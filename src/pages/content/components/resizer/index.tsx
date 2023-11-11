import { children, createSignal } from "solid-js";

export function Resizer(props) {
  const c = children(() => props.children);
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [dir, setDir] = createSignal('');
  const [startWidth, setStartWidth] = createSignal(0);
  const [startLeft, setStartLeft] = createSignal(0);
  const [isResizing, setResizing] = createSignal(false);

  function initResize(e) {
    if (props.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setMousePosition({x: e.clientX, y: e.clientY});
    setStartWidth(props.frameRef.offsetWidth);
    setStartLeft(props.frameRef.getBoundingClientRect().left);
    setResizing(true);
    setDir(e.currentTarget.dataset.dir);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }

  function resize(e) {
    if (!isResizing()) return;
    const { x, y } = mousePosition();
    const { clientX, clientY } = e;
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    if (dir() === 'e' || dir() === 'w') {
      props.onResize(dir(), startWidth(), deltaX, deltaY, startLeft());
    } else if (dir() === 's' || dir() === 'n') {
      props.onResize(dir(), startWidth(), deltaX, deltaY);
      setMousePosition({x: clientX, y: clientY});
    } else if (dir() === 'se' || dir() === 'sw' || dir() === 'ne' || dir() === 'nw') {
      props.onResize(dir(), startWidth(), deltaX, deltaY, startLeft());
      setMousePosition({x: mousePosition().x, y: clientY});
    }
  }

  function stopResize() {
    setResizing(false);
    props.onResizeEnd();
  }

  [].slice.call(c()).forEach(el => {
    el.addEventListener('mousedown', initResize);
  });

  return <>{c()}</>;
}