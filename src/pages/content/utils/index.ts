export function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function evenOut(d, off = 1) {
  return d % 2 === 0 ? d : d + off;
}