import 'virtual:windi.css';
import { For, createEffect, createSignal, onMount } from "solid-js";
import  {Portal, render} from "solid-js/web";
import pyodide from "./pyodide";
import DEMO_HTML from './demo.js';
import { copyToClipboard } from './pages/content/utils';

const { hostname } = new URL(window.location.href);
window.chrome = {
  // @ts-expect-error url helper to import pyodide modules
  runtime: {
    getURL: (path) => {
      return `chrome-extension://${hostname}/${path}`;
    },
    id: hostname
  }
};


let IS_PYODIDE_LOADED = false;
const delay_scale = 0.9;
let timer = null;

function animate(img, timeline, canvas)
{
  let i = 0;
  const f = function()
  {
    const frame = i++ % timeline.length;
    const delay = timeline[frame].delay * delay_scale;
    const blits = timeline[frame].blit;
    const ctx = canvas.getContext('2d');
    for (let j = 0; j < blits.length; ++j)
    {
      const blit = blits[j];
      const sx = blit[0];
      const sy = blit[1];
      const w = blit[2];
      const h = blit[3];
      const dx = blit[4];
      const dy = blit[5];
      ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h);
    }
    timer = window.setTimeout(f, delay);
  }

  if (timer) window.clearTimeout(timer);
  f();
}

