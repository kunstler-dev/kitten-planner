// Kitten controller. Calmly trails the cursor (never in the way), falls asleep when the mouse rests,
// purrs when you rest the cursor on it, and — when you hover a button while deciding where to go —
// jumps on top of that button (pressing it down) and hops from button to button with you.
// A "director" (the AI-tab playground) can take over to play with the robot.
import { createKitten3D } from './kitten3d.js';
import { onSeasonChange } from './seasons/season.js';
import { createKittenSvg } from './kitten-svg.js';

export const PERCH_TARGETS =
  '.btn, .nav-item, .stat, .chip-btn, .segmented button, .side-item, .lang-switch button, .theme-switch';
const TOP_LIMIT = 46;
const HOVER_DELAY = 550;
const SLEEP_AFTER = 20000;

let el;
let shadow;
let view;
let enabled = true;
let speedMul = 1;
let director = null;

const pos = { x: 160, y: 500 };
const vel = { x: 0, y: 0 };
const mouse = { x: 400, y: 400, inside: false, lastMove: performance.now() };
let touch = false;
let facing = 1;
let mode = 'follow'; // follow | approach | crouch | jump | perched | directed
let jump = null; // { from, to, t, dur, height, onLand }
let perch = null; // { el, offsetX }
let goal = null; // { el, approach } button we're heading to
let crouchUntil = 0;
let hover = { el: null, since: 0 };
let hoverSince = 0;
let lastHeart = 0;
let last = performance.now();
let rafId = 0;
let directedTarget = null; // { x, y, speed }

const clampX = (x) => Math.min(Math.max(x, 40), innerWidth - 40);
const clampY = (y) => Math.min(Math.max(y, TOP_LIMIT + 50), innerHeight - 4);

function usable(node) {
  if (!node?.isConnected || node.closest('.modal-backdrop') || node.offsetParent === null) return false;
  const r = node.getBoundingClientRect();
  return (
    r.width >= 28 &&
    r.height >= 20 &&
    r.top > TOP_LIMIT + 40 - 30 &&
    r.bottom < innerHeight &&
    r.left > 0 &&
    r.right < innerWidth
  );
}

function spawnHeart() {
  const heart = document.createElement('div');
  heart.className = 'kitten-heart';
  heart.textContent = Math.random() < 0.75 ? '♥' : '✿';
  heart.style.left = `${pos.x + (Math.random() * 24 - 12)}px`;
  heart.style.top = `${pos.y - 58}px`;
  document.body.append(heart);
  setTimeout(() => heart.remove(), 1400);
}

export function press(node) {
  if (!node?.isConnected) return;
  node.classList.remove('kitten-press');
  void node.offsetWidth;
  node.classList.add('kitten-press');
  setTimeout(() => node.classList.remove('kitten-press'), 450);
}

function startJump(to, onLand, height) {
  const from = { ...pos };
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const up = from.y - to.y;
  mode = 'jump';
  jump = {
    from,
    to,
    t: 0,
    dur: Math.min(0.7, 0.32 + dist / 1600),
    height: height ?? (up > 0 ? up / 2 + 30 : 26),
    onLand,
  };
  if (Math.abs(to.x - from.x) > 4) facing = to.x >= from.x ? 1 : -1;
}

function releasePerch() {
  perch?.el?.classList.remove('kitten-perch');
  perch = null;
}

/** Landing spot on top of a button, on the side away from the cursor so it never covers it. */
function landingSpot(node) {
  const r = node.getBoundingClientRect();
  const away = mouse.x < r.left + r.width / 2 ? 1 : -1;
  const inset = Math.min(22, r.width / 4);
  const x = away > 0 ? r.right - inset : r.left + inset;
  return { x, y: r.top + 3, offsetX: x - (r.left + r.width / 2) };
}

function leapOnto(node) {
  const spot = landingSpot(node);
  startJump({ x: spot.x, y: spot.y }, () => {
    if (!usable(node)) return (mode = 'follow');
    press(node);
    node.classList.add('kitten-perch');
    perch = { el: node, offsetX: spot.offsetX };
    mode = 'perched';
  });
}

function jumpDown() {
  const r = perch?.el?.getBoundingClientRect();
  releasePerch();
  const dir = Math.sign(pos.x - mouse.x) || facing;
  startJump({ x: clampX(pos.x + dir * 40), y: clampY((r ? r.bottom : pos.y) + 28) }, () => (mode = 'follow'), 20);
}

