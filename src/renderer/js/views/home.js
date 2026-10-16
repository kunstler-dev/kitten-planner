import { h, icon } from '../ui.js';
import { state, update, uid } from '../state.js';
import { greeting, humanDate, todayKey, addDays, relativeTime, longDate } from '../dates.js';
import { t, tx, money } from '../i18n.js';
import { taskRow, sortTasks, progressBar } from './common.js';
import { progress, nextSteps } from '../launch-model.js';
import { monthTotals } from './finance.js';
import { navigate } from '../router.js';

const IDEA_COUNT = 10;

export function renderHome(root) {
  const d = state.data;
  const today = todayKey();
  const weekEnd = addDays(today, 7);
  const name = d.profile.name?.trim();

  const todayTasks = sortTasks(d.tasks.filter((x) => !x.done && x.due && x.due <= today));
  const doneToday = d.tasks.filter(
    (x) => x.done && x.doneAt && new Date(x.doneAt).toDateString() === new Date().toDateString(),
  );
  const events = d.events
    .filter((e) => e.date >= today && e.date <= weekEnd)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
    .slice(0, 5);
  const deadlines = d.documents
    .filter((doc) => doc.deadline && doc.deadline <= addDays(today, 30))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);
  const notes = [...d.notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const idea = t(`idea.${Math.floor(Date.now() / 86400000) % IDEA_COUNT}`);
  const legal = progress('legal');
  const commercial = progress('commercial');
  const month = monthTotals(today.slice(0, 7));

  const quickInput = h('input', {
    class: 'input',
    placeholder: t('home.quickAdd'),
    onkeydown: (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        const title = e.target.value.trim();
        update((data) =>
          data.tasks.push({
            id: uid(),
            title,
            notes: '',
            due: today,
            priority: 'normal',
            planId: null,
            done: false,
            doneAt: null,
            createdAt: Date.now(),
          }),
        );
        document.querySelector('.home-tasks input')?.focus();
      }
    },
  });

  const stat = (label, value, ic, color, to, extra) =>
    h(
      'button',
      { class: `card stat c-${color}`, onclick: () => navigate(to) },
      h('div', { class: 'stat-icon' }, icon(ic, 20)),
      h(
        'div',
        { class: 'stat-body' },
        h('div', { class: 'stat-value' }, value),
        h('div', { class: 'stat-label' }, label),
        extra,
      ),
    );

  const launchCard = (kind, pr, color, ic) =>
    h(
      'section',
      { class: `card launch-mini c-${color}` },
      h(
        'div',
        { class: 'card-head' },
        h('h2', {}, icon(ic, 18), t(`nav.${kind}`)),
        h('button', { class: 'link', onclick: () => navigate(kind) }, `${t('common.open')} →`),
      ),
      h(
        'div',
        { class: 'plan-progress-row' },
        progressBar(pr.pct, color),
        h('span', { class: 'small' }, `${pr.done}/${pr.total}`),
      ),
      h(
        'ol',
        { class: 'next-steps' },
        nextSteps(kind, 3).map((s) =>
          h('li', {}, h('button', { class: 'linkish', onclick: () => navigate(kind, { stepId: s.id }) }, tx(s.title))),
        ),
      ),
    );

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', {}, name ? t('home.greetName', { greet: greeting(), name }) : `${greeting()}!`),
        h('div', { class: 'muted' }, longDate(today)),
      ),
    ),
    h(
      'div',
      { class: 'stats' },
      stat(t('home.statLegal'), `${legal.pct}%`, 'scale', 'lavender', 'legal'),
      stat(t('home.statCommercial'), `${commercial.pct}%`, 'store', 'powder', 'commercial'),
      stat(t('home.statToday'), todayTasks.length, 'tasks', 'mint', 'plans'),
      stat(t('home.statMonth'), money(month.income - month.expense), 'wallet', 'peach', 'finance'),
    ),
    h(
      'div',
      { class: 'home-grid' },
      h(
        'section',
        { class: 'card home-tasks' },
        h(
          'div',
          { class: 'card-head' },
          h('h2', {}, t('home.focus')),
          h('button', { class: 'link', onclick: () => navigate('plans') }, `${t('home.allTasks')} →`),
        ),
        quickInput,
        h(
          'div',
          { class: 'task-list' },
          todayTasks.length
            ? todayTasks.map((x) => taskRow(x))
            : h('div', { class: 'muted soft-empty' }, doneToday.length ? t('home.allDone') : t('home.noTasks')),
        ),
      ),
      launchCard('legal', legal, 'lavender', 'scale'),
      launchCard('commercial', commercial, 'powder', 'store'),
      h(
        'section',
        { class: 'card' },
        h(
          'div',
          { class: 'card-head' },
          h('h2', {}, t('home.upcoming')),
          h('button', { class: 'link', onclick: () => navigate('calendar') }, `${t('nav.calendar')} →`),
        ),
        events.length || deadlines.length
          ? h(
              'div',
              { class: 'event-list' },
              events.map((e) =>
                h(
                  'div',
                  { class: `event-item c-${e.color || 'lavender'}` },
                  h('div', { class: 'event-date' }, humanDate(e.date), e.time ? ` · ${e.time}` : ''),
                  h('div', { class: 'event-title' }, e.title),
                ),
              ),
              deadlines.map((doc) =>
                h(
                  'button',
                  {
                    class: `event-item c-${doc.deadline < today ? 'powder' : 'peach'}`,
                    onclick: () => navigate('documents'),
                  },
                  h(
                    'div',
                    { class: 'event-date' },
                    icon('docs', 12),
                    ` ${t('docs.deadline')}: ${humanDate(doc.deadline)}`,
                  ),
                  h('div', { class: 'event-title' }, doc.title),
                ),
              ),
            )
          : h('div', { class: 'muted soft-empty' }, t('home.noEvents')),
      ),
      h(
        'section',
        { class: 'card' },
        h(
          'div',
          { class: 'card-head' },
          h('h2', {}, t('home.recentNotes')),
          h('button', { class: 'link', onclick: () => navigate('notes') }, `${t('common.all')} →`),
        ),
        notes.length
          ? h(
              'div',
              { class: 'note-mini-list' },
              notes.map((n) =>
                h(
                  'button',
                  { class: `note-mini c-${n.color || 'cream'}`, onclick: () => navigate('notes', { noteId: n.id }) },
                  h('div', { class: 'note-mini-title' }, n.title || t('notes.untitled')),
                  h('div', { class: 'muted small' }, relativeTime(n.updatedAt)),
                ),
              ),
            )
          : h('div', { class: 'muted soft-empty' }, t('home.noNotes')),
      ),
      h(
        'section',
        { class: 'card idea-card' },
        h('div', { class: 'idea-icon' }, icon('sparkle', 22)),
        h('div', { class: 'idea-text' }, idea),
        h(
          'button',
          { class: 'btn btn-soft', onclick: () => navigate('chat', { prompt: t('home.planDayPrompt') }) },
          icon('chat', 16),
          t('home.planDay'),
        ),
      ),
    ),
  );
}
