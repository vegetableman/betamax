/* eslint-disable tailwindcss/no-custom-classname */

import { children, createSignal } from "solid-js";

export const tooltipStyle = `
  .btm_tooltip {
    position: relative;
    z-index: 2;
  }
  .btm_tooltip__text {
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
    <span class="btm_tooltip" onMouseEnter={() => {
      tidIn && clearTimeout(tidIn);
      tidOut && clearTimeout(tidOut);
      tidIn = setTimeout(() => toggleTooltip(true), 500);
      tidOut = setTimeout(() => toggleTooltip(false), 2000);
    }} onMouseLeave={() => {
      tidIn && clearTimeout(tidIn); tidOut && clearTimeout(tidOut); toggleTooltip(false);}} onClick={() => { 
      tidIn && clearTimeout(tidIn); tidOut && clearTimeout(tidOut); toggleTooltip(false);}}>
      {c()}
      {showTooltip() && <span class="btm_tooltip__text" style={props.style}>{props.title}</span>}
    </span>
  </>;
}