function goToButton(node) {
  goal = null;
  releasePerch();
  const r = node.getBoundingClientRect();
  const near = Math.hypot(pos.x - (r.left + r.width / 2), pos.y - r.top) < 260;
  if (near || mode === 'perched') {
    leapOnto(node);
  } else {
    goal = {
      el: node,
      approach: {
        x: clampX(r.left + r.width / 2 + (pos.x < r.left ? -1 : 1) * (r.width / 2 + 30)),
        y: clampY(r.bottom + 20),
      },
    };
    mode = 'approach';
  }
}

function steer(tx, ty, maxSpeed, dt, stopDist = 6) {
  tx = clampX(tx);
  ty = clampY(ty);
  const dx = tx - pos.x;
  const dy = ty - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > stopDist) {
    const desired = Math.min(maxSpeed, dist * 4 + 20);
    vel.x += ((dx / dist) * desired - vel.x) * Math.min(1, dt * 8);
    vel.y += ((dy / dist) * desired - vel.y) * Math.min(1, dt * 8);
  } else {
    vel.x *= 0.6;
    vel.y *= 0.6;
  }
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  if (Math.abs(vel.x) > 20) facing = vel.x > 0 ? 1 : -1;
  return dist;
}

/** API for the AI-tab playground. */
export const kittenApi = {
  get pos() {
    return { ...pos };
  },
  get busy() {
    return mode === 'jump';
  },
  goTo(x, y, speed = 1) {
    directedTarget = { x, y, speed };
  },
  jumpTo(to, height, onLand) {
    startJump(
      to,
      () => {
        mode = 'directed';
        onLand?.();
      },
      height,
    );
  },
  face(f) {
    facing = f;
  },
};

export function setKittenDirector(d) {
  director = d;
  directedTarget = null;
  releasePerch();
  goal = null;
  if (mode !== 'jump') mode = d ? 'directed' : 'follow';
}

function tick(now) {
  rafId = requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!enabled) {
    director?.update(now, dt, kittenApi, 'idle');
    return;
  }

  const idleFor = now - mouse.lastMove;
  const sleepy = idleFor > SLEEP_AFTER || !mouse.inside;
  let state = 'idle';
  let speed = 0;

  // Hovering a button for a moment = "thinking where to go" → kitten comes and sits on it.
  if (
    !director &&
    hover.el &&
    now - hover.since > HOVER_DELAY &&
    hover.el !== perch?.el &&
    hover.el !== goal?.el &&
    mode !== 'jump' &&
    mode !== 'crouch' &&
    usable(hover.el)
  ) {
    goToButton(hover.el);
  }

  if (mode === 'jump' && jump) {
    jump.t += dt;
    const u = Math.min(1, jump.t / jump.dur);
    pos.x = jump.from.x + (jump.to.x - jump.from.x) * u;
    pos.y = jump.from.y + (jump.to.y - jump.from.y) * u - jump.height * 4 * u * (1 - u);
    state = 'jump';
    if (u >= 1) {
      const done = jump.onLand;
      jump = null;
      mode = director ? 'directed' : 'follow';
      done?.();
    }
  } else if (mode === 'crouch') {
    state = 'crouch';
    if (now > crouchUntil && goal) {
      const node = goal.el;
      goal = null;
      leapOnto(node);
    }
  } else if (mode === 'perched' && perch) {
    if (!usable(perch.el)) {
      releasePerch();
      mode = 'follow';
    } else {
      const r = perch.el.getBoundingClientRect();
      pos.x = r.left + r.width / 2 + perch.offsetX;
      pos.y = r.top + 3;
      facing = mouse.x >= pos.x ? 1 : -1;
      const pad = 60;
      const cursorNear =
        mouse.x > r.left - pad && mouse.x < r.right + pad && mouse.y > r.top - pad && mouse.y < r.bottom + pad;
      state = sleepy ? 'sleep' : 'idle';
      if (!cursorNear && !hover.el) jumpDown();
    }
  } else if (mode === 'directed' && director) {
    const t = directedTarget;
    if (t) {
      const dist = steer(t.x, t.y, 300 * t.speed * speedMul, dt);
      speed = Math.hypot(vel.x, vel.y);
      if (dist < 8) directedTarget = null;
    }
    state = speed > 40 ? 'run' : 'idle';
  } else if (mode === 'approach' && goal) {
    if (!usable(goal.el)) {
      goal = null;
      mode = 'follow';
    } else {
      const dist = steer(goal.approach.x, goal.approach.y, 420 * speedMul, dt);
      speed = Math.hypot(vel.x, vel.y);
      state = speed > 40 ? 'run' : 'idle';
      if (dist < 10) {
        mode = 'crouch';
        crouchUntil = now + 180;
      }
    }
  } else {
    mode = 'follow';
    // Trail behind and below the cursor; stop at a polite distance.
    const tx = mouse.x - facing * 46;
    const ty = mouse.y + 40;
    steer(tx, ty, 380 * speedMul, dt, 22);
    speed = Math.hypot(vel.x, vel.y);
    if (speed > 40) state = 'run';
    else if (sleepy) state = 'sleep';
  }

  director?.update(now, dt, kittenApi, state);
  if (director && sleepy && mode === 'directed' && speed < 40) state = 'sleep';

  // Petting: cursor resting on the kitten.
  const over = mouse.inside && Math.abs(mouse.x - pos.x) < 28 && mouse.y < pos.y && mouse.y > pos.y - 46;
  if (over && idleFor > 150) {
    if (!hoverSince) hoverSince = now;
  } else if (!over) hoverSince = 0;
  if (hoverSince && now - hoverSince > 800 && state !== 'jump') {
    state = 'happy';
    if (now - lastHeart > 380) {
      lastHeart = now;
      spawnHeart();
    }
  }

  view.setState(state);
  view.setFacing(facing);
  view.setSpeed(speed / 60);
  view.setLook((mouse.x - pos.x) / 300, (mouse.y - (pos.y - 30)) / 240);
  view.tick(dt);
  el.dataset.state = state;
  el.dataset.mode = mode;
  el.style.transform = `translate3d(${pos.x - view.feet.x}px, ${pos.y - view.feet.y}px, 0)`;
  const lift = jump ? Math.max(0, jump.height * 4 * (jump.t / jump.dur) * (1 - jump.t / jump.dur)) : 0;
  shadow.style.transform = `translate(-50%, ${lift}px) scale(${Math.max(0.4, 1 - lift / 70)})`;
  shadow.style.opacity = mode === 'perched' ? '0.3' : '0.55';
}

