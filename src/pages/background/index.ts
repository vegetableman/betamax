/* eslint-disable no-undef */

// async function getCurrentTab() {
//   let queryOptions = { active: true, lastFocusedWindow: true };
//   // `tab` will either be a `tabs.Tab` instance or `undefined`.
//   let [tab] = await chrome.tabs.query(queryOptions);
//   return tab;
// }

// function delay(millisec) {
//   return new Promise(resolve => {
//       setTimeout(() => { resolve('') }, millisec);
//   })
// // }

// let images = [];
// let captureTab = false;

// async function captureCurrentTab() {
//   console.log('capture');
//   images = [];
//   const tab = await getCurrentTab();
//   console.log('tab:', tab);
//   if (!tab) {
//     return;
//   }
//   captureTab = true;
//   while (captureTab) {
//     const img = await chrome.tabs.captureVisibleTab(tab.windowId);
//     images.push(img);
//     await delay(250);
//   }
//   console.log('images:', images);
// }

// let messageRes;

// chrome.runtime.onMessage.addListener(async (req, sender, res) => {
//   if (req.message === 'capture') {
//     console.log('req', req);
//     // console.log('capture');
//     // // images = [];
//     // const tab = await getCurrentTab();
//     // console.log('tab:', tab);
//     // if (!tab) {
//     //   return;
//     // }
//     // captureTab = true;
//     // while (captureTab) {
//     //   const img = await chrome.tabs.captureVisibleTab(tab.windowId);
//     //   console.log('img:', img);
//     //   images.push(img);
//     //   await delay(250);
//     // }
//     // console.log('images:', images);
//     // await captureCurrentTab();
//     images = req.screenshots;
//   } else if (req.message === 'stop') {
//     captureTab = false;
//     // console.log('images', images);
//     // chrome.tabs.sendMessage(tab.id, {message: 'process_images'});
//     res(images);
//   }
// });

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

let bg = {
  screenshots: null,
  times: null
};

chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { message: 'viewFrame' });
  });
});

chrome.runtime.onMessage.addListener(async (req, sender, res) => {
  if (req.type === 'process_screenshots') {
    const {screenshots, times} = req.data;
    bg.screenshots = screenshots;
    bg.times = times;
    chrome.tabs.create({url: 'frame-list.html' }, (tab) => {
      chrome.tabs.sendMessage(tab.id, { data: {screenshots, times} });
    });
    res(true)
  }
})