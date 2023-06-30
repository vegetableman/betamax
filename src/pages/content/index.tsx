import { render } from "solid-js/web";
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
//   z-index: 9999; /* Ensure the cursor element is above other elements */
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
// 	if (event.target instanceof HTMLElement && (event.target.style.cursor === 'pointer' || event.target.closest('button'))) {
// 		cursorEl.innerHTML = pointersvg;
// 	} else {
// 		cursorEl.innerHTML = svg;
// 	}
//   cursorEl.style.left = `${event.clientX}px`;
//   cursorEl.style.top = `${event.clientY}px`;
// });

var delay_scale = 0.7
var timer = null

var animate = function(img, timeline, canv)
{
	var i = 0

	var run_time = 0
	for (var j = 0; j < timeline.length - 1; ++j)
		run_time += timeline[j].delay

	var f = function()
	{
		var frame = i++ % timeline.length
		var delay = timeline[frame].delay * delay_scale
		var blits = timeline[frame].blit

		var ctx = canv.getContext('2d')

		for (j = 0; j < blits.length; ++j)
		{
			var blit = blits[j]
			var sx = blit[0]
			var sy = blit[1]
			var w = blit[2]
			var h = blit[3]
			var dx = blit[4]
			var dy = blit[5]
			ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h)
		}

		timer = window.setTimeout(f, delay)
	}

	if (timer) window.clearTimeout(timer)
	f()
}

var animate_fallback = function(img, timeline, element)
{
	var i = 0

	var run_time = 0
	for (var j = 0; j < timeline.length - 1; ++j)
		run_time += timeline[j].delay

	var f = function()
	{
		if (i % timeline.length == 0)
		{
			while (element.hasChildNodes())
				element.removeChild(element.lastChild)
		}

		var frame = i++ % timeline.length
		var delay = timeline[frame].delay * delay_scale
		var blits = timeline[frame].blit

		for (j = 0; j < blits.length; ++j)
		{
			var blit = blits[j]
			var sx = blit[0]
			var sy = blit[1]
			var w = blit[2]
			var h = blit[3]
			var dx = blit[4]
			var dy = blit[5]

			var d = document.createElement('div')
			d.style.position = 'absolute'
			d.style.left = dx + "px"
			d.style.top = dy + "px"
			d.style.width = w + "px"
			d.style.height = h + "px"
			d.style.backgroundImage = "url('" + img.src + "')"
			d.style.backgroundPosition = "-" + sx + "px -" + sy + "px"

			element.appendChild(d)
		}

		timer = window.setTimeout(f, delay)
	}

	if (timer) window.clearTimeout(timer)
	f()
}

const stopEvent = new CustomEvent("stop-capture");

function set_animation(img_url, timeline, canvas_id, fallback_id)
{
  console.log('timeline:', timeline);
	var img = new Image()
	img.onload = function()
	{
		var canvas = document.getElementById(canvas_id)
		if (canvas && canvas.getContext) {
			canvas.width = timeline[0].blit[0][2];
			canvas.height = timeline[0].blit[0][3];
			canvas.style.position = 'absolute';
			animate(img, timeline, canvas)
		} else {
			animate_fallback(img, timeline, document.getElementById(fallback_id))
		}
	}
	img.src = img_url
}



// let captureInterval; 

// function stopCapture(res) {
//   cv.processImages(res, (imagedata, timeline) => {
//     console.log('image:', imagedata, timeline);
// 		// const canvas = document.getElementById('betamax-canvas');
//     const canvas = document.createElement('canvas');
//     // var image = new Image();
//     if (canvas instanceof HTMLCanvasElement) {
//       var ctx = canvas.getContext("2d");
//       canvas.width = imagedata.width;
//       canvas.height = imagedata.height;
//       ctx.putImageData(imagedata, 0, 0);
// 			// ctx.drawImage(imagedata, 0, 0, 800, 450, 0, 0, 800, 450)
//       // image.src = canvas.toDataURL();
//       set_animation(canvas.toDataURL(), timeline, 'betamax-canvas', 'anim_fallback');
//     }
//   });
// }

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function startCapture() {
	async function captureElementScreenshots(element, intervalMs) {
		// Request screen capture permission
		const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, preferCurrentTab: true });

		await delay(2000);

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
	
		const captureInterval = setInterval(() => {
			// Get the dimensions and position of the element
			const rect = element.getBoundingClientRect();
			const scrollX = window.scrollX || window.pageXOffset;
    	const scrollY = window.scrollY || window.pageYOffset;
	
			// Create a canvas with the dimensions of the element
			const canvas = document.createElement('canvas');
			canvas.width = rect.width;
			canvas.height = rect.height;
			const context = canvas.getContext('2d');

			// Draw the current video frame onto the canvas, capturing only the element's portion
			context.drawImage(videoElement, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
	
			// Convert the canvas image to a data URL
			const dataURL = canvas.toDataURL('image/png');

			times.push(Date.now());
	
			// Add the screenshot to the array
			screenshots.push(dataURL);
		}, intervalMs);

		function stopCapture() {
			captureInterval && clearInterval(captureInterval);
			// Stop the screen capture stream
			stream.getTracks().forEach(track => track.stop());
	
			// Process the captured screenshots as needed
			processScreenshots(screenshots, times);
		}

		document.addEventListener('stop-capture', function(e) {
			// console.log('stop-capture:', e.detail); // Prints "Example of an event"
			stopCapture();
		});
		
	
		// Stop capturing screenshots after the specified duration
		// setTimeout(() => {
		// clearInterval(captureInterval);
		// stopCapture();
		// }, durationMs);
	
		function processScreenshots(screenshots, times) {
			// Example: Log the screenshots array
			console.log(screenshots, times);
			// chrome.runtime.sendMessage({
			// 	message: 'capture', screenshots
			// });
			cv.processImages({screenshots, times}, (imagedata, timeline) => {
				// console.log('image:', imagedata, timeline);
				const canvas = document.getElementById('betamax-canvas');
				// const canvas = document.createElement('canvas');
				// var image = new Image();
				if (canvas instanceof HTMLCanvasElement) {
					var ctx = canvas.getContext("2d");
					canvas.width = imagedata.width;
					canvas.height = imagedata.height;
					ctx.putImageData(imagedata, 0, 0);
					// ctx.drawImage(imagedata, 0, 0, 800, 450, 0, 0, 800, 450)
					// image.src = canvas.toDataURL();
					// set_animation(canvas.toDataURL(), timeline, 'betamax-canvas', 'anim_fallback');
				}
			});
		}
	}

	captureElementScreenshots(document.querySelector('.guided-container'), 20);
}

let stop;
chrome.runtime.onMessage.addListener(async (req, sender, res) => {
  console.log('req')
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


