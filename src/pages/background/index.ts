chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle_capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { message: 'toggleCapture' });
    });
  } else if (command === 'cancel_capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { message: 'cancelCapture' });
    });
  }
});

chrome.action.onClicked.addListener(async function(tab) {
  chrome.tabs.sendMessage(tab.id, { message: 'viewFrame' });
});

chrome.runtime.onMessage.addListener(async (req, sender, sendResponse) => {
  console.log('req', req);
  if (req.type === 'process_screenshots') {
    const { dimension, fileName, format } = req.payload;
    chrome.tabs.create({url: 'src/frame.html'}, (tab) => {
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { payload: dimension, fileName, format });
      }, 1000);
    });
    sendResponse(true);
  } else if (req.type === 'start_capture') {
    const { region, fileName } = req.payload;
    const existingContexts = await chrome.runtime.getContexts({});
    const offscreenDocument = existingContexts.find(
      (c) => c.contextType === 'OFFSCREEN_DOCUMENT'
    );
  
    if (!offscreenDocument) {
      try {
      // Create an offscreen document.
        await chrome.offscreen.createDocument({
          url: 'src/offscreen.html',
          reasons: ['DISPLAY_MEDIA', 'BLOBS'],
          justification: 'Recording tab and generating zip'
        });
      } catch(error) {
        console.error('Error in createDocument', error);
      }
    } 
  
    chrome.runtime.sendMessage({
      type: 'start-recording',
      target: 'offscreen',
      data: {
        region,
        fileName
      }
    });
  } else if (req.type === 'stop_capture') {
    chrome.runtime.sendMessage({
      type: 'stop-recording',
      target: 'offscreen'
    });
  } else if (req.type === 'off-recording-started') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { message: 'bg-recording-started' });
    });
  } else if (req.type === 'off-prerecording-started') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { message: 'bg-prerecording-started' });
    });
  } else if (req.type === 'off-recording-stopped') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { message: 'bg-recording-stopped' });
    });
  } else if (req.type === 'cancel_capture') {
    chrome.runtime.sendMessage({
      type: 'cancel-recording',
      target: 'offscreen'
    });
  } else if (req.type === 'off-remove-document') {
      try {
        console.log('closedocument')
        await chrome.offscreen.closeDocument();
      } catch(error) {
        console.error('Error in closeDocument', error);
      }
  } else if (req.type === 'continue_capture') {
    chrome.runtime.sendMessage({
      type: 'continue-recording',
      target: 'offscreen'
    });
  } else if (req.type === 'off-open-frame') {
    const { fileName } = req.payload;
    chrome.tabs.create({url: 'src/frame.html'}, (tab) => {
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { fileName });
      }, 1000);
    });
  }
});