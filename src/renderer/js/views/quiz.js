// Painting quiz over the whole painting-of-the-day collection: "Who painted it?" (painting → 4 artists)
// and "Which one is theirs?" (artist → 4 paintings). Best streak and totals are saved (and synced).
import { h, icon, segmented } from '../ui.js';
import { state, update } from '../state.js';
import { t, tx } from '../i18n.js';
import { PAINTINGS, ARTISTS } from '../data/art/index.js';
import { loadArtImage, fmtYear } from './art.js';

const ARTIST_KEYS = [...new Set(PAINTINGS.map((p) => p.a))].filter((a) => ARTISTS[a]);
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const shuffle = (list) =>
  list
    .map((v) => [Math.random(), v])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
const artistName = (key) => tx(ARTISTS[key].name);

let mode = 'mix';
let question = null;
let picked = null;
let streak = 0;
let session = { right: 0, total: 0 };

function otherArtists(except, n) {
  return shuffle(ARTIST_KEYS.filter((a) => a !== except)).slice(0, n);
}

function newQuestion() {
  const kind = mode === 'mix' ? pickOne(['who', 'which']) : mode;
  picked = null;
  if (kind === 'who') {
    const painting = pickOne(PAINTINGS);
    question = { kind, painting, options: shuffle([painting.a, ...otherArtists(painting.a, 3)]), answer: painting.a };
  } else {
    const painting = pickOne(PAINTINGS);
    const others = otherArtists(painting.a, 3).map((a) => pickOne(PAINTINGS.filter((p) => p.a === a)));
    question = { kind, painting, options: shuffle([painting, ...others]), answer: painting.id };
  }
}

function frame(painting, big) {
  const img = h('img', { alt: '', loading: 'lazy' });
  const box = h('div', { class: `quiz-img${big ? ' big' : ''}` }, img);
  loadArtImage(img, painting, () =>
    box.replaceChildren(h('div', { class: 'quiz-noimg' }, icon('palette', 22), h('span', {}, tx(painting.t)))),
  );
  return box;
}

function answer(value, root) {
  if (picked !== null) return;
  picked = value;
  const right = value === question.answer;
  session = { right: session.right + (right ? 1 : 0), total: session.total + 1 };
  streak = right ? streak + 1 : 0;
  update(
    (d) => {
      d.quiz.total += 1;
      if (right) d.quiz.right += 1;
      d.quiz.best = Math.max(d.quiz.best, streak);
    },
    { silent: true },
  );
  renderQuiz(root);
}

function optionState(value) {
  if (picked === null) return '';
  if (value === question.answer) return ' right';
  return value === picked ? ' wrong' : ' dim';
}

export function renderQuiz(root) {
  if (!question) newQuestion();
  const q = question;
  const p = q.painting;
  const saved = state.data.quiz;

  const body =
    q.kind === 'who'
      ? h(
          'div',
          { class: 'quiz-who' },
          frame(p, true),
          h(
            'div',
            { class: 'quiz-options' },
            q.options.map((a) =>
              h(
                'button',
                { class: `quiz-option btn btn-ghost${optionState(a)}`, onclick: () => answer(a, root) },
                artistName(a),
              ),
            ),
          ),
        )
      : h(
          'div',
          { class: 'quiz-which' },
          h(
            'div',
            { class: 'quiz-artist' },
            h('b', {}, artistName(p.a)),
            h('span', { class: 'muted' }, tx(ARTISTS[p.a].life)),
          ),
          h(
            'div',
            { class: 'quiz-grid' },
            q.options.map((o) =>
              h(
                'button',
                { class: `quiz-tile${optionState(o.id)}`, onclick: () => answer(o.id, root) },
                frame(o, false),
                picked !== null ? h('div', { class: 'quiz-tile-title small' }, tx(o.t)) : null,
              ),
            ),
          ),
        );

  const result =
    picked === null
      ? null
      : h(
          'div',
          { class: `quiz-result ${picked === q.answer ? 'ok' : 'miss'}` },
          h('div', { class: 'quiz-verdict' }, picked === q.answer ? t('quiz.right') : t('quiz.wrong')),
          h('div', {}, h('b', {}, `«${tx(p.t)}»`), ` — ${artistName(p.a)}, ${fmtYear(p.y)}`),
          h('div', { class: 'muted small' }, `${tx(p.s)} · ${tx(p.l)}`),
          h(
            'button',
            {
              class: 'btn btn-primary',
              onclick: () => {
                newQuestion();
                renderQuiz(root);
              },
            },
            t('quiz.next'),
            icon('chevronRight', 16),
          ),
        );

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', {}, t('nav.quiz')),
        h('div', { class: 'muted' }, t('quiz.subtitle', { n: PAINTINGS.length })),
      ),
      segmented(
        [
          { value: 'mix', label: t('quiz.mode.mix') },
          { value: 'who', label: t('quiz.mode.who') },
          { value: 'which', label: t('quiz.mode.which') },
        ],
        mode,
        (v) => {
          mode = v;
          newQuestion();
          renderQuiz(root);
        },
      ),
    ),
    h(
      'div',
      { class: 'quiz-stats' },
      h('span', { class: 'chip' }, '✅ ', t('quiz.session', { right: session.right, total: session.total })),
      h('span', { class: 'chip' }, '🔥 ', t('quiz.streak', { n: streak })),
      h('span', { class: 'chip' }, '🏆 ', t('quiz.best', { n: saved.best })),
    ),
    h(
      'section',
      { class: 'card quiz-card' },
      h('div', { class: 'quiz-question' }, q.kind === 'who' ? t('quiz.askWho') : t('quiz.askWhich')),
      body,
      result,
    ),
  );
}
