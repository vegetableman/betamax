// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


let recorder;
let data = [];
let zip = new JSZip();
let isCancelled = false;
let continueCapture = false;

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.target === 'offscreen') {
    switch (message.type) {
      case 'start-recording':
        startRecording(message.data);
        break;
      case 'stop-recording':
        stopRecording();
        break;
      case 'continue-recording':
        continueCapture = true;
        break;
      case 'cancel-recording':
        isCancelled = true;
        stopRecording();
        break;
      default:
        throw new Error('Unrecognized message:', message.type);
    }
  }
});

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function intervalTimer(callback, interval) {
  let counter = 1;
  let timeoutId;
  const startTime = Date.now();

  function main() {
    const nowTime = Date.now();
    const nextTime = startTime + counter * interval;
    timeoutId = setTimeout(main, interval - (nowTime - nextTime));
    counter += 1;
    callback();
  }

  timeoutId = setTimeout(main, interval);

  return () => {
    clearTimeout(timeoutId);
  };
}

let completions = 0;

async function startRecording(data) {
  const { region, fileName } = data;
  if (recorder?.state === 'recording') {
    throw new Error('Called startRecording while recording is in progress.');
  }

  const controller = new CaptureController();

  let media;
  try {
    media = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: {
        cursor: 'always',
        frameRate: 30
      },
      controller
    });
  } catch {
    chrome.runtime.sendMessage({type: 'off-remove-document'});
    return;
  }

  var settings = media.getTracks()[0].getSettings();
  console.log(settings);
  const displaySurface = settings.displaySurface;
  if (displaySurface == "window") {
    // Do not move focus to the captured window.
    // Keep the capturing page focused.
    controller.setFocusBehavior("no-focus-change");
  }

  chrome.runtime.sendMessage({type: 'off-prerecording-started'});
  
  await new Promise((resolve) => {
    const id = setInterval(() => {
      console.log('cc', continueCapture);
      if (continueCapture) {
        clearInterval(id);
        resolve(true);
      }
    }, 1000 / 60);
  });


  let times = [];

  function postCapture() {
    zip.generateAsync({type: 'blob'}).then(async function(content) {
      let link = document.createElement('a')
      link.rel = 'noopener'
      link.href = URL.createObjectURL(content);
      link.download = fileName;
      setTimeout(function () { URL.revokeObjectURL(link.href) }, 4E4); // 40s
      setTimeout(function () { link.click() }, 0);
      setTimeout(function () {
        chrome.runtime.sendMessage({type: 'off-open-frame', payload: {fileName}});
        chrome.runtime.sendMessage({type: 'off-remove-document'}); 
      }, 1000);
    })
  }

  const canvas = document.createElement('canvas');
  canvas.width =  region.width;
  canvas.height =  region.height;
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  
  let bitmaps = []
  recorder = new MediaRecorder(media);
  
  const track = media.getVideoTracks()[0];
  const imageCapture = new ImageCapture(track);
  
  let intervalId = setInterval(async () => {
    let now = parseInt(performance.now());
    imageCapture.track && imageCapture.track.readyState === 'live' && imageCapture.grabFrame().then((bitmap) => {
      times.push(now);
      bitmaps.push(bitmap);
    }).catch(() => {})
  }, 1000 / 60);
  
  recorder.onstop = () => {
    chrome.runtime.sendMessage({type: 'off-recording-stopped'});
    clearInterval(intervalId);
    media.getTracks().forEach((t) => t.stop());
    if (!isCancelled) {
      bitmaps.forEach((imageBitmap, i) => {
        context.drawImage(imageBitmap, -region.left, -region.top);
        canvas.toBlob((blob) => {
          completions++;
          zip.file(`${times[i]}.png`, blob);
          if (completions === bitmaps.length) {
            postCapture();
          }
        });
      });
    } else {
      isCancelled = false;
      chrome.runtime.sendMessage({type: 'off-remove-document'}); 
    }
  }
  
  recorder.start();
}

async function stopRecording() {
  if (recorder) {
    recorder.stop();
  }
}
