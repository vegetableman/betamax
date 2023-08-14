import "@webcomponents/custom-elements";
import { children, createEffect, createSignal, onCleanup } from "solid-js";
import { customElement } from "solid-element";
import JSZip from "jszip";

const TITLE_BAR_HEIGHT = 40;

const style = `
  .frame {
    display: flex;
    flex-direction: column;
    position: relative;
    width: 100%;
  }
  .title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0 0 ${TITLE_BAR_HEIGHT}px;
    background: #333;
  }
  .record-btn, .stop-btn {
    background: #fd6900;
    display: flex;
    align-items: center;
    padding: 0 10px;
    color: #fff;
    padding: 5px 7px;
  }
  .stop-btn {
    background: red;
  }
  .record-btn:hover {
    cursor: pointer;
    background: #e56104;
  }
  .stop-btn:hover {
    cursor: pointer;
    background: #c90808;
  }
  .record-btn > .icon, .stop-btn > .icon {
    padding-right: 5px;
    font-size: 10px;
    position: relative;
    top: -1px;
  }
  .mirror > .w {
    width: 15px;
    height: 440px;
    position: absolute;
    left: -15px;
    top: 0;
  }
  .mirror > .w > div {
    float: right;
    background: #333;
    height: 100%;
    width: 5px;
  }
  .mirror > .e {
    width: 15px;
    height: 440px;
    position: absolute;
    right: -15px;
    top: 0;
    cursor: e-resize;
  }
  .mirror > .e > div {
    float: left;
    background: #333;
    width: 5px;
    height: 100%;
  }
  .mirror > .s {
    height: 15px;
    width: 100%;
    bottom: -410px;
    position: absolute;
    cursor: s-resize;
  }
  .mirror > .s > div {
    background: #333;
    height: 5px;
  }
  .mirror > .n {
    width: 100%;
    background: #333;
    position: absolute;
    top: 0;
    cursor: n-resize;
    height: 5px;
  }
  .mirror[data-disabled=true] > * {
    cursor: default !important;
  }
  .se {
    position: absolute;
    right: 0;
    bottom: calc(-355px - ${TITLE_BAR_HEIGHT}px);
    width: 15px;
    cursor: se-resize;
    height: 15px;
  }
  .sw {
    position: absolute;
    left: 0;
    bottom: -365px;
    width: 15px;
    cursor: sw-resize;
    height: 15px;
  }
  .nw {
    position: absolute;
    left: 0;
    width: 10px;
    cursor: nw-resize;
    height: 10px;
    top: 0;
  }
  .ne {
    position: absolute;
    right: 0;
    width: 10px;
    cursor: ne-resize;
    height: 10px;
    top: 0;
  }
  .timer {
    color: #fff;
    position: absolute;
    left: 45%;
  }
  .starting {
    color: #fff;
    position: absolute;
    left: 45%;
  }
  .starting::after {
    content: ".";
    opacity: 0;
    animation: animateDots 1s infinite;
  }
  @keyframes animateDots {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 1;
      content: "..";
    }
    100% {
      opacity: 1;
      content: "...";
    }
  }
  .countdown-overlay {
    width: 100%;
    height: 355px;
    position: absolute;
    top: ${TITLE_BAR_HEIGHT}px;
    background: #33333352;
    color: #fff;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-size: 50px;
  }
  .close-btn, .btn {
    background: none;
    color: #fff;
    cursor: pointer;
  }
  .config {
    position: absolute;
    top: ${TITLE_BAR_HEIGHT}px;
    width: 100%;
    height: 400px;
    overflow: auto;
    background: #333333e3;
    color: #fff;
  }
  .config > .row {
    display: flex;
    justify-content: flex-start;
    padding: 15px 5px;
  }

  .config input {
    width: 55px;
  }

  .config .input-wrapper {
    margin-left: 15px;
  }

  .config .input-wrapper .x {
    padding: 0 10px;
  }

  .config .output-row input {
    width: 70px;
  }

  .cfg-close-btn {
    position: absolute;
    top: 0;
    right: 7px;
    color: silver;
    cursor: pointer;
  }

  .cfg-close-btn:hover {
    color: #fff;
  }

  .dim-label {
    position: absolute;
    bottom: 2px;
    padding: 0 5px;
    background: #333;
    color: #fff;
  }
`;

