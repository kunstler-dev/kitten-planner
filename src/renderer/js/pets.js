// Pet corner controller: keeps one persistent element (so the WebGL canvas survives sidebar
// re-renders), runs the scene at ~30 fps and pauses while the window is hidden.
import { h } from './ui.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { createPetCorner } from './pets3d.js';
import { onSeasonChange } from './seasons/season.js';

let el = null;
let scene = null;
let enabled = true;
let raf = 0;
let last = 0;

function loop(now) {
  raf = requestAnimationFrame(loop);
  if (now - last < 32) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  scene.tick(dt);
}

function start() {
  if (!scene || raf || !enabled || document.hidden) return;
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
}

function build() {
  enabled = state.data.settings.pets !== false;
  el = h('div', { class: 'pet-corner', 'aria-hidden': 'true' });
  // Start a moment after boot so its shaders don't compile at the same time as the kitten's.
  setTimeout(buildScene, 900);
}

function buildScene() {
  try {
    scene = createPetCorner();
  } catch (err) {
    console.warn('pet corner unavailable', err);
    scene = null;
  }
  if (scene) {
    const zzz = h('div', { class: 'pet-zzz' }, h('span', {}, 'z'), h('span', {}, 'z'), h('span', {}, 'z'));
    const a = scene.sleeperAnchor();
    zzz.style.left = `${a.x}px`;
    zzz.style.top = `${a.y - 14}px`;
    el.append(scene.el, zzz);
    onSeasonChange((season) => scene.setOutfit(season));
    el.addEventListener('mouseenter', () => scene.setHover(true));
    el.addEventListener('mouseleave', () => scene.setHover(false));
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  } else {
    el.append(h('div', { class: 'pet-fallback' }, '😴🐈 🧶🐈‍⬛ 🐕'));
  }
  start();
}

/** The pet corner element for the sidebar (created once, re-used on every nav render). */
export function petCorner() {
  if (!el) build();
  el.title = t('pets.title');
  el.hidden = !enabled;
  start();
  return el;
}

export function setPetsEnabled(on) {
  enabled = on;
  if (el) el.hidden = !on;
  if (on) start();
  else stop();
}
