import "@src/styles/index.css";
import styles from "./Popup.module.css";

const Popup = () => {

  function play() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      // Send a message to the content script
      chrome.tabs.sendMessage(tabs[0].id, { message: 'init' });
      chrome.tabs.sendMessage(tabs[0].id, { message: 'startCapture' });
    });
  }

  function stop() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { message: 'stopCapture' });
    });
  }

  return (
    <div class={styles.App}>
      <div>
        <button class="p-1" onclick={play}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-play"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <button class="p-1" onclick={stop}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-stop-circle"><circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect></svg>
        </button>
      </div>
    </div>
  );
};

export default Popup;