function Resizer(props) {
  const c = children(() => props.children);
  const { frameRef, onResize, onResizeEnd } = props;
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [dir, setDir] = createSignal('');
  const [startWidth, setStartWidth] = createSignal(0);
  const [resizing, setResizing] = createSignal(false);

  function initResize(e) {
    if (props.disabled) return;
    e.preventDefault();
    setMousePosition({x: e.clientX, y: e.clientY});
    
    setStartWidth(frameRef.offsetWidth);
    setResizing(true);
    setDir(e.currentTarget.className);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }

  function resize(e) {
    if (!resizing()) return;
    const { x, y } = mousePosition();
    const { clientX, clientY } = e;
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    if (dir() === 'e') {
      onResize(dir(), startWidth(), deltaX, deltaY);
    }
    else if (dir() === 's' || dir() === 'n') {
      onResize(dir(), startWidth(), deltaX, deltaY);
      setMousePosition({x: clientX, y: clientY});
    }
    else if (dir() === 'se') {
      onResize(dir(), startWidth(), deltaX, deltaY);
      setMousePosition({x: mousePosition().x, y: clientY});
    }
  }

  function stopResize() {
    setResizing(false);
    onResizeEnd();
  }

  c().forEach(el => {
    el.addEventListener('mousedown', initResize);
  });

  return <>{c()}</>
}

const DEFAULT_FRAME_INTERVAL = 16;
const zip = new JSZip();

