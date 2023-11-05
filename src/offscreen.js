let recorder;
let data = [];
let zip = new JSZip();
let isCancelled = false;
let continueCapture = false;
let tabId;

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return;
  }
  tabId = message.tabId;
  console.log(message);
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
    default:
      throw new Error('Unrecognized message:', message.type);
  }
});

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

function evenOut(d) {
  return d % 2 === 0 ? d : d + 1;
}

let completions = 0;

async function startRecording(data) {
  const { region, fileName, frameRate } = data;

  if (recorder?.state === 'recording') {
    throw new Error('Called startRecording while recording is in progress.');
  }

  let media;
  const controller = new CaptureController();
  try {
    media = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: {
        displaySurface: window.devicePixelRatio > 1.3 ? 'window': 'monitor',
        cursor: 'always'
      },
      controller
    });
  } catch {
    chrome.runtime.sendMessage({type: 'remove_document', target: 'background', tabId});
    return;
  }

  let settings = media.getTracks()[0].getSettings();
  console.log(settings);
  const displaySurface = settings.displaySurface;
  if (displaySurface == "window") {
    controller.setFocusBehavior("no-focus-change");
  } else if (displaySurface === 'monitor') {
    region.top = evenOut(region.top + (settings.height - region.window.innerHeight));
    console.log('region:', region);
  }

  chrome.runtime.sendMessage({type: 'init_capture', target: 'background', tabId});
  
  // Wait for the countdown to finish
  await new Promise((resolve) => {
    const id = setInterval(() => {
      if (continueCapture) {
        clearInterval(id);
        resolve(true);
      }
    }, 0);
  });
  
  recorder = new MediaRecorder(media);
  const track = media.getVideoTracks()[0];
  const imageCapture = new ImageCapture(track);
  
  let times = [];
  let bitmaps = [];
  let intervalId = setInterval(async () => {
    let now = parseInt(performance.now());
    imageCapture.track && imageCapture.track.readyState === 'live' && imageCapture.grabFrame().then((bitmap) => {
      times.push(now);
      bitmaps.push(bitmap);
    }).catch(() => {});
  }, 1000 / frameRate);
  
  recorder.onstop = () => {
    clearInterval(intervalId);
    media.getTracks().forEach((t) => t.stop());
    chrome.runtime.sendMessage({type: 'capture_stopped', tabId});
    const canvas = document.createElement('canvas');
    canvas.width = region.width;
    canvas.height = region.height;
    const context = canvas.getContext('2d');
    if (!isCancelled) {
      chrome.runtime.sendMessage({type: 'processing_capture', target: 'background', tabId});
      bitmaps.forEach((imageBitmap, i) => {
        context.drawImage(imageBitmap, -region.left, -region.top);
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
  
  recorder.start();
}

async function stopRecording() {
  if (recorder) {
    recorder.stop();
  }
}
