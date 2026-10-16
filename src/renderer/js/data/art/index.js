// "Painting of the day" calendar: one famous painting per day from START to END.
// Special dates are pinned to fitting paintings; everything else is filled in a fixed,
// artist-interleaved order. Outside the range the schedule simply cycles.
import { ARTISTS } from './artists.js';
import { PINS } from './pins.js';
import p01 from './part-01.js';
import p02 from './part-02.js';
import p03 from './part-03.js';
import p04 from './part-04.js';
import p05 from './part-05.js';
import p06 from './part-06.js';
import p07 from './part-07.js';
import p08 from './part-08.js';
import p09 from './part-09.js';
import p10 from './part-10.js';
import p11 from './part-11.js';
import p12 from './part-12.js';
import p13 from './part-13.js';
import p14 from './part-14.js';
import p15 from './part-15.js';
import p16 from './part-16.js';
import p17 from './part-17.js';
import p18 from './part-18.js';

export { ARTISTS, PINS };
export const START = '2026-10-16';
export const END = '2027-12-31';

export const PAINTINGS = [p01, p02, p03, p04, p05, p06, p07, p08, p09, p10, p11, p12, p13, p14, p15, p16, p17, p18].flat();
export const BY_ID = Object.fromEntries(PAINTINGS.map((p) => [p.id, p]));

const DAY = 86400000;
const keyToUtc = (k) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
const utcToKey = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Fill order: round-robin over artists so consecutive days rarely repeat a painter. */
function fillOrder(list) {
  const groups = new Map();
  for (const p of list) {
    if (!groups.has(p.a)) groups.set(p.a, []);
    groups.get(p.a).push(p);
  }
  const queues = [...groups.values()].sort((a, b) => b.length - a.length);
  const out = [];
  while (out.length < list.length) {
    for (const q of queues) if (q.length) out.push(q.shift());
  }
  return out;
}

let schedule = null;
export function buildSchedule() {
  if (schedule) return schedule;
  const pinnedIds = new Set(Object.values(PINS));
  const queue = fillOrder(PAINTINGS.filter((p) => !pinnedIds.has(p.id)));
  schedule = new Map();
  for (let ms = keyToUtc(START), i = 0; ms <= keyToUtc(END); ms += DAY) {
    const key = utcToKey(ms);
    schedule.set(key, PINS[key] ? BY_ID[PINS[key]] : queue[i++ % queue.length]);
  }
  return schedule;
}

export function totalDays() {
  return buildSchedule().size;
}

export function paintingFor(dateKey) {
  const s = buildSchedule();
  if (s.has(dateKey)) return s.get(dateKey);
  // Outside the planned range: cycle through the same schedule.
  const days = [...s.values()];
  const offset = Math.round((keyToUtc(dateKey) - keyToUtc(START)) / DAY);
  return days[((offset % days.length) + days.length) % days.length];
}
