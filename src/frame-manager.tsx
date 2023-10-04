import 'virtual:windi.css';
import { For, createEffect, createSignal, onMount } from "solid-js";
import  {Portal, render} from "solid-js/web";
import pyodide from "./pyodide";
import JSZip from "jszip";
import DEMO_HTML from './demo.js';

const {hostname} = new URL(window.location.href);
window.chrome = {
  // @ts-ignore
  runtime: {
    getURL: (path) => {
      return `chrome-extension://${hostname}/${path}`
    }
  }
};

const logo = `
██████╗ ███████╗████████╗ █████╗ ███╗   ███╗ █████╗ ██╗  ██╗
██╔══██╗██╔════╝╚══██╔══╝██╔══██╗████╗ ████║██╔══██╗╚██╗██╔╝
██████╔╝█████╗     ██║   ███████║██╔████╔██║███████║ ╚███╔╝ 
██╔══██╗██╔══╝     ██║   ██╔══██║██║╚██╔╝██║██╔══██║ ██╔██╗ 
██████╔╝███████╗   ██║   ██║  ██║██║ ╚═╝ ██║██║  ██║██╔╝ ██╗
╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
`;

let IS_PYODIDE_LOADED = false;
const delay_scale = 0.9
let timer = null

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
  const [ss, setScreenshots] = createSignal([]);
  const [times, setTimes] = createSignal([]);
  const [format, setFormat] = createSignal('png');
  const [fileName, setFileName] = createSignal('No file choosen');
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

  const generateAnimation = async () => {
    if (generating()) return;

    setIsGenerating(true);
    setMessages([]);
    setMessages([...messages(), "Loading Pyodide..."]);
    if (!IS_PYODIDE_LOADED) {
      await pyodide.load();
    }
    setMessages([...messages(), "Pyodide is loaded."]);
    setMessages([...messages(), "Sending images to the worker..."]);
    pyodide.processImages({
      screenshots: ss().map((s) => s.src), times: times(), format: format(), resizeFactor: resizeFactor()}, async (done, payload) => {
      if (done) {
        setIsGenerating(false);
        const {image, timeline: tt} = payload;
        const url =  URL.createObjectURL(image);
        setPackedImage(image);
        setTimeline(JSON.stringify(tt));
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
    const zip = new JSZip();
    zip.file('timeline.js', `timeline=${timeline()}`);
    zip.file('packed_image.png', packedImage());
    zip.file('demo.html', DEMO_HTML);
    const blob = await zip.generateAsync({type: 'blob'});
    window.parent.postMessage({name: 'downloadFile', extension: 'zip', blob, file: `anim_${fileName()}`}, "*");
  }

  onMount(async () => {
    window.addEventListener('message', function(event) {
      if ( event.data instanceof Object) {
        setExampleFileName(event.data.fileName);
        setDetailsOpen(event.data.isDetailsOpen);
      }
    });
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
    } else if (e.shiftKey && e.key === 'Delete') {
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
    } else if (e.key === 'ArrowRight') {
      toggleTransition(true);
      nextImage()
    } else if (e.key === 'ArrowLeft') {
      toggleTransition(true);
      prevImage();
    } 
  }}>
    <div class="flex h-full">
      <pre class="absolute left-[25px] top-[25px] text-[mediumpurple] text-[3px] leading-[unset]">{logo}</pre>
      <div class="flex-1 bg-zinc-800 h-full" ref={gallery}>
        {ss().length ?
          <div class="relative h-full">
            <div class="absolute"></div>
            <div class="absolute left-5 bottom-6 opacity-60 hover:opacity-100 z-10">
              <div class="text-lg">⌨</div>
              <div class="text-sm text-gray-400 pb-[2px]"><b>Shift + Delete</b> to delete image. </div>
              <div class="text-sm text-gray-400 pb-[2px]"><b>Ctrl + Shift + Delete</b> to delete all images following the current one.</div>
              <div class="text-sm text-gray-400"><b>Shift + Left Arrow/Right Arrow</b> to switch between images without transition.</div>
            </div>
            <button style={{display: currentImage() === 0 ? 'none': 'inline'}} class="absolute top-[45%] transform -translate-y-[50%] cursor-pointer left-0 text-gray-300 p-4 text-5xl z-10 hover:text-white" onClick={prevImage}>◂</button>
            <button style={{display: currentImage() === ss().length - 1 ? 'none': 'inline'}}  class="absolute top-[45%] transform -translate-y-[50%] cursor-pointer right-0 text-gray-300 p-4 text-5xl z-10 hover:text-white" onClick={nextImage}>▸</button>
            <div class="relative h-full w-full overflow-hidden text-center">
              <For each={ss()}>{({src, id}, i) =>
                <div tabIndex="-1" style={{
                  '--tw-translate-x': `${i() < currentImage() ? -1 * (currentImage() - i()) * 100: i() > currentImage() ? (i() - currentImage()) * 100 : 0}%`,
                  'position': currentImage() !== i() ? 'absolute': 'relative'
                }} class={`absolute outline-none left-0 top-0 h-full w-full flex items-center justify-center transform translate-x-[0%] ${transitionEnabled() ? 'transition-transform duration-250 ease-in-out delay-0': ''}`}>
                  <img src={src} alt={`Image ${currentImage() + 1}`} />
                  <div class="absolute text-xl left-[48%] bottom-6 text-gray-400">
                    {i() + 1} of {ss().length}
                  </div>
                  <div class="absolute text-xl right-4 bottom-6 text-gray-400">
                    {id}.png
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
              <input disabled={generating()} class="absolute select-none h-12 z-10 text-transparent cursor-pointer outline-none w-full peer" type="file" accept=".zip" ref={fileInput} onchange={async (event) => {
                const zipFileInput = event.target;
                if (zipFileInput.files.length > 0) {
                  const selectedZipFile = zipFileInput.files[0];
                  setFileName(selectedZipFile.name.split('.zip')[0]);
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
                    const t = fileEntry.name.split('.png')[0];
                    setScreenshots([...ss(), {src: `data:image/png;base64,${b64}`, id: t}]);
                    setTimes([...times(), parseInt(t)]);
                  }
                }
              }}/>
              <button disabled={generating()} class="py-[10px] px-3 my-[10px] text-sm border-outset text-white bg-[#0349ff] peer-hover:bg-[#0944dd] border-[#0f328f] border-2" onclick={() => {
                fileInput.click();
              }}>
                <span class="relative pr-2 top-[-2px]">📁</span>
                <span>Select zip</span>
              </button>
              <div class="flex items-center px-1 w-fit max-w-[200px] h-[43px] border-2 border-[#333] text-[#666] text-sm border-l-0">
                {fileName()}
              </div>
            </div>
            {exampleFileName() && <div>Recently downloaded file name: <b style="font-weight: 600;">{exampleFileName()}</b></div>}
            <div class="items-center flex">
              <span class="text-sm">Resize factor:</span> 
              <select class="p-[10px] border-2 border-solid border-[#333] my-[10px] text-xs w-16 ml-1" onchange={(e) => {
                const { value } = e.target;
                value && setResizeFactor(parseFloat(value));
              }}>
                <option disabled>Select resize factor</option>
                <option value="1" selected>1</option>
                <option value="0.5">1/2</option>
                <option value="0.75">3/4</option>
              </select>
              <div class="relative group cursor-pointer">
                <svg class="ml-2" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-info"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span class="hidden group-hover:inline absolute bg-white p-1 w-48 b-[-50px] right-0 border border-[#ddd]">Set resize factor to scale images.</span>
              </div>
            </div>
            <select class="p-[10px] border-2 border-solid border-[#333] my-[10px] text-xs" onchange={(e) => {
              const { value } = e.target;
              value && setFormat(value);
            }}>
              <option disabled>Select format</option>
              <option value="png" selected>PNG</option>
              <option value="webp">WEBP</option>
            </select>
            <button style={{cursor: generating()? 'default': 'pointer'}} disabled={!ss()?.length} class="relative py-[10px] px-2 my-[10px] w-40 h-10 border-[#ef5527] bg-[#f46236] text-white text-sm border-outset border-2 disabled:opacity-70 disabled:cursor-default hover:not-disabled:bg-[#fb3a00]" onclick={generateAnimation}>
              <div class="absolute left-4 top-2 z-20">Generate animation</div>
              {generating() ? 
              <div class="absolute left-0 top-0 w-full h-full bg-progress-pattern transition-all duration-300 ease animate-progress z-10"></div>: null}
            </button>
            <div>
             {generating() ? <a class="underline text-[blue] cursor-pointer hover:opacity-75" onclick={() => {
              IS_PYODIDE_LOADED = false; 
              pyodide.terminate(); 
              setIsGenerating(false);
              setMessages([...messages(), 'Cancelled.']);
              }}>Cancel</a>: null}
            </div>
          </div>
          {generating() || messages().length ? <ul ref={logScroller} class="px-5 basis-[400px] py-3 bg-[#ddd] overflow-auto">
            <For each={messages()}>{(m) =>
              <li class="text-sm leading-6"> {'>'} {m()}</li>
            }</For>
          </ul>: null}
          {isOutput() ? <Portal>
            <div onkeydown={(e) => {
                if (e.key === 'Escape') {
                showOutput(false);
              }
            }} class="absolute flex items-center justify-center top-0 left-0 w-full h-full bg-zinc-800 z-20">
              <pre class="absolute left-[25px] top-[25px] text-[mediumpurple] text-[3px] leading-[unset]">{logo}</pre>
              <span class="absolute text-[20px] top-[16px] right-[20px] text-gray-400 cursor-pointer hover:text-white" onclick={() => {
                showOutput(false);
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </span>
              <canvas ref={canvas}/>
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
                    <p class="text-sm p-3 text-left">Below are the generated files, you can download them individually or as zip below:</p>
                    <ul class="flex flex-col items-center relative">
                      <li>
                        <img src={URL.createObjectURL(packedImage())} class="object-cover w-24 h-24 cursor-pointer border border-transparent hover:border-[crimson]" onclick={() => {
                          window.parent.postMessage({name: 'downloadFile', extension: 'png', blob: packedImage(), file: fileName()}, "*");
                        }}/>
                      </li>
                      <li class="my-5">
                        <div class="flex items-center">
                          <input type="text" class="bg-[#eee] text-sm p-1 rounded-sm border-[#ddd] border-[1]" ref={timelineInput} value={timeline()}/>
                          <button class="pl-1 transform scale-100 active:scale-90" onclick={async () => {
                            try {
                                await navigator.clipboard.writeText(timelineInput.value);
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
                    <button class="py-[10px] px-5 mr-4 border-[#fd6900] bg-[#fb6800] text-white text-sm border-outset border-2 disabled:opacity-70 disabled:cursor-default hover:bg-[#fb3a00]" onclick={downloadZip}>
                      <span>Download as zip</span>
                    </button>
                    <div class="py-3">Found it useful? <a target="_blank" class="underline text-[#f76600] font-medium" href="https://www.buymeacoffee.com/vigneshanand">buy me a beer</a> 🍺😊</div>
                    <div class="px-3 pb-5">
                      <details ref={details} open={isDetailsOpen()} class="text-left" ontoggle={(e) => {
                        const isOpen = e.target instanceof HTMLDetailsElement && e.target.open;
                        setDetailsOpen(isOpen);
                        window.parent.postMessage({name: 'isDetailsOpen', isOpen}, "*");
                      }}>
                        <summary class="py-2 cursor-pointer text-sm font-medium">
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
                            <pre class="inline">timeline.js</pre>: Contains the timeline array with information on each of those differences for the animation to work.
                          </div>
                          <div class="pb-2">
                            <pre class="inline">demo.html</pre>: Links to both files above. You could open this file in the browser to see the animated demo.
                          </div>
                          <div class="bg-[#eee] border border-[#ddd] text-sm leading-5 px-2 py-2 rounded-md">
                            To use it, simply copy the lines from <b>line 6</b> to <b>line 63</b> on the file <pre class="inline font-semibold">demo.html</pre> in the zip and paste/modify it in your code based on your needs.
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
  </div>
}

const styleContent = `
  input[type="file"]::-webkit-file-upload-button {
    visibility: hidden;
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
