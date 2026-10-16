// Seasonal looks: which season is active (automatic by date or chosen in Settings), its colour
// grading (css/seasons.css via html[data-season]) and which ambient effects it offers.

import { PERSONAL } from '../personal.js';

export const SEASONS = ['autumn', 'halloween', 'winter', 'christmas', 'spring', 'summer', 'birthday'];

/** Effects each season can show; every one has its own on/off switch in Settings. */
export const SEASON_FX = {
  autumn: ['leaves', 'rain', 'decor'],
  halloween: ['leaves', 'critters', 'fog', 'decor'],
  winter: ['snow', 'decor'],
  christmas: ['snow', 'garland', 'decor'],
  spring: ['petals', 'critters', 'decor'],
  summer: ['fluff', 'critters', 'decor'],
  birthday: ['confetti', 'garland', 'decor'],
};

export const FX_KEYS = ['leaves', 'rain', 'snow', 'garland', 'petals', 'fluff', 'critters', 'fog', 'confetti', 'decor'];

/** Ambient sound per season (generated with WebAudio, off by default). */
export const SEASON_SOUND = {
  autumn: 'rain',
  halloween: 'rain',
  winter: 'fire',
  christmas: 'fire',
  spring: 'birds',
  summer: 'birds',
  birthday: 'musicbox',
};

/**
 * Season for a local date key (YYYY-MM-DD) when Settings say "auto". `birthday` is 'MM-DD'
 * (from personal.js; empty means the birthday look only appears when chosen by hand).
 */
export function seasonForDate(key, birthday = PERSONAL.birthday) {
  const m = Number(key.slice(5, 7));
  const d = Number(key.slice(8, 10));
  if (birthday && key.slice(5) === birthday) return 'birthday';
  if ((m === 10 && d >= 24) || (m === 11 && d <= 1)) return 'halloween';
  if (m === 12 || (m === 1 && d <= 6)) return 'christmas';
  if (m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}

/** 'auto' | a season | 'none' → the season actually shown (or null for the plain look). */
export function resolveSeason(choice, todayKey, birthday) {
  if (choice === 'none') return null;
  if (SEASONS.includes(choice)) return choice;
  return seasonForDate(todayKey, birthday);
}

/** Effects that are both offered by the season and switched on. */
export function activeFx(season, fx = {}) {
  if (!season) return [];
  return SEASON_FX[season].filter((k) => fx[k] !== false);
}

// Tiny pub/sub so the 3D animals can put on their outfits whenever the season changes.
let current = null;
const subscribers = new Set();
export function onSeasonChange(cb) {
  subscribers.add(cb);
  cb(current);
  return () => subscribers.delete(cb);
}
export function publishSeason(season) {
  current = season;
  subscribers.forEach((cb) => cb(season));
}
