// Seasonal ambience: one full-screen canvas *behind* the interface (rain, leaves, snow, petals,
// fireflies, bats, confetti, balloons…) plus a few DOM/SVG decorations (garland, corner tree,
// Halloween fog, a little scene in the sidebar). Never intercepts clicks; pauses when hidden.

let canvas;
let ctx;
let particles = [];
let raf = 0;
let last = 0;
let fx = [];
let season = null;
let dark = false;
let w = 0;
let h = 0;
let dpr = 1;
const layer = { garland: null, tree: null, fog: null };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isTouch = matchMedia('(hover: none)').matches;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const LEAF_COLORS = ['#c8642f', '#d98a3a', '#b84a2a', '#e0a83f', '#9c5a2b', '#c97b2c'];
const PETAL_COLORS = ['#f7c6d6', '#f3b0c6', '#fbe1ea', '#f9d3e0'];
const CONFETTI = ['#f29bb4', '#b58be6', '#ffcf66', '#7fd4c1', '#8fb6f0', '#ff9a6b'];
const BALLOONS = ['#f29bb4', '#b58be6', '#ffcf66', '#7fd4c1', '#8fb6f0'];
const BUTTERFLY = ['#f6a5c0', '#b9a2ee', '#ffd27a', '#8fd3c4'];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
  w = innerWidth;
  h = innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Where falling leaves come from: the top edge, and the crown of the corner tree. */
function leafSource() {
  const crown = layer.tree?.getBoundingClientRect();
  if (crown && crown.width && Math.random() < 0.45) {
    return { x: rand(crown.left + 20, crown.right - 20), y: rand(crown.top + 20, crown.top + crown.height * 0.45) };
  }
  return { x: rand(-40, w + 40), y: rand(-60, -10) };
}

const MAKERS = {
  leaves: (initial) => {
    const s = initial ? { x: rand(0, w), y: rand(0, h) } : leafSource();
    return {
      kind: 'leaf',
      ...s,
      size: rand(7, 13),
      vy: rand(22, 48),
      sway: rand(0.6, 1.6),
      phase: rand(0, 6.3),
      rot: rand(0, 6.3),
      spin: rand(-1.6, 1.6),
      color: pick(LEAF_COLORS),
    };
  },
  rain: (initial) => ({
    kind: 'rain',
    x: rand(-60, w + 60),
    y: initial ? rand(0, h) : rand(-h * 0.2, -10),
    len: rand(10, 20),
    vy: rand(520, 760),
    vx: -60,
  }),
  snow: (initial) => ({
    kind: 'snow',
    x: rand(0, w),
    y: initial ? rand(0, h) : rand(-40, -5),
    r: rand(1.2, 3.6),
    vy: rand(18, 46),
    sway: rand(0.4, 1.2),
    phase: rand(0, 6.3),
  }),
  petals: (initial) => ({
    kind: 'petal',
    x: rand(-20, w),
    y: initial ? rand(0, h) : rand(-40, -5),
    size: rand(5, 9),
    vy: rand(20, 40),
    vx: rand(8, 26),
    phase: rand(0, 6.3),
    rot: rand(0, 6.3),
    spin: rand(-2, 2),
    color: pick(PETAL_COLORS),
  }),
  fluff: (initial) => ({
    kind: 'fluff',
    x: rand(-20, w),
    y: initial ? rand(0, h) : h + 20,
    size: rand(5, 9),
    vy: -rand(10, 22),
    vx: rand(6, 20),
    phase: rand(0, 6.3),
  }),
  confetti: (initial) => ({
    kind: 'confetti',
    x: rand(0, w),
    y: initial ? rand(0, h) : rand(-60, -5),
    wdt: rand(5, 9),
    hgt: rand(8, 14),
    vy: rand(50, 90),
    phase: rand(0, 6.3),
    rot: rand(0, 6.3),
    spin: rand(-5, 5),
    color: pick(CONFETTI),
  }),
  balloon: (initial) => ({
    kind: 'balloon',
    x: rand(30, w - 30),
    y: initial ? rand(h * 0.3, h) : h + 60,
    r: rand(14, 22),
    vy: -rand(18, 34),
    phase: rand(0, 6.3),
    color: pick(BALLOONS),
  }),
  bat: () => {
    const left = Math.random() < 0.5;
    return {
      kind: 'bat',
      x: left ? -40 : w + 40,
      y: rand(h * 0.08, h * 0.55),
      vx: (left ? 1 : -1) * rand(70, 120),
      phase: rand(0, 6.3),
      size: rand(9, 15),
    };
  },
  butterfly: () => {
    const left = Math.random() < 0.5;
    return {
      kind: 'butterfly',
      x: left ? -30 : w + 30,
      y: rand(h * 0.2, h * 0.85),
      vx: (left ? 1 : -1) * rand(30, 55),
      phase: rand(0, 6.3),
      size: rand(7, 10),
      color: pick(BUTTERFLY),
    };
  },
  firefly: (initial) => ({
    kind: 'firefly',
    x: rand(0, w),
    y: rand(h * 0.35, h),
    vx: rand(-12, 12),
    vy: rand(-8, 8),
    phase: rand(0, 6.3),
    life: initial ? rand(0, 8) : 0,
  }),
};

