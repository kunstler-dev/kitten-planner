import { h, icon } from '../ui.js';
import { state, update, uid } from '../state.js';
import { greeting, humanDate, todayKey, addDays, relativeTime } from '../dates.js';
import { taskRow, sortTasks, planProgress, progressBar } from './common.js';
import { navigate } from '../router.js';

const IDEAS = [
  'Маленький шаг каждый день важнее идеального плана.',
  'Запиши три вещи, которые сегодня приблизят тебя к цели.',
  'Поговори с одним потенциальным клиентом на этой неделе.',
  'Чётко сформулируй, какую проблему решает твоё дело.',
  'Сделай первую версию — улучшать будешь потом.',
  'Посчитай, сколько стоит твой час, и не продавай его дешевле.',
  'Отдых — тоже часть плана. Без него не будет сил на рост.',
  'Попроси обратную связь у тех, кому доверяешь.',
  'Определи одну главную задачу на день и начни с неё.',
  'Каждый эксперт когда-то был новичком.',
];

export function renderHome(root) {
  const d = state.data;
  const today = todayKey();
  const weekEnd = addDays(today, 7);
  const name = d.profile.name?.trim();

  const todayTasks = sortTasks(d.tasks.filter((t) => !t.done && t.due && t.due <= today));
  const doneToday = d.tasks.filter(
    (t) => t.done && t.doneAt && new Date(t.doneAt).toDateString() === new Date().toDateString(),
  );
  const events = d.events
    .filter((e) => e.date >= today && e.date <= weekEnd)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
    .slice(0, 6);
  const notes = [...d.notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  const idea = IDEAS[Math.floor(Date.now() / 86400000) % IDEAS.length];

  const quickInput = h('input', {
    class: 'input',
    placeholder: 'Быстро добавить задачу на сегодня…',
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

  const stat = (label, value, ic, color, to) =>
    h(
      'button',
      { class: `card stat c-${color}`, onclick: () => navigate(to) },
      h('div', { class: 'stat-icon' }, icon(ic, 20)),
      h('div', {}, h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label)),
    );

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', {}, `${greeting()}${name ? `, ${name}` : ''}!`),
        h(
          'div',
          { class: 'muted capitalize' },
          new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'stats' },
      stat('задач на сегодня', todayTasks.length, 'tasks', 'lavender', 'tasks'),
      stat('сделано сегодня', doneToday.length, 'check', 'mint', 'tasks'),
      stat('событий за неделю', events.length, 'calendar', 'powder', 'calendar'),
      stat('заметок', d.notes.length, 'note', 'peach', 'notes'),
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
          h('h2', {}, 'Фокус на сегодня'),
          h('button', { class: 'link', onclick: () => navigate('tasks') }, 'Все задачи →'),
        ),
        quickInput,
        h(
          'div',
          { class: 'task-list' },
          todayTasks.length
            ? todayTasks.map((t) => taskRow(t))
            : h(
                'div',
                { class: 'muted soft-empty' },
                doneToday.length
                  ? 'Всё на сегодня сделано — ты молодец! ✨'
                  : 'На сегодня задач нет. Добавь первую выше.',
              ),
        ),
      ),
      h(
        'section',
        { class: 'card' },
        h(
          'div',
          { class: 'card-head' },
          h('h2', {}, 'Ближайшие события'),
          h('button', { class: 'link', onclick: () => navigate('calendar') }, 'Календарь →'),
        ),
        events.length
          ? h(
              'div',
              { class: 'event-list' },
              events.map((e) =>
                h(
                  'div',
                  { class: `event-item c-${e.color || 'lavender'}` },
                  h(
                    'div',
                    { class: 'event-date' },
                    humanDate(e.date),
                    e.time ? h('span', { class: 'muted' }, ` · ${e.time}`) : null,
                  ),
                  h('div', { class: 'event-title' }, e.title),
                ),
              ),
            )
          : h('div', { class: 'muted soft-empty' }, 'На неделе событий нет.'),
      ),
      h(
        'section',
        { class: 'card' },
        h(
          'div',
          { class: 'card-head' },
          h('h2', {}, 'Мои планы'),
          h('button', { class: 'link', onclick: () => navigate('tasks') }, 'Открыть →'),
        ),
        d.plans.length
          ? h(
              'div',
              { class: 'plan-mini-list' },
              d.plans.slice(0, 5).map((p) => {
                const pr = planProgress(p.id);
                return h(
                  'div',
                  { class: 'plan-mini' },
                  h(
                    'div',
                    { class: 'plan-mini-head' },
                    h('span', {}, p.title),
                    h('span', { class: 'muted small' }, `${pr.done}/${pr.total}`),
                  ),
                  progressBar(pr.pct, p.color),
                );
              }),
            )
          : h('div', { class: 'muted soft-empty' }, 'Создай план — например, «Запуск своего дела».'),
      ),
      h(
        'section',
        { class: 'card' },
        h(
          'div',
          { class: 'card-head' },
          h('h2', {}, 'Последние заметки'),
          h('button', { class: 'link', onclick: () => navigate('notes') }, 'Все →'),
        ),
        notes.length
          ? h(
              'div',
              { class: 'note-mini-list' },
              notes.map((n) =>
                h(
                  'button',
                  { class: `note-mini c-${n.color || 'cream'}`, onclick: () => navigate('notes', { noteId: n.id }) },
                  h('div', { class: 'note-mini-title' }, n.title || 'Без названия'),
                  h('div', { class: 'muted small' }, relativeTime(n.updatedAt)),
                ),
              ),
            )
          : h('div', { class: 'muted soft-empty' }, 'Здесь появятся твои заметки.'),
      ),
      h(
        'section',
        { class: 'card idea-card' },
        h('div', { class: 'idea-icon' }, icon('sparkle', 22)),
        h('div', { class: 'idea-text' }, idea),
        h(
          'button',
          {
            class: 'btn btn-soft',
            onclick: () =>
              navigate('chat', { prompt: 'Помоги мне спланировать сегодняшний день, учитывая мои задачи и планы.' }),
          },
          icon('chat', 16),
          'Спланировать день с ИИ',
        ),
      ),
    ),
  );
}
