import "@webcomponents/custom-elements";
import { children, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { customElement } from "solid-element";
import { parse } from 'tldts';
import JSZip from "jszip";

const TITLE_BAR_HEIGHT = 40;
const MIRROR_FRAME_HEIGHT = 15;

const style = `
  .btm_frame {
    --btm-title-background-color: #333;
    --btm-record-btn-background-color: #f46236;
    --btm-record-btn-hover-background-color: #f15120;
    --btm-record-btn-border-color: #ef5527;
    --btm-stop-btn-background-color: red;
    --btm-stop-btn-hover-background-color: #c90808;
    --btm-btn-color: #fff;
    --btm-mirror-background-color: #333;
    --btm-dimension-background-color: #333;
    --btm-countdown-background-color: #33333352;
    --btm-config-background-color: #333333e3;
  }
  .btm_frame__inner {
    display: flex;
    flex-direction: column;
    position: relative;
    width: 100%;
  }
  .btm_title_bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0 0 ${TITLE_BAR_HEIGHT}px;
    background: var(--btm-title-background-color);
    cursor: move;
  }
  .btm_record-btn, .btm_stop-btn {
    display: flex;
    align-items: center;
    padding: 3px 7px 5px 7px;
    background: var(--btm-record-btn-background-color);
    border-color: var(--btm-record-btn-border-color);
    color: var(--btm-btn-color);
  }
  .btm_record-btn:hover {
    background: var(--btm-record-btn-hover-background-color);
    cursor: pointer;
  }
  .btm_stop-btn {
    background: var(--btm-stop-btn-background-color);
  }
  .btm_stop-btn:hover {
    background: var(--btm-stop-btn-hover-background-color);
    cursor: pointer;
  }
  .btm_record-btn > .btm_icon, .btm_stop-btn > .btm_icon {
    position: relative;
    top: -1px;
    padding-right: 5px;
    font-size: 10px;
  }
  .btm_mirror > .btm_w {
    position: absolute;
    left: -15px;
    top: 0;
    width: 15px;
    height: 440px;
    cursor: w-resize;
  }
  .btm_mirror > .btm_w > div {
    float: right;
    height: 100%;
    width: 5px;
    background: var(--btm-mirror-background-color);
  }
  .btm_mirror > .btm_e {
    position: absolute;
    right: -15px;
    top: 0;
    width: ${MIRROR_FRAME_HEIGHT}px;
    height: 440px;
    cursor: e-resize;
  }
  .btm_mirror > .btm_e > div {
    float: left;
    width: 5px;
    height: 100%;
    background: var(--btm-mirror-background-color);
  }
  .btm_mirror > .btm_s {
    position: absolute;
    bottom: -415px;
    height: ${MIRROR_FRAME_HEIGHT}px;
    width: 100%;
    cursor: s-resize;
  }
  .btm_mirror > .btm_s > div {
    background: var(--btm-mirror-background-color);
    height: 5px;
  }
  .btm_mirror > .btm_n {
    position: absolute;
    top: 0;
    width: 100%;
    height: 5px;
    background: var(--btm-mirror-background-color);
    cursor: n-resize;
  }
  .btm_mirror[data-disabled=true] > * {
    cursor: default !important;
  }
  .btm_mirror > .btm_se {
    position: absolute;
    right: 0;
    bottom: calc(-355px - ${TITLE_BAR_HEIGHT}px);
    width: ${MIRROR_FRAME_HEIGHT}px;
    height: ${MIRROR_FRAME_HEIGHT}px;
    cursor: se-resize;
  }
  .btm_title__timer {
    position: absolute;
    left: 45%;
    color: var(--btm-btn-color);
  }
  .btm_title__text {
    position: absolute;
    left: 45%;
    color: var(--btm-btn-color);
  }
  .btm_title__text::after {
    content: ".";
    opacity: 0;
    animation: animate_dots 1s infinite;
  }
  @keyframes animate_dots {
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
  .btm_countdown {
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: absolute;
    top: ${TITLE_BAR_HEIGHT}px;
    width: 100%;
    height: 355px;
    text-align: center;
    background: var(--btm-countdown-background-color);
    color: var(--btm-btn-color);
    font-size: 50px;
  }
  .btm_countdown > span {
    position: relative;
    top: -30px;
  }
  .btm_title__close-btn, .btm_title__config-btn {
    background: none;
    color: var(--btm-btn-color);
    cursor: pointer;
  }
  .btm_config {
    position: absolute;
    top: ${TITLE_BAR_HEIGHT}px;
    width: 100%;
    height: 400px;
    overflow: auto;
    background: var(--btm-config-background-color);
    color: var(--btm-btn-color);
  }
  .btm_config__row {
    display: flex;
    justify-content: flex-start;
    padding: 15px 10px 5px 10px;
  }
  .btm_config__row--element {
    flex-direction: column;
  }
  .btm_config__row__wrapper > input {
    width: 100px;
  }
  .btm_config__row__label {
    flex-basis: 230px;
  }
  .btm_config__row--element > .btm_config__row__label {
    flex-basis: auto;
    padding-bottom: 10px;
  }
  .btm_config__close-btn {
    position: absolute;
    top: 0;
    right: 7px;
    color: silver;
    cursor: pointer;
  }
  .btm_config__close-btn:hover {
    color: var(--btm-btn-color);
  }
  .btm_dimension {
    position: absolute;
    bottom: 2px;
    padding: 0 5px;
    background: var(--btm-dimension-background-color);
    color: var(--btm-btn-color);
  }
  .btm_config__row__x {
    padding: 0 5px;
  }
  .btm_bottom_bar {
    display: none;
    position: absolute;
    bottom: -445px;
    right: -5px;
    align-items: center;
    justify-content: space-between;
    flex: 0 0 40px;
    height: 40px;
    width: 100%;
    padding: 0 5px;
    background: var(--btm-title-background-color);
    cursor: move;
  }
`;

function Resizer(props) {
  const c = children(() => props.children);
  const { frameRef, onResize, onResizeEnd } = props;
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [dir, setDir] = createSignal('');
  const [startWidth, setStartWidth] = createSignal(0);
  const [startLeft, setStartLeft] = createSignal(0);
  const [resizing, setResizing] = createSignal(false);

  function initResize(e) {
    if (props.disabled) return;
    e.preventDefault();
    setMousePosition({x: e.clientX, y: e.clientY});
    
    setStartWidth(frameRef.offsetWidth);
    setStartLeft(frameRef.getBoundingClientRect().left);
    setResizing(true);
    setDir(e.currentTarget.dataset.dir);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }

  function resize(e) {
    if (!resizing()) return;
    const { x, y } = mousePosition();
    const { clientX, clientY } = e;
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    if (dir() === 'e' || dir() === 'w') {
      onResize(dir(), startWidth(), deltaX, deltaY, startLeft());
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
const MIN_WIDTH = 200;
const MIN_HEIGHT = 45;
const FRAME_HEIGHT = 5;
let zip = new JSZip();

customElement("btm-frame", {}, () => {
  let frame;
  let overlay;
  let dimLabel;
  let n;
  let s;
  let e;
  let w;
  let se;
  let bottomBar;
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [elementOffset, setElementOffset] = createSignal({ x: window.innerWidth/2 - MIN_WIDTH, y: window.innerHeight/2 - MIN_WIDTH });
  const [isMouseDown, setMouseDown] = createSignal(false);
  const [isRecording, setIsRecording] = createSignal(false);
  const [isStarting, setIsStarting] = createSignal(false);
  const [showConfig, toggleConfig] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [showBottomBar, toggleBottomBar] = createSignal(false);
  const [interval, setFrameInterval] = createSignal(DEFAULT_FRAME_INTERVAL);
  const [selectedEl, setSelectedEl] = createSignal("");
  const [dimension, setDimension] = createSignal({width: 400, height: 400 + FRAME_HEIGHT});
  const [time, setTime] = createSignal('00:00');
  const [countDown, setCountDown] = createSignal(3);

  const handleMouseDown = (event) => {
    if (event.target.classList.contains('record-btn') || isRecording()) {
      return;
    }
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
    if (!isMouseDown() || isRecording()) return;

    const { clientX, clientY } = event;
    const { x, y } = mousePosition();
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    setMousePosition({x: clientX, y: clientY});
    setElementOffset({x: (elementOffset().x + deltaX), y: (elementOffset().y + deltaY)});
    if (frame.getBoundingClientRect().top < -25) {
      bottomBar.style.bottom = `${parseInt(getComputedStyle(s).bottom) - (TITLE_BAR_HEIGHT - 3 * FRAME_HEIGHT)}px`;
      toggleBottomBar(true);
    } else {
      toggleBottomBar(false);
    }
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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: {
          displaySurface: 'monitor'
        },
      });

      setIsStarting(true);
      const i = setInterval(() => {
        setCountDown((c) => {
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
    
      let times = [];
      let r = frame.getBoundingClientRect();
      r = {
        top: Math.round(r.top + (screen.height - window.innerHeight)), 
        bottom: r.bottom, 
        // Add 2 pixel offset to get accurate width.
        width: r.width, 
        left: Math.round(r.left), 
        height: s.offsetTop - r.height
      }

      const canvas = document.createElement('canvas');
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
        context.drawImage(videoElement, -r.left, -r.top);
        canvas.toBlob((blob) => {
          zip.file(`${t}.png`, blob);
        })
      }, interval());

      stopCapture = async function() {
        clearInterval(timerId);
        setIsRecording(false);
        cancelTimer();
        context.clearRect(0, 0, canvas.width, canvas.height);
        totalSeconds = 0;
        stream.getTracks().forEach(track => track.stop());
        processScreenshots();
        times = [];
        document.removeEventListener('stop-capture', stopCapture);
      }

      document.addEventListener('stop-capture', stopCapture);

      stream.getVideoTracks()[0].onended = function () {
        stopCapture();
      };
      
      async function processScreenshots() {
        zip.generateAsync({type: 'blob'}).then(async function(content) {
          let link = document.createElement('a')
          link.rel = 'noopener'
          link.href = URL.createObjectURL(content);
          let loc = parse(document.location.href);
          let fileName = `${loc.domainWithoutSuffix || 'images'}_${Date.now()}.zip`;
          link.download = fileName;
          setTimeout(function () { URL.revokeObjectURL(link.href) }, 4E4) // 40s
          setTimeout(function () { link.click() }, 0)
          const messageToBgScript = {
            type: 'process_screenshots',
            payload: {fileName, dimension: dimension() ? {...dimension()}: null}
          };
          chrome.runtime.sendMessage(messageToBgScript, (response) => {
            // Optional: Handle the response from the background script
            console.log('Response from background:', response);
          });
          zip = new JSZip();
        });
      }
    }

    captureElementScreenshots();
  }

  createEffect(() => {
    if (isStarting() && overlay) {
      overlay.style.height = parseInt(w.style.height) - TITLE_BAR_HEIGHT - FRAME_HEIGHT + 'px';
    }
  });

  onMount(() => {
    document.addEventListener('start-capture', startCapture);
  });

  onCleanup(() => {
    document.removeEventListener('start-capture', startCapture);
  });

  const selectElement = (value) => {
    setSelectedEl(value);
    const el = document.querySelector(value);
    const rect = el.getBoundingClientRect();
    setElementOffset({
      x: rect.left - FRAME_HEIGHT,
      y: rect.top - TITLE_BAR_HEIGHT - FRAME_HEIGHT,
    });
    const delta = dimension().height - (rect.height + MIRROR_FRAME_HEIGHT);
    setDimension({width: rect.width + (2 * FRAME_HEIGHT), height: rect.height + MIRROR_FRAME_HEIGHT});
    s.style.bottom = `${parseInt(getComputedStyle(s).bottom) + delta}px`;
    se.style.bottom = `${parseInt(getComputedStyle(se).bottom) + delta}px`;
    if (s.getBoundingClientRect().top > window.innerHeight) {
      s.style.bottom = `${parseInt(getComputedStyle(s).bottom) + FRAME_HEIGHT}px`;
      se.style.bottom = `${parseInt(getComputedStyle(se).bottom) + FRAME_HEIGHT}px`;
      setDimension({width: dimension().width, height: dimension().height - FRAME_HEIGHT});
    } else if (frame.getBoundingClientRect().top < -25) {
      bottomBar.style.bottom = `${parseInt(getComputedStyle(s).bottom) - (TITLE_BAR_HEIGHT - 3 * FRAME_HEIGHT)}px`;
      toggleBottomBar(true);
    }
    toggleConfig(false);
  }

  return (
    <div
      class="btm_frame" 
      ref={frame}
      style={{
        position: 'fixed',
        left: `${elementOffset().x}px`,
        top: `${elementOffset().y}px`,
        width: dimension().width + 'px',
        'min-width': `${MIN_WIDTH}px`,
        'z-index': '2147483647'
      }}
    >
      <style>{style}</style>
      <div class="btm_frame__inner">
        <div class="btm_title_bar" onMouseDown={handleMouseDown}>
          {!isRecording() ? <button class="btm_record-btn" onClick={startCapture}>
            <span class="btm_icon">⬤</span>
            <span>Record</span>
          </button>: null}
          {isRecording() ? <button class="btm_stop-btn" onClick={() => {
            document.dispatchEvent(stopEvent);
          }}>
            <span class="btm_icon">◼</span>
            <span>Stop</span>
          </button>: null}
          {isRecording() ? <span class="btm_title__timer">{time()}</span>: null}
          {isStarting() ? <span class="btm_title__text">Starting</span>: null}
          <div>
            <button class="btm_title__config-btn" disabled={isRecording()} onclick={() => {
              toggleConfig((c) => !c);
            }}>⚙</button>
            <button class="btm_title__close-btn" disabled={isRecording()} onclick={() => {
              document.querySelector('btm-frame').remove();
            }}>✖</button>
          </div>
        </div>
        {isStarting() ? <div class="btm_countdown" ref={overlay}>
          <span>{countDown()}</span>
        </div>: null}
        {showConfig() ? <div class="btm_config" style={{height: dimension().height + 'px'}}>
          <div class="btm_config__row">
              <span class="btm_config__row__label">Frame Interval (ms): </span>
              <span class="btm_config__row__wrapper">
                <input type="text" style="width: 50px;" value={`${interval()}`} onchange={(e) => {
                  let {value} = e.target;
                  let v = parseInt(value);
                  !Number.isNaN(v) && v > 0 && setFrameInterval(v);
                }}/>
              </span>
          </div>
          <div class="btm_config__row">
              <span class="btm_config__row__label">Set window size: </span>
              <span class="btm_config__row__wrapper">
                  <input type="text" style="width: 50px;" value={dimension().width} onchange={(e) => {
                    let {value} = e.target;
                    let v = parseInt(value);
                    !Number.isNaN(v) && v > 0 && setDimension({width: v, height: dimension().height});
                  }}/>
                  <span class="btm_config__row__x">X</span>
                  <input type="text" style="width: 50px;" value={dimension().height - FRAME_HEIGHT} onchange={(e) => {
                     let {value} = e.target;
                     let v = parseInt(value) + FRAME_HEIGHT;
                     const h = dimension().height - v;
                     s.style.bottom = `${parseInt(getComputedStyle(s).bottom) + h}px`;
                     se.style.bottom = `${parseInt(getComputedStyle(se).bottom) + h}px`;
                     !Number.isNaN(v) && v > 0 && setDimension({width: dimension().width, height: v});
                  }}/>
              </span>
          </div>
          <div class="btm_config__row btm_config__row--element">
              <span class="btm_config__row__label">Enter id or class or name of an element to record (and press <b style="font-weight: 600;">Enter</b>): </span>
              <span class="btm_config__row__wrapper">
                <input type="text" style="width: 140px;" value={`${selectedEl()}`} onblur={(e) => {
                  let {value} = e.target;
                  selectElement(value);
                }} placeholder="Starting with # or ." onkeyup={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    'value' in e.target && selectElement(e.target.value);
                  }
                }}/>
              </span>
          </div>
          <span class="btm_config__close-btn" onclick={() => {
            toggleConfig((c) => !c);
          }}>✖</span>
        </div> : null}
        <div class="btm_mirror" data-disabled={isRecording()}>
          <Resizer disabled={isRecording()} frameRef={frame} onResize={(dir, width, deltaX, deltaY, startLeft) => {
            setIsResizing(true);
            if (dir === 'e') {
              const w = width + deltaX;
              if (w < MIN_WIDTH) return;
              setDimension({width: w, height: dimension().height});
            }
            else if (dir === 'w') {
              const w = width - deltaX;
              if (w < MIN_WIDTH) return;
              frame.style.left = `${startLeft + deltaX}px`;
              setDimension({width: w, height: dimension().height});
            }
            else if (dir === 's' || dir === 'se') {
              const h = dimension().height + deltaY;
               if (h < MIN_HEIGHT || width + deltaX < MIN_WIDTH) return;
              s.style.bottom = `${Math.min(parseInt(getComputedStyle(s).bottom) - deltaY, -55)}px`;
              se.style.bottom = `${Math.min(parseInt(getComputedStyle(se).bottom) - deltaY, -40)}px`;
              setDimension({width: dir === 'se' ? width + deltaX: dimension().width, height: h});
            }
            else if (dir === 'n') {
              const h = dimension().height - deltaY;
              if (h < MIN_HEIGHT) return;
              frame.style.top = `${parseInt(getComputedStyle(frame).top) + deltaY}px`;
              setDimension({width: dimension().width, height: h});
              s.style.bottom = `${parseInt(getComputedStyle(s).bottom) + deltaY}px`;
              se.style.bottom = `${parseInt(getComputedStyle(se).bottom) + deltaY}px`;
            }
          }} onResizeEnd={() => {
            setIsResizing(false);
          }}>
            <div class="btm_n" data-dir="n" ref={n}>
              <div></div>
            </div>
            <div class="btm_w" data-dir="w" ref={w} style={{height: dimension().height + TITLE_BAR_HEIGHT + 'px'}}>
              <div></div>
            </div>
            <div class="btm_e" data-dir="e" ref={e} style={{height: dimension().height + TITLE_BAR_HEIGHT + 'px'}}>
              <div></div>
            </div>
            <div class="btm_s" data-dir="s" ref={s}>
              <div></div>
            </div>
            <div class="btm_se" data-dir="se" ref={se}>
              {isResizing() ? <div ref={dimLabel} class="btm_dimension" style={{right: `${(dimension().width - dimLabel.getBoundingClientRect().width) - 5}px`}}>{dimension().width}x{dimension().height - FRAME_HEIGHT}</div>: null}
            </div>
          </Resizer>
        </div>
        <div style={{display: showBottomBar()? 'flex': 'none'}} class="btm_bottom_bar" ref={bottomBar} onMouseDown={handleMouseDown}>
          {!isRecording() ? <button class="btm_record-btn" onClick={startCapture}>
            <span class="btm_icon">⬤</span>
            <span>Record</span>
          </button>: null}
          {isRecording() ? <button class="btm_stop-btn" onClick={() => {
            document.dispatchEvent(stopEvent);
          }}>
            <span class="btm_icon">◼</span>
            <span>Stop</span>
          </button>: null}
          {isRecording() ? <span class="btm_title__timer">{time()}</span>: null}
          {isStarting() ? <span class="btm_title__text">Starting</span>: null}
          <div style="padding-left: 15px;">
            <button class="btm_title__config-btn" disabled={isRecording()} onclick={() => {
              toggleConfig((c) => !c);
            }}>⚙</button>
            <button class="btm_title__close-btn" disabled={isRecording()} onclick={() => {
              document.querySelector('btm-frame').remove();
            }}>✖</button>
          </div>
        </div>
      </div>
    </div>
  );
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

const stopEvent = new CustomEvent("stop-capture");
const startEvent = new CustomEvent("start-capture");

chrome.runtime.onMessage.addListener(async (req) => {
  if (req.message === 'startCapture') {
    document.dispatchEvent(startEvent);
  } else if (req.message === 'stopCapture') {
    document.dispatchEvent(stopEvent);
  } else if (req.message === 'viewFrame') {
    document.body.appendChild(document.createElement('btm-frame'));
  }
});


