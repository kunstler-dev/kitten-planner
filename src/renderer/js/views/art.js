// Painting-of-the-day "easter egg": a modal with the painting, its story and where to see it.
import { h, icon, modal } from '../ui.js';
import { state, update } from '../state.js';
import { t, tx, getLang } from '../i18n.js';
import { todayKey, addDays, longDate } from '../dates.js';
import { ARTISTS, START, paintingFor, totalDays } from '../data/art/index.js';

const imageCache = new Map();

export function canOpen(dateKey) {
  return dateKey >= START && dateKey <= todayKey();
}

export function isOpened(dateKey) {
  return Boolean(state.data.art.opened[dateKey]);
}

export function openedCount() {
  return Object.keys(state.data.art.opened).length;
}

/** Loads the painting image (bundled → cached → downloaded once) into an <img>. */
export function loadArtImage(img, painting, onFail) {
  const apply = (src) => {
    if (src) img.src = src;
    else onFail?.();
  };
  if (imageCache.has(painting.id)) return apply(imageCache.get(painting.id));
  window.api.artImage({ id: painting.id, wiki: painting.wiki }).then((src) => {
    if (src) imageCache.set(painting.id, src);
    apply(src);
  });
}

/** Years are written with the Ukrainian "бл." (circa) prefix; shown as "um" in German. */
export function fmtYear(y) {
  return getLang() === 'de' ? String(y).replace(/бл\. ?/g, 'um ') : String(y);
}

function artistLine(p) {
  const a = ARTISTS[p.a];
  return a ? `${tx(a.name)} (${tx(a.life)})` : '';
}

export function artThumb(dateKey, onOpen) {
  if (!canOpen(dateKey)) {
    return h('div', { class: 'art-teaser locked' }, icon('lock', 16), h('span', {}, t('art.locked', { date: longDate(dateKey) })));
  }
  const p = paintingFor(dateKey);
  const img = h('img', { alt: '' });
  const box = h(
    'button',
    { class: `art-teaser${isOpened(dateKey) ? ' seen' : ''}`, onclick: onOpen },
    h('div', { class: 'art-teaser-img' }, img),
    h('div', { class: 'art-teaser-text' }, h('div', { class: 'art-kicker' }, icon('sparkle', 12), t('art.ofTheDay')), isOpened(dateKey) ? h('b', {}, tx(p.t)) : h('b', {}, t('art.surprise')), h('span', { class: 'muted small' }, isOpened(dateKey) ? artistLine(p) : t('art.clickToOpen'))),
  );
  if (isOpened(dateKey)) loadArtImage(img, p, () => img.remove());
  else img.replaceWith(h('div', { class: 'art-egg' }, '🎨'));
  return box;
}

export function openArt(dateKey) {
  if (!canOpen(dateKey)) return;
  let current = dateKey;
  return modal({
    title: t('art.title'),
    width: 1040,
    build: () => {
      const wrap = h('div', { class: 'art-modal' });
      const render = () => {
        const p = paintingFor(current);
        if (!isOpened(current)) update((d) => (d.art.opened[current] = Date.now()), { silent: true });
        const img = h('img', { alt: tx(p.t) });
        const frame = h('div', { class: 'art-frame loading' }, img);
        img.onload = () => frame.classList.remove('loading');
        loadArtImage(img, p, () => frame.replaceChildren(h('div', { class: 'art-noimg' }, icon('sparkle', 28), h('span', {}, t('art.noImage')))));
        const prev = addDays(current, -1);
        const next = addDays(current, 1);
        wrap.replaceChildren(
          frame,
          h(
            'div',
            { class: 'art-info' },
            h('div', { class: 'art-kicker' }, icon('calendar', 12), longDate(current)),
            h('h2', { class: 'art-title' }, tx(p.t)),
            h('div', { class: 'art-artist' }, artistLine(p)),
            h(
              'div',
              { class: 'art-facts' },
              h('div', {}, h('span', {}, t('art.year')), h('b', {}, fmtYear(p.y))),
              h('div', {}, h('span', {}, t('art.style')), h('b', {}, tx(p.s))),
              h('div', {}, h('span', {}, t('art.medium')), h('b', {}, tx(p.m))),
              h('div', {}, h('span', {}, t('art.where')), h('b', {}, tx(p.l))),
            ),
            ...tx(p.d)
              .split('\n')
              .filter(Boolean)
              .map((para) => h('p', { class: 'art-text' }, para)),
            h(
              'div',
              { class: 'art-nav' },
              h('button', { class: 'btn btn-ghost small', disabled: !canOpen(prev), onclick: () => ((current = prev), render()) }, icon('chevronLeft', 14), t('art.prev')),
              h('span', { class: 'muted small' }, t('art.counter', { n: openedCount(), total: totalDays() })),
              h('button', { class: 'btn btn-ghost small', disabled: !canOpen(next), onclick: () => ((current = next), render()) }, t('art.next'), icon('chevronRight', 14)),
            ),
          ),
        );
      };
      render();
      return wrap;
    },
  }).then(() => {
    // refresh markers (opened state) in whatever view is visible
    update(() => {});
  });
}
