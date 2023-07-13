import cv from '@src/cv';

const root = document.createElement("div");
root.id = "extension-root";
document.body.append(root);
const canvas= document.createElement('canvas');
canvas.id = "betamax-canvas";
canvas.style.position = 'absolute';
canvas.style.zIndex = '1';
canvas.style.left = '20px';
canvas.style.bottom = '20px';
document.body.appendChild(canvas);

// const style = document.createElement('style');
// style.innerHTML = `
// .bt-custom-cursor {
//   position: fixed;
//   top: 0;
//   left: 0;
//   width: 20px;
//   height: 20px;
//   cursor: pointer;
//   border-radius: 50%;
//   pointer-events: none; /* Ensure the cursor element doesn't interfere with mouse events */
//   z-index: 99999999999999999; /* Ensure the cursor element is above other elements */
// }
// `;
// document.head.appendChild(style);

// const cursorEl = document.createElement('div');
// cursorEl.classList.add('bt-custom-cursor');
// const pointersvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"  height="1em"><path d="M448 240v96c0 3.084-.356 6.159-1.063 9.162l-32 136C410.686 499.23 394.562 512 376 512H168a40.004 40.004 0 0 1-32.35-16.473l-127.997-176c-12.993-17.866-9.043-42.883 8.822-55.876 17.867-12.994 42.884-9.043 55.877 8.823L104 315.992V40c0-22.091 17.908-40 40-40s40 17.909 40 40v200h8v-40c0-22.091 17.908-40 40-40s40 17.909 40 40v40h8v-24c0-22.091 17.908-40 40-40s40 17.909 40 40v24h8c0-22.091 17.908-40 40-40s40 17.909 40 40zm-256 80h-8v96h8v-96zm88 0h-8v96h8v-96zm88 0h-8v96h8v-96z"/></svg>';
// const svg = '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512"><path d="M302.189 329.126H196.105l55.831 135.993c3.889 9.428-.555 19.999-9.444 23.999l-49.165 21.427c-9.165 4-19.443-.571-23.332-9.714l-53.053-129.136-86.664 89.138C18.729 472.71 0 463.554 0 447.977V18.299C0 1.899 19.921-6.096 30.277 5.443l284.412 292.542c11.472 11.179 3.007 31.141-12.5 31.141z"/></svg>';
// cursorEl.innerHTML = svg;
// document.body.appendChild(cursorEl);
// document.addEventListener('mousemove', (event) => {
//   // console.log('mousemove', event.target instanceof HTMLElement ? event.target.closest('button'): null);
//   // Update the position of the custom cursor element to match the mouse position
// 	if (event.target instanceof HTMLElement && (event.target.style.cursor === 'pointer' || event.target.closest('button') || event.target.closest('.cursor-pointer'))) {
// 		cursorEl.innerHTML = pointersvg;
// 	} else {
// 		cursorEl.innerHTML = svg;
// 	}
//   cursorEl.style.left = `${event.clientX}px`;
//   cursorEl.style.top = `${event.clientY}px`;
// });


const delay_scale = 0.9
let timer = null

function animate(img, timeline, canv)
{
	let i = 0;
	let run_time = 0;
	for (let j = 0; j < timeline.length - 1; ++j)
		run_time += timeline[j].delay;

	let f = function()
	{
		let frame = i++ % timeline.length;
		let delay = timeline[frame].delay * delay_scale;
		let blits = timeline[frame].blit;

		let ctx = canv.getContext('2d');
		for (let j = 0; j < blits.length; ++j)
		{
			let blit = blits[j];
			let sx = blit[0];
			let sy = blit[1];
			let w = blit[2];
			let h = blit[3];
			let dx = blit[4];
			let dy = blit[5];
			ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h);
		}

		timer = window.setTimeout(f, delay);
	}

	if (timer) window.clearTimeout(timer);
	f();
}

const stopEvent = new CustomEvent("stop-capture");

