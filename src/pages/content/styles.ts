export const __BTM_COLOR_VAR = '--btm-bg-color';
export const TITLE_BAR_HEIGHT = 40;
export const MIRROR_FRAME_HEIGHT = 15;

export const style = `
  .btm_window {
    ${__BTM_COLOR_VAR}: hsl(0, 0%, 20%);
    --black-23: hsl(0, 0%, 23%);
    --black-52: hsl(0, 0%, 52%);
    --orange-58: hsl(14, 90%, 58%);
    --orange-54: hsl(14, 88%, 54%);
    --orange-55: hsl(14, 86%, 55%);
    --red-50: hsl(0, 86%, 50%);
    --blue-69: hsl(218, 90%, 69%);
    --red: red;
    --white: white;
    --white-87: hsl(0, 0%, 87%);
    --black-a-3-20:  hsla(0, 0%, 20%, 0.3215686274509804);
    --black-a-8-20: hsla(0, 0%, 20%, 0.8901960784313725);
  }
  .btm_window {
    font-family: "BTM__Inter", Arial, Helvetica, sans-serif;
    font-size: 13px;
  }
  .btm_window__inner {
    display: flex;
    flex-direction: column;
    position: relative;
    width: 100%;
  }
  .btm_title_bar, .btm_bottom_bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0 0 ${TITLE_BAR_HEIGHT}px;
    background: var(${__BTM_COLOR_VAR});
    cursor: move;
  }
  .btm_bottom_bar {
    display: none;
    position: absolute;
    bottom: -445px;
    right: -5px;
    flex: 0 0 40px;
    height: 40px;
    width: 100%;
    padding: 0 5px;
    cursor: move;
  }
  .btm_record-btn, .btm_stop-btn {
    display: flex;
    align-items: center;
    padding: 2px 8px 4px 8px;
    min-height: 20px;
    background: var(--orange-58);
    color: var(--white);
    box-sizing: content-box;
    border-width: 2px;
    border-color: var(--orange-55);
    border-style: outset;
    z-index: 2;
  }
  .btm_record-btn:hover {
    background: var(--orange-54);
    cursor: pointer;
  }
  .btm_record-intro-btn {
    padding-top: 4px;
    background: none;
    border-color: var(--white-87);
    border-width: 1px;
    appearance: none;
    border-style: solid;
    display: inline-block;
    color: var(--white-87);
    font-size: 11px;
    transform: scale(.9);
  }
  .btm_record-intro-btn .btm_record__text {
    font-size: 12px;
  }
  .btm_record-intro-btn > svg {
    width: 8px;
    height: 9px;
    position: relative;
    top: 0.5px;
    color: var(--white-87);
  }
  .btm_stop-btn {
    background: var(--red);
    min-width: 45px;
  }
  .btm_stop-btn:hover {
    background: var(--red-50);
    cursor: pointer;
  }
  .btm_record__text {
    padding-left: 5px;
    font-family: 'BTM__Inter';
    font-weight: 500;
    font-size: 13px;
  }
  .btm_stop-btn .btm_record__text {
    font-weight: 600;
  }
  .btm_mirror > .btm_w {
    position: absolute;
    left: -15px;
    top: 0;
    width: 15px;
    height: 440px;
    cursor: w-resize;
  }
  .btm_mirror > .btm_w > div {
    float: right;
    height: 100%;
    width: 5px;
    background: var(${__BTM_COLOR_VAR});
  }
  .btm_mirror > .btm_e {
    position: absolute;
    right: -15px;
    top: 0;
    width: ${MIRROR_FRAME_HEIGHT}px;
    height: 440px;
    cursor: e-resize;
  }
  .btm_mirror > .btm_e > div {
    float: left;
    width: 5px;
    height: 100%;
    background: var(${__BTM_COLOR_VAR});
  }
  .btm_mirror > .btm_s {
    position: absolute;
    bottom: -415px;
    height: ${MIRROR_FRAME_HEIGHT}px;
    width: 100%;
    cursor: s-resize;
    z-index: 2;
  }
  .btm_mirror > .btm_s > div {
    background: var(${__BTM_COLOR_VAR});
    height: 5px;
  }
  .btm_mirror > .btm_n {
    position: absolute;
    top: 0;
    width: 100%;
    height: 5px;
    background: var(${__BTM_COLOR_VAR});
    cursor: n-resize;
  }
  .btm_mirror[data-disabled=true] > * {
    cursor: default !important;
  }
  .btm_mirror > .btm_se {
    position: absolute;
    right: -15px;
    bottom: calc(-355px - ${TITLE_BAR_HEIGHT + 10}px);
    width: ${MIRROR_FRAME_HEIGHT + 10}px;
    height: ${MIRROR_FRAME_HEIGHT + 10}px;
    cursor: se-resize;
    z-index: 2;
  }
  .btm_mirror > .btm_sw {
    position: absolute;
    left: -15px;
    bottom: calc(-355px - ${TITLE_BAR_HEIGHT + 10}px);
    width: ${MIRROR_FRAME_HEIGHT + 10}px;
    height: ${MIRROR_FRAME_HEIGHT + 10}px;
    cursor: sw-resize;
    z-index: 2;
  }
  .btm_mirror > .btm_ne {
    position: absolute;
    right: -${MIRROR_FRAME_HEIGHT}px;
    top: 0;
    width: ${MIRROR_FRAME_HEIGHT + 10}px;
    height: ${MIRROR_FRAME_HEIGHT}px;
    cursor: ne-resize;
    z-index: 1;
  }
  .btm_mirror > .btm_nw {
    position: absolute;
    left: -${MIRROR_FRAME_HEIGHT}px;
    top: 0;
    width: ${MIRROR_FRAME_HEIGHT + 10}px;
    height: ${MIRROR_FRAME_HEIGHT + 10}px;
    cursor: nw-resize;
    z-index: 1;
  }
  .btm_title__timer-wrapper {
    display: flex;
    align-items: center;
    margin-left: -15px;
  }
  .btm_title__timer {
    font-size: 13px;
    color: var(--white);
    min-width: 40px;
    font-weight: 500;
  }
  .btm_title__text {
    position: absolute;
    left: 45%;
    font-size: 13px;
    color: var(--white);
  }
  .btm_title__text::after {
    content: ".";
    opacity: 0;
    animation: animate_dots 1s infinite;
  }
  @keyframes animate_dots {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 1;
      content: "..";
    }
    100% {
      opacity: 1;
      content: "...";
    }
  }
  .btm_overlay {
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: absolute;
    top: ${TITLE_BAR_HEIGHT}px;
    width: 100%;
    height: 355px;
    text-align: center;
    background: var(--black-a-3-20);
    color: var(--white);
    font-size: 50px;
  }
  .btm_overlay > span {
    position: relative;
    top: -30px;
  }
  .btm_processing {
    font-size: 20px;
    font-weight: 600;
  }
  .btm_processing > span::after {
    position: absolute;
    content: ".";
    opacity: 0;
    animation: animate_dots 1s infinite;
  }
  .btm_title__close-btn, .btm_title__config-btn, .btm_title__cancel-btn {
    background: none;
    border-color: var(${__BTM_COLOR_VAR});
    color: var(--white);
    color: var(--white-87);
    cursor: pointer;
  }
  .btm_title__close-btn > svg {
    position: relative;
    top: 1px;
  }
  .btm_title__cancel-btn {
    position: relative;
    left: -5px;
    padding: 1px 5px;
    color: red;
  }
  .btm_title__cancel-btn > svg {
    position: relative;
    top: 2px;
  }
  .btm_config {
    position: absolute;
    top: ${TITLE_BAR_HEIGHT}px;
    width: 100%;
    padding-top: 10px;
    height: 400px;
    overflow: auto;
    background: var(--black-a-8-20);
    color: var(--white);
    box-sizing: border-box;
  }
  .btm_config__row {
    display: flex;
    justify-content: flex-start;
    padding: 15px 10px 5px 10px;
  }
  .btm_config__row--element {
    flex-direction: column;
  }
  .btm_config__row__wrapper > input[type="text"] {
    width: 100px;
    padding: 3px;
    font-size: 13px;
    background: var(--black-23);
    border: 1px solid var(--black-52);
    color: var(--white);
  }
  .btm_config__row__label {
    flex-basis: 230px;
    font-size: 13px;
  }
  .btm_config__row__value {
    padding-left: 2px; 
    padding-top: 1px;
  }
  .btm_config__row--element > .btm_config__row__label {
    flex-basis: auto;
    padding-bottom: 10px;
  }
  .btm_config__close-btn {
    position: absolute;
    top: 5px;
    right: 8px;
    font-size: 13px;
    color: silver;
    cursor: pointer;
  }
  .btm_config__close-btn:hover {
    color: var(--white);
  }
  .btm_dimension {
    position: absolute;
    bottom: 10px;
    left: 20px;
    padding: 0 5px;
    background: var(${__BTM_COLOR_VAR});
    color: var(--white);
  }
  .btm_config__row__x {
    padding: 0 5px;
    font-size: 13px;
  }
  .btm_config__row--mode {
    display: flex;
    align-items: center;
  }
  .btm_config__mode-input {
    margin: 0;
    cursor: pointer;
  }
  .btm_config__mode-label {
    padding-left: 5px;
    cursor: pointer;
  }
  .btm_config__mode-label--auto {
    padding-right: 10px;
  }
  .btm_config__interval-input {
    width: 50px;
  }
  .btm_config__interval-input:disabled {
    opacity: 0.5;
  }
  .btm_config__region {
    display: flex;
    align-items: center;
    justify-content: center;

    position: relative;
    margin: 30px 20px 20px 38px;
    border: 1px solid var(--black-52);
  }
  .btm_config__region  input[type="text"] {
    background: var(--black-23);
    border: 1px solid var(--black-52);
    color: var(--white);
    font-size: 12px;
    padding: 3px 5px;
  }
  .btm_config__region--left {
    position: absolute;
    left: -38px;
    top: calc(52% - 22px);
    width: 20px;
  }
  .btm_config__region--top {
    position: absolute;
    top: -28px;
    left: 35%;
    width: 20px;
  }
  .btm_config__region--width, .btm_config__region--height {
    width: 20px;
    margin: 0 4px;
  }
  .btm_config__region--center {
    margin-top: -17px;
  }
  .btm_config__row__tooltip {
    position: relative;
    top: 2px;
    margin: 0 2px 0 2px;
    cursor: pointer;
    z-index: 1;
  }
  .btm_config__row__tooltip_text {
    display:none;
    position: absolute;
    background: var(--black-23);
    color: white;
    padding: 2px 6px;
    min-width: 200px;
  }
  .btm_config__row__tooltip:hover .btm_config__row__tooltip_text {
    display: block;
  }

  /* Intro */

  .btm_intro__message {
    padding: 6px 20px 6px 20px;
    max-width: 400px;
    margin: 0 auto;
    color: var(--white-87);
    line-height: 1.4;
  }
  .btm_intro__message b {
    color: var(--white);
  }
  .btm_intro {
    position: absolute;
    top: ${TITLE_BAR_HEIGHT}px;
    width: 100%;
    height: 355px;
    overflow: hidden;
    background: var(--black-a-8-20);
    color: var(--white);
  }
  .btm_intro__ok {
    float: right;
    display: inline-block;
    padding: 8px 15px;

    background: hsl(34, 83.16%, 21.45%);
    border-color: var(--white-87);
    border-width: 1px;
    appearance: none;
    border-style: solid;
    color: var(--white-87);
    font-weight: 600;
    font-size: 14px;
    transform: scale(.9);
    cursor: pointer;
  }
  .btm_intro__ok:hover {
    background: hsl(34, 73%, 26%);
  }
  .btm_intro__header {
    position: relative;
    display: flex;
    justify-content: space-between;
    max-width: 400px;
    margin: 0 auto;
    margin-top: 10px;
    padding: 0 20px;
    border-bottom: 1px solid var(--black-23);
  }
  .btm_intro__header > h3 {
    position: relative;
    font-weight: 600;
    font-size: 12px;
    margin-bottom: 6px;
  }
  .btm_intro__header .selected {
    color: var(--blue-69);
  }
  .btm_intro__header__indicator {
    display: none;
    position: absolute;
    width: 110px;
    height: 2px;
    bottom: -7px;
    background: var(--blue-69);
    left: -30px;
  }
  .btm_intro__header--screen .btm_intro__header__indicator {
    left: -18px;
  }
  .btm_intro__header .selected .btm_intro__header__indicator {
    display: block;
  }
  .btm_intro__list {
    display: grid;
    list-style: none;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
    padding: 15px 20px 5px 20px;
    max-width: 400px;
    margin: 0 auto;
  }
  .btm_intro__list > li {
    width: 100%;
    height: 60px;
    border: 1px solid var(--white-87);
  }
  .btm_intro__list > li:first-child {
    border-color: var(--blue-69);
    border-width: 2px;
  }
  .btm_intro__arrow {
    position: absolute;
    top: 17px;
    left: 40%;
  }
  .btm_intro__arrow .curve {
    height: 180px;
    width: 200px;
    border: 2px solid var(--white-87);
    border-color: transparent transparent transparent var(--white-87);
    border-radius: 230px 0 0 150px;
  }
  .btm_intro__arrow .point {
    position: absolute;
    left: 38px;
    top: 38px;
  }
  .btm_intro__arrow .point:before, .btm_intro__arrow .point:after {
    height: 25px;
    content: "";
    position: absolute;
    border: 1px solid var(--white-87);
  }
  .btm_intro__arrow .point:before {
    top: -13px;
    left: -16px;
    transform:rotate(60deg);
  }
  .btm_intro__arrow .point:after {
    top: -7px;
    left: -4px;
    transform: rotate(-2deg);
  }
  .btm_intro__screen-arrow {
    position: absolute;
    left: 50%;
    top: 10px;
    transform: rotate(33deg);
  }
  .btm_intro__screen-arrow .point:before {
    top: -37px;
    left: 91px;
    transform: rotate(22deg);
  }
  .btm_intro__screen-arrow .point:before, .btm_intro__screen-arrow .point:after {
    position: absolute;
    height: 10px;
    content: "";
    border: 1px solid var(--white-87);
  }
  .btm_intro__screen-arrow .point:after {
    top: -37px;
    left: 96px;
    transform: rotate(148deg);
  }
  .btm_intro__screen-arrow .point {
    position: absolute;
    left: 35px;
    top: 52px;
  }
  .btm_intro__screen-arrow .curve {
    position: relative;
    top: -80px;
    right: 34px;
    height: 160px;
    width: 200px;
    transform: rotate(45deg);
    border: 2px solid var(--white-87);
    border-color: transparent var(--white-87) transparent transparent;
    border-radius: 0 200px 0 0;
  }
  .btm_advanced {
    padding: 10px 0 0 12px;
  }
  .btm_advanced summary {
    cursor: pointer;
  }
  .btm_config__row--impl label {
    font-size: 11px;
  }
  .btm_config__row__radio-wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-right: 5px;
  }
  .btm_config__row__radio-wrapper:first-child {
    margin-bottom: 10px;
  }
  .btm_config__row__radio-wrapper input {
    margin: 0 4px;
  }
  .btm_config__row__radio-wrapper input:first-child {
    margin-left: 0;
  }
  .btm_config__row--impl .btm_config__row__radio:last-child {
    margin-left: 5px;
  }
`;
