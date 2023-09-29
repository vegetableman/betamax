chrome.runtime.onMessage.addListener((request) => {
  console.log("Message from the background script:", request);
  const iframe = document.querySelector("iframe");
  iframe.contentWindow.postMessage(request, "*");
});

window.addEventListener("message", function(event) {
  if (event.data instanceof Object) {
    const { blob, name, extension } = event.data;
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${name}.${extension}`;
    setTimeout(function () { URL.revokeObjectURL(link.href) }, 4E4); // 40s
    setTimeout(function () { link.click() }, 0);
  }
});