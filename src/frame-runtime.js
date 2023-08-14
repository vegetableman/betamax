console.log('hello frame');
chrome.runtime.onMessage.addListener((request) => {
  console.log("Message from the background script:", request);
});