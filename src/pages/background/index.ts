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

chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { message: 'viewFrame' });
  });
});

chrome.runtime.onMessage.addListener(async (req, sender, res) => {
  if (req.type === 'process_screenshots') {
    const { dimension, fileName, format } = req.payload;
    chrome.tabs.create({url: 'src/frame.html'}, (tab) => {
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { payload: dimension, fileName, format });
      }, 1000);
    });
    res(true)
  }
});