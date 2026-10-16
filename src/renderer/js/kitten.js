// Kitten controller: chases the cursor, falls asleep when you're idle, purrs when you rest the
// cursor on it, and sometimes runs to a button, jumps on top of it (pressing it down) or
// pushes a card. Rendering is delegated to the 3D renderer, with a flat SVG fallback.
import { createKitten3D } from './kitten3d.js';
import { createKittenSvg } from './kitten-svg.js';

const PERCH_TARGETS = '.btn, .nav-item, .stat, .chip-btn, .segmented button, .side-item';
const PUSH_TARGETS = '.card:not(.modal)';
const TOP_LIMIT = 52; // keep below the title bar

let el;
let shadow;
let view;
let enabled = true;
let speedMul = 1;

const pos = { x: 160, y: 500 };
const vel = { x: 0, y: 0 };
const mouse = { x: 400, y: 400, inside: false, lastMove: performance.now() };
let facing = 1;
let mode = 'follow'; // follow | approach | crouch | jump | perched
let target = null; // { el, kind: 'perch'|'push', side, approach: {x,y} }
let jump = null; // { from, to, t, dur, height, onLand }
let perch = null; // { el, offsetX, until, nextHop }
let crouchUntil = 0;
let nextPlayAt = performance.now() + 8000;
let hoverSince = 0;
let lastHeart = 0;
let last = performance.now();
let rafId = 0;

const clampX = (x) => Math.min(Math.max(x, 70), innerWidth - 70);
const clampY = (y) => Math.min(Math.max(y, TOP_LIMIT + 90), innerHeight - 6);

function visible(node) {
  if (node.closest('.modal-backdrop') || node.offsetParent === null) return false;
  const r = node.getBoundingClientRect();
  return (
    r.width >= 44 &&
    r.height >= 24 &&
    r.top > TOP_LIMIT + 90 &&
    r.bottom < innerHeight - 20 &&
    r.left > 30 &&
    r.right < innerWidth - 30
  );
}

function spawnHeart() {
  const heart = document.createElement('div');
  heart.className = 'kitten-heart';
  heart.textContent = Math.random() < 0.75 ? '♥' : '✿';
  heart.style.left = `${pos.x + (Math.random() * 40 - 20)}px`;
  heart.style.top = `${pos.y - 110}px`;
  document.body.append(heart);
  setTimeout(() => heart.remove(), 1400);
}

function bump(node) {
  if (!node?.isConnected) return;
  node.style.setProperty('--push-dir', facing);
  node.classList.remove('kitten-bump');
  void node.offsetWidth;
  node.classList.add('kitten-bump');
  setTimeout(() => node.classList.remove('kitten-bump'), 700);
}

function press(node) {
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
    dur: Math.min(0.85, 0.42 + dist / 1400),
    height: height ?? (up > 0 ? up / 2 + 45 : 40),
    onLand,
  };
  facing = to.x >= from.x ? 1 : -1;
}

function releasePerch() {
  if (perch?.el) perch.el.classList.remove('kitten-perch');
  perch = null;
}

function jumpDown(toward) {
  const r = perch?.el?.getBoundingClientRect();
  releasePerch();
  const dir = toward ? Math.sign(toward.x - pos.x) || facing : facing;
  const to = { x: clampX(pos.x + dir * 80), y: clampY((r ? r.bottom : pos.y) + 46) };
  startJump(to, () => (mode = 'follow'), 30);
}

function pickTarget() {
  const pushing = Math.random() < 0.3;
  const nodes = [...document.querySelectorAll(pushing ? PUSH_TARGETS : PERCH_TARGETS)].filter(visible);
  if (!nodes.length) return null;
  const node = nodes[Math.floor(Math.random() * nodes.length)];
  const r = node.getBoundingClientRect();
  const side = pos.x < r.left + r.width / 2 ? -1 : 1;
  const approach = pushing
    ? { x: clampX(side < 0 ? r.left - 40 : r.right + 40), y: clampY(r.top + Math.min(r.height, 120) / 2 + 40) }
    : { x: clampX(r.left + r.width / 2 + side * (r.width / 2 + 70)), y: clampY(r.bottom + 34) };
  return { el: node, kind: pushing ? 'push' : 'perch', side, approach };
}

function onArrive(now) {
  const tg = target;
  target = null;
  if (!tg.el.isConnected) return (mode = 'follow');
  if (tg.kind === 'push') {
    facing = tg.side < 0 ? 1 : -1;
    bump(tg.el);
    mode = 'follow';
    mouse.lastMove = now - 2500;
    return;
  }
  // Crouch, then leap onto the top edge of the button.
  mode = 'crouch';
  facing = tg.side < 0 ? 1 : -1;
  crouchUntil = now + 260;
  target = tg;
}

function leapOnto(tg) {
  const r = tg.el.getBoundingClientRect();
  const offsetX = (Math.random() - 0.5) * Math.min(r.width * 0.4, 60);
  target = null;
  startJump({ x: r.left + r.width / 2 + offsetX, y: r.top + 4 }, () => {
    if (!tg.el.isConnected) return (mode = 'follow');
    press(tg.el);
    tg.el.classList.add('kitten-perch');
    mode = 'perched';
    const now = performance.now();
    perch = { el: tg.el, offsetX, until: now + 2500 + Math.random() * 2500, nextHop: now + 900 + Math.random() * 900 };
  });
}

