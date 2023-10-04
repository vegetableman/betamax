chrome.runtime.onMessage.addListener(async (request) => {
  const iframe = document.querySelector("iframe");
  const data = await chrome.storage.sync.get("isDetailsOpen");
  request.isDetailsOpen = data ? data.isDetailsOpen: false;
  iframe.contentWindow.postMessage(request, "*");
});

window.addEventListener("message", function(event) {
  if (event.data instanceof Object) {
    const { name, blob, file, extension, isOpen } = event.data;
    if (name === 'downloadFile') {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${file}.${extension}`;
      setTimeout(function () { URL.revokeObjectURL(link.href) }, 4E4); // 40s
      setTimeout(function () { link.click() }, 0);
    } else if (name === 'isDetailsOpen') {
      chrome.storage.sync.set({'isDetailsOpen': isOpen});
    }
  }
});