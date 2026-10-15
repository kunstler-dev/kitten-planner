import { h, icon, modal, field, confirmDialog, colorPicker, toast } from '../ui.js';
import { state, update, uid } from '../state.js';
import { MONTHS, WEEKDAYS_SHORT, monthGrid, todayKey, fromKey } from '../dates.js';
import { taskRow } from './common.js';
import { editTask } from './tasks.js';

const now = new Date();
let viewYear = now.getFullYear();
let viewMonth = now.getMonth();
let selected = todayKey();

function eventsOn(key) {
  return state.data.events.filter((e) => e.date === key).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

export function editEvent(ev, date) {
  const draft = ev
    ? { ...ev }
    : { title: '', date: date || selected, time: '', endTime: '', color: 'lavender', note: '' };
  return modal({
    title: ev ? 'Изменить событие' : 'Новое событие',
    build: (close) => {
      const title = h('input', { class: 'input', value: draft.title, placeholder: 'Встреча, звонок, дедлайн…' });
      const d = h('input', { class: 'input', type: 'date', value: draft.date });
      const t1 = h('input', { class: 'input', type: 'time', value: draft.time || '' });
      const t2 = h('input', { class: 'input', type: 'time', value: draft.endTime || '' });
      const note = h('textarea', { class: 'input', rows: 3, placeholder: 'Заметка к событию' });
      note.value = draft.note || '';
      let color = draft.color;
      const save = () => {
        if (!title.value.trim()) return title.focus();
        if (!d.value) return d.focus();
        const fields = {
          title: title.value.trim(),
          date: d.value,
          time: t1.value || '',
          endTime: t2.value || '',
          note: note.value.trim(),
          color,
        };
        update((data) => {
          if (ev)
            Object.assign(
              data.events.find((e) => e.id === ev.id),
              fields,
            );
          else data.events.push({ id: uid(), createdAt: Date.now(), ...fields });
        });
        close(true);
      };
      title.addEventListener('keydown', (e) => e.key === 'Enter' && save());
      return h(
        'div',
        { class: 'modal-body' },
        field('Название', title),
        h('div', { class: 'field-row three' }, field('Дата', d), field('Начало', t1), field('Конец', t2)),
        field('Заметка', note),
        field(
          'Цвет',
          colorPicker(color, (c) => (color = c)),
        ),
        h(
          'div',
          { class: 'modal-actions' },
          ev
            ? h(
                'button',
                {
                  class: 'btn btn-ghost danger-text',
                  onclick: async () => {
                    close(false);
                    if (await confirmDialog(`Удалить событие «${ev.title}»?`)) {
                      update((data) => (data.events = data.events.filter((e) => e.id !== ev.id)));
                      toast('Событие удалено');
                    }
                  },
                },
                'Удалить',
              )
            : null,
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, 'Отмена'),
          h('button', { class: 'btn btn-primary', onclick: save }, ev ? 'Сохранить' : 'Добавить'),
        ),
      );
    },
  });
}

export function renderCalendar(root) {
  const today = todayKey();
  const grid = monthGrid(viewYear, viewMonth);
  const go = (delta) => {
    viewMonth += delta;
    if (viewMonth < 0) ((viewMonth = 11), viewYear--);
    if (viewMonth > 11) ((viewMonth = 0), viewYear++);
    renderCalendar(root);
  };

  const cells = grid.map((c) => {
    const evs = eventsOn(c.key);
    const tasks = state.data.tasks.filter((t) => t.due === c.key);
    return h(
      'button',
      {
        class: `cal-cell${c.inMonth ? '' : ' out'}${c.key === today ? ' today' : ''}${c.key === selected ? ' selected' : ''}`,
        onclick: () => {
          selected = c.key;
          if (!c.inMonth) {
            const d = fromKey(c.key);
            viewYear = d.getFullYear();
            viewMonth = d.getMonth();
          }
          renderCalendar(root);
        },
        ondblclick: () => editEvent(null, c.key),
      },
      h('span', { class: 'cal-day' }, c.day),
      h(
        'div',
        { class: 'cal-pills' },
        evs.slice(0, 3).map((e) => h('div', { class: `cal-pill c-${e.color}` }, e.time ? `${e.time} ` : '', e.title)),
        evs.length > 3 ? h('div', { class: 'muted tiny' }, `ещё ${evs.length - 3}`) : null,
      ),
      tasks.length
        ? h(
            'div',
            { class: 'cal-task-dots', title: `Задач: ${tasks.length}` },
            tasks.slice(0, 5).map((t) => h('span', { class: `tdot${t.done ? ' done' : ''}` })),
          )
        : null,
    );
  });

  const dayEvents = eventsOn(selected);
  const dayTasks = state.data.tasks.filter((t) => t.due === selected);

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Календарь'), h('div', { class: 'muted' }, 'Двойной клик по дню — новое событие')),
      h('button', { class: 'btn btn-primary', onclick: () => editEvent(null, selected) }, icon('plus', 16), 'Событие'),
    ),
    h(
      'div',
      { class: 'cal-layout' },
      h(
        'div',
        { class: 'card cal-card' },
        h(
          'div',
          { class: 'cal-head' },
          h('button', { class: 'icon-btn', title: 'Предыдущий месяц', onclick: () => go(-1) }, icon('chevronLeft')),
          h('h2', {}, `${MONTHS[viewMonth]} ${viewYear}`),
          h('button', { class: 'icon-btn', title: 'Следующий месяц', onclick: () => go(1) }, icon('chevronRight')),
          h('div', { class: 'spacer' }),
          h(
            'button',
            {
              class: 'btn btn-ghost small',
              onclick: () => {
                viewYear = now.getFullYear();
                viewMonth = new Date().getMonth();
                selected = todayKey();
                renderCalendar(root);
              },
            },
            'Сегодня',
          ),
        ),
        h(
          'div',
          { class: 'cal-weekdays' },
          WEEKDAYS_SHORT.map((w) => h('div', {}, w)),
        ),
        h('div', { class: 'cal-grid' }, cells),
      ),
      h(
        'div',
        { class: 'card day-panel' },
        h(
          'h2',
          { class: 'capitalize' },
          fromKey(selected).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
        ),
        selected === today ? h('div', { class: 'muted small' }, 'Сегодня') : null,
        h('div', { class: 'day-section-title' }, 'События'),
        dayEvents.length
          ? dayEvents.map((e) =>
              h(
                'button',
                { class: `day-event c-${e.color}`, onclick: () => editEvent(e) },
                h(
                  'div',
                  { class: 'day-event-time' },
                  e.time ? `${e.time}${e.endTime ? `–${e.endTime}` : ''}` : 'Весь день',
                ),
                h('div', { class: 'day-event-title' }, e.title),
                e.note ? h('div', { class: 'muted small' }, e.note) : null,
              ),
            )
          : h('div', { class: 'muted small soft-empty' }, 'Событий нет'),
        h(
          'button',
          { class: 'btn btn-soft full', onclick: () => editEvent(null, selected) },
          icon('plus', 16),
          'Добавить событие',
        ),
        h('div', { class: 'day-section-title' }, 'Задачи со сроком'),
        dayTasks.length
          ? h(
              'div',
              { class: 'task-list' },
              dayTasks.map((t) => taskRow(t, { onEdit: editTask })),
            )
          : h('div', { class: 'muted small soft-empty' }, 'Задач на этот день нет'),
      ),
    ),
  );
}
