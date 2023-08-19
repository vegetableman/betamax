import 'virtual:windi.css'
import { For, createSignal } from "solid-js";
import  {Portal, render} from "solid-js/web";
import pyodide from "./pyodide";
import JSZip from "jszip";

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
  const [ss, setScreenshots] = createSignal([]);
  const [times, setTimes] = createSignal([]);
  const [format, setFormat] = createSignal('png');
  const [fileName, setFileName] = createSignal('No file choosen');
  const [currentImage, setCurrentImage] = createSignal(0);
  const [messages, setMessages] = createSignal([]);
  const [generating, setIsGenerating] = createSignal(false);
  const [isOutput, showOutput] = createSignal(false);
  const [isExpanded, toggleExpansion] = createSignal(false);

  const generateAnimation = async () => {
    if (generating()) return;

    setIsGenerating(true);
    setMessages([]);
    setMessages([...messages(), "Loading Pyodide..."]);
    if (!IS_PYODIDE_LOADED) {
      await pyodide.load();
    }
    setMessages([...messages(), "Pyodide is loaded."]);
    setMessages([...messages(), "Sending images to worker..."]);
    pyodide.processImages({
      screenshots: ss().map((s) => s.src), times: times(), format: format(), dimension: null}, (done, payload) => {
      if (done) {
        setIsGenerating(false);
        const {image, timeline} = payload;
        const url = URL.createObjectURL(image);
        showOutput(true);
        var im = new Image();
        im.onload = function()
        {
          const blits = timeline[0].blit[0];
          canvas.width = blits[2];
          canvas.height = blits[3];
          animate(im, timeline, canvas);
        };
        im.src = url;
      } else {
        const {message} = payload;
        setMessages([...messages(), message]);
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

  return <div onkeydown={(e) => {
    if (e.key === 'ArrowRight') {
      nextImage()
    } else if (e.key === 'ArrowLeft') {
      prevImage();
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
      })
    }
  }}>
    <div class="flex h-full">
      <pre class="absolute left-[25px] top-[25px] text-[mediumpurple] text-[3px] leading-[unset]">{logo}</pre>
      <div class="flex-1 bg-zinc-800 h-full">
        {ss().length ?
          <div class="relative h-full">
            <div class="absolute"></div>
            <div class="absolute right-4 top-3 text-gray-400 text-sm"><b>Shift + Delete</b> to delete image</div>
            <button style={{display: currentImage() === 0 ? 'none': 'inline'}} class="absolute top-[45%] transform -translate-y-[50%] cursor-pointer left-0 text-gray-300 p-4 text-5xl z-10 hover:text-white" onClick={prevImage}>◂</button>
            <button style={{display: currentImage() === ss().length - 1 ? 'none': 'inline'}}  class="absolute top-[45%] transform -translate-y-[50%] cursor-pointer right-0 text-gray-300 p-4 text-5xl z-10 hover:text-white" onClick={nextImage}>▸</button>
            <div class="relative h-full w-full overflow-hidden text-center">
              <For each={ss()}>{({src, id}, i) =>
                <div tabIndex="-1" style={{
                  '--tw-translate-x': `${i() < currentImage() ? -1 * (currentImage() - i()) * 100: i() > currentImage() ? (i() - currentImage()) * 100 : 0}%`,
                  'position': currentImage() !== i() ? 'absolute': 'relative'
                }} class={`absolute outline-none left-0 top-0 h-full w-full flex items-center justify-center transform translate-x-[0%] transition-transform duration-250 ease-in-out delay-0`}>
                  <img src={src} alt={`Image ${currentImage() + 1}`} />
                  <div class="absolute text-xl left-[48%] bottom-5 text-gray-400">
                    {i() + 1} of {ss().length}
                  </div>
                  <div class="absolute text-xl right-4 bottom-5 text-gray-400">
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
            <input type="file" accept=".zip" ref={fileInput} style="display:none;" onchange={async (event) => {
              const zipFileInput = event.target;
              if (zipFileInput.files.length > 0) {
                const selectedZipFile = zipFileInput.files[0];
                setFileName(selectedZipFile.name);
                const zip = new JSZip();
                const zipData = await zip.loadAsync(selectedZipFile);
                const fileNames = Object.keys(zipData.files);

                fileNames.sort((a, b) => {
                  const aNum = parseInt(a.split(".")[0]);
                  const bNum = parseInt(b.split(".")[0]);
                  return aNum - bNum;
                });

                for (const fileName of fileNames) {
                  const fileEntry = zipData.files[fileName];
                  const b64 = await fileEntry.async("base64");
                  const t = fileEntry.name.split('.png')[0];
                  setScreenshots([...ss(), {src: `data:image/png;base64,${b64}`, id: t}]);
                  setTimes([...times(), parseInt(t)]);
                }
              }
            }}/>
            <div class="flex items-center">
              <button class="py-[10px] px-3 my-[10px] text-sm border-outset text-white bg-[#0349ff] hover:bg-[#0944dd] border-[#0f328f] border-2" onclick={() => {
                fileInput.click();
              }}>
                <span class="relative pr-2 top-[-2px]">📁</span>
                <span>Select zip</span>
              </button>
              <div class="flex items-center px-1 w-fit max-w-[200px] h-[43px] border border-[#333] text-[#666] text-sm border-l-0">
                {fileName()}
              </div>
            </div>
            <select class="p-[10px] border-2 border-solid border-[#333] my-[10px] text-xs" onchange={(e) => {
              const { value } = e.target;
              value && setFormat(value);
            }}>
              <option disabled>Select Format</option>
              <option value="png" selected>PNG</option>
              <option value="webp">WEBP</option>
            </select>
            <button style={{cursor: generating()? 'default': 'pointer'}} disabled={!ss()?.length} class="relative py-[10px] px-2 my-[10px] w-40 h-10 border-[#ef5527] bg-[#f46236] text-white text-sm border-outset border-2 disabled:opacity-70 disabled:cursor-default hover:not-disabled:bg-[#fb3a00]" onclick={generateAnimation}>
              <div class="absolute left-4 top-2 z-20">Generate animation</div>
              {generating() ? 
              <div class="absolute left-0 top-0 w-full h-full bg-progress-pattern transition-all duration-300 ease animate-progress z-10"></div>: null}
            </button>
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
              <span class="absolute text-[20px] top-0 right-[7px] text-white cursor-pointer" onclick={() => {
                showOutput(false);
              }}>✖</span>
              <canvas ref={canvas}/>
              <div class="absolute w-96 right-3 bottom-0 rounded-t-lg shadow-tw bg-white z-[1999999] overflow-hidden">
                <div class="h-[38px] rounded-t-lg bg-[white] transition-all delay-0 duration-200" classList={{'h-[500px]': isExpanded() === true}}>
                  <div class="flex justify-between py-[10px] px-[15px] cursor-pointer border-b border-gray-200" onClick={() => {
                    toggleExpansion(!isExpanded());
                  }}>
                    <div class="flex items-center">
                      <span class="text-[17px] ml-[6px]" style="color: var(--p-color-text)">Download</span>
                    </div>
                  </div>
                  <div>
                    <ul>
                      <li></li>
                    </ul>
                    <button class="py-[10px] px-5 mr-4 my-[10px] border-[#fd6900] bg-[#fb6800] text-white text-sm border-outset border-2 disabled:opacity-70 disabled:cursor-default hover:bg-[#fb3a00]" onclick={generateAnimation}>
                      <span>Download</span>
                    </button>
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

window.onload = async () => {
  const root = document.createElement("div");
  root.id = "frame-root";
  document.body.append(root);

  render(() => {
    return <App/>
  }, root);

  await pyodide.load();
  IS_PYODIDE_LOADED = true;
}
