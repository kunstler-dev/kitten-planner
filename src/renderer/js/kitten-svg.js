// Flat SVG kitten — fallback renderer when WebGL is unavailable.

const SVG = `
<svg class="kitten-svg" viewBox="0 0 84 64" width="100" height="76" aria-hidden="true">
  <g class="k-tail"><path d="M18 40 C 8 38, 4 28, 8 16" /></g>
  <g class="k-legs-back">
    <rect class="k-leg k-leg-a" x="21" y="40" width="7" height="15" rx="3.5"/>
    <rect class="k-leg k-leg-b" x="29" y="40" width="7" height="15" rx="3.5"/>
  </g>
  <ellipse class="k-body" cx="38" cy="39" rx="21" ry="12.5"/>
  <path class="k-stripe" d="M30 28 q2 5 0 9 M37 27 q2 6 0 10 M44 28 q2 5 0 9"/>
  <ellipse class="k-belly" cx="42" cy="45" rx="12" ry="5"/>
  <g class="k-legs-front">
    <rect class="k-leg k-leg-b" x="44" y="40" width="7" height="15" rx="3.5"/>
    <g class="k-paw"><rect class="k-leg k-leg-a" x="52" y="40" width="7" height="15" rx="3.5"/></g>
  </g>
  <g class="k-head">
    <path class="k-ear" d="M49 20 L51 5 L60 14 Z"/>
    <path class="k-ear" d="M64 13 L73 5 L73 21 Z"/>
    <path class="k-ear-in" d="M51.5 17 L52.5 9 L57.5 14 Z"/>
    <path class="k-ear-in" d="M66 14 L71 9.5 L71 18 Z"/>
    <circle class="k-face" cx="62" cy="27" r="14.5"/>
    <path class="k-stripe" d="M58 14.5 q1 3 0 5 M62 13 q1 3.5 0 6 M66 14.5 q1 3 0 5"/>
    <g class="k-eyes">
      <ellipse class="k-eye" cx="56.5" cy="26" rx="2.3" ry="3"/>
      <ellipse class="k-eye" cx="68" cy="26" rx="2.3" ry="3"/>
      <circle class="k-glint" cx="57.3" cy="24.8" r="0.8"/>
      <circle class="k-glint" cx="68.8" cy="24.8" r="0.8"/>
    </g>
    <path class="k-happy-eyes" d="M54 26.5 q2.5 -3 5 0 M65.5 26.5 q2.5 -3 5 0"/>
    <ellipse class="k-cheek" cx="53" cy="31.5" rx="3" ry="1.8"/>
    <ellipse class="k-cheek" cx="71.5" cy="31.5" rx="3" ry="1.8"/>
    <path class="k-nose" d="M60.6 30 h3 l-1.5 1.8 z"/>
    <path class="k-mouth" d="M62.1 31.8 q-1.2 2 -3 1.2 M62.1 31.8 q1.2 2 3 1.2"/>
    <path class="k-whisker" d="M50 31 h-7 M50 33.5 l-6 2 M74 31 h7 M74 33.5 l6 2"/>
  </g>
</svg>`;

export function createKittenSvg() {
  const el = document.createElement('div');
  el.className = 'kitten-svg-wrap';
  el.innerHTML = SVG;
  const inner = el.firstElementChild;
  return {
    el,
    size: { w: 100, h: 76 },
    feet: { x: 50, y: 74 },
    setState(s) {
      // 'crouch' and 'jump' share the hop pose in the flat version
      el.dataset.state = s === 'crouch' ? 'idle' : s;
    },
    setFacing(f) {
      inner.style.transform = `scaleX(${f})`;
    },
    setSpeed(v) {
      el.style.setProperty('--run-speed', `${Math.max(0.18, 0.42 - v * 0.03)}s`);
    },
    setLook() {},
    tick() {},
    dispose() {},
  };
}
