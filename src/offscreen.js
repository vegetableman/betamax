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

let isOpen = false;

async function startRecording(data) {
  if (isOpen) {
    return;
  }

  const { fileName, frameRate, bitrate, mimeType } = data;
  const controller = new CaptureController();
  let media;
  try {
    isOpen = true;
    media = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: {
        displaySurface: window.devicePixelRatio > 1.3 ? 'window': 'monitor',
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1007177#c4
        // Cursor remains inconsistent in mac
        // cursor: 'always'
      },
      controller
    });
  } catch {
    chrome.runtime.sendMessage({type: 'remove_document', target: 'background', tabId});
    return;
  }

  const settings = media.getTracks()[0].getSettings();
  const displaySurface = settings.displaySurface;
  if (displaySurface === "window") {
    controller.setFocusBehavior("no-focus-change");
  } 

  chrome.runtime.sendMessage({type: 'start_countdown', target: 'background', tabId, payload: {displaySurface}});
  
  // Wait for the countdown to finish
  await new Promise((resolve) => {
    const id = setInterval(() => {
      if (continueCapture) {
        clearInterval(id);
        resolve(true);
      }
    }, 0);
  });

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
   
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(blob);

    const canvas = document.createElement('canvas');
    canvas.width = region.width;
    canvas.height = region.height;
    // canvas.style.imageRendering = 'pixelated';
    const context = canvas.getContext('2d', {willReadFrequently: true});

    let startTime = 0.0;
    let completions = 0;
    let paintCount = 0;

    const frames = [];

    const processCapture = () => {
      now = performance.now().toFixed(3);
      if (startTime === 0.0) {
        startTime = now;
      }
      const time = videoElement.currentTime;
      let t = Math.round(time * 1000);
      console.log('t:', t);
      times.push(t);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(videoElement, -region.left, -region.top);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      frames.push(imageData.data.buffer);
      // const compressedData = UPNG.encode([imageData.data.buffer], canvas.width, canvas.height, 256);
      // const compressedBlob = new Blob([compressedData], { type: 'image/png' });
      // zip.file(`${t}.png`, compressedBlob);

      const elapsed = (now - startTime) / 1000.0;
      const fps = (++paintCount / elapsed).toFixed(3);
      console.info('fps:', fps);

      // canvas.toBlob((blob) => {
      //   completions++;
      //   zip.file(`${t}.png`, blob);
      //   if (completions === times.length) {
      //     times = [];
      //     postCapture(fileName);
      //   }
      // });
    }
    let vIntervalId;
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
        // console.log('ended:', times, videoElement.currentTime, videoElement.duration)
        frames.forEach((f, i) => {
          const compressedData = UPNG.encode([f], canvas.width, canvas.height, 256);
          const compressedBlob = new Blob([compressedData], { type: 'image/png' });
          zip.file(`${times[i]}.png`, compressedBlob);
        });
        postCapture(fileName);
      });
      videoElement.play();
    } else {
      isCancelled = false;
      chrome.runtime.sendMessage({type: 'remove_document', target: 'background', tabId});
    }
  }

  recorder.start(1000 / frameRate);
}

async function stopRecording() {
  if (recorder) {
    recorder.stop();
  }
}