/** How many of each particle the active effects want (fewer on phones). */
function plan() {
  const k = isTouch ? 0.55 : 1;
  const area = Math.min(1.4, (w * h) / (1366 * 860));
  const n = (base) => Math.round(base * k * Math.max(0.5, area));
  const out = {};
  if (fx.includes('leaves')) out.leaves = n(season === 'halloween' ? 14 : 22);
  if (fx.includes('rain')) out.rain = n(90);
  if (fx.includes('snow')) out.snow = n(110);
  if (fx.includes('petals')) out.petals = n(26);
  if (fx.includes('fluff')) out.fluff = n(12);
  if (fx.includes('confetti')) {
    out.confetti = n(70);
    out.balloon = n(7);
  }
  if (fx.includes('critters')) {
    if (season === 'halloween') out.bat = n(4);
    if (season === 'spring') out.butterfly = n(5);
    if (season === 'summer') out.firefly = n(dark ? 26 : 12);
  }
  return out;
}

function fill() {
  const want = plan();
  particles = particles.filter((p) => want[p.type] > 0);
  for (const [type, count] of Object.entries(want)) {
    const have = particles.filter((p) => p.type === type).length;
    for (let i = have; i < count; i++) particles.push({ type, ...MAKERS[type](true) });
  }
}

function step(p, dt, t) {
  switch (p.kind) {
    case 'leaf':
      p.y += p.vy * dt;
      p.x += Math.sin(t * p.sway + p.phase) * 30 * dt + 8 * dt;
      p.rot += p.spin * dt;
      return p.y < h + 30;
    case 'rain':
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      return p.y < h + 20;
    case 'snow':
      p.y += p.vy * dt;
      p.x += Math.sin(t * p.sway + p.phase) * 14 * dt;
      return p.y < h + 10;
    case 'petal':
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin(t + p.phase) * 18 * dt;
      p.rot += p.spin * dt;
      return p.y < h + 20 && p.x < w + 30;
    case 'fluff':
      p.y += p.vy * dt + Math.sin(t * 0.8 + p.phase) * 6 * dt;
      p.x += p.vx * dt;
      return p.y > -30 && p.x < w + 30;
    case 'confetti':
      p.y += p.vy * dt;
      p.x += Math.sin(t * 2 + p.phase) * 25 * dt;
      p.rot += p.spin * dt;
      return p.y < h + 20;
    case 'balloon':
      p.y += p.vy * dt;
      p.x += Math.sin(t * 0.7 + p.phase) * 10 * dt;
      return p.y > -80;
    case 'bat':
    case 'butterfly':
      p.x += p.vx * dt;
      p.y += Math.sin(t * 1.4 + p.phase) * 22 * dt;
      return p.x > -60 && p.x < w + 60;
    case 'firefly':
      p.life += dt;
      p.vx += rand(-20, 20) * dt;
      p.vy += rand(-20, 20) * dt;
      p.vx = Math.max(-18, Math.min(18, p.vx));
      p.vy = Math.max(-14, Math.min(14, p.vy));
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return p.life < 14 && p.x > -20 && p.x < w + 20 && p.y > 0 && p.y < h + 20;
    default:
      return false;
  }
}

