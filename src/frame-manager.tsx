import 'virtual:windi.css';
import { For, createEffect, createSignal, onMount } from "solid-js";
import  {Portal, render} from "solid-js/web";
import pyodide from "./pyodide";
import DEMO_HTML from './demo.js';
import { copyToClipboard } from './pages/content/utils';

const { hostname } = new URL(window.location.href);
window.chrome = {
  // @ts-ignore
  runtime: {
    getURL: (path) => {
      return `chrome-extension://${hostname}/${path}`
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
  let run_time = 0;
  for (let j = 0; j < timeline.length - 1; ++j)
    run_time += timeline[j].delay;

  let f = function()
  {
    let frame = i++ % timeline.length;
    let delay = timeline[frame].delay * delay_scale;
    let blits = timeline[frame].blit;
    let ctx = canvas.getContext('2d');
    for (let j = 0; j < blits.length; ++j)
    {
      let blit = blits[j];
      let sx = blit[0];
      let sy = blit[1];
      let w = blit[2];
      let h = blit[3];
      let dx = blit[4];
      let dy = blit[5];
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
  const [format, _setFormat] = createSignal('png');
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
      screenshots: ss().map((s) => s.src), times: times(), format: format(), resizeFactor: resizeFactor(), packingMode: packingMode()}, async (done, payload) => {
      if (done) {
        setIsGenerating(false);
        const {image, timeline: tt} = payload;
        const url =  URL.createObjectURL(image);
        setPackedImage(image);
        setTimeline(JSON.stringify(tt));
        terminatePyodide();
        showOutput(true);
        var im = new Image();
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

  const downloadZip = async () => {
    //@ts-expect-error
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

  return <div onkeydown={(e) => {
    e.preventDefault();
    // disable transition on shift
    if (e.shiftKey && e.key === 'ArrowRight') {
      toggleTransition(false);
      nextImage();
    } else if (e.shiftKey && e.key === 'ArrowLeft') {
      toggleTransition(false);
      prevImage();
    } else if (e.shiftKey && e.ctrlKey && e.key === 'Delete') {
      setScreenshots((ss) => {
        let ss_ = [...ss];
        ss_.splice(currentImage() + 1);
        return ss_;
      });
      setTimes((t) => {
        let t_ = [...t];
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
        let ss_ = [...ss];
        ss_.splice(currentImage(), 1);
        return ss_;
      });
      setTimes((t) => {
        let t_ = [...t];
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
        <figcaption class="text-right text-[10px] pt-1 text-[mediumpurple] font-bold italic">BETA</figcaption>
      </figure>
      <div class="flex-1 bg-zinc-800 h-full" tabindex="0" ref={gallery}>
        {ss().length ?
          <div class="relative h-full">
            <div class="absolute"></div>
            <div class="absolute left-5 bottom-6 opacity-60 hover:opacity-100 z-10">
              <div class="text-lg text-gray-50 mb-1">
                <svg fill="currentColor" height="1em" viewBox="0 0 576 512"><path d="M64 112c-8.8 0-16 7.2-16 16V384c0 8.8 7.2 16 16 16H512c8.8 0 16-7.2 16-16V128c0-8.8-7.2-16-16-16H64zM0 128C0 92.7 28.7 64 64 64H512c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128zM176 320H400c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V336c0-8.8 7.2-16 16-16zm-72-72c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H120c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H120c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H200c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H200c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H280c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H280c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H360c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H360c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H440c-8.8 0-16-7.2-16-16V248zm16-96h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H440c-8.8 0-16-7.2-16-16V168c0-8.8 7.2-16 16-16z"/></svg>
              </div>
              <div class="text-sm text-gray-50 pb-[2px]"><b>Shift + Delete</b> to delete frame. </div>
              <div class="text-sm text-gray-50 pb-[2px]"><b>Ctrl + Shift + Delete</b> to delete all frames following the current one.</div>
              <div class="text-sm text-gray-50"><b>Shift + Left Arrow/Right Arrow</b> to switch between frames without transition.</div>
            </div>
            <button style={{display: currentImage() === 0 ? 'none': 'inline'}} class="absolute top-[45%] transform -translate-y-[50%] cursor-pointer left-0 text-gray-300 p-4 text-5xl z-10 hover:text-white" onClick={prevImage}>◂</button>
            <button style={{display: currentImage() === ss().length - 1 ? 'none': 'inline'}}  class="absolute top-[45%] transform -translate-y-[50%] cursor-pointer right-0 text-gray-300 p-4 text-5xl z-10 hover:text-white" onClick={nextImage}>▸</button>
            <div class="relative h-full w-full overflow-hidden text-center">
              <For each={ss()}>{({src, id}, i) =>
                <div tabIndex="-1" style={{
                  '--tw-translate-x': `${i() < currentImage() ? -1 * (currentImage() - i()) * 100: i() > currentImage() ? (i() - currentImage()) * 100 : 0}%`,
                  'position': currentImage() !== i() ? 'absolute': 'relative'
                }} class={`absolute px-5 my-[-30px] outline-none left-0 top-0 h-full w-full flex items-center justify-center transform translate-x-[0%] ${transitionEnabled() ? 'transition-transform duration-250 ease-in-out delay-0': ''}`}>
                  <img src={src} alt={`Image ${currentImage() + 1}`} class="max-h-[80vh]"/>
                  <div class="absolute text-lg left-[48%] bottom-6 text-gray-400">
                    {i() + 1} of {ss().length}
                  </div>
                  <div class="absolute text-lg right-5 bottom-6 text-gray-400">
                    {id}
                  </div>
                </div>
              }</For>
            </div>
          </div> : null}
      </div>
      <div class="flex basis-96 bg-[#eee]">
        <div class="flex flex-col w-full">
          <div class="flex flex-col flex-1 items-center w-full py-[20px] border-b border-[#ccc]">
            <div class="flex items-center w-full relative justify-center">
              <details class="absolute top-[-12px] left-[20px] z-20 pt-1 text-[#333]">
                <summary class="cursor-pointer">Need help?</summary>
                <p class="absolute top-7 w-72 bg-[antiquewhite] border border-[#777] py-1 px-2">Check out the <a class="text-blue-600 underline" target="_blank" href="https://github.com/vegetableman/betamax">README</a>. To report or know more about existing issues, go <a class="text-blue-600 underline" target="_blank" href="https://github.com/vegetableman/betamax/issues/">here</a>.</p>
              </details>
              <div class="relative flex items-center pt-3">
                <input disabled={generating()} class="absolute select-none h-12 z-10 text-transparent cursor-pointer outline-none w-full peer" type="file" accept=".zip" ref={fileInput} onchange={async (event) => {
                  const zipFileInput = event.target;
                  if (zipFileInput.files.length > 0) {
                    const selectedZipFile = zipFileInput.files[0];
                    setFileName(selectedZipFile.name.split('.zip')[0]);
                    //@ts-expect-error
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
                <button disabled={generating()} class="flex items-center py-[10px] px-3 my-[10px] text-sm border-outset font-medium text-white bg-[#0349ff] peer-hover:bg-[#0944dd] border-[#0f328f] border-2" onclick={() => {
                  fileInput.click();
                }}>
                  <span class="relative pr-2 top-[-1px]"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="yellow" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round" class="feather feather-folder"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span>
                  <span>Select zip</span>
                </button>
                <div class="flex items-center px-2 w-fit max-w-[200px] h-[43px] border-2 border-[#777] text-[#333] text-[13px] leading-[1.3] border-l-0 rounded-br-sm rounded-tr-sm break-all">
                  {fileName() ? `${fileName()}.zip`: 'No file choosen'}
                </div>
              </div>
              <div class="absolute top-[-10px] right-[20px] text-sm cursor-pointer underline hover:opacity-70" onclick={() => {
                aboutDialog.showModal();
              }}>About</div>

            </div>
            {exampleFileName() && <div class="text-center max-w-[90%] break-all">Recently downloaded file name: <b style="font-weight: 600;">{exampleFileName()}</b></div>}
            <div class="items-center flex p-2">
              <span class="text-sm pr-2 text-[#333]">Resize factor</span> 
              <select class="p-[5px] border-2 border-solid border-[#777] text-[#555] rounded-sm my-[10px] text-xs w-16 ml-1 font-medium cursor-pointer" onchange={(e) => {
                const { value } = e.target;
                value && setResizeFactor(parseFloat(value));
              }}>
                <option disabled>Select resize factor</option>
                <option value="1" selected>1</option>
                <option value="0.75">3/4</option>
                <option value="0.5">1/2</option>
              </select>
              <div class="relative group cursor-pointer">
                <svg class="ml-2 text-[#777] fill-[antiquewhite]" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span class="hidden group-hover:inline absolute bg-[antiquewhite] p-1 w-[199px] b-[-50px] right-0 border border-[#777] z-10">Set resize factor to scale images and the packed image.</span>
              </div>
            </div>
            <div class="items-center flex p-2">
              <span class="text-sm pr-2 text-[#333]">Packing Optimization</span> 
              <select class="p-[5px] border-2 border-solid border-[#777] text-[#555] rounded-sm my-[10px] text-xs w-full max-w-[120px] ml-1 font-medium cursor-pointer" onchange={(e) => {
                const { value } = e.target;
                value && setPackingMode(parseFloat(value));
              }}>
                <option disabled>Select packing optimization</option>
                <option value="1" selected>High (slowest)</option>
                <option value="0.5">Medium</option>
                <option value="0">None (fastest)</option>
              </select>
            </div>
            <button style={{cursor: generating()? 'default': 'pointer'}} disabled={!ss()?.length} class="relative py-[10px] px-2 my-[10px] w-40 h-10 border-[#ef5527] bg-[#f46236] text-white text-sm border-outset border-2 disabled:opacity-70 disabled:cursor-default hover:not-disabled:bg-[#fb3a00] font-medium" onclick={generateAnimation}>
              <div class="absolute left-4 top-2 z-20">Generate animation</div>
              {generating() ? 
              <div class="absolute left-0 top-0 w-full h-full bg-progress-pattern transition-all duration-300 ease animate-progress z-10"></div>: null}
            </button>
            {generating() ? <div>
              <a class="underline text-[blue] cursor-pointer hover:opacity-75" onclick={() => {
                terminatePyodide();
                setIsGenerating(false);
                setMessages([...messages(), 'Cancelled.']);
                }}>Cancel</a>
              </div>: null}
          </div>
          {generating() || messages().length ? <ul ref={logScroller} class="px-5 basis-[400px] py-3 bg-[#ddd] overflow-auto">
            <For each={messages()}>{(m, i) =>
              <li classList={{'text-red-600': err() && i() >= err().line, 'text-sm': true, 'leading-6': true}}> {'>'} {m()}</li>
            }</For>
          </ul>: null}
          {isOutput() ? <Portal>
            <div onkeydown={(e) => {
                if (e.key === 'Escape') {
                showOutput(false);
              }
            }} class="absolute flex items-center justify-center top-0 left-0 w-full h-full bg-zinc-800 z-20">
              <div class="absolute left-[25px] top-[25px] w-28">
                <img src="./assets/img/logo-full.svg"/>
              </div>
              <span class="absolute text-[20px] top-[16px] right-[20px] text-gray-400 cursor-pointer hover:text-white" onclick={() => {
                showOutput(false);
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </span>
              <canvas ref={canvas} class="max-h-[80vh]"/>
              <div class="absolute w-96 right-3 bottom-0 shadow-tw bg-white z-[1999999] overflow-hidden">
                <div class="rounded-t-lg bg-[white] transition-all delay-0 duration-200" classList={{'h-[500px]': isExpanded(), 'h-[44px]': !isExpanded()}}>
                  <div class="flex justify-between py-[10px] px-3 cursor-pointer border-b border-gray-200 bg-[#444]" onClick={() => {
                    toggleExpansion(!isExpanded());
                  }}>
                    <div class="flex items-center text-white">
                      <span class="text-base" style="color: var(--p-color-text)">Download files</span>
                    </div>
                  </div>
                  <div class="text-center h-full overflow-auto pb-12">
                    <p class="text-sm p-3 pb-5 text-left">Below are the generated files, you can download them individually or as zip below:</p>
                    <ul class="flex flex-col items-center relative">
                      <li>
                        <img src={URL.createObjectURL(packedImage())} class="object-cover w-24 h-24 cursor-pointer border border-transparent hover:border-[crimson]" onclick={() => {
                          window.parent.postMessage({name: 'downloadFile', extension: format(), blob: packedImage(), file: fileName()}, '*');
                        }}/>
                      </li>
                      <li class="my-5">
                        <div class="flex items-center">
                          <input type="text" class="bg-[#eee] text-sm p-1 rounded-sm border-[#777] border-[1]" ref={timelineInput} value={timeline()}/>
                          <button class="pl-1 transform scale-100 active:scale-90" onclick={async () => {
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-clipboard">
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                          </button>
                        </div>
                      </li>
                      {showClipboardMsg() ? <li class="absolute bottom-0 right-3 text-[11px]">Copied to Clipboard!</li>: null}
                    </ul>
                    <button class="py-[10px] px-5 mr-4 border-[#fd6900] bg-[#fb6800] text-white text-sm border-outset border-2 disabled:opacity-70 disabled:cursor-default hover:bg-[#fb3a00] font-medium" onclick={downloadZip}>
                      <span>Download as zip</span>
                    </button>
                    <div class="py-3 text-xs">Found it useful? consider <a target="_blank" class="underline text-[#f76600] font-medium cursor-pointer" onclick={() => {
                       window.parent.postMessage({name: 'coffee'}, '*');
                    }}>buying me a donut</a> 🍩😊</div>
                    <div class="px-3 pb-5">
                      <details ref={details} open={isDetailsOpen()} class="text-left" ontoggle={(e) => {
                        const isOpen = e.target instanceof HTMLDetailsElement && e.target.open;
                        setDetailsOpen(isOpen);
                        window.parent.postMessage({name: 'isDetailsOpen', isOpen}, '*');
                      }}>
                        <summary class="pt-5 pb-2 cursor-pointer text-sm font-medium">
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
                          <div class="bg-[#eee] border border-[#ddd] text-sm px-2 py-2 rounded-md">
                            To use it, simply copy the lines from <b>line 6</b> until the closing <pre class="inline">script</pre> tag in the file <pre class="inline font-semibold">demo.html</pre> in the zip and paste/modify it in your code based on your needs.
                          </div>
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
      <img class="w-52 m-auto" src="./assets/img/logo-full.svg"/>
      <div class="text-center my-2">
        <p class="text-xs pt-2">Version v{version()}-beta</p>
        <p class="text-xs pt-2">Built by <a class="text-[blue] outline-none hover:underline" href="https://vigneshanand.com/" target="_blank">Vignesh Anand</a>.</p>
        <p class="text-xs pt-2"><a class="text-[blue] hover:underline" href="https://github.com/vegetableman/betamax" target="_blank">https://github.com/vegetableman/betamax</a></p>
      </div>
      <button class="hover:underline border border-black mt-2 p-1 float-right" onclick={() => {
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
