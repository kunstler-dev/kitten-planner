// Minimal i18n: flat dictionaries per language, `t('a.b', { n: 1 })`.
import uk from './locales/uk.js';
import de from './locales/de.js';

export const LANGS = { uk, de };
export const LANG_LABELS = { uk: 'UA', de: 'DE' };
const INTL = { uk: 'uk-UA', de: 'de-DE' };

let current = 'uk';
const missing = new Set();

export function setLang(lang) {
  current = LANGS[lang] ? lang : 'uk';
  document.documentElement.lang = current;
}

export function getLang() {
  return current;
}

export function locale() {
  return INTL[current];
}

export function t(key, params) {
  let s = LANGS[current][key];
  if (s === undefined) {
    if (!missing.has(key)) {
      missing.add(key);
      console.warn(`i18n missing: ${current}.${key}`);
    }
    s = LANGS.uk[key] ?? key;
  }
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  return s;
}

/** Picks the current-language variant of a { uk, de } object (used by content templates). */
export function tx(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  return obj[current] ?? obj.uk ?? '';
}

export function money(value) {
  return new Intl.NumberFormat(INTL[current], {
    style: 'currency',
    currency: 'EUR',
    currencyDisplay: 'narrowSymbol',
  }).format(Number(value) || 0);
}

export function num(value, digits = 0) {
  return new Intl.NumberFormat(INTL[current], { maximumFractionDigits: digits }).format(Number(value) || 0);
}