function tick(now) {
  rafId = requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!enabled) return;

  if (window.__kpForcePlay) {
    // test hook: start playing right away
    window.__kpForcePlay = false;
    nextPlayAt = 0;
    mouse.lastMove = now - 4000;
  }
  const idleFor = now - mouse.lastMove;
  const userActive = idleFor < 250;
  let state = 'idle';

  if (mode === 'jump' && jump) {
    jump.t += dt;
    const u = Math.min(1, jump.t / jump.dur);
    pos.x = jump.from.x + (jump.to.x - jump.from.x) * u;
    pos.y = jump.from.y + (jump.to.y - jump.from.y) * u - jump.height * 4 * u * (1 - u);
    state = 'jump';
    if (u >= 1) {
      const done = jump.onLand;
      jump = null;
      mode = 'follow';
      done?.();
    }
  } else if (mode === 'crouch') {
    state = 'crouch';
    if (userActive) mode = 'follow';
    else if (now > crouchUntil && target) leapOnto(target);
  } else if (mode === 'perched' && perch) {
    if (!perch.el.isConnected || !visible(perch.el)) {
      releasePerch();
      mode = 'follow';
    } else {
      const r = perch.el.getBoundingClientRect();
      pos.x = r.left + r.width / 2 + perch.offsetX;
      pos.y = r.top + 4;
      state = 'idle';
      if (userActive) jumpDown(mouse);
      else if (now > perch.until) jumpDown();
      else if (now > perch.nextHop) {
        perch.nextHop = now + 1400 + Math.random() * 1200;
        if (Math.random() < 0.5) {
          const node = perch.el;
          startJump(
            { x: pos.x, y: pos.y },
            () => {
              press(node);
              mode = 'perched';
            },
            26,
          );
          mode = 'jump';
        } else facing = -facing;
      }
    }
  } else {
    // follow / approach: steer toward a point on the "floor"
    let tx;
    let ty;
    if (mode === 'approach' && target) {
      if (userActive || !target.el.isConnected) {
        mode = 'follow';
        target = null;
      } else {
        tx = target.approach.x;
        ty = target.approach.y;
      }
    }
    if (mode !== 'approach') {
      mode = 'follow';
      tx = mouse.x - facing * 64;
      ty = mouse.y + 56;
      if (now > nextPlayAt && idleFor > 3500) {
        target = pickTarget();
        if (target) mode = 'approach';
        nextPlayAt = now + 12000 + Math.random() * 14000;
      }
    }
    tx = clampX(tx);
    ty = clampY(ty);
    const dx = tx - pos.x;
    const dy = ty - pos.y;
    const dist = Math.hypot(dx, dy);
    const maxSpeed = (mode === 'approach' ? 330 : 460) * speedMul;
    if (dist > 6) {
      const desired = Math.min(maxSpeed, dist * 5 + 30);
      vel.x += ((dx / dist) * desired - vel.x) * Math.min(1, dt * 9);
      vel.y += ((dy / dist) * desired - vel.y) * Math.min(1, dt * 9);
    } else {
      vel.x *= 0.6;
      vel.y *= 0.6;
    }
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    if (Math.abs(vel.x) > 25) facing = vel.x > 0 ? 1 : -1;
    const speed = Math.hypot(vel.x, vel.y);
    if (mode === 'approach' && dist < 10) onArrive(now);
    if (speed > 60) state = 'run';
    else if (idleFor > 25000 || !mouse.inside) state = 'sleep';
    view.setSpeed(speed / 60);
  }

  // Petting: cursor resting on the kitten.
  const over = mouse.inside && Math.abs(mouse.x - pos.x) < 55 && mouse.y < pos.y && mouse.y > pos.y - 85;
  if (over && idleFor > 150) {
    if (!hoverSince) hoverSince = now;
  } else if (!over) hoverSince = 0;
  if (hoverSince && now - hoverSince > 900 && state !== 'jump') {
    state = 'happy';
    if (now - lastHeart > 380) {
      lastHeart = now;
      spawnHeart();
    }
  }

  view.setState(state);
  view.setFacing(facing);
  view.setLook((mouse.x - pos.x) / 400, (mouse.y - (pos.y - 60)) / 300);
  view.tick(dt);
  el.dataset.state = state;
  el.style.transform = `translate3d(${pos.x - view.feet.x}px, ${pos.y - view.feet.y}px, 0)`;
  const lift = jump ? Math.max(0, jump.height * 4 * (jump.t / jump.dur) * (1 - jump.t / jump.dur)) : 0;
  shadow.style.transform = `translate(-50%, ${lift}px) scale(${Math.max(0.4, 1 - lift / 120)})`;
  shadow.style.opacity = mode === 'perched' ? '0.35' : '0.6';
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
  shadow.style.top = `${view.feet.y - 6}px`;
  const zzz = document.createElement('div');
  zzz.className = 'kitten-zzz';
  zzz.innerHTML = 'z<span>z</span><span>z</span>';
  zzz.style.left = `${view.feet.x + 30}px`;
  zzz.style.top = `${view.feet.y - 80}px`;
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
  document.documentElement.addEventListener('mouseleave', () => (mouse.inside = false));
  window.addEventListener('mousedown', () => {
    // A click nearby startles the kitten into a little hop.
    if (mode === 'follow' && Math.hypot(mouse.x - pos.x, mouse.y - (pos.y - 40)) < 130 && Math.random() < 0.4) {
      startJump({ x: pos.x, y: pos.y }, () => (mode = 'follow'), 34);
    }
  });

  setKittenEnabled(on);
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
