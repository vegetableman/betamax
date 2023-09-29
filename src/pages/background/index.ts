// chrome.commands.onCommand.addListener(async (command) => {
//   console.log(`Command: ${command}`);
//   if (command === 'start_capture') {
//     chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
//       // Send a message to the content script
//       chrome.tabs.sendMessage(tabs[0].id, { message: 'init' });
//       chrome.tabs.sendMessage(tabs[0].id, { message: 'startCapture' });
//     });
//     // await captureCurrentTab();
//   } else if (command === 'stop_capture') {
//     // captureTab = false;
//     chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
//       chrome.tabs.sendMessage(tabs[0].id, { message: 'stopCapture' });
//     });
//   }
// });

chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { message: 'viewFrame' });
  });
});

chrome.runtime.onMessage.addListener(async (req, sender, res) => {
  if (req.type === 'process_screenshots') {
    const { dimension, fileName } = req.payload;
    chrome.tabs.create({url: 'src/frame.html'}, (tab) => {
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { payload: dimension, fileName });
      }, 1000);
    });
    res(true)
  }
})

