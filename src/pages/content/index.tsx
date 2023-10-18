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
    --btm-stop-btn-hover-background-color: #ed1212;
    --btm-btn-color: #fff;
    --btm-mirror-background-color: #333;
    --btm-dimension-background-color: #333;
    --btm-countdown-background-color: #33333352;
    --btm-config-background-color: #333333e3;
  }
  .btm_frame {
    font-family: "BTM__Inter", Arial, Helvetica, sans-serif;
    font-size: 13px;
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
    padding: 2px 8px 4px 8px;
    min-height: 20px;
    background: var(--btm-record-btn-background-color);
    color: var(--btm-btn-color);
    box-sizing: content-box;
    border-width: 2px;
    border-color: var(--btm-record-btn-border-color);
    border-style: outset;
    z-index: 2;
  }
  .btm_record-btn:hover {
    background: var(--btm-record-btn-hover-background-color);
    cursor: pointer;
  }
  .btm_stop-btn {
    background: var(--btm-stop-btn-background-color);
    min-width: 45px;
  }
  .btm_stop-btn:hover {
    background: var(--btm-stop-btn-hover-background-color);
    cursor: pointer;
  }
  .btm_record__text {
    padding-left: 5px;
    font-family: 'BTM__Inter';
    font-weight: 500;
    font-size: 13px;
  }
  .btm_stop-btn .btm_record__text {
    font-weight: 600;
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
    z-index: 2;
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
    right: -15px;
    bottom: calc(-355px - ${TITLE_BAR_HEIGHT + 10}px);
    width: ${MIRROR_FRAME_HEIGHT + 10}px;
    height: ${MIRROR_FRAME_HEIGHT + 10}px;
    cursor: se-resize;
    z-index: 2;
  }
  .btm_mirror > .btm_sw {
    position: absolute;
    left: -15px;
    bottom: calc(-355px - ${TITLE_BAR_HEIGHT + 10}px);
    width: ${MIRROR_FRAME_HEIGHT + 10}px;
    height: ${MIRROR_FRAME_HEIGHT + 10}px;
    cursor: sw-resize;
    z-index: 2;
  }
  .btm_mirror > .btm_ne {
    position: absolute;
    right: -${MIRROR_FRAME_HEIGHT}px;
    top: 0;
    width: ${MIRROR_FRAME_HEIGHT + 10}px;
    height: ${MIRROR_FRAME_HEIGHT}px;
    cursor: ne-resize;
    z-index: 1;
  }
  .btm_mirror > .btm_nw {
    position: absolute;
    left: -${MIRROR_FRAME_HEIGHT}px;
    top: 0;
    width: ${MIRROR_FRAME_HEIGHT + 10}px;
    height: ${MIRROR_FRAME_HEIGHT + 10}px;
    cursor: nw-resize;
    z-index: 1;
  }
  .btm_title__timer-wrapper {
    display: flex;
    align-items: center;
    margin-left: -15px;
  }
  .btm_title__timer {
    font-size: 13px;
    color: var(--btm-btn-color);
    min-width: 40px;
  }
  .btm_title__text {
    position: absolute;
    left: 45%;
    font-size: 13px;
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
  .btm_title__close-btn, .btm_title__config-btn, .btm_title__cancel-btn {
    background: none;
    color: var(--btm-btn-color);
    cursor: pointer;
  }
  .btm_title__cancel-btn {
    position: relative;
    left: -5px;
    color: red;
  }
  .btm_config {
    position: absolute;
    top: ${TITLE_BAR_HEIGHT}px;
    width: 100%;
    padding-top: 10px;
    height: 400px;
    overflow: auto;
    background: var(--btm-config-background-color);
    color: var(--btm-btn-color);
    box-sizing: border-box;
  }
  .btm_config__row {
    display: flex;
    justify-content: flex-start;
    padding: 15px 10px 5px 10px;
  }
  .btm_config__row--element {
    flex-direction: column;
  }
  .btm_config__row__wrapper > input[type="text"], 
  .btm_config__row__wrapper > select {
    width: 100px;
    padding: 3px;
    font-size: 13px;
    background: #3b3b3b;
    border: 1px solid #858585;
    color: #ffffff;
  }
  .btm_config__row__label {
    flex-basis: 230px;
    font-size: 13px;
  }
  .btm_config__row__value {
    padding-left: 2px; 
    padding-top: 1px;
  }
  .btm_config__row--element > .btm_config__row__label {
    flex-basis: auto;
    padding-bottom: 10px;
  }
  .btm_config__close-btn {
    position: absolute;
    top: 5px;
    right: 7px;
    font-size: 13px;
    color: silver;
    cursor: pointer;
  }
  .btm_config__close-btn:hover {
    color: var(--btm-btn-color);
  }
  .btm_dimension {
    position: absolute;
    bottom: 10px;
    left: 20px;
    padding: 0 5px;
    background: var(--btm-dimension-background-color);
    color: var(--btm-btn-color);
  }
  .btm_config__row__x {
    padding: 0 5px;
    font-size: 13px;
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
  .btm_config__row--mode {
    display: flex;
    align-items: center;
  }
  .btm_config__mode-input {
    margin: 0;
    cursor: pointer;
  }
  .btm_config__mode-label {
    padding-left: 5px;
    cursor: pointer;
  }
  .btm_config__mode-label--auto {
    padding-right: 10px;
  }
  .btm_config__interval-input {
    width: 50px;
  }
  .btm_config__interval-input:disabled {
    opacity: 0.5;
  }
`;

function Resizer(props) {
  const c = children(() => props.children);
  const { frameRef, onResize, onResizeEnd } = props;
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [dir, setDir] = createSignal('');
  const [startWidth, setStartWidth] = createSignal(0);
  const [startLeft, setStartLeft] = createSignal(0);
  const [isResizing, setResizing] = createSignal(false);

  function initResize(e) {
    if (props.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setMousePosition({x: e.clientX, y: e.clientY});
    
    setStartWidth(frameRef.offsetWidth);
    setStartLeft(frameRef.getBoundingClientRect().left);
    setResizing(true);
    setDir(e.currentTarget.dataset.dir);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }

  function resize(e) {
    if (!isResizing()) return;
    const { x, y } = mousePosition();
    const { clientX, clientY } = e;
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    if (dir() === 'e' || dir() === 'w') {
      onResize(dir(), startWidth(), deltaX, deltaY, startLeft());
    } else if (dir() === 's' || dir() === 'n') {
      onResize(dir(), startWidth(), deltaX, deltaY);
      setMousePosition({x: clientX, y: clientY});
    } else if (dir() === 'se' || dir() === 'sw' || dir() === 'ne' || dir() === 'nw') {
      onResize(dir(), startWidth(), deltaX, deltaY, startLeft());
      setMousePosition({x: mousePosition().x, y: clientY});
    }
  }

  function stopResize() {
    setResizing(false);
    onResizeEnd();
  }

  [].slice.call(c()).forEach(el => {
    el.addEventListener('mousedown', initResize);
  });

  return <>{c()}</>
}

const DEFAULT_FRAME_INTERVAL = 16;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 45;
const FRAME_SIZE = 5;
const __BTM_FRAME_INTERVAL_KEY = '__btm_frame_interval';
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
  let sw;
  let ne;
  let nw;
  let bottomTitleBar;
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [windowWidth, setWindowWidth] = createSignal(window.innerWidth);
  const [windowHeight, setWindowHeight] = createSignal(window.innerHeight);
  const [elementOffset, setElementOffset] = createSignal({ x: window.innerWidth/2 - MIN_WIDTH, y: window.innerHeight/2 - MIN_WIDTH });
  const [isMouseDown, setMouseDown] = createSignal(false);
  const [isRecording, setIsRecording] = createSignal(false);
  const [isStarting, setIsStarting] = createSignal(false);
  const [showConfig, toggleConfig] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [showBottomTitleBar, toggleBottomTitleBar] = createSignal(false);
  const [frameCaptureMode, setFrameCaptureMode] = createSignal("auto");
  const [frameInterval, setFrameInterval] = createSignal(DEFAULT_FRAME_INTERVAL);
  const [selectedEl, setSelectedEl] = createSignal("");
  const [dimension, setDimension] = createSignal({width: 400, height: 400 + FRAME_SIZE});
  const [time, setTime] = createSignal('00:00');
  const [countDown, setCountDown] = createSignal(3);
  const [imageFormat, _setImageFormat] = createSignal("png");
  const [isCancelled, setIsCancelled] = createSignal(false);

  const handleMouseDown = (event) => {
    if (isRecording() || isResizing()) {
      return;
    }
    const { clientX, clientY } = event;
    setMouseDown(true);
    setMousePosition({x: clientX, y: clientY});
    const rect = frame.getBoundingClientRect();
    setElementOffset({
      x: rect.left,
      y: rect.top,
    });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.documentElement.style.userSelect = 'none';
    document.documentElement.style.cursor = 'move';
  };

  const handleMouseMove = (event) => {
    if (!isMouseDown() || isRecording() || isResizing()) return;

    const { clientX, clientY } = event;
    const { x, y } = mousePosition();
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    setMousePosition({x: clientX, y: clientY});
    setElementOffset({x: (elementOffset().x + deltaX), y: (elementOffset().y + deltaY)});
    if (frame.getBoundingClientRect().top < -25) {
      bottomTitleBar.style.bottom = -dimension().height - TITLE_BAR_HEIGHT + FRAME_SIZE + 'px';
      toggleBottomTitleBar(true);
      setBottomFramePosition(dimension().height, TITLE_BAR_HEIGHT);
    } else if(showBottomTitleBar()) {
      toggleBottomTitleBar(false);
      setBottomFramePosition(dimension().height);
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
  function updateDisplayTime() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = formatTime(minutes);
    const formattedSeconds = formatTime(seconds);
    totalSeconds++;
    return`${formattedMinutes}:${formattedSeconds}`;
  }

  function toggleCapture() {
    if (isRecording()) {
      stopCapture();
    } else {
      startCapture();
    }
  }

  function startCapture() {
    setTime('00:00');
    setCountDown(3);

    async function captureElementScreenshots() {
      let stream;
      // Request screen capture permission
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          audio: false,
          video: {
            displaySurface: 'monitor'
          },
        });
      }
      catch {
        return;
      }

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
        setTime(updateDisplayTime());
      }, 1000);
    
      // Wait for the video to load metadata
      await new Promise(resolve => {
        videoElement.onloadedmetadata = resolve;
      });
    
      let times = [];
      let r = frame.getBoundingClientRect();
      // substract the offset of 2 pixels
      const dw = screen.width - (window.innerWidth * window.devicePixelRatio) - 2;
      const dt = screen.height - (window.innerHeight * window.devicePixelRatio);
      r = {
        top: (r.bottom * window.devicePixelRatio) - (TITLE_BAR_HEIGHT + FRAME_SIZE * window.devicePixelRatio) + dt,//TITLE_BAR_HEIGHT + dt, //(Math.round(r.top) * window.devicePixelRatio) + dt,
        width: window.devicePixelRatio * dimension().width + FRAME_SIZE, 
        left: (window.devicePixelRatio * Math.round(r.left)) + dw,
        height: window.devicePixelRatio * dimension().height
      };

      const canvas = document.createElement('canvas');
      canvas.width =  r.width;
      canvas.height =  r.height;
      const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });

      let completions = 0;
      function postCapture() {
        if (completions === times.length && !isRecording() && !isCancelled()) {
          processScreenshots();
          times = [];
          completions = 0;
        } else if (isCancelled()) {
          times = [];
          completions = 0;
          setIsStarting(false);
          setIsCancelled(false);
          zip = new JSZip();
        }
      }

      let isStarted = false;
      let paintCount = 0;
      let startTime = 0.0;
      const processCapture = (now, metadata) => {
        if (!isRecording()) {
          return;
        }
        now = now || performance.now().toFixed(3);
        if (startTime === 0.0) {
          startTime = now;
        }
        const time = metadata ? metadata.mediaTime : videoElement.currentTime;
        let t = Math.round((time - 2) * 1000);
        times.push(t);
        if (!isStarted) {
          isStarted = true;
          setTime(updateDisplayTime());
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(videoElement, -r.left, -r.top);

        const elapsed = (now - startTime) / 1000.0;
        const fps = (++paintCount / elapsed).toFixed(3);
        console.log('fps:', fps);

        canvas.toBlob((blob) => {
          completions++;
          zip.file(`${t}.${imageFormat()}`, blob);
          postCapture();
        }, `image/${imageFormat()}`);

        if (frameCaptureMode() === 'auto') {
          videoElement.requestVideoFrameCallback(processCapture);
        }
      }
      
      let cancelTimer;
      if (frameCaptureMode() === 'manual') {
        cancelTimer = intervalTimer(processCapture, frameInterval());
      } else {
        videoElement.requestVideoFrameCallback(processCapture);
      }

      stopCapture = async function() {
        clearInterval(timerId);
        setIsRecording(false);
        cancelTimer?.();
        totalSeconds = 0;
        stream.getTracks().forEach(track => track.stop());
        postCapture();
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
          let fileName = `betamax_${loc.domainWithoutSuffix}_${new Date().toLocaleString('sv-SE', { hour12: false}).replaceAll(/\-|:/g, '').replace(' ', '_')}.zip`;
          link.download = fileName;
          setTimeout(function () { URL.revokeObjectURL(link.href) }, 4E4); // 40s
          setTimeout(function () { link.click() }, 0);
          const messageToBgScript = {
            type: 'process_screenshots',
            payload: {fileName, format: imageFormat(), dimension: dimension() ? {...dimension()}: null}
          };
          chrome.runtime.sendMessage(messageToBgScript, (response) => {
            // Optional: Handle the response from the background script
            console.log('Response from background:', response);
          });
          zip = new JSZip();
        });
      }
    };

    captureElementScreenshots();
  }

  function cancelCapture() {
    setIsCancelled(true);
    document.dispatchEvent(stopEvent);
  }

  createEffect(() => {
    if (isStarting() && overlay) {
      overlay.style.height = parseInt(w.style.height) - TITLE_BAR_HEIGHT - FRAME_SIZE + 'px';
    }
  });

  function onResize() {
    const { innerWidth, innerHeight} = window;
    const deltaX = innerWidth - windowWidth();
    const deltaY = innerHeight - windowHeight();
    setElementOffset({x: elementOffset().x + deltaX, y: elementOffset().y + deltaY});
    setWindowWidth(innerWidth);
    setWindowHeight(innerHeight);
  }

  onMount(async () => {
    document.addEventListener('toggle-capture', toggleCapture);
    document.addEventListener('cancel-capture', cancelCapture);
    window.addEventListener('resize', onResize);
    const data = await chrome.storage.sync.get(__BTM_FRAME_INTERVAL_KEY);
    if (data && data[__BTM_FRAME_INTERVAL_KEY]) {
      setFrameInterval(data[__BTM_FRAME_INTERVAL_KEY]);
    }
  });

  onCleanup(() => {
    document.removeEventListener('toggle-capture', toggleCapture);
    document.removeEventListener('cancel-capture', cancelCapture);
    window.removeEventListener('resize', onResize);
  });

  const selectElement = (value) => {
    if (!value) {
      return;
    }
    
    setSelectedEl(value);
    const el = document.querySelector(value);
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const selectionOffset = 5;
    setElementOffset({
      x: rect.left - selectionOffset,
      y: rect.top - TITLE_BAR_HEIGHT - selectionOffset,
    });
    const h = rect.height + MIRROR_FRAME_HEIGHT;
    setDimension({width: rect.width + (2 * selectionOffset), height: h});
    setBottomFramePosition(h);
    if (frame.getBoundingClientRect().top < -25) {
      bottomTitleBar.style.bottom =  -dimension().height -  TITLE_BAR_HEIGHT + 'px';
      toggleBottomTitleBar(true);
    }
    toggleConfig(false);
  }

  function setBottomFramePosition(h: number, frameHeight = 0) {
    se.style.bottom = -h - frameHeight + 'px';
    sw.style.bottom = -h - frameHeight + 'px';
    s.style.bottom = -h - (frameHeight ? frameHeight : MIRROR_FRAME_HEIGHT) + FRAME_SIZE + 'px';
  }

  const controls = () => { 
    return (<> 
      {!isRecording() ? 
        <button title="Record (Alt + Shift + R)" class="btm_record-btn" onClick={(e) => {
          e.preventDefault();
          startCapture();
        }} onMouseDown={(e) => e.stopPropagation()}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-circle"><circle cx="12" cy="12" r="10"></circle></svg>
        <span class="btm_record__text">Record</span>
      </button>: null}
      {isRecording() ? <button title="Stop (Alt + Shift + R)" class="btm_stop-btn" onClick={() => {
        document.dispatchEvent(stopEvent);
      }} onMouseDown={(e) => e.stopPropagation()}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-square"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
        <span class="btm_record__text">Stop</span>
      </button>: null}
      {isRecording() ?
        <span class="btm_title__timer-wrapper">
          <button title="Cancel (Alt + Shift + C)" class="btm_title__cancel-btn"  onclick={cancelCapture} onMouseDown={(e) => e.stopPropagation()}>✖</button>
          <span class="btm_title__timer">
            {time()}
          </span>
        </span>: 
      null}
      {isStarting() ? <span class="btm_title__text">Starting</span>: null}
      <div style="z-index: 2;">
        <button title="Settings" class="btm_title__config-btn" disabled={isRecording()} onclick={() => {
          toggleConfig((c) => !c);
        }} onMouseDown={(e) => e.stopPropagation()}>⚙</button>
        <button title="Close" class="btm_title__close-btn" disabled={isRecording()} onclick={() => {
          document.querySelector('btm-frame').remove();
        }} onMouseDown={(e) => e.stopPropagation()}>✖</button>
      </div>
  </>);
  };

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
          {controls()}
        </div>
        {isStarting() ? <div class="btm_countdown" ref={overlay}>
          <span>{countDown()}</span>
        </div>: null}
        {showConfig() ? <div class="btm_config" style={{height: dimension().height + 'px'}}>
          <div class="btm_config__row">
              <span class="btm_config__row__label">Frame capture mode: </span>
              <div class="btm_config__row__wrapper btm_config__row--mode">
                <input class="btm_config__mode-input" onchange={() => {
                  setFrameCaptureMode('auto');
                }}  type="radio" id="auto" name="mode" value="auto" checked={frameCaptureMode() === 'auto'}/>
                <label class="btm_config__mode-label btm_config__mode-label--auto" for="auto">Auto</label>

                <input class="btm_config__mode-input" onchange={() => {
                  setFrameCaptureMode('manual');
                }} type="radio" id="manual" name="mode" value="manual" checked={frameCaptureMode() === 'manual'}/>
                <label class="btm_config__mode-label" for="manual">Manual</label>
              </div>
          </div>
          <div class="btm_config__row">
              <span class="btm_config__row__label">Frame interval (ms): </span>
              <span class="btm_config__row__wrapper">
                <input class="btm_config__interval-input" disabled={frameCaptureMode() === 'auto'} type="text" style="width: 50px;" value={`${frameInterval()}`} onchange={(e) => {
                  let {value} = e.target;
                  let v = parseInt(value);
                  !Number.isNaN(v) && v > 0 && setFrameInterval(v);
                  chrome.storage.sync.set({[__BTM_FRAME_INTERVAL_KEY]: v});
                }}/>
              </span>
          </div>
          <div class="btm_config__row">
              <span class="btm_config__row__label">Frame size: </span>
              <span class="btm_config__row__wrapper">
                  <input type="text" style="width: 50px;" value={dimension().width} onchange={(e) => {
                    let {value} = e.target;
                    let v = parseInt(value);
                    !Number.isNaN(v) && v > 0 && setDimension({width: v, height: dimension().height});
                  }}/>
                  <span class="btm_config__row__x">X</span>
                  <input type="text" style="width: 50px;" value={dimension().height - FRAME_SIZE} onchange={(e) => {
                     let {value} = e.target;
                     let v = parseInt(value) + FRAME_SIZE;
                     const h = dimension().height - v;
                     setBottomFramePosition(h);
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
          <span title="Close" class="btm_config__close-btn" onclick={() => {
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
            } else if (dir === 'w' || dir === 'sw') {
              const w = width - deltaX;
              if (w < MIN_WIDTH) {
                return;
              }
              setElementOffset({x: startLeft + deltaX, y: elementOffset().y});
              setDimension({width: w, height: dimension().height});
              if (dir === 'sw') {
                const h = dimension().height + deltaY;
                setDimension({width: dir === 'se' ? width + deltaX: dimension().width, height: h});
                if (showBottomTitleBar()) {
                  bottomTitleBar.style.bottom = -dimension().height -  TITLE_BAR_HEIGHT + 'px';
                  setBottomFramePosition(h, TITLE_BAR_HEIGHT + 10);
                } else {
                  setBottomFramePosition(h);
                }
              }
            } else if (dir === 's' || dir === 'se') {
              const h = dimension().height + deltaY;
              if (h < MIN_HEIGHT || ( dir === 'se' && width + deltaX < MIN_WIDTH)) {
                return;
              }
              setDimension({width: dir === 'se' ? width + deltaX: dimension().width, height: h});
              if (showBottomTitleBar()) {
                bottomTitleBar.style.bottom = -dimension().height -  TITLE_BAR_HEIGHT + 'px';
                setBottomFramePosition(h, TITLE_BAR_HEIGHT + 10);
              } else {
                setBottomFramePosition(h);
              }
            } else if (dir === 'n' || dir === 'ne' ||  dir === 'nw') {
              const h = dimension().height - deltaY;
              if (h < MIN_HEIGHT) return;
              if (dir === 'ne' || dir === 'nw') {
                const w = dir === 'ne' ? width + deltaX: width - deltaX;
                if (w < MIN_WIDTH) return;
                if (dir === 'nw') {
                  setElementOffset({y: elementOffset().y, x: startLeft + deltaX});
                }
                setElementOffset({y: elementOffset().y + deltaY, x: elementOffset().x});
                setDimension({width: w, height: h});
              } else {
                setElementOffset({y: elementOffset().y + deltaY, x: elementOffset().x});
                setDimension({width: dimension().width, height: h});
              }
              setBottomFramePosition(h);
            }
          }} onResizeEnd={() => {
            setIsResizing(false);
          }}>
            <div class="btm_n" data-dir="n" ref={n}>
              <div></div>
            </div>
            <div class="btm_ne" data-dir="ne" ref={ne}></div>
            <div class="btm_nw" data-dir="nw" ref={nw}></div>
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
            </div>
            <div class="btm_sw" data-dir="sw" ref={sw}>
              {isResizing() ? <div style={{position: "relative", width: "100%", height: "100%"}}>
                <div ref={dimLabel} style={{bottom: showBottomTitleBar() ? `${TITLE_BAR_HEIGHT + 15}px`: '10px'}} class="btm_dimension">{dimension().width}x{dimension().height - FRAME_SIZE}</div>
              </div>: null}
            </div>
          </Resizer>
        </div>
        <div style={{display: showBottomTitleBar()? 'flex': 'none'}} class="btm_bottom_bar" ref={bottomTitleBar} onMouseDown={handleMouseDown}>
          {controls()}
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
const toggleCaptureEvent = new CustomEvent("toggle-capture");
const cancelEvent = new CustomEvent("cancel-capture");

chrome.runtime.onMessage.addListener(async (req) => {
  if (req.message === 'toggleCapture') {
    document.dispatchEvent(toggleCaptureEvent);
  } else if (req.message === 'cancelCapture') {
    document.dispatchEvent(cancelEvent);
  } else if (req.message === 'viewFrame') {
    document.body.appendChild(document.createElement('btm-frame'));
  }
});


