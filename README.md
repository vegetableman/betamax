<div align="center">
   <img width="128" src="/src/assets/img/logo.svg" alt="logo"/>
   <h1>Betamax</h1>
   A browser extension for recording and generating animated demo screencasts.
</div>
<br/>

Related blog post: https://vigneshanand.com/recording-and-generating-animated-screencasts-within-the-browser/

This tool is in **Beta** (the chrome extension is in review) and will remain so until notable performance issues are solved. If this tool is used for production or any critical use case, please do so at your own risk.

This project is a fork of [solid-chrome-extension-template](https://github.com/fuyutarow/solid-chrome-extension-template)


## How to use Betamax


## Recording


It's recommended to select `Window` on record for high DPI/Retina displays whereas  `Screen` for others. 

There are two recording modes or implementations currently:

`Image Capture`: This is the default implementation logic being used. It uses the [grabFrame](https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture/grabFrame) method of ImageCapture. On higher DPI displays, this mode affects the frame rate of the page being recorded causing slowdown and color contrast mismatch. However, the images captured are relatively small and consistent in size and allow for faster packing.


`MediaRecorder`: This is the implementation which uses the [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) interface to store the recording buffer as a blob and is faster as it doesn't affect the frame rate of the page being recorded and has accurate representation of color contrast. However, it fails at packing due to bigger capture sizes and duplicate frames in the packed image making it unusable as of now. This is the implementation I am looking forward to fix.


Other settings:

`Frame rate`: &nbsp;Set the frame rate at which the images are captured.

`Window color`: &nbsp;Adjust the color of window. Useful in dark backgrounds.

`Window position`: &nbsp;Set the position of capture window. The position is stored for the duration of the tab.

`Window size`: &nbsp;Set the size of the capture window. The size is stored for the duration of the tab.

`Enter id or class or name of an element to record`: &nbsp;Enter id or class similar to value passed to `querySelector` using `#` or `.` or tag name. For instance, `.sample-container`.

`Video MIME`: &nbsp;Used in conjuction with the option  `MediaRecoder` to set the encoding of the video.

`Bitrate`:&nbsp; Used in conjuction with the option  `MediaRecoder` to set bitrate of the video being recorded.

`Add offset to adjust the captured result`: Ideally, this setting should not be used. For some reason, you end up seeing the borders of the capture window in your images, you could offset it. 


## Generation

The packed image is generated through a derivation of [anim_encoder](https://github.com/sublimehq/anim_encoder) in the file `pyodide.worker.js` executed through pyodide. The end result is a zip file containing the `packed_image.png`, `timeline.json` and `demo.html`. Checkout the example directory in this repo.

Let's talk about the options:

`Resize factor`: &nbsp; Allows resizing the images and the packed image. Useful when a smaller sized demo will do the job. Helps in faster generation.

`Packing Optimization`

There are three options: 

- `High`: Reduces duplicates in the packed image by matching the differing region in the frame with the existing regions in the packed image to generate a compact result. 
- `Medium`: Scales down the packed image and differing region by half for faster comparison but resulting in duplicates relatively more compared to the first option in the packed image.
- `None`: Packs all the differing regions as they appear in the packed image.

`Simplification Tolerance`

This value is used to determine the proximity of two differing regions and whether they should be combined into a single region. This value is highly dependent on the input images and requires playing around. Please note: a higher value then the one set doesn't necessarily guarantee reduction in the packed image size.

`Allocation Size`

The maximum number of rows available (or height) for allocation in the packed image. Update this value if you run in to allocation errors.

## Development

The environment could be set up using [devenv](https://devenv.sh/) by running `devenv shell`

To start the development, following commands are run:

`npm install`

`npm run dev:all`

`Pyodide` and it's packages are loaded through a web worker locally to avoid CSP issues in the extension. So, it's build locally following the steps [here](https://pyodide.org/en/stable/development/building-from-sources.html). I might include it as a submodule as part of the repo. 

## License

The MIT License (MIT)

License for https://github.com/sublimehq/anim_encoder included below:

Copyright (c) 2012, Sublime HQ Pty Ltd
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.