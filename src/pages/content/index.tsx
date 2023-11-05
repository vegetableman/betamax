import "@webcomponents/custom-elements";
import { children, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { customElement } from "solid-element";
import { parse } from 'tldts';
import { delay, evenOut } from './utils'

const __BTM_COLOR_VAR = '--btm-bg-color';
const TITLE_BAR_HEIGHT = 40;
const MIRROR_FRAME_HEIGHT = 15;

const style = `
  .btm_window {
    ${__BTM_COLOR_VAR}: #333;
    --btm-title-background-color: var(${__BTM_COLOR_VAR});
    --btm-record-btn-background-color: #f46236;
    --btm-record-btn-hover-background-color: #f15120;
    --btm-record-btn-border-color: #ef5527;
    --btm-stop-btn-background-color: red;
    --btm-stop-btn-hover-background-color: #ed1212;
    --btm-btn-color: #fff;
    --btm-btn-border-color: var(${__BTM_COLOR_VAR});
    --btm-mirror-background-color: var(${__BTM_COLOR_VAR});
    --btm-dimension-background-color: var(${__BTM_COLOR_VAR});
    --btm-countdown-background-color: #33333352;
    --btm-config-background-color: #333333e3;
  }
  .btm_window {
    font-family: "BTM__Inter", Arial, Helvetica, sans-serif;
    font-size: 13px;
  }
  .btm_window__inner {
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
    font-weight: 500;
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
  .btm_overlay {
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
  .btm_overlay > span {
    position: relative;
    top: -30px;
  }
  .btm_processing {
    font-size: 20px;
  }
  .btm_processing > span::after {
    position: absolute;
    content: ".";
    opacity: 0;
    animation: animate_dots 1s infinite;
  }
  .btm_title__close-btn, .btm_title__config-btn, .btm_title__cancel-btn {
    background: none;
    border-color: var(${__BTM_COLOR_VAR});
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

let __BTM_COLOR_VALUE;
let __BTM_DIMENSION_OBJ;
let __BTM_POSITION_OBJ;

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

const DEFAULT_FRAME_RATE = 30;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 45;
const FRAME_SIZE = 5;
const __BTM_FRAME_RATE_KEY = '__btm_frame_rate';
const __BTM_WINDOW_COLOR_KEY = '__btm_window_color';
const __BTM_WINDOW_POSITION_KEY = '__btm_window_position';
const __BTM_WINDOW_DIMENSION_KEY = '__btm_window_dimension';

let startCountdown;

customElement("btm-frame", {}, () => {
  let frame;
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [elementOffset, setElementOffset] = createSignal({ 
    x: __BTM_POSITION_OBJ?.x ?? window.innerWidth/2 - MIN_WIDTH, 
    y: __BTM_POSITION_OBJ?.y ?? window.innerHeight/2 - MIN_WIDTH 
  });
  const [frameRate, setFrameRate] = createSignal(DEFAULT_FRAME_RATE);
  const [isMouseDown, setMouseDown] = createSignal(false);
  const [isRecording, setIsRecording] = createSignal(false);
  const [isStarting, setIsStarting] = createSignal(false);
  const [isStopping, setIsStopping] = createSignal(false);
  const [showConfig, toggleConfig] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [showBottomTitleBar, toggleBottomTitleBar] = createSignal(false);
  const [selectedEl, setSelectedEl] = createSignal(null);
  const [dimension, setDimension] = createSignal({
    width: __BTM_DIMENSION_OBJ?.width ?? 400, 
    height:__BTM_DIMENSION_OBJ?.height ?? (400 + FRAME_SIZE)
  });
  const [time, setTime] = createSignal('00:00');
  const [countDown, setCountDown] = createSignal(3);
  const [color, setColor] = createSignal(__BTM_COLOR_VALUE);

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

  const setupBottomTitleBar = () => {
    if (frame.getBoundingClientRect().top < -25) {
      toggleBottomTitleBar(true);
    } else if(showBottomTitleBar()) {
      toggleBottomTitleBar(false);
    }
  }

  const handleMouseMove = (event) => {
    if (!isMouseDown() || isRecording() || isResizing()) return;

    const { clientX, clientY } = event;
    const { x, y } = mousePosition();
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    setMousePosition({x: clientX, y: clientY});
    setElementOffset({x: (elementOffset().x + deltaX), y: (elementOffset().y + deltaY)});
    setupBottomTitleBar();
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
      initCapture();
    }
  }

  function initCapture() {
    const r = frame.getBoundingClientRect();
    const dpr = window.devicePixelRatio;

    const region = {
      left: evenOut(elementOffset().x) * dpr,
      top: evenOut(elementOffset().y, -1) * dpr,
      width: evenOut(dimension().width) * dpr - 2,
      height: evenOut(dimension().height - FRAME_SIZE) * dpr - 2,
      window: {innerHeight: evenOut(window.innerHeight)}
    };

    console.log('region:', region);

    const loc = parse(document.location.href);
    const messageToBgScript = {
      type: 'start_capture',
      target: 'background',
      payload: {
        region, 
        frameRate: frameRate(),
        fileName: `betamax_${loc.domainWithoutSuffix}_${new Date().toLocaleString('sv-SE', { hour12: false}).replaceAll(/\-|:/g, '').replace(' ', '_')}.zip`
      }
    };

    chrome.runtime.sendMessage(messageToBgScript);
  }

  let timerId;
  startCountdown = async () => {
    setTime('00:00');
    setCountDown(3);
    setIsStarting(true);
    await new Promise((resolve) => {
      const id = setInterval(() => {
        if (countDown() === 1) {
          clearInterval(id);
          resolve(true);
        }
        setCountDown((c) => {
          return Math.max(c - 1, 1);
        });
      }, 1000);
    });
    setIsStarting(false);
    await delay(100);
    chrome.runtime.sendMessage({type: 'continue_capture', target: 'background'});
    setIsRecording(true);
    setTime(updateDisplayTime());
    timerId = setInterval(() => {
      setTime(updateDisplayTime());
    }, 1000);
  };

  function reset() {
    clearInterval(timerId);
    setIsRecording(false);
    totalSeconds = 0;
  }

  function cancelCapture() {
    reset();
  }

  function stopCapture() {
    reset();
    setIsStopping(true);
    chrome.runtime.sendMessage({type: 'stop_capture', target: 'background'});
  }

  function processingCapture() {
    setIsStopping(false);
    setIsProcessing(true);
  }

  function processingCompletion() {
    setIsProcessing(false);
  }

  createEffect(async () => {
    if (!color()) {
      return;
    }
    chrome.storage.sync.set({[__BTM_WINDOW_COLOR_KEY]: color()});
  });

  createEffect(() => {
    sessionStorage.setItem(__BTM_WINDOW_POSITION_KEY, JSON.stringify(elementOffset()));
    sessionStorage.setItem(__BTM_WINDOW_DIMENSION_KEY, JSON.stringify(dimension()));
  });

  function onResize() {
    setupBottomTitleBar();
  }

  onMount(async () => {
    document.addEventListener('toggle-capture', toggleCapture);
    document.addEventListener('cancel-capture', cancelCapture);
    document.addEventListener('stop-capture', stopCapture);
    document.addEventListener('processing', processingCapture);
    document.addEventListener('completion', processingCompletion);
    window.addEventListener('resize', onResize);
    const data = await chrome.storage.sync.get(__BTM_FRAME_RATE_KEY);
    if (data && data[__BTM_FRAME_RATE_KEY]) {
      setFrameRate(data[__BTM_FRAME_RATE_KEY]);
    }
    setupBottomTitleBar();
  });

  onCleanup(() => {
    document.removeEventListener('toggle-capture', toggleCapture);
    document.removeEventListener('cancel-capture', cancelCapture);
    document.removeEventListener('stop-capture', stopCapture);
    document.removeEventListener('processing', processingCapture);
    document.removeEventListener('completion', processingCompletion);
    window.removeEventListener('resize', onResize);
  });

  const selectElement = (value) => {
    if (!value) {
      return;
    }
    
    setSelectedEl(value);
    let el;
    try {
      el = document.querySelector(value);
    } catch {
      return;
    }
    const rect = el.getBoundingClientRect();
    const selectionOffset = 5;
    setElementOffset({
      x: rect.left - selectionOffset,
      y: rect.top - TITLE_BAR_HEIGHT - selectionOffset,
    });
    let h;
    console.log(rect.bottom, window.innerHeight);
    if (rect.bottom >= window.innerHeight) {
      h = rect.height + FRAME_SIZE + selectionOffset;
    } else {
      h = rect.height + MIRROR_FRAME_HEIGHT;
    }
    setDimension({width: rect.width + (2 * selectionOffset), height: h});
    toggleConfig(false);
    setupBottomTitleBar();
  }

  const controls = () => { 
    return (<> 
      {!isRecording() ? 
        <button title="Record (Alt + Shift + R)" class="btm_record-btn" onClick={(e) => {
          e.preventDefault();
          initCapture();
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
          <button title="Cancel (Alt + Shift + C)" class="btm_title__cancel-btn"  onclick={() => {
              cancelCapture();
              chrome.runtime.sendMessage({type: 'cancel_capture', target: 'background'});
          }} onMouseDown={(e) => e.stopPropagation()}>✖</button>
          <span class="btm_title__timer">
            {time()}
          </span>
        </span>: 
      null}
      {isStarting() ? <span class="btm_title__text">Starting</span>: null}
      {isStopping() && !isProcessing() ? <span class="btm_title__text">Stopping</span>: null}
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
      class="btm_window" 
      ref={frame}
      style={{
        position: 'fixed',
        left: `${elementOffset().x}px`,
        top: `${elementOffset().y}px`,
        width: dimension().width + 'px',
        'min-width': `${MIN_WIDTH}px`,
        'z-index': '2147483647',
        [__BTM_COLOR_VAR]: color()
      }}
    >
      <style>{style}</style>
      <div class="btm_window__inner">
        <div class="btm_title_bar" onMouseDown={handleMouseDown}>
          {controls()}
        </div>
        {isStarting() || isProcessing() ? <div style={{height: dimension().height - FRAME_SIZE + 'px'}}  classList={{btm_overlay: true, btm_processing: isProcessing()}}>
          <span>{isProcessing() ? 'Processing Captures': countDown()}</span>
        </div>: null}
        {showConfig() ? <div class="btm_config" style={{height: dimension().height + 'px'}}>
          <div class="btm_config__row">
              <span class="btm_config__row__label">Frame rate: </span>
              <span class="btm_config__row__wrapper">
                <input class="btm_config__interval-input" type="text" style="width: 50px;" value={`${frameRate()}`} onchange={(e) => {
                  let {value} = e.target;
                  let v = parseInt(value);
                  !Number.isNaN(v) && v > 0 && setFrameRate(v);
                  chrome.storage.sync.set({[__BTM_FRAME_RATE_KEY]: v});
                }}/>
              </span>
          </div>
          <div class="btm_config__row">
              <span class="btm_config__row__label">Window color: </span>
              <div class="btm_config__row__wrapper btm_config__row--mode">
                <input type="color" value={color()} oninput={(e) => {
                  setColor(e.target.value);
                }}/>
              </div>
          </div>
          <div class="btm_config__row">
              <span class="btm_config__row__label">Window position: </span>
              <span class="btm_config__row__wrapper">
                  <input type="text" style="width: 50px;" value={elementOffset().x} onchange={(e) => {
                    let {value} = e.target;
                    let v = parseInt(value);
                    !Number.isNaN(v) && v > 0 && setElementOffset({x: v, y: elementOffset().y});
                  }}/>
                  <span class="btm_config__row__x">X</span>
                  <input type="text" style="width: 50px;" value={elementOffset().y} onchange={(e) => {
                     let {value} = e.target;
                     let v = parseInt(value);
                     !Number.isNaN(v) && v > 0 && setElementOffset({x: elementOffset().x, y: v});
                  }}/>
              </span>
          </div>
          <div class="btm_config__row">
              <span class="btm_config__row__label">Window size: </span>
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
                     !Number.isNaN(v) && v > 0 && setDimension({width: dimension().width, height: v});
                  }}/>
              </span>
          </div>
          <div class="btm_config__row btm_config__row--element">
              <span class="btm_config__row__label">Enter id or class or name of an element to record (and press <b style="font-weight: 600;">Enter</b>): </span>
              <span class="btm_config__row__wrapper">
                <input type="text" style="width: 140px;" value={selectedEl()} onblur={(e) => {
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
              if (w < MIN_WIDTH) {
                return;
              } 
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
              }
            } else if (dir === 's' || dir === 'se') {
              const h = dimension().height + deltaY;
              if (h < MIN_HEIGHT || ( dir === 'se' && width + deltaX < MIN_WIDTH)) {
                return;
              }
              setDimension({width: dir === 'se' ? width + deltaX: dimension().width, height: h});
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
            }
          }} onResizeEnd={() => {
            setIsResizing(false);
          }}>
            <div class="btm_n" data-dir="n">
              <div></div>
            </div>
            <div class="btm_ne" data-dir="ne" ></div>
            <div class="btm_nw" data-dir="nw" ></div>
            <div class="btm_w" data-dir="w" style={{height: dimension().height + TITLE_BAR_HEIGHT + 'px'}}>
              <div></div>
            </div>
            <div class="btm_e" data-dir="e" style={{height: dimension().height + TITLE_BAR_HEIGHT + 'px'}}>
              <div></div>
            </div>
            <div class="btm_s" data-dir="s" style={{bottom: -dimension().height - (showBottomTitleBar() ? TITLE_BAR_HEIGHT + 10 : MIRROR_FRAME_HEIGHT) + FRAME_SIZE + 'px', height: showBottomTitleBar() ? '10px': '15px'}}>
              <div></div>
            </div>
            <div class="btm_se" data-dir="se"  style={{bottom: -dimension().height - (showBottomTitleBar() ? TITLE_BAR_HEIGHT + 10: 0) + 'px'}}>
            </div>
            <div class="btm_sw" data-dir="sw"  style={{bottom: -dimension().height - (showBottomTitleBar() ? TITLE_BAR_HEIGHT + 10: 0) + 'px'}}>
              {isResizing() ? <div style={{position: "relative", width: "100%", height: "100%"}}>
                <div style={{bottom: showBottomTitleBar() ? `${TITLE_BAR_HEIGHT + 15}px`: '10px'}} class="btm_dimension">{dimension().width}x{dimension().height - FRAME_SIZE}</div>
              </div>: null}
            </div>
          </Resizer>
        </div>
        <div style={{display: showBottomTitleBar() ? 'flex': 'none', bottom: -dimension().height - TITLE_BAR_HEIGHT + 'px'}} class="btm_bottom_bar" onMouseDown={handleMouseDown}>
          {controls()}
        </div>
      </div>
    </div>
  );
});

const stopEvent = new CustomEvent("stop-capture");
const toggleCaptureEvent = new CustomEvent("toggle-capture");
const cancelEvent = new CustomEvent("cancel-capture");
const processingEvent = new CustomEvent("processing");
const completionEvent = new CustomEvent("completion");

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'tab') {
    return;
  }

  if (message.type === 'toggle_capture') {
    document.dispatchEvent(toggleCaptureEvent);
  } else if (message.type === 'cancel_capture') {
    document.dispatchEvent(cancelEvent);
  } else if (message.type === 'view_frame') {
    if (document.querySelector('btm-frame')) {
      return;
    }
    const colorData = await chrome.storage.sync.get(__BTM_WINDOW_COLOR_KEY);
    __BTM_COLOR_VALUE = colorData[__BTM_WINDOW_COLOR_KEY];
    const dimensionValue = sessionStorage.getItem(__BTM_WINDOW_DIMENSION_KEY);
    const positionValue = sessionStorage.getItem(__BTM_WINDOW_POSITION_KEY);
    if (dimensionValue && positionValue) {
      __BTM_DIMENSION_OBJ = JSON.parse(dimensionValue);
      __BTM_POSITION_OBJ = JSON.parse(positionValue);
    }
    const frameEl = document.createElement('btm-frame');
    document.body.appendChild(frameEl);
  } else if (message.type === 'init_capture') {
    startCountdown();
  } else if (message.type === 'capture_stopped') {
    document.dispatchEvent(cancelEvent);
  } else if (message.type === 'processing_capture') {
    document.dispatchEvent(processingEvent);
  } else if (message.type === 'open_frame_manager') {
    document.dispatchEvent(completionEvent);
  }
  return true;
});


