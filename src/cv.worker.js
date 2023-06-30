/**
 *  Here we will check from time to time if we can access the OpenCV
 *  functions. We will return in a callback if it's been resolved
 *  well (true) or if there has been a timeout (false).
 */

// How long to wait before the animation restarts
END_FRAME_PAUSE = 4000

function waitForOpencv(callbackFn, waitTimeMs = 30000, stepTimeMs = 100) {
  if (self.cv_ && self.cv_.Mat) callbackFn(true)

  let timeSpentMs = 0
  const interval = setInterval(async () => {
    try {
      self.cv_ = await cv;
    } catch(ex) {
      console.log('ex:', ex);
    }
    const limitReached = timeSpentMs > waitTimeMs
    if ((self.cv_ && self.cv_.Mat) || limitReached) {
      clearInterval(interval)
      return callbackFn(!limitReached)
    } else {
      timeSpentMs += stepTimeMs
    }
  }, stepTimeMs)
}

function dataURLtoBlob(dataURL) {
  const BASE64_MARKER = ';base64,';
  const parts = dataURL.split(BASE64_MARKER);
  const contentType = parts[0].split(':')[1];
  const raw = self.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

function stringifyData(mat) {
  var rows = mat.rows;
  var cols = mat.cols;

  // Access the data of the matrix as a Uint8Array
  var data = mat.data;

  // Convert the data to a string representation
  var str = "";

  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      var index = i * cols + j;
      str += data[index] + " ";
    }
    str += "\n";
  }

  return str;
}

function imageDataFromMat(mat) {
  // converts the mat type to cv.CV_8U
  const cv = self.cv_;
  const img = new cv.Mat()
  const depth = mat.type() % 8
  const scale =
    depth <= cv.CV_8S ? 1.0 : depth <= cv.CV_32S ? 1.0 / 256.0 : 255.0
  const shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128.0 : 0.0
  mat.convertTo(img, cv.CV_8U, scale, shift)

  // converts the img type to cv.CV_8UC4
  switch (img.type()) {
    case cv.CV_8UC1:
      cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA)
      break
    case cv.CV_8UC3:
      cv.cvtColor(img, img, cv.COLOR_RGB2RGBA)
      break
    case cv.CV_8UC4:
      break
    default:
      throw new Error(
        'Bad number of channels (Source image must have 1, 3 or 4 channels)'
      )
  }
  const clampedArray = new ImageData(
    new Uint8ClampedArray(img.data),
    img.cols,
    img.rows
  )
  img.delete()
  return clampedArray
}


let rois = [];
let nrs = [];
let nres = [];
let blits = [];
let nrois = [];
let drois = [];

