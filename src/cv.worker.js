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
  const images = data.payload;
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

      // console.log('mat:', mat);

      cv.cvtColor(mat, mat, cv.COLOR_RGBA2RGB);
      matrices.push(mat);
    }
    // console.log('rows:', matrices[0].rows, 'cols:',  matrices[0].cols, matrices[0])
    const packedImage = new cv.Mat(matrices[0].rows, matrices[0].cols, cv.CV_8UC3, [0, 0, 0, 0]);
    const finalImage = new cv.Mat(matrices[0].rows, matrices[0].cols, cv.CV_8UC3, [0, 0, 0, 0]);

    console.log('finalImage:', finalImage, packedImage);

    // console.log('packedImage:', packedImage);
    for (let i = 0; i < matrices.length - 1; i++) {
      let diff = new cv.Mat();
      cv.absdiff(matrices[i], matrices[i + 1], diff);

      // console.log('diff:', diff);

      const grayDiffImage = new cv.Mat();
      cv.cvtColor(diff, grayDiffImage, cv.COLOR_RGBA2GRAY);

      const binaryImage = new cv.Mat();
      cv.threshold(grayDiffImage, binaryImage, 0, 1, cv.THRESH_BINARY);

      // console.log('binaryImage:', stringifyData(binaryImage));

      let kernel = cv.Mat.ones(5, 5, cv.CV_8U);

      // / Apply morphological dilation
      const dilatedImage = new cv.Mat();

      cv.dilate(binaryImage, dilatedImage, kernel, new cv.Point(-1, -1), 5, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

      let erodedImage = new cv.Mat();
      cv.erode(dilatedImage, erodedImage, kernel, new cv.Point(-1, -1), 5, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

      const stats = new cv.Mat();
      const labeledImage = new cv.Mat();
      // Create an empty centroids matrix
      const centroids = new cv.Mat();
      // Perform connected component labeling and obtain statistics
      const numLabels = cv.connectedComponentsWithStats(erodedImage, labeledImage, stats, centroids);

      console.log('labeledImage:', labeledImage, stats, centroids);

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
            // console.log('roi')
            const r = new cv.Rect(posX, posY, width, height);
            const b = new cv.Rect(stats.data32S[(index + 1) * 5], stats.data32S[(index + 1) * 5 + 1], width, height);
            matrices[i + 1].roi(b)
              .copyTo(packedImage.roi(r));
            foundPosition = true;
            // rois.push({i, rect: b, drect: r});
            rois.push({i, r});
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
    }

    rois = rois.sort((a, b) => {
      // return Math.abs(a.rect.width - a.rect.height) - Math.abs(b.rect.width - b.rect.height);
      return Math.abs(a.r.width - a.r.height) - Math.abs(b.r.width - b.r.height);
    }).reverse();

    // debugger;

    // let nrois = [];
    for (const {r,i} of rois) {
      // const r = roi.rect;
      // console.log('r:', r);
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
          const nr = new cv.Rect(posX, posY, width, height);

          let dst = new cv.Mat();
          let mask = new cv.Mat();
          cv.matchTemplate(finalImage, template, dst, cv.TM_CCOEFF_NORMED, mask);
          let minMaxLocResult = cv.minMaxLoc(dst, mask);
          const { maxLoc } = minMaxLocResult;
          const row = maxLoc.y;
          const col = maxLoc.x;

          const packedRegion = finalImage.rowRange(row, row + height).colRange(col, col + width);
          const srcRegion = packedImage.rowRange(r.y, r.y + height).colRange(r.x, r.x + width);
          const compareResult = new cv.Mat();
          cv.compare(packedRegion, srcRegion, compareResult, cv.CMP_EQ);

          let compareGray = new cv.Mat();
          cv.cvtColor(compareResult, compareGray, cv.COLOR_BGR2GRAY);

          const nonZeroCount = cv.countNonZero(compareGray);
          // console.log('nonZeroCount:', nonZeroCount, width * height, nonZeroCount !== width * height);
          if (nonZeroCount !== width * height) {
            template
              .copyTo(finalImage.roi(nr));
            nrs.push({i, rect: nr});
            nres.push({i, rect: {...nr, ...{y: nr.y + 450}}});
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

    console.log('nrs:', nrs);

    debugger;

    // const grayImage  = new cv.Mat();
    // cv.cvtColor(finalImage,  grayImage, cv.COLOR_BGR2GRAY);

    // const binaryImage = new cv.Mat();
    // cv.threshold(grayImage, binaryImage, 1, 255, cv.THRESH_BINARY);

    // const projection = new cv.Mat();
    // cv.reduce(binaryImage, projection, 1, cv.REDUCE_SUM, cv.CV_32S);

    // const projectionArray = projection.data32S;
    // let transitionRow = 0;
    // for (let i = 0; i < projectionArray.length; i++) {
    //   if (projectionArray[i] < (Math.max(...projectionArray) * 0.1)) {
    //     transitionRow = i;
    //     break;
    //   }
    // }

    let snrs = nrs.sort((a, b) => {
      return (a.rect.y + a.rect.height) - (b.rect.y + b.rect.height);
    }).reverse();

    // console.log('nrs:', snrs, snrs[0].rect.y + snrs[0].rect.height);

    const croppedImage = new cv.Mat();
    finalImage.roi(new cv.Rect(0, 0, finalImage.cols, snrs[0].rect.y + snrs[0].rect.height)).copyTo(croppedImage);

    const input = new cv.MatVector();
    input.push_back(matrices[0]);
    input.push_back(croppedImage);
    cv.vconcat(input, outputMatrix);

    // console.log('m:', matrices[0])

    // self.postMessage({ done: true, image: imageDataFromMat(finalImage) });
  }

  const times = [660305415, 660306038, 660306220, 660306414, 660306598, 660306790, 660307644, 660307810, 660307875, 660308049, 660308235, 660308285, 660309704];

  const delays = times.slice(1).concat([times[times.length - 1] + END_FRAME_PAUSE])
  .map((value, index) => value - times[index]);

  console.log('rois:', rois);

  console.log('delays:', delays);

  timeline = [{
    delay: delays[0], blit:[[0, 0, matrices[0].cols, matrices[0].rows, 0, 0]]
  }];

  nrois.forEach((_n, index) => {
    let blitlist = [];
    let n = nres.filter((r) => r.i === index);
    for (let i = 0; i < n.length; i++) {
      const {x, y, width, height} = n[i].rect;
      blitlist.push([x, y, width, height, drois[index][i].x, drois[index][i].y, drois[index][i].width, drois[index][i].height]);
    }
    timeline.push({delay: delays[index + 1], blit: blitlist});
  });

  // for (let i = 0; i < images.length; i++) {
  //   const {x, y, width, height} = nrs[i];
  //   // blits.push([x, y, width, height, rois[i].x, rois[i].y]);
  //   const blit = [ rois[i].x, rois[i].y , width, height, x, y];
  //   timeline.push({delay: delays[i], blit});
  // }

  // console.log('blits:', blits);

  // timeline = [{'delay': delays, 'blit': blits}]


  // // Specify the coordinates of the rectangle
  // const top_left = new cv.Point(145, 15);
  // const bottom_right = new cv.Point(160, 20);

  // // Specify the color and thickness of the rectangle
  // const color = new cv.Scalar(0, 255, 0); // Green color in BGR format
  // const thickness = 1;

  // // Draw the rectangle on the image
  // cv.rectangle(outputMatrix, top_left, bottom_right, color, thickness);

  console.log('timeline:', timeline);

  // cv.rectangle(outputMatrix, new cv.Point(790, 510), new cv.Point(795, 520), color, thickness);

  // self.postMessage({ name: 'timeline', timeline });
  self.postMessage({ done: true, image: imageDataFromMat(outputMatrix), timeline });
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