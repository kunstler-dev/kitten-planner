// Shared helpers for tasks/plans used by several views.
import { h, icon } from '../ui.js';
import { state, update } from '../state.js';
import { humanDate, todayKey } from '../dates.js';

export const PRIORITIES = {
  high: { label: 'Важно', cls: 'prio-high' },
  normal: { label: 'Обычно', cls: 'prio-normal' },
  low: { label: 'Неспешно', cls: 'prio-low' },
};

export function planById(id) {
  return state.data.plans.find((p) => p.id === id);
}

export function planProgress(planId) {
  const tasks = state.data.tasks.filter((t) => t.planId === planId);
  const done = tasks.filter((t) => t.done).length;
  return { total: tasks.length, done, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export function progressBar(pct, color = 'lavender') {
  return h('div', { class: `progress c-${color}` }, h('div', { class: 'progress-fill', style: { width: `${pct}%` } }));
}

export function toggleTask(id) {
  update((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
  });
}

export function sortTasks(list) {
  const prio = { high: 0, normal: 1, low: 2 };
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ad = a.due || '9999-99-99';
    const bd = b.due || '9999-99-99';
    if (ad !== bd) return ad < bd ? -1 : 1;
    if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority];
    return a.createdAt - b.createdAt;
  });
}

/** Compact task row; `actions` adds edit/delete buttons. */
export function taskRow(task, { onEdit, onDelete, showPlan = true } = {}) {
  const today = todayKey();
  const overdue = task.due && task.due < today && !task.done;
  const plan = showPlan && task.planId ? planById(task.planId) : null;
  const prio = PRIORITIES[task.priority] || PRIORITIES.normal;
  return h(
    'div',
    { class: `task-row${task.done ? ' done' : ''}`, dataset: { id: task.id } },
    h(
      'button',
      {
        class: 'check',
        title: task.done ? 'Вернуть в работу' : 'Отметить выполненной',
        onclick: (e) => {
          e.currentTarget.classList.add('pop');
          toggleTask(task.id);
        },
      },
      icon('check', 14),
    ),
    h(
      'div',
      { class: 'task-main', ondblclick: onEdit ? () => onEdit(task) : null },
      h('div', { class: 'task-title' }, task.title),
      h(
        'div',
        { class: 'task-meta' },
        task.due
          ? h('span', { class: `chip${overdue ? ' chip-danger' : ''}` }, icon('clock', 12), humanDate(task.due))
          : null,
        task.priority !== 'normal' ? h('span', { class: `chip ${prio.cls}` }, icon('flag', 12), prio.label) : null,
        plan ? h('span', { class: `chip chip-plan c-${plan.color}` }, plan.title) : null,
        task.notes ? h('span', { class: 'muted small ellipsis' }, task.notes) : null,
      ),
    ),
    onEdit || onDelete
      ? h(
          'div',
          { class: 'row-actions' },
          onEdit
            ? h('button', { class: 'icon-btn', title: 'Изменить', onclick: () => onEdit(task) }, icon('edit', 16))
            : null,
          onDelete
            ? h('button', { class: 'icon-btn', title: 'Удалить', onclick: () => onDelete(task) }, icon('trash', 16))
            : null,
        )
      : null,
  );
}
