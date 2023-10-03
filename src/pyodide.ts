class Pyodide {

  worker: Worker;
  _status: any;
  loaded: boolean;
  /**
   * We will use this method privately to communicate with the worker and
   * return a promise with the result of the event. This way we can call
   * the worker asynchronously.
   */
  _dispatch(event) {
    const { msg } = event
    this._status[msg] = ['loading']
    this.worker.postMessage(event)
    return new Promise((res, rej) => {
      let interval = setInterval(() => {
        const status = this._status[msg]
        if (status) {
          if (status[0] === 'done') res(status[1])
          if (status[0] === 'error') rej(status[1])
          if (status[0] !== 'loading') {
            delete this._status[msg]
            clearInterval(interval)
          }
        }
      }, 50)
    })
  }

  /**
   * First, we will load the worker and capture the onmessage
   * and onerror events to always know the status of the event
   * we have triggered.
   *
   * Then, we are going to call the 'load' event, as we've just
   * implemented it so that the worker can capture it.
   */
  load() {
    return new Promise((resolve) => {
      this._status = {};
      if (this.loaded) {
        return resolve(true);
      }
      const crUrl = chrome.runtime.getURL('src/pyodide.worker.js');
      fetch(crUrl)
        .then(response => response.text())
        .then(workerCode => {
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
        
          this.worker = new Worker(workerUrl);
          this.worker.onmessage = e => {
            this._status[e.data.msg] = ['done', e]
            this.loaded = true;
            resolve(true);
          };
          this.worker.onerror = e => {
            this._status[e.data.msg] = ['error', e]
          };
          this._dispatch({msg: 'load', payload: {
            pyodide: chrome.runtime.getURL('src/pyodide/pyodide.js'),
            packages: [
              chrome.runtime.getURL('src/pyodide/packages/micropip-0.3.0-py3-none-any.whl'),
              chrome.runtime.getURL('src/pyodide/packages/numpy-1.24.3-cp311-cp311-emscripten_3_1_39_wasm32.whl'),
              chrome.runtime.getURL('src/pyodide/packages/packaging-23.0-py3-none-any.whl'),
              chrome.runtime.getURL('src/pyodide/packages/PIL-9.1.1-cp311-cp311-emscripten_3_1_39_wasm32.whl'),
              chrome.runtime.getURL('src/pyodide/packages/imageio-2.27.0-py3-none-any.whl'),
              chrome.runtime.getURL('src/pyodide/packages/opencv_python-4.7.0.72-cp311-cp311-emscripten_3_1_39_wasm32.whl'),
              chrome.runtime.getURL('src/pyodide/packages/scipy-1.10.1-cp311-cp311-emscripten_3_1_39_wasm32.whl')
            ]
          }})
      });
    })
  }

  processImages(payload, cb) {
    this.worker.onmessage = function(event) {
      const {done, payload} = event.data;
      cb(done, payload);
    }
    return this._dispatch({ msg: 'processImages', payload });
  }

  terminate() {
    this.loaded = false;
    this.worker.terminate();
  }

  compressImages() {}
}

// Export the same instant everywhere
export default new Pyodide()