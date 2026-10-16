import { h, icon, modal, field, confirmDialog, colorPicker, toast } from '../ui.js';
import { state, update, uid } from '../state.js';
import { t, tx } from '../i18n.js';
import { monthName, weekdaysShort, monthGrid, todayKey, longDate, fromKey } from '../dates.js';
import { taskRow } from './common.js';
import { editTask } from './tasks.js';
import { steps, stepState } from '../launch-model.js';
import { navigate } from '../router.js';
import { canOpen, isOpened, openArt, artThumb } from './art.js';

const now = new Date();
let viewYear = now.getFullYear();
let viewMonth = now.getMonth();
let selected = todayKey();

function eventsOn(key) {
  return state.data.events.filter((e) => e.date === key).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

/** Dated items from other sections: launch steps, document deadlines, invoice due dates. */
function remindersOn(key) {
  const out = [];
  for (const kind of ['legal', 'commercial']) {
    for (const s of steps(kind)) {
      const st = stepState(kind, s.id);
      if (st.due === key && st.status !== 'done')
        out.push({
          label: s.custom ? s.title : tx(s.title),
          icon: kind === 'legal' ? 'scale' : 'store',
          go: () => navigate(kind, { stepId: s.id }),
        });
    }
  }
  for (const d of state.data.documents)
    if (d.deadline === key) out.push({ label: d.title, icon: 'docs', go: () => navigate('documents') });
  for (const inv of state.data.invoices)
    if (inv.dueDate === key && inv.status === 'sent')
      out.push({ label: `${t('inv.invoice')} ${inv.number}`, icon: 'invoice', go: () => navigate('finance') });
  return out;
}

export function editEvent(ev, date) {
  const draft = ev
    ? { ...ev }
    : { title: '', date: date || selected, time: '', endTime: '', color: 'lavender', note: '' };
  return modal({
    title: ev ? t('cal.editEvent') : t('cal.newEvent'),
    build: (close) => {
      const title = h('input', { class: 'input', value: draft.title, placeholder: t('cal.titlePlaceholder') });
      const d = h('input', { class: 'input', type: 'date', value: draft.date });
      const t1 = h('input', { class: 'input', type: 'time', value: draft.time || '' });
      const t2 = h('input', { class: 'input', type: 'time', value: draft.endTime || '' });
      const note = h('textarea', { class: 'input', rows: 3, placeholder: t('cal.notePlaceholder') });
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
        field(t('common.title'), title),
        h(
          'div',
          { class: 'field-row three' },
          field(t('cal.date'), d),
          field(t('cal.start'), t1),
          field(t('cal.end'), t2),
        ),
        field(t('launch.note'), note),
        field(
          t('common.color'),
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
                    if (await confirmDialog(t('cal.delete', { title: ev.title }))) {
                      update((data) => (data.events = data.events.filter((e) => e.id !== ev.id)));
                      toast(t('common.deleted'));
                    }
                  },
                },
                t('common.delete'),
              )
            : null,
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, t('common.cancel')),
          h('button', { class: 'btn btn-primary', onclick: save }, ev ? t('common.save') : t('common.add')),
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
    const tasks = state.data.tasks.filter((x) => x.due === c.key);
    const rem = remindersOn(c.key);
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
      canOpen(c.key)
        ? h(
            'span',
            {
              class: `cal-egg${isOpened(c.key) ? ' seen' : ''}`,
              title: t('art.ofTheDay'),
              role: 'button',
              onclick: (e) => {
                e.stopPropagation();
                openArt(c.key);
              },
            },
            '🎨',
          )
        : null,
      h(
        'div',
        { class: 'cal-pills' },
        evs.slice(0, 3).map((e) => h('div', { class: `cal-pill c-${e.color}` }, e.time ? `${e.time} ` : '', e.title)),
        rem.slice(0, 2).map((r) => h('div', { class: 'cal-pill reminder' }, r.label)),
        evs.length + rem.length > 5
          ? h('div', { class: 'muted tiny' }, t('cal.more', { n: evs.length + rem.length - 5 }))
          : null,
      ),
      tasks.length
        ? h(
            'div',
            { class: 'cal-task-dots', title: t('cal.tasksCount', { n: tasks.length }) },
            tasks.slice(0, 5).map((x) => h('span', { class: `tdot${x.done ? ' done' : ''}` })),
          )
        : null,
    );
  });

  const dayEvents = eventsOn(selected);
  const dayTasks = state.data.tasks.filter((x) => x.due === selected);
  const dayRem = remindersOn(selected);

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, t('nav.calendar')), h('div', { class: 'muted' }, t('cal.subtitle'))),
      h(
        'button',
        { class: 'btn btn-primary', onclick: () => editEvent(null, selected) },
        icon('plus', 16),
        t('cal.event'),
      ),
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
          h('button', { class: 'icon-btn', title: t('cal.prev'), onclick: () => go(-1) }, icon('chevronLeft')),
          h('h2', {}, `${monthName(viewMonth, viewYear)} ${viewYear}`),
          h('button', { class: 'icon-btn', title: t('cal.next'), onclick: () => go(1) }, icon('chevronRight')),
          h('div', { class: 'spacer' }),
          h(
            'button',
            {
              class: 'btn btn-ghost small',
              onclick: () => {
                viewYear = new Date().getFullYear();
                viewMonth = new Date().getMonth();
                selected = todayKey();
                renderCalendar(root);
              },
            },
            t('date.today'),
          ),
        ),
        h(
          'div',
          { class: 'cal-weekdays' },
          weekdaysShort().map((w) => h('div', {}, w)),
        ),
        h('div', { class: 'cal-grid' }, cells),
      ),
      h(
        'div',
        { class: 'card day-panel' },
        h('h2', {}, longDate(selected)),
        selected === today ? h('div', { class: 'muted small' }, t('date.today')) : null,
        artThumb(selected, () => openArt(selected)),
        h('div', { class: 'day-section-title' }, t('cal.events')),
        dayEvents.length
          ? dayEvents.map((e) =>
              h(
                'button',
                { class: `day-event c-${e.color}`, onclick: () => editEvent(e) },
                h(
                  'div',
                  { class: 'day-event-time' },
                  e.time ? `${e.time}${e.endTime ? `–${e.endTime}` : ''}` : t('cal.allDay'),
                ),
                h('div', { class: 'day-event-title' }, e.title),
                e.note ? h('div', { class: 'muted small' }, e.note) : null,
              ),
            )
          : h('div', { class: 'muted small soft-empty' }, t('cal.noEvents')),
        h(
          'button',
          { class: 'btn btn-soft full', onclick: () => editEvent(null, selected) },
          icon('plus', 16),
          t('cal.addEvent'),
        ),
        dayRem.length ? h('div', { class: 'day-section-title' }, t('cal.reminders')) : null,
        dayRem.map((r) =>
          h(
            'button',
            { class: 'day-event c-peach', onclick: r.go },
            h('div', { class: 'day-event-title' }, icon(r.icon, 14), ' ', r.label),
          ),
        ),
        h('div', { class: 'day-section-title' }, t('cal.tasks')),
        dayTasks.length
          ? h(
              'div',
              { class: 'task-list' },
              dayTasks.map((x) => taskRow(x, { onEdit: editTask })),
            )
          : h('div', { class: 'muted small soft-empty' }, t('cal.noTasks')),
      ),
    ),
  );
}