function draw(p, t) {
  ctx.save();
  switch (p.kind) {
    case 'leaf': {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.quadraticCurveTo(p.size * 0.9, -p.size * 0.2, 0, p.size);
      ctx.quadraticCurveTo(-p.size * 0.9, -p.size * 0.2, 0, -p.size);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,40,20,0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 0.8);
      ctx.lineTo(0, p.size * 1.2);
      ctx.stroke();
      break;
    }
    case 'rain':
      ctx.strokeStyle = dark ? 'rgba(190,200,230,0.32)' : 'rgba(110,125,160,0.32)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + (p.vx / p.vy) * p.len, p.y + p.len);
      ctx.stroke();
      break;
    case 'snow':
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.95)';
      ctx.shadowColor = dark ? 'rgba(255,255,255,0.4)' : 'rgba(120,150,190,0.55)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'petal':
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'fluff': {
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.7)' : 'rgba(160,140,110,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, p.size * 1.4);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
      }
      ctx.stroke();
      break;
    }
    case 'confetti':
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(Math.cos(t * 3 + p.phase), 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.wdt / 2, -p.hgt / 2, p.wdt, p.hgt);
      break;
    case 'balloon':
      ctx.strokeStyle = 'rgba(120,100,130,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + p.r * 1.2);
      ctx.quadraticCurveTo(p.x + 6, p.y + p.r * 2, p.x - 2, p.y + p.r * 3.2);
      ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * 0.85, p.r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(p.x - p.r * 0.3, p.y - p.r * 0.4, p.r * 0.18, p.r * 0.3, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bat': {
      const flap = Math.sin(t * 14 + p.phase) * 0.6;
      ctx.translate(p.x, p.y);
      ctx.scale(p.vx > 0 ? 1 : -1, 1);
      ctx.fillStyle = dark ? 'rgba(20,10,30,0.85)' : 'rgba(60,40,80,0.75)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-p.size * 0.6, -p.size * (0.6 + flap), -p.size * 1.4, -p.size * flap);
      ctx.quadraticCurveTo(-p.size * 0.8, p.size * 0.1, 0, p.size * 0.3);
      ctx.quadraticCurveTo(p.size * 0.8, p.size * 0.1, p.size * 1.4, -p.size * flap);
      ctx.quadraticCurveTo(p.size * 0.6, -p.size * (0.6 + flap), 0, 0);
      ctx.fill();
      break;
    }
    case 'butterfly': {
      const open = 0.35 + Math.abs(Math.sin(t * 9 + p.phase)) * 0.65;
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.9;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * p.size * 0.6 * open, -p.size * 0.3, p.size * 0.6 * open, p.size * 0.75, 0, 0, Math.PI * 2);
        ctx.ellipse(s * p.size * 0.45 * open, p.size * 0.45, p.size * 0.42 * open, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#5b4a5e';
      ctx.fillRect(-0.8, -p.size * 0.7, 1.6, p.size * 1.4);
      break;
    }
    case 'firefly': {
      const glow = Math.max(0, Math.sin(t * 2 + p.phase)) * Math.min(1, p.life, 14 - p.life);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
      g.addColorStop(0, `rgba(255,236,140,${0.9 * glow})`);
      g.addColorStop(1, 'rgba(255,236,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 9, p.y - 9, 18, 18);
      break;
    }
  }
  ctx.restore();
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  if (isTouch && now - last < 30) return; // ~30 fps on phones
  last = now;
  const t = now / 1000;
  const want = plan();
  ctx.clearRect(0, 0, w, h);
  particles = particles.filter((p) => {
    const alive = step(p, dt, t);
    if (alive) draw(p, t);
    return alive;
  });
  // Respawn: steady streams for weather, occasional visitors for critters.
  for (const [type, count] of Object.entries(want)) {
    const have = particles.filter((p) => p.type === type).length;
    const occasional = type === 'bat' || type === 'butterfly' || type === 'balloon';
    if (have < count && (!occasional || Math.random() < dt * 0.6)) particles.push({ type, ...MAKERS[type](false) });
  }
}

