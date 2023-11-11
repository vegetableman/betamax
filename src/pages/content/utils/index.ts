export function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function evenOut(d, off = 1) {
  return d % 2 === 0 ? d : d + off;
}

// https://stackoverflow.com/a/71876238
export function copyToClipboard (text) {
  const textArea = document.createElement("textarea"); 
  textArea.value=text; 
  document.body.appendChild(textArea); 
  textArea.focus();
  textArea.select(); 
  document.execCommand('copy');
  document.body.removeChild(textArea);
};