import { children, createSignal } from "solid-js";

export const tooltipStyle = `
  .tooltip {
    position: relative;
    z-index: 2;
  }
  .tooltip__text {
    position: absolute;
    width: max-content;
    font-size: 11px;
    padding: 3px 8px;
    background: var(--black-23);
    color: var(--white);
  }
`;

export function Tooltip(props) {
  const [showTooltip, toggleTooltip] = createSignal(false);
  const c = children(() => props.children);
  let tidIn, tidOut;
  return <>
    <span class="tooltip" onmouseenter={() => {
      tidIn && clearTimeout(tidIn);
      tidOut && clearTimeout(tidOut);
      tidIn = setTimeout(() => toggleTooltip(true), 500);
      tidOut = setTimeout(() => toggleTooltip(false), 2000);
    }} onmouseleave={() => {
      tidIn && clearTimeout(tidIn); tidOut && clearTimeout(tidOut); toggleTooltip(false);}} onclick={() => { 
        tidIn && clearTimeout(tidIn); tidOut && clearTimeout(tidOut); toggleTooltip(false);}}>
      {c()}
      {showTooltip() && <span class="tooltip__text" style={props.style}>{props.title}</span>}
    </span>
  </>;
}