export function initKitten({ enabled: on = true, speed = 1 } = {}) {
  el = document.createElement('div');
  el.id = 'kitten';
  view = createKitten3D() || createKittenSvg();
  el.dataset.renderer = view.el.tagName === 'CANVAS' ? '3d' : 'svg';
  el.style.width = `${view.size.w}px`;
  el.style.height = `${view.size.h}px`;
  shadow = document.createElement('div');
  shadow.className = 'kitten-shadow';
  shadow.style.left = `${view.feet.x}px`;
  shadow.style.top = `${view.feet.y - 4}px`;
  const zzz = document.createElement('div');
  zzz.className = 'kitten-zzz';
  zzz.innerHTML = 'z<span>z</span><span>z</span>';
  zzz.style.left = `${view.feet.x + 14}px`;
  zzz.style.top = `${view.feet.y - 46}px`;
  el.append(shadow, view.el, zzz);
  document.body.append(el);
  speedMul = speed;
  pos.x = 180;
  pos.y = innerHeight - 30;

  window.addEventListener('mousemove', (e) => {
    const moved = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.inside = true;
    if (moved > 3) mouse.lastMove = performance.now();
  });
  // Phone: no cursor — the kitten trots over to wherever she taps, then naps again.
  window.addEventListener(
    'pointerdown',
    (e) => {
      touch = e.pointerType !== 'mouse';
      if (!touch) return;
      // Stay along the bottom edge so she never covers what is being read.
      mouse.x = e.clientX;
      mouse.y = innerHeight - 70;
      mouse.inside = true;
      mouse.lastMove = performance.now();
    },
    { passive: true },
  );
  document.addEventListener('mouseover', (e) => {
    if (touch) return; // taps emulate mouseover; perching is for "thinking with the cursor" only
    const node = e.target.closest?.(PERCH_TARGETS);
    if (node !== hover.el) hover = { el: node || null, since: performance.now() };
  });
  document.documentElement.addEventListener('mouseleave', () => {
    mouse.inside = false;
    hover = { el: null, since: 0 };
  });

  setKittenEnabled(on);
  onSeasonChange((season) => view.setOutfit?.(season));
  rafId = requestAnimationFrame(tick);
}

export function setKittenEnabled(on) {
  enabled = on;
  if (el) el.hidden = !on;
  if (!on) releasePerch();
}

export function setKittenSpeed(v) {
  speedMul = v;
}

export function stopKitten() {
  cancelAnimationFrame(rafId);
  view?.dispose();
}
