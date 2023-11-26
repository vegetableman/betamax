type Context = {contextType: 'OFFSCREEN_DOCUMENT'};

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle_capture' || command === 'cancel_capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0] || typeof tabs[0].id !== 'number') {
        throw new Error("Tab id not found");
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: command, target: 'tab' });
    });
  }
});

chrome.action.onClicked.addListener(async function(tab) {
  if (typeof tab.id !== 'number') {
    throw new Error("Tab id not found");
  }
  chrome.tabs.sendMessage(tab.id, { type: 'view_frame', target: 'tab' });
});

chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.target !== 'background') {
    return;
  }

  if (message.type === 'start_capture') {
    const existingContexts = await chrome.runtime
    // @ts-expect-error new api
      .getContexts({});
    
    const offscreenDocument = existingContexts.find(
      (c: Context) => c.contextType === 'OFFSCREEN_DOCUMENT'
    );
  
    if (!offscreenDocument) {
      try {
        // Create an offscreen document.
        // @ts-expect-error new api
        await chrome.offscreen.createDocument({
          url: 'src/offscreen.html',
          reasons: ['DISPLAY_MEDIA', 'BLOBS'],
          justification: 'Recording tab and generating zip'
        });
      } catch(error) {
        console.error('Error in createDocument', error);
      }
    }
    sender.tab && chrome.runtime.sendMessage({
      type: message.type,
      target: 'offscreen',
      tabId: sender.tab.id,
      data: {
        ...message.payload
      }
    });
  } else if (message.type === 'remove_document') {
    try {
      // @ts-expect-error offscreen is not part of type yet.
      await chrome.offscreen.closeDocument();
    } catch(error) {
      console.error('Error in closeDocument', error);
    }
  } else if (message.type === 'open_frame_manager') {
    const { fileName } = message.payload;
    chrome.tabs.create({url: 'src/frame.html'}, (tab) => {
      setTimeout(() => {
        if (typeof tab.id !== 'number') {
          throw new Error("Tab id not found"); 
        }
        chrome.tabs.sendMessage(tab.id, { fileName });
      }, 1000);
    });
    chrome.tabs.sendMessage(message.tabId, { type: message.type, target: 'tab' });
  } else if (message.type === 'stop_capture' || message.type === 'cancel_capture' ||
    message.type === 'continue_capture' || message.type === 'set_region') {
    sender.tab && chrome.runtime.sendMessage({
      type: message.type,
      target: 'offscreen',
      tabId: sender.tab.id,
      payload: message.payload
    });
  } else if (message.type === 'start_countdown' || message.type === 'capture_stopped' || message.type === 'processing_capture') {
    chrome.tabs.sendMessage(message.tabId, { type: message.type, target: 'tab', payload: message.payload });
  } 
});