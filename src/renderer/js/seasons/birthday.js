// Birthday greeting: every pet says something, then the most important line. The date, title and
// closing line come from personal.js (injected from a repository secret at build time).
// Shown automatically once per year on the day; can be reopened from the home page.
import { h, modal } from '../ui.js';
import { t, tx } from '../i18n.js';
import { PERSONAL } from '../personal.js';
import { state, update } from '../state.js';
import { seasonForDate } from './season.js';
import { todayKey } from '../dates.js';

const VOICES = [
  { who: 'kitten', emoji: '🐱' },
  { who: 'zefirka', emoji: '😴' },
  { who: 'gudzyk', emoji: '🧶' },
  { who: 'bublyk', emoji: '🐶' },
  { who: 'auerilus', emoji: '🤖' },
];

export function showBirthday() {
  return modal({
    title: PERSONAL.title ? tx(PERSONAL.title) : t('bday.title'),
    width: 560,
    build: (close) =>
      h(
        'div',
        { class: 'bday-card' },
        h('div', { class: 'bday-hero' }, '🎂'),
        h('div', { class: 'bday-lead' }, t('bday.lead')),
        h(
          'div',
          { class: 'bday-lines' },
          VOICES.map((v, i) =>
            h(
              'div',
              { class: 'bday-line', style: { animationDelay: `${0.4 + i * 0.7}s` } },
              h('span', { class: 'bday-face' }, v.emoji),
              h('div', {}, h('b', {}, t(`bday.name.${v.who}`)), h('div', {}, t(`bday.msg.${v.who}`))),
            ),
          ),
          PERSONAL.love
            ? h(
                'div',
                { class: 'bday-line bday-love', style: { animationDelay: `${0.4 + VOICES.length * 0.7 + 0.4}s` } },
                h('div', {}, tx(PERSONAL.love)),
              )
            : null,
        ),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-primary', onclick: () => close(true) }, t('bday.thanks')),
        ),
      ),
  });
}

/** Opens the greeting the first time the app starts on her birthday (the real date) this year. */
export function maybeShowBirthday() {
  if (seasonForDate(todayKey()) !== 'birthday') return;
  const year = String(new Date().getFullYear());
  if (state.data.settings.bdaySeen === year) return;
  update((d) => (d.settings.bdaySeen = year), { silent: true });
  setTimeout(showBirthday, 900);
}
