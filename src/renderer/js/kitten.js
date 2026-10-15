// A small kitten that chases the cursor around the window and sometimes
// plays with interface elements (hops onto them and gives them a push).

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

const PLAY_TARGETS = '.card, .btn, .stat, .task-row, .note-item, .cal-cell, .chip-btn, .side-item';
const W = 100;
const H = 76;

let el;
let inner;
let enabled = true;
let speedMul = 1;

const pos = { x: 140, y: 400 };
const vel = { x: 0, y: 0 };
const mouse = { x: 300, y: 300, inside: false, lastMove: performance.now() };
let facing = 1;
let mode = 'follow'; // follow | play | jump
let playTarget = null; // { el, x, y }
let nextPlayAt = performance.now() + 9000;
let hoverSince = 0;
let lastHeart = 0;
let jumpUntil = 0;
let rafId = 0;

function setState(name) {
  if (el.dataset.state !== name) el.dataset.state = name;
}

function spawnHeart() {
  const heart = document.createElement('div');
  heart.className = 'kitten-heart';
  heart.textContent = Math.random() < 0.75 ? '♥' : '✿';
  heart.style.left = `${pos.x + (Math.random() * 30 - 15)}px`;
  heart.style.top = `${pos.y - H - 4}px`;
  document.body.append(heart);
  setTimeout(() => heart.remove(), 1400);
}

function bump(target) {
  if (!target?.isConnected) return;
  target.style.setProperty('--push-dir', facing);
  target.classList.remove('kitten-bump');
  void target.offsetWidth; // restart animation
  target.classList.add('kitten-bump');
  setTimeout(() => target.classList.remove('kitten-bump'), 700);
}

function hop(onLand) {
  mode = 'jump';
  jumpUntil = performance.now() + 520;
  el.classList.remove('hop');
  void el.offsetWidth;
  el.classList.add('hop');
  setTimeout(() => {
    el.classList.remove('hop');
    onLand?.();
    if (mode === 'jump') mode = 'follow';
  }, 520);
}

function pickPlayTarget() {
  const candidates = [...document.querySelectorAll(PLAY_TARGETS)].filter((n) => {
    if (n.closest('.modal-backdrop')) return false;
    const r = n.getBoundingClientRect();
    return (
      r.width > 40 && r.height > 20 && r.top > 70 && r.bottom < innerHeight - 10 && r.left > 0 && r.right < innerWidth
    );
  });
  if (!candidates.length) return null;
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const r = target.getBoundingClientRect();
  const side = Math.random() < 0.5 ? -1 : 1;
  // Approach the element from a side, standing on its baseline, then push it.
  const x = side < 0 ? r.left - W * 0.35 : r.right + W * 0.35;
  return {
    el: target,
    x: Math.min(Math.max(x, W / 2), innerWidth - W / 2),
    y: Math.min(r.bottom, innerHeight - 4),
    side,
  };
}

function tick(now) {
  rafId = requestAnimationFrame(tick);
  if (!enabled) return;

  if (window.__kpForcePlay) {
    // test hook: start playing right away
    window.__kpForcePlay = false;
    nextPlayAt = 0;
    mouse.lastMove = now - 4000;
  }
  const idleFor = now - mouse.lastMove;

  // Decide where to go.
  let tx;
  let ty;
  if (mode === 'play' && playTarget) {
    if (!playTarget.el.isConnected || idleFor < 300) {
      mode = 'follow';
      playTarget = null;
    } else {
      tx = playTarget.x;
      ty = playTarget.y;
    }
  }
  if (mode === 'follow' || mode === 'jump') {
    // Trail a little behind & below the cursor so it never covers what you click.
    tx = mouse.x - facing * 46;
    ty = mouse.y + 42;
    if (now > nextPlayAt && idleFor > 3500 && mode === 'follow') {
      playTarget = pickPlayTarget();
      if (playTarget) mode = 'play';
      nextPlayAt = now + 14000 + Math.random() * 16000;
    }
  }
  tx = Math.min(Math.max(tx, W / 2), innerWidth - W / 2);
  ty = Math.min(Math.max(ty, H + 40), innerHeight - 2);

  const dx = tx - pos.x;
  const dy = ty - pos.y;
  const dist = Math.hypot(dx, dy);
  const maxSpeed = (mode === 'play' ? 5 : 7.5) * speedMul;

  if (dist > 6 && mode !== 'jump') {
    const desired = Math.min(maxSpeed, dist * 0.09 + 0.6);
    vel.x += ((dx / dist) * desired - vel.x) * 0.16;
    vel.y += ((dy / dist) * desired - vel.y) * 0.16;
  } else {
    vel.x *= 0.7;
    vel.y *= 0.7;
  }
  pos.x += vel.x;
  pos.y += vel.y;

  if (Math.abs(vel.x) > 0.6) {
    const f = vel.x > 0 ? 1 : -1;
    if (f !== facing) facing = f;
  }

  const speed = Math.hypot(vel.x, vel.y);

  // Arrived at the play target: face it, hop, push.
  if (mode === 'play' && playTarget && dist < 8) {
    const t = playTarget;
    playTarget = null;
    facing = t.side < 0 ? 1 : -1;
    el.classList.add('paw-swipe');
    setTimeout(() => {
      el.classList.remove('paw-swipe');
      bump(t.el);
      if (Math.random() < 0.6) hop(() => bump(t.el));
    }, 380);
    mode = 'follow';
    mouse.lastMove = now - 2000; // linger a moment before returning
  }

  // Petting: cursor resting on the kitten.
  const overCat = mouse.inside && Math.abs(mouse.x - pos.x) < W / 2 && mouse.y < pos.y && mouse.y > pos.y - H;
  if (overCat) {
    if (!hoverSince) hoverSince = now;
  } else hoverSince = 0;
  const purring = hoverSince && now - hoverSince > 900;
  if (purring && now - lastHeart > 380) {
    lastHeart = now;
    spawnHeart();
  }

  if (now < jumpUntil) setState('jump');
  else if (purring) setState('happy');
  else if (speed > 1.2) setState('run');
  else if (idleFor > 25000 || !mouse.inside) setState('sleep');
  else setState('idle');

  el.style.transform = `translate3d(${pos.x - W / 2}px, ${pos.y - H}px, 0)`;
  inner.style.transform = `scaleX(${facing})`;
  el.style.setProperty('--run-speed', `${Math.max(0.18, 0.42 - speed * 0.03)}s`);
}

export function initKitten({ enabled: on = true, speed = 1 } = {}) {
  el = document.createElement('div');
  el.id = 'kitten';
  el.innerHTML = `<div class="kitten-inner">${SVG}</div><div class="kitten-zzz">z<span>z</span><span>z</span></div>`;
  inner = el.firstElementChild;
  document.body.append(el);
  speedMul = speed;
  pos.x = 160;
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
    if (Math.hypot(mouse.x - pos.x, mouse.y - (pos.y - H / 2)) < 120 && mode === 'follow' && Math.random() < 0.35) {
      hop();
    }
  });

  setKittenEnabled(on);
  rafId = requestAnimationFrame(tick);
}

export function setKittenEnabled(on) {
  enabled = on;
  if (el) el.hidden = !on;
}

export function setKittenSpeed(v) {
  speedMul = v;
}

export function stopKitten() {
  cancelAnimationFrame(rafId);
}