customElement("my-counter", {}, () => {
  let frame;
  let overlay;
  let dimLabel;
  let n;
  let s;
  let e;
  let w;
  let se;
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [elementOffset, setElementOffset] = createSignal({ x: window.innerWidth/2 - 200, y: window.innerHeight/2 - 200 });
  const [isMouseDown, setMouseDown] = createSignal(false);
  const [isRecording, setIsRecording] = createSignal(false);
  const [isStarting, setIsStarting] = createSignal(false);
  const [showConfig, toggleConfig] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [interval, setFrameInterval] = createSignal(DEFAULT_FRAME_INTERVAL);
  const [dimension, setDimension] = createSignal({width: 400, height: 400, _set: false});
  const [time, setTime] = createSignal('00:00');
  const [countDown, setCountDown] = createSignal(3);

  const handleMouseDown = (event) => {
    const { clientX, clientY } = event;
    setMousePosition({x: clientX, y: clientY});
    const rect = frame.getBoundingClientRect()
    setElementOffset({
      x: rect.left,
      y: rect.top,
    });
    setMouseDown(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.documentElement.style.userSelect = 'none';
    document.documentElement.style.cursor = 'move';
  };

  const handleMouseMove = (event) => {
    if (!isMouseDown()) return;

    const { clientX, clientY } = event;
    const { x, y } = mousePosition();
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    setMousePosition({x: clientX, y: clientY});
    setElementOffset({x: (elementOffset().x + deltaX), y: (elementOffset().y + deltaY)})
  };

  const handleMouseUp = () => {
    if (!isMouseDown()) return;

    setMouseDown(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.documentElement.style.userSelect = 'auto';
    document.documentElement.style.cursor = 'auto';
  };

  onCleanup(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  });
  

  let stopCapture;
  
  function formatTime(time) {
    return time < 10 ? `0${time}` : time.toString();
  }

  let totalSeconds = 0;
  function updateTimer() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = formatTime(minutes);
    const formattedSeconds = formatTime(seconds);
    totalSeconds++;
    return`${formattedMinutes}:${formattedSeconds}`;
  }

  function startCapture() {
    setTime('00:00');
    setCountDown(3);

    async function captureElementScreenshots() {
      // Request screen capture permission
      const width = screen.width * (window.devicePixelRatio || 1)
		  const height = screen.height * (window.devicePixelRatio || 1)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: true,
        preferCurrentTab: true
      });

      setIsStarting(true);
      const i = setInterval(() => {
        setCountDown((c) => {
          console.log('c:', c);
          return Math.max(c - 1, 1);
        });
      }, 1000);
      await delay(3000);
      clearInterval(i);
      setIsStarting(false);

      await delay(100);

      // Create a video element and set the stream as the source
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.play();
      setIsRecording(true);

      const timerId = setInterval(() => {
        setTime(updateTimer());
      }, 1000);
    
      // Wait for the video to load metadata
      await new Promise(resolve => {
        videoElement.onloadedmetadata = resolve;
      });
    
      let screenshots = [];
      let times = [];
      let r = frame.getBoundingClientRect();
      r = {
        top: Math.round(r.top + r.height + 1), 
        bottom: r.bottom, 
        width: r.width, 
        left: Math.round(r.left), 
        height: s.offsetTop - r.height - 1
      }

      const canvas = document.createElement('canvas');
      // const scaleFactor = Math.max(rect.width / window.innerWidth, rect.height / window.innerHeight);

      // canvas.width = rect.width * scaleFactor;
      // canvas.height = rect.height * scaleFactor;

      canvas.width = r.width;
      canvas.height = r.height;

      const context = canvas.getContext('2d');

      let isStarted = false;

      const cancelTimer = intervalTimer(() => {
        let t = Math.round(videoElement.currentTime * 1000);
        times.push(t);
        if (!isStarted) {
          isStarted = true;
          setTime(updateTimer());
        }
        // rect.left, rect.top + (rect.bottom - rect.top) + 1, rect.width, rect.height, 0, 0, rect.width, rect.height
        // Draw the current video frame onto the canvas, capturing only the element's portion
        // context.drawImage(videoElement, r.left, r.top, r.width, r.height, 0, 0, canvas.width, canvas.height);
        // context.drawImage(videoElement, rect.left, rect.top);
        context.drawImage(videoElement, -r.left, -r.top);
        // context.drawImage(videoElement, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
        // context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        // Convert the canvas image to a data URL
        // const dataURL = await cropImage(canvas.toDataURL('image/png'), 0, 0, 400, 400);
        // screenshots.push(canvas.toDataURL('image/png'));
        // screenshots.push();
        canvas.toBlob((blob) => {
          zip.file(`${t}.png`, blob);
        })
      }, interval);

      stopCapture = async function() {
        clearInterval(timerId);
        setIsRecording(false);
        cancelTimer();
        stream.getTracks().forEach(track => track.stop());
        console.log('screenshots:', screenshots);
        processScreenshots();
        screenshots = [];
        times = [];
      }

      stream.getVideoTracks()[0].onended = function () {
        stopCapture();
      };

      document.addEventListener('stop-capture', function(e) {
        stopCapture();
      });
      
      async function processScreenshots() {

        zip.generateAsync({type:"blob"}).then(async function(content) {
          // let link = document.createElement('a')
          // link.rel = 'noopener'
          // link.href = URL.createObjectURL(content) // DOES NOT WORK
          // link.download = 'images.zip'
          // setTimeout(function () { URL.revokeObjectURL(link.href) }, 4E4) // 40s
          // setTimeout(function () { link.click() }, 0)
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: "images.zip",
              types: [
                {
                  description: 'ZIP Files',
                  accept: {
                    'application/zip': ['.zip'],
                  },
                },
              ],
            });
        
            const writableStream = await handle.createWritable();
            await writableStream.write(content);
            await writableStream.close();

            const messageToBgScript = {
              type: 'process_screenshots',
              payload: {dimension: dimension()._set ? {...dimension()}: null}
            };
    
            chrome.runtime.sendMessage(messageToBgScript, (response) => {
              // Optional: Handle the response from the background script
              console.log('Response from background:', response);
            });
        
            console.log('File saved successfully using FileSavePicker.', handle);
          } catch (error) {
            console.error('An error occurred:', error);
          }
        });
      }
    }

    captureElementScreenshots();
  }

  createEffect(() => {
    if (isStarting() && overlay) {
      console.log('isStarting():', isStarting());
      overlay.style.height = parseInt(w.style.height) - TITLE_BAR_HEIGHT + 'px';
    }
  })

  return (
    <div ref={frame}
      style={{
        position: 'fixed',
        width: dimension().width + 'px',
        "min-width": '200px',
        left: `${elementOffset().x}px`,
        top: `${elementOffset().y}px`,
        "z-index": "2147483647"
      }}
    >
      <style>{style}</style>
      <div class="frame">
        <div class="title-bar"  onMouseDown={handleMouseDown}>
          {!isRecording() ? <button class="record-btn" onClick={startCapture}>
            <span class="icon">⬤</span>
            <span>Record</span>
          </button>: null}
          {isRecording() ? <button class="stop-btn" onClick={() => {
            document.dispatchEvent(stopEvent);
          }}>
            <span class="icon">◼</span>
            <span>Stop</span>
          </button>: null}
          {isRecording() ? <span class="timer">{time()}</span>: null}
          {isStarting() ? <span class="starting">Starting</span>: null}
          <div>
            <button class="btn" disabled={isRecording()} onclick={() => {
              toggleConfig((c) => !c);
            }}>⚙</button>
            <button class="close-btn" disabled={isRecording()} onclick={() => {
              document.querySelector('my-counter').remove();
            }}>✖</button>
          </div>
        </div>
        {isStarting() ? <div class="countdown-overlay" ref={overlay}>{countDown()}</div>: null}
        {showConfig() ? <div class="config" style={{height: dimension().height + 'px'}}>
          <div class="row">
              <span>Frame Interval (ms): </span>
              <span class="input-wrapper">
                <input type="text" value={`${interval()}`} onchange={(e) => {
                  let {value} = e.target;
                  let v = parseInt(value);
                  !Number.isNaN(v) && v > 0 && setFrameInterval(v);
                }}/>
              </span>
          </div>
          <div class="row output-row">
              <span>Output Dimensions (px): </span>
              <span class="input-wrapper">
                <input type="text" value={dimension().width} onchange={(e) => {
                   let {value} = e.target;
                   let v = parseInt(value);
                   !Number.isNaN(v) && v > 0 && setDimension({width: v, height: dimension().height, _set: true});
                }}/>
                <span class="x">X</span>
                <input type="text" value={dimension().height} onchange={(e) => {
                  let {value} = e.target;
                  let v = parseInt(value);
                  !Number.isNaN(v) && v > 0 && setDimension({width: dimension().width, height: v, _set: true});
                }}/>
              </span>
          </div>
          <span class="cfg-close-btn" onclick={() => {
            toggleConfig((c) => !c);
          }}>✖</span>
        </div> : null}
        <div class="mirror" data-disabled={isRecording()}>
          <Resizer disabled={isRecording()} frameRef={frame} onResize={(dir, width, deltaX, deltaY) => {
            setIsResizing(true);
            if (dir === 'e') {
              const w = width + deltaX;
              if (w < 200) return;
              setDimension({width: w, height: dimension().height, _set: false});
            }
            else if (dir === 's' || dir === 'se') {
              const h = dimension().height + deltaY;
               if (h < 45 || width + deltaX < 200) return;
              s.style.bottom = `${Math.min(parseInt(getComputedStyle(s).bottom) - deltaY, -55)}px`;
              se.style.bottom = `${Math.min(parseInt(getComputedStyle(se).bottom) - deltaY, -40)}px`;
              setDimension({width: dir === 'se' ? width + deltaX: dimension().width, height: h, _set: false});
            }
            else if (dir === 'n') {
              const h = dimension().height - deltaY;
              if (h < 45) return;
              console.log('h', h, parseInt(getComputedStyle(frame).top) + deltaY, deltaY)
              frame.style.top = `${parseInt(getComputedStyle(frame).top) + deltaY}px`;
              setDimension({width: dimension().width, height: h, _set: false});
              s.style.bottom = `${parseInt(getComputedStyle(s).bottom) + deltaY}px`;
              se.style.bottom = `${parseInt(getComputedStyle(se).bottom) + deltaY}px`;
            }
          }} onResizeEnd={() => {
            setIsResizing(false);
          }}>
            <div class="n" ref={n}>
              <div></div>
            </div>
            <div class="w" ref={w} style={{height: dimension().height + TITLE_BAR_HEIGHT + 'px'}}>
              <div></div>
            </div>
            <div class="e" ref={e} style={{height: dimension().height + TITLE_BAR_HEIGHT + 'px'}}>
              <div></div>
            </div>
            <div class="s" ref={s}>
              <div></div>
            </div>
            <div class="se" ref={se}>
              {isResizing() ? <div ref={dimLabel} class="dim-label" style={{right: `${(dimension().width - dimLabel.getBoundingClientRect().width) - 5}px`}}>{dimension().width}x{dimension().height}</div>: null}
            </div>
          </Resizer>
        </div>
      </div>
    </div>
  );
});

const stopEvent = new CustomEvent("stop-capture");

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


chrome.runtime.onMessage.addListener(async (req, sender, res) => {
  if (req.message === 'init') {
    console.log('init');
  }
  else if (req.message === 'cv_loaded') {
    console.log('cv loaded');
  }
  else if (req.message === 'processingComplete') {
    console.log('processingComplete');
  }
  else if (req.message === 'stopCapture') {
    document.dispatchEvent(stopEvent);
  }
  else if (req.message === 'viewFrame') {
    document.body.appendChild(document.createElement('my-counter'));
  }
});


