// Seasonal looks controller: applies colour grading, effects, sound and outfits for the season
// chosen in Settings (or the automatic one for today) and keeps them current across midnight.
import { resolveSeason, activeFx, SEASON_SOUND, publishSeason } from './season.js';
import { renderSeasonFx } from './fx.js';
import { setAmbience } from './sound.js';
import { state } from '../state.js';
import { todayKey } from '../dates.js';

let lastDay = '';

export function effectiveSeason() {
  return resolveSeason(state.data.settings.season || 'auto', todayKey());
}

export function applySeason() {
  lastDay = todayKey();
  const season = effectiveSeason();
  const html = document.documentElement;
  if (season) html.dataset.season = season;
  else delete html.dataset.season;
  renderSeasonFx(season, activeFx(season, state.data.settings.fx), html.dataset.theme === 'dark');
  publishSeason(season);
  syncSound();
}

export function syncSound() {
  const season = effectiveSeason();
  setAmbience(state.data.settings.sound && season ? SEASON_SOUND[season] : null);
}

export function initSeasons() {
  applySeason();
  window.addEventListener('themechange', applySeason);
  setInterval(() => lastDay !== todayKey() && applySeason(), 60 * 1000);
  // Browsers only start audio after a click/tap.
  window.addEventListener('pointerdown', syncSound);
}
