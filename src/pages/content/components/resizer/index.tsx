import { JSX, children, createSignal } from "solid-js";
import { Direction } from "../..";

interface ResizerProps {
  children: JSX.Element;
  disabled: boolean;
  frameRef: HTMLElement | undefined;
  onResize: (dir: Direction, width: number, deltaX: number, deltaY: number, startLeft?: number) => void;
  onResizeEnd: () => void;
}

export function Resizer(props: ResizerProps) {
  const c = children(() => props.children);
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 });
  const [dir, setDir] = createSignal<Direction | null>(null);
  const [startWidth, setStartWidth] = createSignal(0);
  const [startLeft, setStartLeft] = createSignal(0);
  const [isResizing, setResizing] = createSignal(false);

  function initResize(e: MouseEvent) {
    if (props.disabled || !(e.currentTarget instanceof HTMLElement)) return;
    e.preventDefault();
    e.stopPropagation();
    setMousePosition({x: e.clientX, y: e.clientY});
    if (props.frameRef) {
      setStartWidth(props.frameRef.offsetWidth);
      setStartLeft(props.frameRef.getBoundingClientRect().left);
    }
    setResizing(true);
    const { dir } = e.currentTarget.dataset;
    if (dir === 'w' || dir === 'e' || dir === 'n' || dir === 's' ||
      dir === 'se' || dir === 'sw' || dir === 'ne' || dir === 'nw') {
      setDir(dir);
    }
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }

  function resize(e: MouseEvent) {
    if (!isResizing()) return;
    const { x, y } = mousePosition();
    const { clientX, clientY } = e;
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    const d = dir();
    if (!d) {
      return;
    }
    if (['w', 'e'].includes(d)) {
      props.onResize(d, startWidth(), deltaX, deltaY, startLeft());
    } else if (['s','n'].includes(d)) {
      props.onResize(d, startWidth(), deltaX, deltaY);
      setMousePosition({x: clientX, y: clientY});
    } else if (d === 'se' || d === 'sw' || d === 'ne' || d === 'nw') {
      props.onResize(d, startWidth(), deltaX, deltaY, startLeft());
      setMousePosition({x: mousePosition().x, y: clientY});
    }
  }

  function stopResize() {
    setResizing(false);
    props.onResizeEnd();
  }

  [].slice.call(c()).forEach((el: HTMLElement) => {
    el.addEventListener('mousedown', initResize);
  });

  return <>{c()}</>;
}