function start() {
  if (raf || !fx.some((k) => k !== 'decor' && k !== 'garland' && k !== 'fog') || reducedMotion.matches) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
  ctx?.clearRect(0, 0, w, h);
}

// ---------- DOM decorations ----------

function garlandSvg() {
  const bulbs = [];
  const colors = season === 'birthday' ? CONFETTI : ['#ffd76a', '#ff8a7a', '#8fd6a8', '#8fb6f0', '#f7a8d0'];
  for (let i = 0; i < 40; i++) {
    const x = 12 + i * 50;
    const y = 8 + Math.sin((i / 40) * Math.PI * 12) * 4 + 6;
    if (season === 'birthday') {
      bulbs.push(
        `<path d="M${x - 12} ${y - 6} L${x + 12} ${y - 6} L${x} ${y + 14} Z" fill="${colors[i % colors.length]}"/>`,
      );
    } else {
      bulbs.push(
        `<g class="bulb" style="animation-delay:${(i % 5) * 0.37}s"><rect x="${x - 2}" y="${y - 3}" width="4" height="4" rx="1" fill="#6b5b4e"/><ellipse cx="${x}" cy="${y + 6}" rx="4.2" ry="6" fill="${colors[i % colors.length]}"/></g>`,
      );
    }
  }
  const wire = Array.from(
    { length: 41 },
    (_, i) => `${12 + i * 50},${8 + Math.sin((i / 40) * Math.PI * 12) * 4 + 3}`,
  ).join(' ');
  return `<svg width="2000" height="34" viewBox="0 0 2000 34" preserveAspectRatio="xMinYMin slice"><polyline points="${wire}" fill="none" stroke="${season === 'birthday' ? '#c9a7d8' : '#5d6b4f'}" stroke-width="1.4"/>${bulbs.join('')}</svg>`;
}

const TREE_SVG = {
  autumn: `<svg viewBox="0 0 220 300" width="220" height="300"><path d="M104 300 C108 240 100 200 108 160 L120 160 C126 205 118 245 124 300 Z" fill="#7a5034"/><path d="M110 175 C90 160 70 165 58 150" stroke="#7a5034" stroke-width="7" fill="none"/><g opacity="0.95"><circle cx="70" cy="120" r="46" fill="#d98a3a"/><circle cx="120" cy="90" r="58" fill="#c8642f"/><circle cx="165" cy="128" r="44" fill="#e0a83f"/><circle cx="110" cy="140" r="42" fill="#b84a2a"/><circle cx="150" cy="70" r="30" fill="#d9763a"/></g></svg>`,
  halloween: `<svg viewBox="0 0 220 300" width="220" height="300"><path d="M100 300 C104 240 98 200 106 150 L118 150 C122 200 116 240 122 300 Z" fill="#3b2a3f"/><path d="M110 170 C80 140 60 140 40 110 M112 160 C140 130 160 128 185 95 M108 190 C90 200 70 205 55 220 M110 150 C110 120 100 100 104 70" stroke="#3b2a3f" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="60" cy="108" r="9" fill="#e8833a" opacity="0.9"/><circle cx="180" cy="98" r="7" fill="#e8833a" opacity="0.8"/></svg>`,
};

