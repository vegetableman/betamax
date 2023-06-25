self.onmessage = function(event) {
  const message = event.data;
  if (message.image1Data && message.image2Data) {
    const image1Data = message.image1Data;
    const image2Data = message.image2Data;
    const width = Math.max(image1Data.width, image2Data.width);
    const height = Math.max(image1Data.height, image2Data.height);
    const diffData = new Uint8ClampedArray(width * height * 4);

    // Compare image1Data and image2Data to populate diffData
    for (let i = 0; i < diffData.length; i += 4) {
      const r1 = image1Data.data[i];
      const g1 = image1Data.data[i + 1];
      const b1 = image1Data.data[i + 2];
      const a1 = image1Data.data[i + 3];

      const r2 = image2Data.data[i];
      const g2 = image2Data.data[i + 1];
      const b2 = image2Data.data[i + 2];
      const a2 = image2Data.data[i + 3];

      const diffR = Math.abs(r1 - r2);
      const diffG = Math.abs(g1 - g2);
      const diffB = Math.abs(b1 - b2);
      // const diffA = (diffR || diffG || diffB) ? 255: 0;
      const diffA = Math.abs(a1 - a2);

      // Set the difference values in the diffData array
      diffData[i] = diffR;
      diffData[i + 1] = diffG;
      diffData[i + 2] = diffB;
      diffData[i + 3] = diffA;
    }

    self.postMessage({ compareReady: true, diffData, width, height  });
  } else if (message.pack) {
    const diffData = message.diffData;
    const width = message.width;
    const height = message.height;

    // Sort the differences by size (largest to smallest)
    const differences = [];
    for (let i = 0; i < diffData.length; i += 4) {
      const diffR = diffData[i];
      const diffG = diffData[i + 1];
      const diffB = diffData[i + 2];
      const diffA = diffData[i + 3];
      const diffSize = diffR + diffG + diffB + diffA;

      if (diffSize > 0) {
        differences.push({
          index: i / 4,
          size: diffSize
        });
      }
    }
    differences.sort((a, b) => b.size - a.size);

    // Pack the differences into a new image
    const packedData = new Uint8ClampedArray(width * height * 4);
    const packedCanvas = new OffscreenCanvas(width, height);
    const packedContext = packedCanvas.getContext("2d");

    for (const diff of differences) {
      const x = diff.index % width;
      const y = Math.floor(diff.index / width);
      const diffIndex = diff.index * 4;

      const r = diffData[diffIndex];
      const g = diffData[diffIndex + 1];
      const b = diffData[diffIndex + 2];
      const a = diffData[diffIndex + 3];

      packedData[diffIndex] = r;
      packedData[diffIndex + 1] = g;
      packedData[diffIndex + 2] = b;
      packedData[diffIndex + 3] = a;
    }
    const packedImageData = new ImageData(packedData, width, height);
    // packedContext.putImageData(packedImageData, 0, 0);
    // const packedImageDataCopy = packedContext.getImageData(0, 0, width, height);

    self.postMessage({ packReady: true, packedImageData });
    // self.postMessage({ packReady: true, packedImageData: packedCanvas.transferToImageBitmap() });
  }
};
