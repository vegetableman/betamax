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

const delay_scale = 0.9
let timer = null

function animate(img, timeline, canv)
{
	let i = 0;
	let run_time = 0;
	for (let j = 0; j < timeline.length - 1; ++j)
		run_time += timeline[j].get('delay');

	let f = function()
	{
		let frame = i++ % timeline.length;
		let delay = timeline[frame].get('delay') * delay_scale;
		let blits = timeline[frame].get('blit');

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
			const blits = timeline[0].get('blit')[0];
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
				// var im = new Image();
				// im.src = url;
				// document.body.appendChild(im);
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


