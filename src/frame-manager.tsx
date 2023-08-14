import { For, Show, createSignal } from "solid-js";
import  {render} from "solid-js/web";
import { TransitionGroup } from "solid-transition-group";
import pyodide from "./pyodide";
import JSZip from "jszip";

window.chrome = {
  runtime: {
    getURL: (path) => {
      return `chrome-extension://hlldadkmohenombjfpfinmpnlppldogf/${path}`
    }
  }
}

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
  let canvas: HTMLCanvasElement;
  let [ss, setScreenshots] = createSignal([]);
  let [times, setTimes] = createSignal([]);
  let [msg, setMessage] = createSignal("");
  let [elapsedTime, setElapsedTime] = createSignal(null);
  let [isDownload, showDownload] = createSignal(false);
  let [format, setFormat] = createSignal('png');
  function setAnimation(url, timeline)
  {
    var img = new Image();
    img.onload = function()
    {
      const blits = timeline[0].blit[0];
      canvas.width = blits[2];
      canvas.height = blits[3];
      animate(img, timeline, canvas);
    };
    img.src = url;
  }
  const style = `
      .list {
        flex: 1;
        display: flex;
        align-items: center;
        flex-direction: column;
      }
      .item {
        display: flex;
        min-width: 400px;
        padding: 10px 0;
      }
      .gen-btn {
        padding: 10px 20px;
        background: steelblue;
        color: #fff;
        border: 0;
        border-radius: 3px;
      }
      .close-btn {
        cursor: pointer;
        padding-left: 10px;
      }
      .right-col {
        flex: 0 0 20%;
      }
      .container {
        display: flex;
      }
      .list-item {
        transition: all 0.5s;
        display: inline-block;
        margin-right: 10px;
      }
      .list-item-enter,
      .list-item-exit-to {
        opacity: 0;
        transform: translateY(30px);
        transition: all;
      }
      .list-item-exit-active {
        position: absolute;
        display: none;
      }
      .item {
        transition: transform ease-in 0.4s;
      }
      .gen-container {
        position: sticky;
        top: 10px;
      }
      .canvas-overlay {
        display: flex;
        position: absolute;
        justify-content: center;
        align-items: center;
        background: #2626268f;
        width: 100%;
        height: 100vh;
      }
      .canvas-container {
        position: relative;
        background: #fff;
        padding: 10px;
      }
      .download-container {
        text-align: right;
      }
      .download-btn {
        background: steelblue;
        color: #fff;
        padding: 10px;
        margin: 10px 0 0 0;
      }
      .close-overlay-btn {
        position: absolute;
        right: -7px;
        top: -10px;
        font-size: 11px;
      }
      .message::after {
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
  `;
  const deleteScreenshot = (id) => () => {
    setScreenshots((ss) => {
      let ssx = [...ss];
      ssx = ssx.filter((s) => {
        return id !== s.id;
      });
      return ssx;
    });
  }
  function calc(num) {
    return num.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];
  }
  const generateAnimation = async () => {
    if (!IS_PYODIDE_LOADED) {
      await pyodide.load();
    }
    pyodide.processImages({screenshots: ss().map((s) => s.src), times: times(), format: format(), dimension: null}, (done, payload) => {
      if (done) {
        const {image, timeline} = payload;
        const url = URL.createObjectURL(image);
        var im = new Image();
        im.src = url;
        document.body.appendChild(im);
        showDownload(true);
        setAnimation(url, timeline);
      } else {
        console.log('process:', payload);
        const {message} = payload;
        if (message.includes(':')) {
          const time = message.split(':')[1];
          setMessage(message.split(':')[0]);
          const f = parseFloat(time);
          const t = f < 1 ? `${calc(f * 1000)}ms` : `${calc(f)}s`;
          setElapsedTime(t);
        } else {
          setMessage(message);
          setElapsedTime(null);
        }
      }
    });
  }
  const downloadResult = () => {

  }
  return (
    <div class="container">
      <style>{style}</style>
        <ul class="list">
          <TransitionGroup name="list-item">
            <For each={ss()}>{({src, id}) =>
              <li class="item" key={id}>
                <div>
                  <span>{times[id]}</span>
                </div>
                <div>
                  <img src={src}/>
                  <div class="close-btn" onclick={deleteScreenshot(id)}>❌</div>
                </div>
              </li>
            }</For>
          </TransitionGroup>
        </ul>
      <div class="right-col">
        <div class="gen-container">
          <div>
              <input type="file" id="fileInput" onchange={async (event) => {
                const zipFileInput = event.target;
                if (zipFileInput.files.length > 0) {
                  const selectedZipFile = zipFileInput.files[0];
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
            <select onchange={(e) => {
              const { value } = e.target;
              value && setFormat(value);
            }}>
              <option disabled>Select Format</option>
              <option value="png" selected>PNG</option>
              <option value="webp">WEBP</option>
            </select>
          </div>
          <button class="gen-btn" onclick={generateAnimation}>Generate</button>
          {msg() ? <div class="message">{msg()}</div>: null}
          <div>{elapsedTime() ? `Finished in: ${elapsedTime()}`: null}</div>
        </div>
      </div>
      <Show
        when={isDownload()}>
        <div class="canvas-overlay">
          <dialog class="canvas-container" open>
            <canvas id="betamax-canvas" ref={canvas}/>
            <div class="download-container">
              <button class="download-btn" onclick={downloadResult}>Download</button>
            </div>
            <div class="close-overlay-btn" onclick={() => {
              showDownload(false);
            }}>❌</div>
          </dialog>
        </div>
      </Show>
    </div>
  )
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
