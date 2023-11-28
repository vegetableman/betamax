/* eslint-disable tailwindcss/no-custom-classname */

import "@webcomponents/custom-elements";
import { For, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { customElement } from "solid-element";
import { parse } from 'tldts';
import { Resizer, Tooltip, tooltipStyle } from './components';
import { delay } from './utils';
import { __BTM_COLOR_VAR, TITLE_BAR_HEIGHT, MIRROR_FRAME_HEIGHT, style } from './styles';

interface IDimension {
  width: number;
  height: number;
}

interface IPosition {
  x: number;
  y: number;
}

interface IRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface IPayload {
  displaySurface: string
}

export type Direction = 'sw' | 'nw' | 'se' | 'ne' | 'e' | 'w' | 's' | 'n';

let __BTM_COLOR_VALUE: string;
let __BTM_DIMENSION_OBJ: IDimension;
let __BTM_POSITION_OBJ: IPosition;

const DEFAULT_FRAME_RATE = 30;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 45;
const FRAME_SIZE = 5;
const __BTM_FRAME_RATE_KEY = '__btm_frame_rate';
const __BTM_WINDOW_COLOR_KEY = '__btm_window_color';
const __BTM_WINDOW_POSITION_KEY = '__btm_window_position';
const __BTM_WINDOW_DIMENSION_KEY = '__btm_window_dimension';
const __BTM_INTRO_KEY = '__btm_show_intro';

let startCountdown: (payload: IPayload) => Promise<void>;

customElement("btm-frame", {}, () => {
  let frame: HTMLDivElement | undefined;
  const dpr = window.devicePixelRatio;
  const isHighDPI = dpr > 1.3;
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [elementOffset, setElementOffset] = createSignal({ 
    x: __BTM_POSITION_OBJ?.x ?? window.innerWidth/2 - MIN_WIDTH, 
    y: __BTM_POSITION_OBJ?.y ?? window.innerHeight/2 - MIN_WIDTH 
  });
  const [frameRate, setFrameRate] = createSignal<number>(DEFAULT_FRAME_RATE);
  const [isMouseDown, setMouseDown] = createSignal(false);
  const [isRecording, setIsRecording] = createSignal(false);
  const [isStarting, setIsStarting] = createSignal(false);
  const [isStopping, setIsStopping] = createSignal(false);
  const [showConfig, toggleConfig] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [showBottomTitleBar, toggleBottomTitleBar] = createSignal(false);
  // Setting selectedEl as object to allow selection on enter of same value. 
  const [selectedEl, setSelectedEl] = createSignal<{el: string}>({el: ''});
  const [dimension, setDimension] = createSignal({
    width: __BTM_DIMENSION_OBJ?.width ?? 400, 
    height:__BTM_DIMENSION_OBJ?.height ?? (450 + FRAME_SIZE)
  });
  const [time, setTime] = createSignal('00:00');
  const [countDown, setCountDown] = createSignal<number |  ((value: (prev: number) => number) => number) | null>(null);
  const [color, setColor] = createSignal(__BTM_COLOR_VALUE);
  const [offset, setOffset] = createSignal({left: 0, top: 0, width: 0, height: 0});
  const [showIntro, toggleIntro] = createSignal(false);
  const [bitrate, setBitrate] = createSignal<number | null>(null);
  const [mimeType, setMimeType] = createSignal('video/webm;codecs=vp9');
  const [implementation, setImplementation] = createSignal('imc');

  const handleMouseDown = (event: MouseEvent) => {
    if (isRecording() || isResizing()) {
      return;
    }
    const { clientX, clientY } = event;
    setMouseDown(true);
    setMousePosition({x: clientX, y: clientY});
    if (!(frame instanceof HTMLDivElement)) {
      throw new Error("Ref frame not found");
    }
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
    if (!(frame instanceof HTMLDivElement)) {
      throw new Error("Ref frame not found");
    }
    if (frame.getBoundingClientRect().top < -25) {
      toggleBottomTitleBar(true);
    } else if(showBottomTitleBar()) {
      toggleBottomTitleBar(false);
    }
  }

  const handleMouseMove = (event: MouseEvent) => {
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
  
  function formatTime(time: number) {
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

  function calculateRegion(displaySurface: string) {
    const dpr = window.devicePixelRatio;
    const offsetTop = isHighDPI && displaySurface === 'window' ? (TITLE_BAR_HEIGHT * dpr) + ((window.outerHeight - window.innerHeight) * dpr) 
      : isHighDPI ? (screen.height - window.innerHeight) + TITLE_BAR_HEIGHT : (screen.height - window.innerHeight);
    const captureDpr = displaySurface === 'window' ? dpr : 1;
    return {
      left: (elementOffset().x * captureDpr) + offset().left,
      top: ((elementOffset().y  * captureDpr) + offsetTop) + offset().top,
      width: (dimension().width * captureDpr) + offset().width,
      height: ((dimension().height - FRAME_SIZE) * captureDpr) - 2 + offset().height
    }
  }

  function initCapture() {
    const loc = parse(document.location.href);
    const messageToBgScript = {
      type: 'start_capture',
      target: 'background',
      payload: {
        frameRate: frameRate(),
        bitrate: bitrate(),
        mimeType: mimeType(),
        implementation: implementation(),
        fileName: `betamax_${loc.domainWithoutSuffix || loc.hostname}_${new Date().toLocaleString('sv-SE', { hour12: false}).replaceAll(/-|:/g, '').replace(' ', '_')}.zip`
      }
    };
    chrome.runtime.sendMessage(messageToBgScript);
  }

  let timerId: NodeJS.Timer;
  startCountdown = async (payload: IPayload) => {
    console.log('start countdown')
    setIsStarting(true);
    setTime('00:00');
    await delay(1000);
    chrome.runtime.sendMessage({
      type: 'set_region',
      target: 'background',
      payload: {
        region: calculateRegion(payload.displaySurface)
      }
    });
    setCountDown(3);
    await new Promise((resolve) => {
      const id = setInterval(() => {
        if (countDown() === 1) {
          clearInterval(id);
          resolve(true);
        }
        setCountDown((c) => {
          return typeof c === 'number' ? Math.max(c - 1, 1): c;
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
    setCountDown(null)
    clearInterval(timerId);
    setIsRecording(false);
    totalSeconds = 0;
  }

  function cancelCapture() {
    reset();
    chrome.runtime.sendMessage({type: 'cancel_capture', target: 'background'});
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

  createEffect(() => {
    if (!color()) {
      return;
    }
    chrome.storage.sync.set({[__BTM_WINDOW_COLOR_KEY]: color()});
  });

  createEffect(() => {
    let value;
    if (!selectedEl() || !(value = selectedEl())) {
      return;
    }
    
    let el: unknown;
    try {
      el = document.querySelector(value.el);
    } catch {
      return;
    }
    if (el === null || !(el instanceof HTMLElement)) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const selectionOffset = 5;
    setElementOffset({
      x: rect.left - selectionOffset,
      y: rect.top - TITLE_BAR_HEIGHT - selectionOffset,
    });
    let h;
    if (rect.bottom >= window.innerHeight) {
      h = rect.height + FRAME_SIZE + selectionOffset;
    } else {
      h = rect.height + MIRROR_FRAME_HEIGHT;
    }
    setDimension({width: rect.width + (2 * selectionOffset), height: h});
    toggleConfig(false);
    setupBottomTitleBar();
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
    const intro = await chrome.storage.local.get(__BTM_INTRO_KEY);
    if (!(intro && intro[__BTM_INTRO_KEY])) {
      toggleIntro(true);
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

  const controls = () => { 
    return (<> 
      {!isRecording() ?
        <Tooltip title="Record (Alt + Shift + R)" style={{bottom:'-33px', left: '3px'}}>
          <button class="btm_record-btn" onClick={(e: Event) => {
            e.preventDefault();
            initCapture();
          }} onMouseDown={(e: Event) => e.stopPropagation()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-circle"><circle cx="12" cy="12" r="10" /></svg>
            <span class="btm_record__text">Record</span>
          </button>
        </Tooltip>
        : null}
      {isRecording() ? <Tooltip title="Stop (Alt + Shift + R)" style={{bottom: showBottomTitleBar() ? '-33px': '38px', left: '3px'}}>
        <button class="btm_stop-btn" onClick={() => {
          document.dispatchEvent(stopEvent);
        }} onMouseDown={(e: Event) => e.stopPropagation()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-square"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
          <span class="btm_record__text">Stop</span>
        </button></Tooltip>: null}
      {isRecording() ?
        <span class="btm_title__timer-wrapper">
          <Tooltip title="Cancel (Alt + Shift + C)" style={{bottom: showBottomTitleBar() ? '-37px': '34px', left: '3px'}}>
            <button class="btm_title__cancel-btn"  onClick={() => {
              cancelCapture();
            }} onMouseDown={(e: Event) => e.stopPropagation()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </Tooltip>
          <span class="btm_title__timer">
            {time()}
          </span>
        </span>: 
        null}
      {isStarting() ? <span class="btm_title__text">Starting</span>: null}
      {isStopping() && !isProcessing() ? <span class="btm_title__text">Stopping</span>: null}
      <div style={{"z-index":"2"}}>
        <Tooltip title="Settings" style={{bottom: showBottomTitleBar() || !isRecording() ? '-41px': '31px', left: '-20px'}}>
          <button class="btm_title__config-btn" disabled={isRecording()} onClick={() => {
            toggleConfig((c) => !c);
          }} onMouseDown={(e) => e.stopPropagation()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="feather feather-settings"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
        </Tooltip>
        <Tooltip title="Close" style={{bottom: showBottomTitleBar() || !isRecording() ? '-41px': '31px', left: '-20px'}}>
          <button class="btm_title__close-btn" disabled={isRecording()} onClick={() => {
            document.querySelector('btm-frame')?.remove();
          }} onMouseDown={(e: Event) => e.stopPropagation()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </Tooltip>
      </div>
    </>);
  };

  function updateOffset(pos: keyof IRect) {
    // eslint-disable-next-line solid/reactivity
    return (e: Event) => {
      if (e.target instanceof HTMLInputElement) {
        offset()[pos] = parseInt(e.target.value);
      }
      setOffset(offset());
    }
  }

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
      <style>{tooltipStyle}</style>
      <div class="btm_window__inner">
        <div class="btm_title_bar" onMouseDown={handleMouseDown}>
          {controls()}
        </div>
        {isStarting() || isProcessing() ? <div style={{height: dimension().height + (showBottomTitleBar() ? 0 : -FRAME_SIZE) + 'px'}}  classList={{btm_overlay: true, btm_processing: isProcessing() || !countDown()}}>
          <span>{isProcessing() ? 'Processing Captures': countDown() ? `${countDown()}`: 'Starting Countdown'}</span>
        </div>: null}
        {showIntro() ? 
          <div class="btm_intro" style={{height: dimension().height - FRAME_SIZE + 'px'}}>
            <div class="btm_intro__header">
              <h3>Chrome Tab</h3>
              <h3 classList={{selected: isHighDPI}}>
                Window
                <div class="btm_intro__header__indicator" />
              </h3>
              <h3 classList={{selected: dpr === 1, 'btm_intro__header--screen': true}}>
                Entire Screen
                <div class="btm_intro__header__indicator" />
              </h3>
              {isHighDPI ? <div class="btm_intro__arrow">
                <div class="point" />
                <div class="curve" />
              </div> : 
                <div class="btm_intro__arrow btm_intro__screen-arrow">
                  <div class="point" />
                  <div class="curve" />
                </div>}
            </div>
            <ul class="btm_intro__list">
              <For each={isHighDPI ? [1, 2, 3, 4, 5, 6]: [1]}>{() =>
                <li />
              }</For>
            </ul>
            <div class="btm_intro__message">
              <p>
                Based on your display, it's recommended that you select the default tab <b>{isHighDPI ? "Window": "Entire Screen"}</b> on <button class="btm_record-intro-btn btm_record-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-circle"><circle cx="12" cy="12" r="10" /></svg>
                  <span class="btm_record__text">Record</span> 
                </button> to capture the current tab.
              </p> 
              <p>Other choices may yield inaccurate or low-resolution captures.</p>
              <button class="btm_intro__ok" onClick={() => {
                toggleIntro(false);
                chrome.storage.local.set({[__BTM_INTRO_KEY]: "1"});
              }}>Got it</button>
            </div>
          </div>: null}
        {showConfig() ? <div class="btm_config" style={{height: dimension().height + 'px'}}>
          <div class="btm_config__row">
            <span class="btm_config__row__label">Frame rate: </span>
            <span class="btm_config__row__wrapper">
              <input class="btm_config__interval-input" type="text" style={{"width":"50px"}} value={`${frameRate()}`} onChange={(e) => {
                const {value} = e.target;
                const v = parseInt(value);
                !Number.isNaN(v) && v > 0 && setFrameRate(v);
                chrome.storage.sync.set({[__BTM_FRAME_RATE_KEY]: v});
              }}/>
            </span>
          </div>
          <div class="btm_config__row">
            <span class="btm_config__row__label">Window color: </span>
            <div class="btm_config__row__wrapper btm_config__row--mode">
              <input type="color" value={color()} onInput={(e) => {
                setColor(e.target.value);
              }}/>
            </div>
          </div>
          <div class="btm_config__row">
            <span class="btm_config__row__label">Window position: </span>
            <span class="btm_config__row__wrapper">
              <input type="text" style={{"width":"50px"}} value={elementOffset().x} onChange={(e) => {
                const {value} = e.target;
                const v = parseInt(value);
                !Number.isNaN(v) && v > 0 && setElementOffset({x: v, y: elementOffset().y});
              }}/>
              <span class="btm_config__row__x">X</span>
              <input type="text" style={{"width":"50px"}} value={elementOffset().y} onChange={(e) => {
                const {value} = e.target;
                const v = parseInt(value);
                !Number.isNaN(v) && v > 0 && setElementOffset({x: elementOffset().x, y: v});
              }}/>
            </span>
          </div>
          <div class="btm_config__row">
            <span class="btm_config__row__label">Window size: </span>
            <span class="btm_config__row__wrapper">
              <input type="text" style={{"width":"50px"}} value={dimension().width} onChange={(e) => {
                const {value} = e.target;
                const v = parseInt(value);
                !Number.isNaN(v) && v > 0 && setDimension({width: v, height: dimension().height});
              }}/>
              <span class="btm_config__row__x">X</span>
              <input type="text" style={{"width":"50px"}} value={dimension().height - FRAME_SIZE} onChange={(e) => {
                const {value} = e.target;
                const v = parseInt(value) + FRAME_SIZE;
                !Number.isNaN(v) && v > 0 && setDimension({width: dimension().width, height: v});
              }}/>
            </span>
          </div>
          <div class="btm_config__row btm_config__row--element">
            <span class="btm_config__row__label">Enter id or class or name of an element to record (and press <b style={{"font-weight":"600"}}>Enter</b>): </span>
            <span class="btm_config__row__wrapper">
              <input type="text" style={{"width":"140px"}} value={selectedEl().el} onBlur={(e) => {
                const {value} = e.target;
                setSelectedEl({el: value});
              }} placeholder="Starting with # or ." onKeyUp={(e: KeyboardEvent) => {
                if (e.target && e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                  'value' in e.target && setSelectedEl({el: e.target.value});
                }
              }}/>
            </span>
          </div>
          <details class="btm_advanced">
            <summary>Advanced</summary>
            <div class="btm_config__row">
              <span class="btm_config__row__label">Implementation: </span>
              <span class="btm_config__row__wrapper">
                <span class="btm_config__row__radio-wrapper">
                  <input type="radio" id="implementation-imc" name="implementation-imc" value="imc" checked={implementation() === 'imc'} onChange={() => {
                    setImplementation('imc');
                  }}/>
                  <label for="implementation-imc">Image Capture</label>
                </span>
                <span class="btm_config__row__radio-wrapper">
                  <input type="radio" id="implementation-mr" name="implementation-mr" value="mr" checked={implementation() === 'mr'} onChange={() => {
                    setImplementation('mr');
                  }}/>
                  <label for="implementation-mr">MediaRecorder</label>
                </span>
              </span>
            </div>
            <div class="btm_config__row">
              <span class="btm_config__row__label">Video MIME: </span>
              <span class="btm_config__row__wrapper">
                <input class="btm_config__interval-input" placeholder="Ex: video/webm;codecs=vp9" type="text" style={{"width":"170px"}} value={mimeType()} onChange={(e) => {
                  const {value} = e.target;
                  setMimeType(value);
                }}/>
              </span>
            </div>
            <div class="btm_config__row">
              <span class="btm_config__row__label">Bitrate: </span>
              <span class="btm_config__row__wrapper">
                <input class="btm_config__interval-input" type="text" style={{"width":"50px"}} value={`${bitrate()}`} onChange={(e) => {
                  const {value} = e.target;
                  const v = parseInt(value);
                  !Number.isNaN(v) && v > 0 && setBitrate(v);
                }}/>
              </span>
            </div>
            <div>
              <div class="btm_config__row btm_config__row--element">
                <span class="btm_config__row__label">
                  Add offset to adjust the captured result
                  <span class="btm_config__row__tooltip">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-help-circle">
                      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span class="btm_config__row__tooltip_text">Set values ranging from -ve to +ve if you notice inaccurate cropping around the boundaries of the captured frame.</span>
                  </span>:
                </span>
                <span class="btm_config__row__wrapper">
                  <div class="btm_config__region" style={{width: 150 + 'px', height: Math.round(150/(dimension().width/dimension().height)) + 'px'}}>
                    <input type="text" class="btm_config__region--left" value={offset().left} onChange={updateOffset('left')}/>
                    <input type="text" class="btm_config__region--top" value={offset().top} onChange={updateOffset('top')}/>
                    <div class="btm_config__region--center">
                      <input type="text" class="btm_config__region--width" value={offset().width} onChange={updateOffset('width')}/>x
                      <input type="text" class="btm_config__region--height" value={offset().height} onChange={updateOffset('height')}/>
                    </div>
                  </div>
                </span>
              </div>
            </div>
          </details>
          <span title="Close" class="btm_config__close-btn" onClick={() => {
            toggleConfig((c) => !c);
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </span>
        </div> : null}
        <div class="btm_mirror" data-disabled={isRecording()}>
          <Resizer disabled={isRecording()} frameRef={frame} onResize={
            // eslint-disable-next-line solid/reactivity
            (dir: Direction, width: number, deltaX: number, deltaY: number, startLeft = 0) => {
              setIsResizing(true);
              if (dir === 'e') {
                const w = width + deltaX;
                if (w < MIN_WIDTH) {
                  return;
                } 
                setDimension({width: w, height: dimension().height});
              } else if (['w', 'sw'].includes(dir)) {
                const w = width - deltaX;
                if (w < MIN_WIDTH) {
                  return;
                }
                setElementOffset({x: startLeft + deltaX, y: elementOffset().y});
                setDimension({width: w, height: dimension().height});
                if (['sw', 'se'].includes(dir)) {
                  const h = dimension().height + deltaY;
                  setDimension({width: dir === 'se' ? width + deltaX: dimension().width, height: h});
                }
              } else if (['s', 'se'].includes(dir)) {
                const h = dimension().height + deltaY;
                if (h < MIN_HEIGHT || ( dir === 'se' && width + deltaX < MIN_WIDTH)) {
                  return;
                }
                setDimension({width: dir === 'se' ? width + deltaX: dimension().width, height: h});
              } else if (['nw', 'ne', 'n'].includes(dir)) {
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
              <div />
            </div>
            <div class="btm_ne" data-dir="ne"  />
            <div class="btm_nw" data-dir="nw"  />
            <div class="btm_w" data-dir="w" style={{height: dimension().height + TITLE_BAR_HEIGHT + 'px'}}>
              <div />
            </div>
            <div class="btm_e" data-dir="e" style={{height: dimension().height + TITLE_BAR_HEIGHT + 'px'}}>
              <div />
            </div>
            <div class="btm_s" data-dir="s" style={{bottom: -dimension().height - (showBottomTitleBar() ? TITLE_BAR_HEIGHT + 10 : MIRROR_FRAME_HEIGHT) + FRAME_SIZE + 'px', height: showBottomTitleBar() ? '10px': '15px'}}>
              <div />
            </div>
            <div class="btm_se" data-dir="se"  style={{bottom: -dimension().height - (showBottomTitleBar() ? TITLE_BAR_HEIGHT + 10: 0) + 'px'}} />
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
  } else if (message.type === 'start_countdown') {
    startCountdown(message.payload);
  } else if (message.type === 'capture_stopped') {
    document.dispatchEvent(cancelEvent);
  } else if (message.type === 'processing_capture') {
    document.dispatchEvent(processingEvent);
  } else if (message.type === 'open_frame_manager') {
    document.dispatchEvent(completionEvent);
  }
  return true;
});


