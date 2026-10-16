// AI-tab playground: the robot Auerilus and the kitten play tag inside a small card.
// Takes over the kitten via setKittenDirector() while the card is on screen.
import { createRobot3D } from './robot3d.js';
import { setKittenDirector } from './kitten.js';

let area = null;
let robotEl = null;
let view = null;
const bot = { x: 0, y: 0, vx: 0, vy: 0, facing: -1, target: null };
let game = { phase: 'gather', until: 0 };
let lastMouseMove = performance.now();
let happyUntil = 0;

function bounds() {
  const r = area.getBoundingClientRect();
  return { left: r.left + 34, right: r.right - 34, top: r.top + 92, bottom: r.bottom - 12 };
}
const inside = (p, b) => p.x >= b.left - 4 && p.x <= b.right + 4 && p.y >= b.top - 4 && p.y <= b.bottom + 4;
const randomPoint = (b) => ({
  x: b.left + Math.random() * (b.right - b.left),
  y: b.top + Math.random() * (b.bottom - b.top),
});
const clampTo = (p, b) => ({
  x: Math.min(Math.max(p.x, b.left), b.right),
  y: Math.min(Math.max(p.y, b.top), b.bottom),
});

function moveBot(dt, speed) {
  if (!bot.target) return 0;
  const dx = bot.target.x - bot.x;
  const dy = bot.target.y - bot.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 4) {
    const desired = Math.min(speed, dist * 4 + 20);
    bot.vx += ((dx / dist) * desired - bot.vx) * Math.min(1, dt * 7);
    bot.vy += ((dy / dist) * desired - bot.vy) * Math.min(1, dt * 7);
  } else {
    bot.vx *= 0.6;
    bot.vy *= 0.6;
  }
  bot.x += bot.vx * dt;
  bot.y += bot.vy * dt;
  if (Math.abs(bot.vx) > 15) bot.facing = bot.vx > 0 ? 1 : -1;
  return dist;
}

const director = {
  update(now, dt, kitten) {
    if (!area?.isConnected) return stopPlayground();
    const b = bounds();
    const k = kitten.pos;
    const sleepy = now - lastMouseMove > 20000;
    const d = Math.hypot(k.x - bot.x, k.y - bot.y);
    let botState = 'idle';

    if (sleepy) {
      game.phase = 'sleep';
    } else if (game.phase === 'sleep') {
      game = { phase: 'chase', until: now + 9000 };
    }

    switch (game.phase) {
      case 'gather': {
        // Kitten comes into the playground; robot waves.
        const spot = clampTo({ x: bot.x - 50, y: bot.y }, b);
        kitten.goTo(spot.x, spot.y, 1.3);
        botState = 'happy';
        if (inside(k, b) && d < 70) game = { phase: 'chase', until: now + 9000 };
        break;
      }
      case 'chase': {
        // Kitten chases Auerilus, he runs away to random corners.
        if (!bot.target || Math.hypot(bot.target.x - bot.x, bot.target.y - bot.y) < 10 || d < 60) {
          let p = randomPoint(b);
          for (let i = 0; i < 4 && Math.hypot(p.x - k.x, p.y - k.y) < 80; i++) p = randomPoint(b);
          bot.target = p;
        }
        moveBot(dt, 150);
        kitten.goTo(bot.x - Math.sign(bot.x - k.x || 1) * 26, bot.y, 0.9);
        if (d < 34 && !kitten.busy) {
          kitten.jumpTo({ x: bot.x, y: bot.y + 2 }, 34, () => {
            view.spin();
            happyUntil = performance.now() + 900;
          });
          game = { phase: 'tagged', until: now + 1200 };
        } else if (now > game.until) game = { phase: 'rest', until: now + 3500 };
        break;
      }
      case 'tagged': {
        // Caught! Short celebration, then roles swap: robot chases the kitten.
        bot.target = null;
        if (now > game.until) {
          const p = randomPoint(b);
          kitten.goTo(p.x, p.y, 1.1);
          game = { phase: 'robotChase', until: now + 7000, flee: p };
        }
        break;
      }
      case 'robotChase': {
        if (Math.hypot(game.flee.x - k.x, game.flee.y - k.y) < 12 || d < 50) {
          game.flee = randomPoint(b);
          kitten.goTo(game.flee.x, game.flee.y, 1.1);
        }
        bot.target = { x: k.x, y: k.y };
        moveBot(dt, 135);
        if (d < 30 || now > game.until) {
          happyUntil = now + 1000;
          kitten.jumpTo({ x: k.x + (k.x < bot.x ? -18 : 18), y: k.y }, 26);
          game = { phase: 'rest', until: now + 4000 };
        }
        break;
      }
      case 'rest': {
        // Sit next to each other for a bit.
        bot.target = null;
        moveBot(dt, 0);
        const spot = clampTo({ x: bot.x + (k.x < bot.x ? -44 : 44), y: bot.y }, b);
        kitten.goTo(spot.x, spot.y, 0.6);
        kitten.face(bot.x > k.x ? 1 : -1);
        bot.facing = k.x > bot.x ? 1 : -1;
        if (now > game.until) game = { phase: 'chase', until: now + 9000 };
        break;
      }
      case 'sleep':
        bot.target = null;
        moveBot(dt, 0);
        botState = 'sleep';
        break;
    }

    const speed = Math.hypot(bot.vx, bot.vy);
    if (botState !== 'sleep') botState = now < happyUntil ? 'happy' : speed > 30 ? 'run' : botState;
    view.setState(botState);
    view.setFacing(bot.facing);
    view.tick(dt);
    robotEl.dataset.state = botState;
    robotEl.style.transform = `translate3d(${bot.x - view.feet.x}px, ${bot.y - view.feet.y}px, 0)`;
  },
};

function fallbackRobot() {
  const el = document.createElement('div');
  el.className = 'robot-fallback';
  el.textContent = '🤖';
  return {
    el,
    size: { w: 40, h: 40 },
    feet: { x: 20, y: 38 },
    setState() {},
    setFacing() {},
    spin() {},
    tick() {},
    dispose() {},
  };
}

export function mountPlayground(cardEl) {
  const first = !area;
  area = cardEl;
  if (!first) return;
  view = createRobot3D() || fallbackRobot();
  robotEl = document.createElement('div');
  robotEl.id = 'robot';
  robotEl.style.width = `${view.size.w}px`;
  robotEl.style.height = `${view.size.h}px`;
  const shadow = document.createElement('div');
  shadow.className = 'kitten-shadow robot-shadow';
  shadow.style.left = `${view.feet.x}px`;
  shadow.style.top = `${view.feet.y - 4}px`;
  const zzz = document.createElement('div');
  zzz.className = 'kitten-zzz';
  zzz.innerHTML = 'z<span>z</span><span>z</span>';
  zzz.style.left = `${view.feet.x + 14}px`;
  zzz.style.top = `${view.feet.y - 60}px`;
  robotEl.append(shadow, view.el, zzz);
  document.body.append(robotEl);
  const b = bounds();
  bot.x = (b.left + b.right) / 2 + 30;
  bot.y = (b.top + b.bottom) / 2;
  game = { phase: 'gather', until: 0 };
  window.addEventListener('mousemove', onMove);
  setKittenDirector(director);
}

function onMove() {
  lastMouseMove = performance.now();
}

export function stopPlayground() {
  if (!area) return;
  area = null;
  setKittenDirector(null);
  window.removeEventListener('mousemove', onMove);
  robotEl?.remove();
  view?.dispose();
  robotEl = null;
  view = null;
}
