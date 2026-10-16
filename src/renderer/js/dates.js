// Date helpers. Dates are stored as local 'YYYY-MM-DD' strings; labels use the active UI language.
import { t, locale } from './i18n.js';

const pad = (n) => String(n).padStart(2, '0');

export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toKey(new Date());
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function monthName(month, year = 2024) {
  const s = new Intl.DateTimeFormat(locale(), { month: 'long' }).format(new Date(year, month, 1));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekdaysShort() {
  // 2024-01-01 is a Monday
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(new Date(2024, 0, 1 + i)),
  );
}

export function longDate(key) {
  const s = fromKey(key).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortDate(key) {
  if (!key) return '';
  const d = fromKey(key);
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(locale(), opts);
}

export function numericDate(key) {
  if (!key) return '';
  return fromKey(key).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function humanDate(key) {
  if (!key) return '';
  const today = todayKey();
  if (key === today) return t('date.today');
  if (key === addDays(today, 1)) return t('date.tomorrow');
  if (key === addDays(today, -1)) return t('date.yesterday');
  return shortDate(key);
}

export function relativeTime(ts) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return t('date.justNow');
  if (min < 60) return t('date.minAgo', { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return t('date.hAgo', { n: h });
  return shortDate(toKey(new Date(ts)));
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return t('greet.night');
  if (h < 12) return t('greet.morning');
  if (h < 18) return t('greet.day');
  return t('greet.evening');
}

/** Monday-first 6x7 grid of date keys for the given month. */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - offset + i);
    days.push({ key: toKey(d), inMonth: d.getMonth() === month, day: d.getDate() });
  }
  return days;
}