const App = () => {
  let fileInput;
  let logScroller;
  let canvas;
  let timelineInput;
  let gallery;
  let details;
  let aboutDialog;
  const [ss, setScreenshots] = createSignal([]);
  const [times, setTimes] = createSignal([]);
  const [format, ] = createSignal('png');
  const [fileName, setFileName] = createSignal(null);
  const [exampleFileName, setExampleFileName] = createSignal(null);
  const [currentImage, setCurrentImage] = createSignal(0);
  const [messages, setMessages] = createSignal([]);
  const [generating, setIsGenerating] = createSignal(false);
  const [transitionEnabled, toggleTransition] = createSignal(true);
  const [isOutput, showOutput] = createSignal(false);
  const [isExpanded, toggleExpansion] = createSignal(false);
  const [packedImage, setPackedImage] = createSignal(null);
  const [timeline, setTimeline] = createSignal(null);
  const [showClipboardMsg, toggleClipboardMsg] = createSignal(null);
  const [isDetailsOpen, setDetailsOpen] = createSignal(true);
  const [resizeFactor, setResizeFactor] = createSignal(null);
  const [packingMode, setPackingMode] = createSignal(null);
  const [err, toggleError] = createSignal(null);
  const [version, setVersion] = createSignal(null);
  const [tolerance, setTolerance] = createSignal(512);
  const [allocation, setAllocation] = createSignal(20000);

  const generateAnimation = async () => {
    if (generating()) return;

    toggleError(false);
    setIsGenerating(true);
    setMessages([]);
    setMessages([...messages(), "Loading Pyodide..."]);
    if (!IS_PYODIDE_LOADED) {
      await pyodide.load();
    }
    setMessages([...messages(), "Pyodide is loaded."]);
    setMessages([...messages(), "Sending images to the worker..."]);
    pyodide.processImages({
      screenshots: ss().map((s) => s.src), times: times(), format: format(), resizeFactor: resizeFactor(), packingMode: packingMode(), tolerance: tolerance(), allocation: allocation()}, async (done, payload) => {
      if (done) {
        setIsGenerating(false);
        const {image, timeline: tt} = payload;
        const url =  URL.createObjectURL(image);
        setPackedImage(image);
        setTimeline(JSON.stringify(tt));
        terminatePyodide();
        showOutput(true);
        const im = new Image();
        im.onload = function()
        {
          const blits = tt[0].blit[0];
          canvas.width = blits[2];
          canvas.height = blits[3];
          animate(im, tt, canvas);
        };
        im.src = url;
      } else {
        const {message} = payload;
        if (message.indexOf('/') > -1 && messages()[messages().length - 1].indexOf('/') > -1) {
          messages()[messages().length - 1] = message;
          setMessages([...messages()]);
        } else if (message.includes("Error generating the result:")) {
          setMessages([...messages(), message]);
          toggleError({line: messages().length - 1});
        } else if (err()) {
          setMessages([...messages(), message]);
          setIsGenerating(false);
          terminatePyodide();
        } else {
          setMessages([...messages(), message]);
        }
        requestAnimationFrame(() => {
          logScroller.scrollTop = logScroller.scrollHeight;
        });
      }
    });
  }

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % ss().length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + ss().length) % ss().length);
  };

  const displayOutput = () => {
    if (!timeline() || !packedImage()) {
      return;
    }
    const url =  URL.createObjectURL(packedImage());
    showOutput(true);
    const im = new Image();
    im.onload = function()
    {
      try {
        const tt = JSON.parse(timeline())
        const blits = tt[0].blit[0];
        canvas.width = blits[2];
        canvas.height = blits[3];
        animate(im, tt, canvas);
      } catch {
        console.error('Error parsing timeline')
      }
    };
    im.src = url;
  }

  const downloadZip = async () => {
    //@ts-expect-error jszip is included globally as script tag
    const zip = new JSZip();
    zip.file('timeline.json', timeline());
    zip.file(`packed_image.${format()}`, packedImage());
    zip.file('demo.html', DEMO_HTML.replace('__TIMELINE__PLACEHOLDER__', timeline()).replace('__EXTENSION__', format()));
    const blob = await zip.generateAsync({type: 'blob'});
    window.parent.postMessage({name: 'downloadFile', extension: 'zip', blob, file: `${fileName()}_anim`}, '*');
  }

  const terminatePyodide = () => {
    IS_PYODIDE_LOADED = false; 
    pyodide.terminate(); 
  }

  onMount(async () => {
    window.addEventListener('message', function(event) {
      if ( event.data instanceof Object) {
        'fileName' in event.data && setExampleFileName(event.data.fileName);
        'isDetailsOpen' in event.data && setDetailsOpen(event.data.isDetailsOpen);
        'version' in event.data && setVersion(event.data.version);
      }
    });
    window.parent.postMessage({name: 'getVersion'}, '*');
  });

  createEffect(() => {
    if (isOutput()) {
      setTimeout(() => {
        toggleExpansion(true);
      }, 500);
    }
  });

  return <div onKeyDown={(e) => {
    e.stopPropagation();
    // disable transition on shift
    if (e.shiftKey && e.key === 'ArrowRight') {
      toggleTransition(false);
      nextImage();
    } else if (e.shiftKey && e.key === 'ArrowLeft') {
      toggleTransition(false);
      prevImage();
    } else if (e.shiftKey && e.ctrlKey && e.key === 'Delete') {
      e.preventDefault();
      setScreenshots((ss) => {
        const ss_ = [...ss];
        ss_.splice(currentImage() + 1);
        return ss_;
      });
      setTimes((t) => {
        const t_ = [...t];
        t_.splice(currentImage() + 1);
        return t_; 
      });
      toggleTransition(false);
      setTimeout(() => {
        gallery.focus();
      }, 10);
    } else if (e.shiftKey && e.key === 'Delete') {
      toggleTransition(false);
      const lastIndex = ss().length - 1;
      setScreenshots((ss) => {
        const ss_ = [...ss];
        ss_.splice(currentImage(), 1);
        return ss_;
      });
      setTimes((t) => {
        const t_ = [...t];
        t_.splice(currentImage(), 1);
        return t_; 
      });
      setTimeout(() => {
        gallery.focus();
        if (currentImage() === lastIndex) {
          prevImage();
        }
      }, 10);
    } else if (e.key === 'ArrowRight') {
      toggleTransition(true);
      nextImage()
    } else if (e.key === 'ArrowLeft') {
      toggleTransition(true);
      prevImage();
    } 
  }}>
    <div class="flex h-full">
      <figure class="absolute left-6 top-6 w-28">
        <img src="./assets/img/logo-full.svg"/>
        <figcaption class="pt-1 text-right text-[10px] font-bold italic text-[mediumpurple]">BETA</figcaption>
      </figure>
      <div class="h-full flex-1 bg-zinc-800" tabindex="0" ref={gallery}>
        {ss().length ?
          <div class="relative h-full">
            <div class="absolute" />
            <div class="absolute bottom-6 left-5 z-10 opacity-60 hover:opacity-100">
              <div class="mb-1 text-lg text-gray-50">
                <svg fill="currentColor" height="1em" viewBox="0 0 576 512"><path d="M64 112c-8.8 0-16 7.2-16 16V384c0 8.8 7.2 16 16 16H512c8.8 0 16-7.2 16-16V128c0-8.8-7.2-16-16-16H64zM0 128C0 92.7 28.7 64 64 64H512c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128zM176 320H400c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V336c0-8.8 7.2-16 16-16zm-72-72c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H120c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H120c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H200c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H200c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H280c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H280c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H360c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H360c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H440c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H440c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16z"/></svg>
              </div>
              <div class="pb-[2px] text-sm text-gray-50"><b>Shift + Delete</b> to delete frame. </div>
              <div class="pb-[2px] text-sm text-gray-50"><b>Ctrl + Shift + Delete</b> to delete all frames following the current one.</div>
              <div class="text-sm text-gray-50"><b>Shift + Left Arrow/Right Arrow</b> to switch between frames without transition.</div>
            </div>
            <button style={{display: currentImage() === 0 ? 'none': 'inline'}} class="absolute left-0 top-[45%] z-10 translate-y-[-50%] cursor-pointer p-4 text-5xl text-gray-300 hover:text-white" onClick={prevImage}>◂</button>
            <button style={{display: currentImage() === ss().length - 1 ? 'none': 'inline'}}  class="absolute right-0 top-[45%] z-10 translate-y-[-50%] cursor-pointer p-4 text-5xl text-gray-300 hover:text-white" onClick={nextImage}>▸</button>
            <div class="relative h-full w-full overflow-hidden text-center">
              <For each={ss()}>{({src, id}, i) =>
                <div tabIndex="-1" style={{
                  '--tw-translate-x': `${i() < currentImage() ? -1 * (currentImage() - i()) * 100: i() > currentImage() ? (i() - currentImage()) * 100 : 0}%`,
                  'position': currentImage() !== i() ? 'absolute': 'relative'
                // eslint-disable-next-line tailwindcss/migration-from-tailwind-2
                }} class={`absolute left-0 top-0 my-[-30px] flex h-full w-full translate-x-[0%] transform items-center justify-center px-5 outline-none ${transitionEnabled() ? 'duration-250 transition-transform delay-0 ease-in-out': ''}`}>
                  <img src={src} alt={`Image ${currentImage() + 1}`} class="max-h-[80vh]"/>
                  <div class="absolute bottom-6 left-[48%] text-lg text-gray-400">
                    {i() + 1} of {ss().length}
                  </div>
                  <div class="absolute bottom-6 right-5 text-lg text-gray-400">
                    {id}
                  </div>
                </div>
              }</For>
            </div>
          </div> : null}
      </div>
      <div class="flex basis-96 bg-[#eee]">
        <div class="flex w-full flex-col">
          <div class="flex w-full flex-1 flex-col items-center border-b border-[#ccc] py-[20px]">
            <div class="relative flex w-full items-center justify-center">
              <details class="absolute left-[20px] top-[-12px] z-20 pt-1 text-[#333]">
                <summary class="cursor-pointer">Need help?</summary>
                <p class="absolute top-7 w-72 border border-[#777] bg-[antiquewhite] px-2 py-1">Check out the <a class="text-blue-600 underline" target="_blank" href="https://github.com/vegetableman/betamax">README</a>. To report or know more about existing issues, go <a class="text-blue-600 underline" target="_blank" href="https://github.com/vegetableman/betamax/issues/">here</a>.</p>
              </details>
              <div class="relative flex items-center pt-3">
                <input disabled={generating()} class="peer absolute z-10 h-12 w-full cursor-pointer select-none text-transparent outline-none" type="file" accept=".zip" ref={fileInput} onChange={async (event) => {
                  const zipFileInput = event.target;
                  if (zipFileInput.files.length > 0) {
                    const selectedZipFile = zipFileInput.files[0];
                    setFileName(selectedZipFile.name.split('.zip')[0]);
                    //@ts-expect-error jszip is included globally as script tag 
                    const zip = new JSZip();
                    const zipData = await zip.loadAsync(selectedZipFile);
                    const fileNames = Object.keys(zipData.files);

                    fileNames.sort((a, b) => {
                      const aNum = parseInt(a.split(".")[0]);
                      const bNum = parseInt(b.split(".")[0]);
                      return aNum - bNum;
                    });

                    setScreenshots([]);
                    setTimes([]);

                    for (const fileName of fileNames) {
                      const fileEntry = zipData.files[fileName];
                      const b64 = await fileEntry.async("base64");
                      const [t, format] = fileEntry.name.split('.');
                      setScreenshots([...ss(), {src: `data:image/${format};base64,${b64}`, id: fileEntry.name}]);
                      setTimes([...times(), parseInt(t)]);
                    }

                    setTimeout(() => {
                      gallery.focus();
                    }, 10);
                  }
                }}/>
                <button disabled={generating()} class="border-outset my-[10px] flex items-center border-2 border-[#0f328f] bg-[#0349ff] px-3 py-[10px] text-sm font-medium text-white peer-hover:bg-[#0944dd]" onClick={() => {
                  fileInput.click();
                }}>
                  <span class="relative top-[-1px] pr-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="yellow" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg></span>
                  <span>Select zip</span>
                </button>
                <div class="flex h-[43px] w-fit max-w-[200px] items-center break-all rounded-r-sm border-2 border-l-0 border-[#777] px-2 text-[13px] leading-[1.3] text-[#333]">
                  {fileName() ? `${fileName()}.zip`: 'No file choosen'}
                </div>
              </div>
              <div class="absolute right-[20px] top-[-10px] cursor-pointer text-sm underline hover:opacity-70" onClick={() => {
                aboutDialog.showModal();
              }}>About</div>

            </div>
            {exampleFileName() && 
              <div class="mb-1 max-w-[90%] break-all text-center text-[#555]">
              Recently downloaded file name:
                <br/> 
                <b class="font-semibold text-[#666]">{exampleFileName()}</b>
              </div>}
            <div class="flex items-center p-2">
              <span class="pr-2 text-sm text-[#333]">Resize factor</span> 
              <select class="my-[10px] ml-1 w-16 cursor-pointer rounded-sm border-2 border-solid border-[#777] p-[5px] text-xs font-medium text-[#555]" onChange={(e) => {
                const { value } = e.target;
                value && setResizeFactor(parseFloat(value));
              }}>
                <option disabled>Select resize factor</option>
                <option value="1" selected>1</option>
                <option value="0.75">3/4</option>
                <option value="0.5">1/2</option>
              </select>
              <div class="group relative cursor-pointer">
                <svg class="ml-2 fill-[antiquewhite] text-[#777]" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                <span class="absolute right-0 z-10 hidden w-[199px] border border-[#777] bg-[antiquewhite] p-1 group-hover:inline">Set resize factor to scale images and the packed image.</span>
              </div>
            </div>
            <div class="flex items-center p-2">
              <span class="pr-2 text-sm text-[#333]">Packing Optimization</span> 
              <select class="my-[10px] ml-1 w-full max-w-[120px] cursor-pointer rounded-sm border-2 border-solid border-[#777] p-[5px] text-xs font-medium text-[#555]" onChange={(e) => {
                const { value } = e.target;
                value && setPackingMode(parseFloat(value));
              }}>
                <option disabled>Select packing optimization</option>
                <option value="1" selected>High (slowest)</option>
                <option value="0.5">Medium</option>
                <option value="0">None (fastest)</option>
              </select>
            </div>
            <details class="flex w-full flex-col items-center p-2">
              <summary class="m-auto max-w-[fit-content] cursor-pointer bg-[#ccc] px-[5px] py-[2px]">Advanced</summary>
              <div class="flex w-full flex-col">
                <div class="flex items-center justify-evenly px-3 pt-4">
                  <span class="pr-2 text-sm text-[#333]">Simplification Tolerance</span> 
                  <input type="text" value={tolerance()} class="max-w-[70px] rounded-sm border-2 border-solid border-[#777] p-[5px] text-[#555]" onChange={(e) => {
                    const {value} = e.target;
                    const v = parseInt(value);
                    !Number.isNaN(v) && v > 0 && setTolerance(v);
                  }} />
                </div>
                <div class="flex items-center justify-around px-3 pr-[2px] pt-4">
                  <span class="pr-2 text-sm text-[#333]">Allocation Size</span> 
                  <input type="text" value={allocation()} class="max-w-[70px] rounded-sm border-2 border-solid border-[#777] p-[5px] text-[#555]" onChange={(e) => {
                    const {value} = e.target;
                    const v = parseInt(value);
                    !Number.isNaN(v) && v > 0 && setAllocation(v);
                  }} />
                </div>
              </div>
            </details>
            <button style={{cursor: generating()? 'default': 'pointer'}} disabled={!ss()?.length} class="border-outset hover:not-disabled:bg-[#fb3a00] relative my-[10px] h-10 w-40 border-2 border-[#ef5527] bg-[#f46236] px-2 py-[10px] text-sm font-medium text-white disabled:cursor-default disabled:opacity-70" onClick={generateAnimation}>
              <div class="absolute left-4 top-2 z-20">Generate animation</div>
              {generating() ? 
                <div class="ease animate-progress bg-progress-pattern absolute left-0 top-0 z-10 h-full w-full transition-all duration-300" />: null}
            </button>
            {generating() ? <div>
              <a class="cursor-pointer text-[blue] underline hover:opacity-75" onClick={() => {
                terminatePyodide();
                setIsGenerating(false);
                setMessages([...messages(), 'Cancelled.']);
              }}>Cancel</a>
            </div>: null}
          </div>
          {generating() || messages().length ? <ul ref={logScroller} class="basis-[400px] overflow-auto bg-[#ddd] px-5 py-3">
            <For each={messages()}>{(m, i) =>
              <li classList={{'text-red-600': err() && i() >= err().line, 'text-sm': true, 'leading-6': true}}> {'>'} {m()}</li>
            }</For>
            {packedImage() && !generating() ? <li class="text-sm leading-6">
              {" > "}
              <a class="cursor-pointer text-[blue] outline-none hover:underline" onClick={() => {
                displayOutput();
              }}>Show Result</a></li>: null}
          </ul>: null}
          {isOutput() ? <Portal>
            <div onKeyDown={(e) => {
              if (e.key === 'Escape') {
                showOutput(false);
              }
            }} class="absolute left-0 top-0 z-20 flex h-full w-full items-center justify-center bg-zinc-800">
              <figure class="absolute left-[25px] top-[25px] w-28">
                <img src="./assets/img/logo-full.svg"/>
                <figcaption class="pt-1 text-right text-[10px] font-bold italic text-[mediumpurple]">BETA</figcaption>
              </figure>
              <span class="absolute right-[20px] top-[16px] cursor-pointer text-[20px] text-gray-400 hover:text-white" onClick={() => {
                showOutput(false);
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </span>
              <canvas ref={canvas} class="max-h-[80vh]"/>
              <div class="shadow-tw absolute bottom-0 right-3 z-[1999999] w-96 overflow-hidden bg-white">
                <div class="rounded-t-lg bg-[white] transition-all delay-0 duration-200" classList={{'h-[500px]': isExpanded(), 'h-[44px]': !isExpanded()}}>
                  <div class="flex cursor-pointer justify-between border-b border-gray-200 bg-[#444] px-3 py-[10px]" onClick={() => {
                    toggleExpansion(!isExpanded());
                  }}>
                    <div class="flex items-center text-white">
                      <span class="text-base" style={{"color":"var(--p-color-text)"}}>Download files</span>
                    </div>
                  </div>
                  <div class="h-full overflow-auto pb-12 text-center">
                    <p class="p-3 pb-5 text-left text-sm">Below are the generated files, you can download them individually or as zip below:</p>
                    <ul class="relative flex flex-col items-center">
                      <li>
                        <img src={URL.createObjectURL(packedImage())} class="h-24 w-24 cursor-pointer border border-transparent object-cover hover:border-[crimson]" onClick={() => {
                          window.parent.postMessage({name: 'downloadFile', extension: format(), blob: packedImage(), file: fileName()}, '*');
                        }}/>
                      </li>
                      <li class="my-5">
                        <div class="flex items-center">
                          <input type="text" class="rounded-sm border-[#777] border-[1] bg-[#eee] p-1 text-sm" ref={timelineInput} value={timeline()}/>
                          <button class="scale-100 pl-1 active:scale-90" onClick={async () => {
                            try {
                              copyToClipboard(timelineInput.value);
                              toggleClipboardMsg(true);
                              setTimeout(() => {
                                toggleClipboardMsg(false);
                              }, 1000);
                            } catch (error) {
                              console.error('Failed to copy: ', error);
                            }
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                            </svg>
                          </button>
                        </div>
                      </li>
                      {showClipboardMsg() ? <li class="absolute bottom-0 right-3 text-[11px]">Copied to Clipboard!</li>: null}
                    </ul>
                    <button class="border-outset mr-4 border-2 border-[#fd6900] bg-[#fb6800] px-5 py-[10px] text-sm font-medium text-white hover:bg-[#fb3a00] disabled:cursor-default disabled:opacity-70" onClick={downloadZip}>
                      <span>Download as zip</span>
                    </button>
                    <div class="py-3 text-xs">Found it useful? consider <a target="_blank" class="cursor-pointer font-medium text-[#f76600] underline" onClick={() => {
                      window.parent.postMessage({name: 'coffee'}, '*');
                    }}>buying me a donut</a> 🍩😊</div>
                    <div class="px-3 pb-5">
                      <details ref={details} open={isDetailsOpen()} class="text-left" onToggle={(e) => {
                        const isOpen = e.target instanceof HTMLDetailsElement && e.target.open;
                        setDetailsOpen(isOpen);
                        window.parent.postMessage({name: 'isDetailsOpen', isOpen}, '*');
                      }}>
                        <summary class="cursor-pointer pb-2 pt-5 text-sm font-medium">
                          Details on the zip and steps to use it:
                        </summary>
                        <div class="px-[10px] text-sm">
                          <div class="pb-2">
                            The zip contains the following files:
                          </div>
                          <div class="pb-2">
                            <pre class="inline">packed_image.png</pre>: An image that packs all the differences between frames.
                          </div>
                          <div class="pb-2">
                            <pre class="inline">timeline.json</pre>: Contains the timeline array with information on each of those differences for the animation to work.
                          </div>
                          <div class="pb-2">
                            <pre class="inline">demo.html</pre>: To view the animated demo, open this file in the browser.
                          </div>
                          <div class="rounded-md border border-[#ddd] bg-[#eee] p-2 text-sm">
                            To use it, simply copy the lines from <b>line 6</b> until the closing <pre class="inline">script</pre> tag in the file <pre class="inline font-semibold">demo.html</pre> in the zip and paste/modify it in your code based on your needs.
                          </div>
                          <div class="py-2 text-xs">Need an example? To view the animated screencasts in action, you can checkout this <a class="text-[blue] outline-none hover:underline" target="_blank" href="https://vigneshanand.com/proposal-for-a-navigation-panel-for-complex-or-perhaps-bloated-admin-interfaces/">blog post</a>.</div>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Portal>: null}
        </div>
      </div>
    </div>
    <dialog ref={aboutDialog}>
      <img class="m-auto w-52" src="./assets/img/logo-full.svg"/>
      <div class="my-2 text-center">
        <p class="pt-2 text-xs">Version v{version()}-beta</p>
        <p class="pt-2 text-xs">Built by <a class="text-[blue] outline-none hover:underline" href="https://vigneshanand.com/" target="_blank">Vignesh Anand</a></p>
        <p class="pt-2 text-xs"><a class="text-[blue] hover:underline" href="https://github.com/vegetableman/betamax" target="_blank">https://github.com/vegetableman/betamax</a></p>
      </div>
      <button class="float-right mt-2 border border-black p-1 hover:underline" onClick={() => {
        aboutDialog.close();
      }}>close</button>
    </dialog>
  </div>
}

const styleContent = `
  input[type="file"]::-webkit-file-upload-button {
    visibility: hidden;
  }
  ::backdrop {
    background-image: linear-gradient(
      45deg,
      #87345e,
      mediumpurple
    );
    opacity: 0.75;
  }
  @font-face {
    font-family: "BTM__Inter";
    src: 
        url("chrome-extension://${chrome.runtime.id}/src/assets/fonts/Inter-Regular.woff2")
        format("woff2"),
        url("chrome-extension://${chrome.runtime.id}/src/assets/fonts/Inter-Regular.woff")
        format("woff");
  }
  @font-face {
    font-weight: 500;
    font-family: "BTM__Inter";
    src:
        url("chrome-extension://${chrome.runtime.id}/src/assets/fonts/Inter-Medium.woff2")
        format("woff2"),
        url("chrome-extension://${chrome.runtime.id}/src/assets/fonts/Inter-Medium.woff")
        format("woff");
  }
  @font-face {
    font-weight: 600;
    font-family: "BTM__Inter";
    src: 
        url("chrome-extension://${chrome.runtime.id}/src/assets/fonts/Inter-SemiBold.woff2")
        format("woff2"),
        url("chrome-extension://${chrome.runtime.id}/src/assets/fonts/Inter-SemiBold.woff")
        format("woff");
  }
  html, body {
    font-family: "BTM__Inter", Helvetica, system-ui;
  }
`

window.onload = async () => {
  const root = document.createElement("div");
  root.id = "frame-root";
  document.body.append(root);

  const style = document.createElement('style');
  style.textContent = styleContent;
  document.head.appendChild(style);

  render(() => {
    return <App/>
  }, root);

  await pyodide.load();
  IS_PYODIDE_LOADED = true;
}
