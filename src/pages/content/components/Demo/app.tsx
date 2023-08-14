import logo from "@src/assets/img/logo.svg";
import "@src/styles/index.css";
import styles from "./App.module.css";

const App = () => {
  function play() {
    chrome.runtime.sendMessage({
      message: 'capture'
    });
  }

  function stop() {
    chrome.runtime.sendMessage({
      message: 'stop'
    }, (res) => {
    });
  }

  return (
    <div class="fixed flex right-4 bottom-4 z-[2000] w-fit h-fit bg-white border-gray-300 border">
      <button class="p-1" onclick={play}>
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-play"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      </button>
      <button class="p-1" onclick={stop}>
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-stop-circle"><circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect></svg>
      </button>
    </div>
  );
};

export default App;
