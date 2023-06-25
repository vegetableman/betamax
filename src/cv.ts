class CV {

  worker: Worker;
  _status: any;
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
        if (status[0] === 'done') res(status[1])
        if (status[0] === 'error') rej(status[1])
        if (status[0] !== 'loading') {
          delete this._status[msg]
          clearInterval(interval)
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
    console.log('load---')
    this._status = {};
    const crUrl = chrome.runtime.getURL('src/cv.worker.js');
    fetch(crUrl)
      .then(response => response.text())
      .then(workerCode => {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
      
        this.worker = new Worker(workerUrl);
        // this.worker.postMessage();
        // this.worker.onmessage = () => {
        //   console.log('cv loaded: 1');
        // }
        this.worker.onmessage = e => this._status[e.data.msg] = ['done', e]
        this.worker.onerror = e => this._status[e.data.msg] = ['error', e]
        this._dispatch({msg: 'load', payload: chrome.runtime.getURL('src/opencv.js')})
      
        // Rest of your code...
      });
//     const workerUrl = chrome.runtime.getURL('assets/cv.worker.js');
//     const workerBlobUrl = `data:text/javascript;base64,${btoa(`
//   importScripts('${workerUrl}');
// `)}`;
//     this.worker = new Worker(workerBlobUrl) // load worker

//     // Capture events and save [status, event] inside the _status object
//     this.worker.onmessage = (e) => (this._status[e.data.msg] = ['done', e])
//     this.worker.onerror = (e) => (this._status[e.data.msg] = ['error', e])
//     return this._dispatch({ msg: 'load' })
  }

  processImages(payload, cb) {
    console.log('processImages', payload);
    let self = this;
    this.worker.onmessage = function(event) {
      console.log('onmessage: ', event);
      const {done, image, name, timeline} = event.data;
      console.log("world:", name, timeline);
      if (done) {
        cb(image, timeline);
      }
    }
    return this._dispatch({ msg: 'processImages', payload });
  }
}

// Export the same instant everywhere
export default new CV()