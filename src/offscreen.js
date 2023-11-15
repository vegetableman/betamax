let recorder;
let data = [];
let zip = new JSZip();
let isCancelled = false;
let continueCapture = false;
let tabId;
let region;

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return;
  }
  tabId = message.tabId;
  switch (message.type) {
    case 'start_capture':
      startRecording(message.data);
      break;
    case 'stop_capture':
      stopRecording();
      break;
    case 'continue_capture':
      continueCapture = true;
      break;
    case 'cancel_capture':
      isCancelled = true;
      stopRecording();
      break;
    case 'set_region':
      region = message.payload.region;
      break;
    default:
      throw new Error('Unrecognized message:', message.type);
  }
});

function postCapture(fileName) {
  zip.generateAsync({type: 'blob'}).then(async function(content) {
    let link = document.createElement('a')
    link.rel = 'noopener'
    link.href = URL.createObjectURL(content);
    link.download = fileName;
    setTimeout(function () { URL.revokeObjectURL(link.href) }, 4E4); // 40s
    setTimeout(function () { link.click() }, 0);
    chrome.runtime.sendMessage({type: 'open_frame_manager', target: 'background', payload: {fileName}, tabId});
    setTimeout(function () {
      chrome.runtime.sendMessage({type: 'remove_document', target: 'background', tabId});
    }, 0);
  })
}


function startMediaRecorder (media, {mimeType, bitrate, frameRate, fileName}) {
  let options = {};
  if (mimeType) {
    options.mimeType = mimeType;
  }
  if (bitrate) {
    options.videoBitsPerSecond = bitrate;
  }
  recorder = new MediaRecorder(media, options);

  let times = [];
  let recordedChunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  recorder.onstop = () => {
    chrome.runtime.sendMessage({type: 'capture_stopped', target: 'background', tabId});
    media.getTracks().forEach((t) => t.stop());
   
    const blob = new Blob(recordedChunks, { type: options.mimeType || 'video/webm;codecs=vp9' });
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(blob);

    const canvas = document.createElement('canvas');
    canvas.width = region.width;
    canvas.height = region.height;
    const context = canvas.getContext('2d');

    let startTime = 0.0;
    let completions = 0;
    let paintCount = 0;

    const processCapture = async () => {
      now = performance.now().toFixed(3);
      if (startTime === 0.0) {
        startTime = now;
      }
      const time = videoElement.currentTime;
      let t = Math.round(time * 1000);
      times.push(t);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(videoElement, -region.left, -region.top);

      const elapsed = (now - startTime) / 1000.0;
      const fps = (++paintCount / elapsed).toFixed(3);
      console.info('fps:', fps);

      canvas.toBlob((blob) => {
        completions++;
        zip.file(`${t}.png`, blob);
        if (completions === times.length) {
          times = [];
          postCapture(fileName);
        }
      });
    }

    if (!isCancelled) {
      chrome.runtime.sendMessage({type: 'processing_capture', target: 'background', tabId});
      videoElement.addEventListener('loadeddata', () => {
        videoElement.currentTime = 1.0;
        vIntervalId = setInterval(() => {
          processCapture()
        },  1000 / frameRate);
      });
      videoElement.addEventListener('ended', () => {
        clearInterval(vIntervalId);
      });
      videoElement.play();
    } else {
      isCancelled = false;
      chrome.runtime.sendMessage({type: 'remove_document', target: 'background', tabId});
    }
  }

  recorder.start();
}

function startImageCapture(media, {frameRate, fileName}) {
  let times = [];
  let bitmaps = [];
  let completions = 0;

  const imageCapture = new ImageCapture(media.getVideoTracks()[0]);

  let intervalId = setInterval(() => {
    if (imageCapture.track && imageCapture.track.readyState === 'ended') {
      chrome.runtime.sendMessage({type: 'capture_stopped', target: 'background', tabId});
      clearInterval(intervalId);
      media.getTracks().forEach((t) => t.stop());
      const canvas = document.createElement('canvas');
      canvas.width = region.width;
      canvas.height = region.height;
      const context = canvas.getContext('2d');
      if (!isCancelled) {
        chrome.runtime.sendMessage({type: 'processing_capture', target: 'background', tabId});
        bitmaps.forEach(async (bmp, i) => {
          context.drawImage(await bmp, 0, 0);
          canvas.toBlob((blob) => {
            completions++;
            zip.file(`${times[i]}.png`, blob);
            if (completions === bitmaps.length) {
              bitmaps = [];
              postCapture(fileName);
            }
          });
        });
      } else {
        isCancelled = false;
        chrome.runtime.sendMessage({type: 'remove_document', target: 'background', tabId});
      }
    }
    let now = parseInt(performance.now());
    imageCapture.track && imageCapture.track.readyState === 'live' && imageCapture.grabFrame().then((bitmap) => {
      times.push(now);
      bitmaps.push(createImageBitmap(bitmap, region.left, region.top, region.width, region.height));
    }).catch(() => {});
  }, 1000 / frameRate);
}

let isOpen = false;
let media;
async function startRecording(data) {
  if (isOpen) {
    return;
  }

  const controller = new CaptureController();
  try {
    isOpen = true;
    media = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: {
        displaySurface: window.devicePixelRatio > 1.3 ? 'window': 'monitor',
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1007177#c4
        // Cursor remains inconsistent in mac
        cursor: 'always'
      },
      controller
    });
  } catch {
    chrome.runtime.sendMessage({type: 'remove_document', target: 'background', tabId});
    return;
  }

  const settings = media.getTracks()[0].getSettings();
  console.info('Track settings: ', settings);
  const displaySurface = settings.displaySurface;
  if (displaySurface === "window") {
    controller.setFocusBehavior("no-focus-change");
  } 

  chrome.runtime.sendMessage({type: 'start_countdown', target: 'background', tabId, payload: { displaySurface }});
  
  // Wait for the countdown to finish
  await new Promise((resolve) => {
    const id = setInterval(() => {
      if (continueCapture) {
        clearInterval(id);
        resolve(true);
      }
    }, 0);
  });

  if (data.implementation == 'mr') {
    startMediaRecorder(media, data);
  } else {
    // Color conversion issues when it comes to ImageCapture
    // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/imagecapture/README.md
    startImageCapture(media, data);
  }
}

async function stopRecording() {
  if (recorder) {
    recorder.stop();
  } else {
    media.getTracks().forEach((t) => t.stop());
  }
}