const SCENES = {
  autumn: `<svg viewBox="0 0 208 92"><ellipse cx="104" cy="86" rx="96" ry="6" fill="rgba(160,100,60,.15)"/><path d="M38 86 C40 66 36 58 40 48 L46 48 C48 60 44 70 46 86Z" fill="#7a5034"/><circle cx="30" cy="40" r="16" fill="#d98a3a"/><circle cx="46" cy="30" r="20" fill="#c8642f"/><circle cx="58" cy="44" r="15" fill="#e0a83f"/><ellipse cx="96" cy="84" rx="26" ry="5" fill="#c8642f" opacity=".7"/><ellipse cx="104" cy="82" rx="14" ry="4" fill="#e0a83f" opacity=".8"/><rect x="150" y="62" width="22" height="22" rx="4" fill="#f4e6d6" stroke="#b07a55" stroke-width="2"/><path d="M172 68 q8 0 8 7 q0 7 -8 7" fill="none" stroke="#b07a55" stroke-width="2"/><path d="M156 56 q3 -6 0 -10 M164 56 q3 -6 0 -10" stroke="#c9b3a3" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="150" y="62" width="22" height="6" fill="#8a5a3c"/></svg>`,
  halloween: `<svg viewBox="0 0 208 92"><ellipse cx="104" cy="86" rx="96" ry="6" fill="rgba(80,40,100,.15)"/><g><ellipse cx="62" cy="68" rx="26" ry="20" fill="#e8833a"/><ellipse cx="62" cy="68" rx="10" ry="20" fill="#f29a4f"/><path d="M60 48 q2 -8 8 -10" stroke="#5a7a3a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M48 62 l6 -5 l4 6z M70 62 l6 -5 l2 7z" fill="#3b2245"/><path d="M48 74 q14 10 28 0 l-4 3 l-4 -3 l-4 3 l-4 -3 l-4 3 l-4 -3z" fill="#3b2245"/><g class="flicker"><ellipse cx="62" cy="68" rx="14" ry="10" fill="#ffd27a" opacity=".25"/></g></g><g><ellipse cx="128" cy="76" rx="16" ry="12" fill="#f29a4f"/><path d="M128 64 q1 -5 5 -6" stroke="#5a7a3a" stroke-width="3" fill="none" stroke-linecap="round"/></g><g class="ghost"><path d="M160 70 q0 -26 18 -26 q18 0 18 26 l-4 -4 l-4 4 l-5 -4 l-5 4 l-5 -4 l-4 4 z" fill="#fff" opacity=".92"/><circle cx="172" cy="56" r="2.5" fill="#3b2245"/><circle cx="184" cy="56" r="2.5" fill="#3b2245"/></g></svg>`,
  winter: `<svg viewBox="0 0 208 92"><ellipse cx="104" cy="86" rx="98" ry="7" fill="#eef3f9"/><path d="M24 86 L40 40 L56 86Z" fill="#5f8bbd" opacity=".55"/><path d="M28 70 L40 40 L52 70Z" fill="#fff" opacity=".7"/><circle cx="110" cy="70" r="16" fill="#fff" stroke="#c7d6e8"/><circle cx="110" cy="46" r="11" fill="#fff" stroke="#c7d6e8"/><circle cx="106" cy="44" r="1.5" fill="#3c4350"/><circle cx="114" cy="44" r="1.5" fill="#3c4350"/><path d="M110 48 l8 2 l-8 1z" fill="#f29a4f"/><path d="M99 55 q11 6 22 0" stroke="#c94f4f" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M160 86 L176 34 L192 86Z" fill="#4a72a3" opacity=".6"/><path d="M165 66 L176 34 L187 66Z" fill="#fff" opacity=".75"/></svg>`,
  christmas: `<svg viewBox="0 0 208 92"><ellipse cx="104" cy="88" rx="98" ry="5" fill="rgba(77,138,104,.15)"/><path d="M8 18 q48 10 96 0 q48 -10 96 0" stroke="#8a6d55" stroke-width="1.5" fill="none"/>${[
    '♥',
    '★',
    '♥',
    '★',
    '♥',
  ]
    .map(
      (ch, i) =>
        `<g transform="translate(${18 + i * 18} ${18 + (i % 2) * 2})"><path d="M0 0 h10 v14 q0 4 -4 4 h-8 q-3 0 -3 -3 q0 -3 3 -3 h2 v-12z" fill="${['#c94f4f', '#4d8a68', '#c94f4f', '#d9a441', '#4d8a68'][i]}"/><rect x="-1" y="-2" width="12" height="4" rx="1.5" fill="#fff"/><text x="5" y="12" font-size="6" text-anchor="middle" fill="#fff" font-family="Nunito,sans-serif" font-weight="800">${ch}</text></g>`,
    )
    .join(
      '',
    )}<g transform="translate(152 4)"><path d="M18 6 L36 34 L28 34 L42 56 L32 56 L46 80 L-10 80 L4 56 L-6 56 L8 34 L0 34Z" fill="#3b7155"/><rect x="14" y="80" width="8" height="6" fill="#7a5034"/><path d="M18 0 l2.5 5 l5.5 .5 l-4 3.5 l1.2 5.5 l-5.2 -3 l-5.2 3 l1.2 -5.5 l-4 -3.5 l5.5 -.5z" fill="#ffd76a"/>${[
    [12, 30],
    [24, 42],
    [8, 52],
    [30, 62],
    [2, 72],
    [20, 70],
  ]
    .map(
      (p, i) =>
        `<circle class="bulb" style="animation-delay:${i * 0.3}s" cx="${p[0]}" cy="${p[1]}" r="2.6" fill="${['#ffd76a', '#ff8a7a', '#8fb6f0'][i % 3]}"/>`,
    )
    .join(
      '',
    )}</g><rect x="110" y="72" width="18" height="14" rx="2" fill="#c94f4f"/><rect x="117" y="72" width="4" height="14" fill="#ffd76a"/><rect x="132" y="76" width="14" height="10" rx="2" fill="#8fb6f0"/><rect x="138" y="76" width="3" height="10" fill="#fff"/></svg>`,
  spring: `<svg viewBox="0 0 208 92"><ellipse cx="104" cy="86" rx="96" ry="6" fill="rgba(95,181,133,.18)"/>${[
    30, 52, 74, 96, 118, 140, 162, 184,
  ]
    .map(
      (x, i) =>
        `<path d="M${x} 86 q${i % 2 ? 3 : -3} -20 0 -${30 + (i % 3) * 8}" stroke="#5fb585" stroke-width="2.5" fill="none"/><ellipse cx="${x + (i % 2 ? 6 : -6)}" cy="${72 - (i % 3) * 4}" rx="6" ry="3" fill="#7cc79b" transform="rotate(${i % 2 ? 30 : -30} ${x} ${72 - (i % 3) * 4})"/><g transform="translate(${x} ${56 - (i % 3) * 8})">${[
          0, 1, 2, 3, 4,
        ]
          .map(
            (k) =>
              `<ellipse cx="0" cy="-6" rx="3.6" ry="6" fill="${['#f7a8c4', '#fbd36b', '#c9a7f0', '#f39bb4'][i % 4]}" transform="rotate(${k * 72})"/>`,
          )
          .join('')}<circle r="2.8" fill="#ffe08a"/></g>`,
    )
    .join('')}</svg>`,
  summer: `<svg viewBox="0 0 208 92"><ellipse cx="104" cy="86" rx="96" ry="6" fill="rgba(47,163,155,.15)"/><g class="sun"><circle cx="172" cy="26" r="14" fill="#ffd36b"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<rect x="170.5" y="2" width="3" height="8" rx="1.5" fill="#ffd36b" transform="rotate(${k * 45} 172 26)"/>`).join('')}</g><path d="M60 86 q2 -26 -2 -46" stroke="#5f9e5a" stroke-width="3.5" fill="none"/><g transform="translate(58 38)">${Array.from({ length: 12 }, (_, k) => `<ellipse cx="0" cy="-12" rx="4" ry="9" fill="#f5b83a" transform="rotate(${k * 30})"/>`).join('')}<circle r="8" fill="#7a5034"/></g><path d="M100 86 l6 -30 h20 l6 30z" fill="#fff8e6" stroke="#e6cfa3"/><rect x="104" y="60" width="24" height="18" fill="#ffe08a" opacity=".7"/><circle cx="122" cy="58" r="5" fill="#f5e663" stroke="#e0c33a"/><path d="M114 56 l10 -22" stroke="#f29bb4" stroke-width="2.5"/></svg>`,
  birthday: `<svg viewBox="0 0 208 92"><ellipse cx="104" cy="88" rx="96" ry="5" fill="rgba(176,111,217,.15)"/><rect x="74" y="58" width="60" height="28" rx="6" fill="#f7c6d6"/><rect x="74" y="58" width="60" height="9" rx="4" fill="#fff"/><rect x="82" y="40" width="44" height="20" rx="5" fill="#c9a7f0"/><path d="M82 46 q5 5 11 0 q5 5 11 0 q5 5 11 0 q5 5 11 0" stroke="#fff" stroke-width="3" fill="none"/>${[
    90, 104, 118,
  ]
    .map(
      (x, i) =>
        `<rect x="${x - 1.5}" y="28" width="3" height="12" rx="1" fill="${['#7fd4c1', '#ffcf66', '#8fb6f0'][i]}"/><ellipse class="flame" style="animation-delay:${i * 0.2}s" cx="${x}" cy="25" rx="2.4" ry="4" fill="#ffb347"/>`,
    )
    .join(
      '',
    )}<rect x="20" y="66" width="22" height="20" rx="3" fill="#8fb6f0"/><rect x="29" y="66" width="4" height="20" fill="#fff"/><rect x="150" y="70" width="18" height="16" rx="3" fill="#ffcf66"/><rect x="157" y="70" width="4" height="16" fill="#f29bb4"/><g class="balloon-sway"><path d="M186 86 q-4 -20 2 -40" stroke="#b58be6" fill="none"/><ellipse cx="188" cy="34" rx="10" ry="13" fill="#b58be6"/><path d="M16 86 q4 -24 -2 -44" stroke="#f29bb4" fill="none"/><ellipse cx="14" cy="30" rx="10" ry="13" fill="#f29bb4"/></g></svg>`,
};

let sceneEl = null;
/** Small seasonal scene for the sidebar (above the pet corner); re-used across nav renders. */
export function seasonScene() {
  sceneEl ||= Object.assign(document.createElement('div'), { className: 'season-scene' });
  sceneEl.setAttribute('aria-hidden', 'true');
  return sceneEl;
}

function ensureLayers() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.id = 'season-fx';
  canvas.setAttribute('aria-hidden', 'true');
  ctx = canvas.getContext('2d');
  document.body.prepend(canvas);
  for (const key of ['garland', 'tree', 'fog']) {
    layer[key] = document.createElement('div');
    layer[key].className = `season-${key}`;
    layer[key].setAttribute('aria-hidden', 'true');
    document.body.append(layer[key]);
  }
  window.addEventListener('resize', () => {
    resize();
    fill();
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reducedMotion.addEventListener?.('change', () => (reducedMotion.matches ? stop() : start()));
}

/** Show the given season (or null) with the given active effects. */
export function renderSeasonFx(nextSeason, activeEffects, isDark) {
  ensureLayers();
  season = nextSeason;
  fx = activeEffects;
  dark = isDark;
  resize();
  const on = (k) => fx.includes(k);
  layer.garland.innerHTML = on('garland') ? garlandSvg() : '';
  layer.garland.dataset.kind = season || '';
  layer.tree.innerHTML = on('leaves') && TREE_SVG[season] ? TREE_SVG[season] : '';
  layer.fog.hidden = !on('fog');
  if (sceneEl) sceneEl.innerHTML = on('decor') && season ? SCENES[season] : '';
  particles = [];
  stop();
  fill();
  start();
}