async function processImages(data) {
  const {screenshots: images, times} = data.payload;
  const cv = self.cv_;
  const matrices = [];
  const outputMatrix = new cv.Mat();

  if (Array.isArray(images)) {
    for (item of images) {
      const imageBitmap = await createImageBitmap( dataURLtoBlob(item));
      const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const offscreenContext = offscreenCanvas.getContext('2d');
      // Set the dimensions of the OffscreenCanvas
      offscreenCanvas.width = imageBitmap.width;
      offscreenCanvas.height = imageBitmap.height;
      // Draw the ImageBitmap onto the OffscreenCanvas
      offscreenContext.drawImage(imageBitmap, 0, 0);
      // Get the image data from the OffscreenCanvas
      const imageData = offscreenContext.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
      let mat = cv.matFromImageData(imageData);
      cv.cvtColor(mat, mat, cv.COLOR_RGBA2RGB);
      matrices.push(mat);
    }

    console.log(1);

    const packedImage = new cv.Mat(matrices[0].rows, matrices[0].cols, cv.CV_8UC3, [0, 0, 0, 0]);
    const finalImage = new cv.Mat(matrices[0].rows, matrices[0].cols, cv.CV_8UC3, [0, 0, 0, 0]);

    for (let i = 0; i < matrices.length - 1; i++) {
      let diff = new cv.Mat();
      console.log(1.1, matrices[i], matrices[i + 1]);
      // The matrices should be of same size to avoid crash
      // Note: Make sure the frame dimensions doesn't change. Simple.
      cv.absdiff(matrices[i], matrices[i + 1], diff);

      console.log(2);

      const grayDiffImage = new cv.Mat();
      cv.cvtColor(diff, grayDiffImage, cv.COLOR_RGBA2GRAY);

      diff.delete();

      console.log(3);

      const binaryImage = new cv.Mat();
      cv.threshold(grayDiffImage, binaryImage, 0, 1, cv.THRESH_BINARY);

      grayDiffImage.delete();      

      console.log(4);

      let kernel = cv.Mat.ones(5, 5, cv.CV_8U);

      // / Apply morphological dilation
      const dilatedImage = new cv.Mat();
      cv.dilate(binaryImage, dilatedImage, kernel, new cv.Point(-1, -1), 5, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
      binaryImage.delete();

      console.log(4.5);

      let erodedImage = new cv.Mat();
      cv.erode(dilatedImage, erodedImage, kernel, new cv.Point(-1, -1), 5, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
      dilatedImage.delete();

      console.log(4.6, ':', erodedImage, ':', cv.countNonZero(erodedImage));

      const stats = new cv.Mat();
      const labeledImage = new cv.Mat();
      // Create an empty centroids matrix
      const centroids = new cv.Mat();

      // Perform connected component labeling and obtain statistics
      let numLabels;
      numLabels = cv.connectedComponentsWithStats(erodedImage, labeledImage, stats, centroids);
      erodedImage.delete();
      labeledImage.delete();
      centroids.delete();

      console.log(5, ':', numLabels);
    
      const componentIndices = Array.from(Array(numLabels - 1).keys())//.sort((a, b) => stats.data32S[(a + 1) * 5 + 4] - stats.data32S[(b + 1) * 5 + 4]).reverse();

      for (const index of componentIndices) {
        const width = stats.data32S[(index + 1) * 5 + 2];
        const height = stats.data32S[(index + 1) * 5 + 3];
  
        // Find an available position to pack the component
        let posX = 0;
        let posY = 0;
        let foundPosition = false;
        while (!foundPosition) {
          // Check if the current position is available
          let isAvailable = true;
          for (let y = posY; y < posY + height; y++) {
            for (let x = posX; x < posX + width; x++) {
              if (packedImage.ucharPtr(y, x)[0] !== 0) {
                isAvailable = false;
                break;
              }
            }
            if (!isAvailable) {
              break;
            }
          }
  
          // If the position is available, pack the component and exit the loop
          if (isAvailable) {
            const r = new cv.Rect(posX, posY, width, height);
            const b = new cv.Rect(stats.data32S[(index + 1) * 5], stats.data32S[(index + 1) * 5 + 1], width, height);
            matrices[i + 1].roi(b)
              .copyTo(packedImage.roi(r));
            foundPosition = true;
            rois.push({i, r, o: index});
            if (!nrois[i]) {
              nrois[i] = [r];
            } else {
              nrois[i].push(r);
            }
            if (!drois[i]) {
              drois[i] = [b];
            } else {
              drois[i].push(b);
            }
          } else {
            // Move to the next position
            posX++;
            if (posX + width > matrices[0].cols) {
              posX = 0;
              posY++;
              if (posY + height > matrices[0].rows) {
                // No more available positions, exit the loop
                break;
              }
            }
          }
        }
      }

      console.log(5.5);

      stats.delete();

      if (!componentIndices.length) {
        times.splice(i, 1);
      }
    }


    let srois = rois.sort((a, b) => {
      return Math.abs(a.r.width - a.r.height) - Math.abs(b.r.width - b.r.height);
    }).reverse();

    console.log(6);


    for (const {r,i, o} of srois) {
      const width = r.width;
      const height = r.height;

      // Find an available position to pack the component
      let posX = 0;
      let posY = 0;
      let foundPosition = false;
      while (!foundPosition) {
        // Check if the current position is available
        let isAvailable = true;
        for (let y = posY; y < posY + height; y++) {
          for (let x = posX; x < posX + width; x++) {
            if (finalImage.ucharPtr(y, x)[0] !== 0) {
              isAvailable = false;
              break;
            }
          }
          if (!isAvailable) {
            break;
          }
        }

        // If the position is available, pack the component and exit the loop
        if (isAvailable) {
          const template = packedImage.roi(r);

          let dst = new cv.Mat();
          let mask = new cv.Mat();
          cv.matchTemplate(finalImage, template, dst, cv.TM_CCOEFF_NORMED, mask);
          let minMaxLocResult = cv.minMaxLoc(dst, mask);
          dst.delete();
          mask.delete();

          const { maxLoc } = minMaxLocResult;
          const row = maxLoc.y;
          const col = maxLoc.x;

          const packedRegion = finalImage.rowRange(row, row + height).colRange(col, col + width);
          const srcRegion = packedImage.rowRange(r.y, r.y + height).colRange(r.x, r.x + width);
          const compareResult = new cv.Mat();
          cv.compare(packedRegion, srcRegion, compareResult, cv.CMP_EQ);
          console.log(8);

          const compareGray = new cv.Mat();
          cv.cvtColor(compareResult, compareGray, cv.COLOR_BGR2GRAY);
          compareResult.delete();
          console.log(9);

          const nonZeroCount = cv.countNonZero(compareGray);
          compareGray.delete();

          if (nonZeroCount !== width * height) {
            const nr = new cv.Rect(posX, posY, width, height);
            const qroi = finalImage.roi(nr);
            template.copyTo(qroi);
            nrs.push({i, rect: nr, oldrect: r});
            nres.push({i, o, rect: {...nr, ...{y: nr.y + matrices[0].rows}}});
          } 
          else {
            const match = nrs.find((nr) => nr.rect.x === col && nr.rect.y === row);
            if (match) {
              nrs.push({i, rect: match.rect, oldrect: match.rect});
              nres.push({i, o, rect: {...match.rect, ...{y: match.rect.y + matrices[0].rows, width, height}}});
            } else {
              times.splice(i, 1);
              const nr = new cv.Rect(posX, posY, width, height);
              const qroi = finalImage.roi(nr);
              template.copyTo(qroi);
              nrs.push({i, rect: nr, oldrect: r});
              nres.push({i, o, rect: {...nr, ...{y: nr.y + matrices[0].rows}}});
            }
          }
          foundPosition = true;
        } else {
          // Move to the next position
          posX++;
          if (posX + width > finalImage.cols) {
            posX = 0;
            posY++;
            if (posY + height > finalImage.rows) {
              // No more available positions, exit the loop
              break;
            }
          }
        }
      }
    }

    packedImage.delete();

    console.log(10);

    let snrs = nrs.sort((a, b) => {
      return (a.rect.y + a.rect.height) - (b.rect.y + b.rect.height);
    }).reverse();

    const croppedImage = new cv.Mat();
    finalImage.roi(new cv.Rect(0, 0, finalImage.cols, snrs[0].rect.y + snrs[0].rect.height)).copyTo(croppedImage);
    finalImage.delete();

    const input = new cv.MatVector();
    input.push_back(matrices[0]);
    input.push_back(croppedImage);
    croppedImage.delete();

    cv.vconcat(input, outputMatrix);
    input.delete();
  }

  console.log(11);

  // const times = [660305415, 660306038, 660306220, 660306414, 660306598, 660306790, 660307644, 660307810, 660307875, 660308049, 660308235, 660308285, 660309704];

  const delays = times.slice(1).concat([times[times.length - 1] + END_FRAME_PAUSE])
  .map((value, index) => value - times[index]);

  timeline = [{
    delay: 0, blit:[[0, 0, matrices[0].cols, matrices[0].rows, 0, 0]]
  }];

  nrois.forEach((_n, index) => {
    let blitlist = [];
    let n = nres.filter((r) => r.i === index).sort((a, b) => a.o - b.o);
    for (let i = 0; i < n.length; i++) {
      const {x, y, width, height} = n[i].rect;
      blitlist.push([x, y, width, height, drois[index][i].x, drois[index][i].y, width, height]);
    }
    timeline.push({delay: delays[index], blit: blitlist});
  });

  self.postMessage({ done: true, image: imageDataFromMat(outputMatrix), timeline});
  outputMatrix.delete();
}

onmessage = function (e) {
  switch (e.data.msg) {
    case 'load': {
      // Import Webassembly script
      self.importScripts(e.data.payload);
      waitForOpencv(function (success) {
        if (success) postMessage({ msg: e.data.msg })
        else throw new Error('Error on loading OpenCV')
      })
      break
    }
    case 'processImages':
      return processImages(e.data)
    default:
      break
  }
}