function set_animation(img_url, timeline, canvas_id, fallback_id)
{
	var img = new Image();
	img.onload = function()
	{
		var canvas = document.getElementById(canvas_id);
		if (canvas && canvas instanceof HTMLCanvasElement && canvas.getContext) {
			const blits = timeline[0].blit[0];
			canvas.width = blits[2];
			canvas.height = blits[3];
			canvas.style.position = 'absolute';
			animate(img, timeline, canvas);
		}
	}
	img.src = img_url;
}

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
    console.log('deviation', nowTime - nextTime);
    counter += 1;
    callback();
  }

  timeoutId = setTimeout(main, interval);

  return () => {
    clearTimeout(timeoutId);
  };
}

function createImageDownloadLink(dataUrl, fileName) {
	var image = new Image();
	image.src = dataUrl;
	image.title = fileName;
	image.onload = () => {
		image.width = image.width/2;
		image.height = image.height/2;
		document.body.appendChild(image);
	}
}

function startCapture() {
	async function captureElementScreenshots(element, intervalMs) {
		// Request screen capture permission
		const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, preferCurrentTab: true });

		await delay(1000);

		stream.getVideoTracks()[0].onended = function () {
			stopCapture();
		};
	
		// Create a video element and set the stream as the source
		const videoElement = document.createElement('video');
		videoElement.srcObject = stream;
		videoElement.play();
	
		// Wait for the video to load metadata
		await new Promise(resolve => {
			videoElement.onloadedmetadata = resolve;
		});
	
		const screenshots = [];
		const times = [];
		const rect = element.getBoundingClientRect();

		const canvas = document.createElement('canvas');
		canvas.width = rect.width;
		canvas.height = rect.height;
		const context = canvas.getContext('2d');

		const cancelTimer = intervalTimer(() => {
			let t = Math.round(videoElement.currentTime * 1000);
			times.push(t);

			// Draw the current video frame onto the canvas, capturing only the element's portion
			context.drawImage(videoElement, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
	
			// Convert the canvas image to a data URL
			const dataURL = canvas.toDataURL('image/png');
	
			// Add the screenshot to the array
			screenshots.push(dataURL);
		}, 16);

		function stopCapture() {
			cancelTimer();
			// captureInterval && clearInterval(captureInterval);
			// Stop the screen capture stream
			stream.getTracks().forEach(track => track.stop());

			// const times = [1689169129236, 1689169129312, 1689169129392, 1689169129484, 1689169129574, 1689169129662, 1689169129757, 1689169129844, 1689169129934, 1689169130021, 1689169130101, 1689169130183, 1689169130266, 1689169130346, 1689169130425, 1689169130504, 1689169130584, 1689169130663, 1689169130749]

			screenshots.forEach((s, i) => {
				createImageDownloadLink(s, `${times[i]}.png`);
			});
			// Process the captured screenshots as needed
			processScreenshots(screenshots, times);
		}

		document.addEventListener('stop-capture', function(e) {
			stopCapture();
		});
		
	
		function processScreenshots(screenshots, times) {
			// Example: Log the screenshots array
			console.log(screenshots, times);
			cv.processImages({screenshots, times}, (imagedata, timeline) => {
				const url = URL.createObjectURL(imagedata);
				var im = new Image();
				im.src = url;
				document.body.appendChild(im);
				set_animation(url, timeline, 'betamax-canvas', 'anim_fallback');
			});
		}
	}

	captureElementScreenshots(document.body, 17);
}

chrome.runtime.onMessage.addListener(async (req, sender, res) => {
  if (req.message === 'init') {
    console.log('init');
    await cv.load();
  }
  else if (req.message === 'cv_loaded') {
    console.log('cv loaded');
  }
  else if (req.message === 'processingComplete') {
    console.log('processingComplete');
  }
  else if (req.message === 'stopCapture') {
		document.dispatchEvent(stopEvent);
  } else if (req.message === 'startCapture') {
		startCapture();
	}
});


