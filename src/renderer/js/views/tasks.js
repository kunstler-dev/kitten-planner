import { h, icon, modal, field, confirmDialog, colorPicker, emptyState, toast } from '../ui.js';
import { state, update, uid } from '../state.js';
import { todayKey, humanDate } from '../dates.js';
import { taskRow, sortTasks, planProgress, progressBar, planById, PRIORITIES } from './common.js';

let filter = 'active'; // active | today | upcoming | nodate | done | plan:<id>

const FILTERS = [
  { id: 'active', label: 'Все активные', icon: 'tasks' },
  { id: 'today', label: 'Сегодня', icon: 'sparkle' },
  { id: 'upcoming', label: 'Предстоящие', icon: 'calendar' },
  { id: 'nodate', label: 'Без срока', icon: 'clock' },
  { id: 'done', label: 'Выполненные', icon: 'check' },
];

function filtered() {
  const today = todayKey();
  const all = state.data.tasks;
  if (filter.startsWith('plan:')) return all.filter((t) => t.planId === filter.slice(5));
  switch (filter) {
    case 'today':
      return all.filter((t) => !t.done && t.due && t.due <= today);
    case 'upcoming':
      return all.filter((t) => !t.done && t.due && t.due > today);
    case 'nodate':
      return all.filter((t) => !t.done && !t.due);
    case 'done':
      return all.filter((t) => t.done).sort((a, b) => b.doneAt - a.doneAt);
    default:
      return all.filter((t) => !t.done);
  }
}

function count(id) {
  const prev = filter;
  filter = id;
  const n = filtered().length;
  filter = prev;
  return n;
}

export function editTask(task) {
  const draft = task
    ? { ...task }
    : {
        title: '',
        notes: '',
        due: '',
        priority: 'normal',
        planId: filter.startsWith('plan:') ? filter.slice(5) : null,
      };
  return modal({
    title: task ? 'Изменить задачу' : 'Новая задача',
    build: (close) => {
      const title = h('input', { class: 'input', value: draft.title, placeholder: 'Что нужно сделать?' });
      const notes = h('textarea', { class: 'input', rows: 3, placeholder: 'Детали (необязательно)' });
      notes.value = draft.notes || '';
      const due = h('input', { class: 'input', type: 'date', value: draft.due || '' });
      const prio = h(
        'select',
        { class: 'input' },
        Object.entries(PRIORITIES).map(([id, p]) =>
          h('option', { value: id, selected: id === draft.priority }, p.label),
        ),
      );
      const plan = h(
        'select',
        { class: 'input' },
        h('option', { value: '' }, '— без плана —'),
        state.data.plans.map((p) => h('option', { value: p.id, selected: p.id === draft.planId }, p.title)),
      );
      const save = () => {
        if (!title.value.trim()) return title.focus();
        const fields = {
          title: title.value.trim(),
          notes: notes.value.trim(),
          due: due.value || null,
          priority: prio.value,
          planId: plan.value || null,
        };
        update((d) => {
          if (task)
            Object.assign(
              d.tasks.find((t) => t.id === task.id),
              fields,
            );
          else d.tasks.push({ id: uid(), done: false, doneAt: null, createdAt: Date.now(), ...fields });
        });
        close(true);
      };
      title.addEventListener('keydown', (e) => e.key === 'Enter' && save());
      return h(
        'div',
        { class: 'modal-body' },
        field('Задача', title),
        field('Описание', notes),
        h('div', { class: 'field-row' }, field('Срок', due), field('Приоритет', prio)),
        field('План', plan),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, 'Отмена'),
          h('button', { class: 'btn btn-primary', onclick: save }, task ? 'Сохранить' : 'Добавить'),
        ),
      );
    },
  });
}

async function deleteTask(task) {
  if (await confirmDialog(`Удалить задачу «${task.title}»?`)) {
    update((d) => (d.tasks = d.tasks.filter((t) => t.id !== task.id)));
    toast('Задача удалена');
  }
}

function editPlan(plan) {
  const draft = plan ? { ...plan } : { title: '', description: '', deadline: '', color: 'lavender' };
  return modal({
    title: plan ? 'Изменить план' : 'Новый план',
    build: (close) => {
      const title = h('input', {
        class: 'input',
        value: draft.title,
        placeholder: 'Например, «Запуск онлайн-магазина»',
      });
      const desc = h('textarea', { class: 'input', rows: 3, placeholder: 'Цель и зачем это нужно' });
      desc.value = draft.description || '';
      const deadline = h('input', { class: 'input', type: 'date', value: draft.deadline || '' });
      let color = draft.color;
      const save = () => {
        if (!title.value.trim()) return title.focus();
        const fields = {
          title: title.value.trim(),
          description: desc.value.trim(),
          deadline: deadline.value || null,
          color,
        };
        let id = plan?.id;
        update((d) => {
          if (plan)
            Object.assign(
              d.plans.find((p) => p.id === plan.id),
              fields,
            );
          else {
            id = uid();
            d.plans.push({ id, createdAt: Date.now(), ...fields });
          }
        });
        filter = `plan:${id}`;
        update(() => {});
        close(true);
      };
      title.addEventListener('keydown', (e) => e.key === 'Enter' && save());
      return h(
        'div',
        { class: 'modal-body' },
        field('Название', title),
        field('Описание', desc),
        field('Дедлайн', deadline),
        field(
          'Цвет',
          colorPicker(color, (c) => (color = c)),
        ),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, 'Отмена'),
          h('button', { class: 'btn btn-primary', onclick: save }, plan ? 'Сохранить' : 'Создать план'),
        ),
      );
    },
  });
}

async function deletePlan(plan) {
  const n = state.data.tasks.filter((t) => t.planId === plan.id).length;
  const ok = await confirmDialog(
    `Удалить план «${plan.title}»?${n ? ` Его задачи (${n}) останутся, но без плана.` : ''}`,
  );
  if (!ok) return;
  filter = 'active';
  update((d) => {
    d.plans = d.plans.filter((p) => p.id !== plan.id);
    d.tasks.forEach((t) => {
      if (t.planId === plan.id) t.planId = null;
    });
  });
}

export function renderTasks(root, params = {}) {
  if (params.filter) filter = params.filter;
  const plan = filter.startsWith('plan:') ? planById(filter.slice(5)) : null;
  if (filter.startsWith('plan:') && !plan) filter = 'active';

  const side = h(
    'div',
    { class: 'tasks-side card' },
    h(
      'div',
      { class: 'side-group' },
      FILTERS.map((f) =>
        h(
          'button',
          {
            class: `side-item${filter === f.id ? ' active' : ''}`,
            onclick: () => ((filter = f.id), renderTasks(root)),
          },
          icon(f.icon, 16),
          h('span', {}, f.label),
          h('span', { class: 'count' }, count(f.id)),
        ),
      ),
    ),
    h(
      'div',
      { class: 'side-title' },
      h('span', {}, 'Планы'),
      h('button', { class: 'icon-btn small', title: 'Новый план', onclick: () => editPlan() }, icon('plus', 16)),
    ),
    h(
      'div',
      { class: 'side-group' },
      state.data.plans.length
        ? state.data.plans.map((p) => {
            const pr = planProgress(p.id);
            return h(
              'button',
              {
                class: `side-item plan-item${filter === `plan:${p.id}` ? ' active' : ''}`,
                onclick: () => ((filter = `plan:${p.id}`), renderTasks(root)),
              },
              h('span', { class: `dot c-${p.color}` }),
              h('span', { class: 'ellipsis' }, p.title),
              h('span', { class: 'count' }, `${pr.pct}%`),
            );
          })
        : h('div', { class: 'muted small pad' }, 'Планы помогают разбить большую цель на шаги.'),
    ),
  );

  const today = todayKey();
  const quick = h('input', {
    class: 'input',
    placeholder: plan ? `Новый шаг для «${plan.title}»… (Enter)` : 'Добавить задачу… (Enter)',
    onkeydown: (e) => {
      if (e.key !== 'Enter' || !e.target.value.trim()) return;
      const title = e.target.value.trim();
      update((d) =>
        d.tasks.push({
          id: uid(),
          title,
          notes: '',
          priority: 'normal',
          done: false,
          doneAt: null,
          createdAt: Date.now(),
          due: filter === 'today' ? today : null,
          planId: plan ? plan.id : null,
        }),
      );
      root.querySelector('.quick-add input')?.focus();
    },
  });

  const list = sortTasks(filtered());
  const headTitle = plan ? plan.title : FILTERS.find((f) => f.id === filter)?.label;
  let planHeader = null;
  if (plan) {
    const pr = planProgress(plan.id);
    planHeader = h(
      'div',
      { class: `card plan-header c-${plan.color}` },
      h(
        'div',
        { class: 'plan-header-top' },
        h(
          'div',
          {},
          plan.description ? h('div', {}, plan.description) : h('div', { class: 'muted' }, 'Без описания'),
          plan.deadline
            ? h('div', { class: 'muted small' }, icon('target', 13), ` Дедлайн: ${humanDate(plan.deadline)}`)
            : null,
        ),
        h(
          'div',
          { class: 'row-actions visible' },
          h('button', { class: 'icon-btn', title: 'Изменить план', onclick: () => editPlan(plan) }, icon('edit', 16)),
          h('button', { class: 'icon-btn', title: 'Удалить план', onclick: () => deletePlan(plan) }, icon('trash', 16)),
        ),
      ),
      h(
        'div',
        { class: 'plan-progress-row' },
        progressBar(pr.pct, plan.color),
        h('span', { class: 'small' }, `${pr.done} из ${pr.total} · ${pr.pct}%`),
      ),
    );
  }

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Планы и задачи'), h('div', { class: 'muted' }, 'Большие цели — маленькими шагами')),
      h(
        'div',
        { class: 'head-actions' },
        h('button', { class: 'btn btn-soft', onclick: () => editPlan() }, icon('target', 16), 'Новый план'),
        h('button', { class: 'btn btn-primary', onclick: () => editTask() }, icon('plus', 16), 'Задача'),
      ),
    ),
    h(
      'div',
      { class: 'tasks-layout' },
      side,
      h(
        'div',
        { class: 'tasks-main' },
        h('h2', { class: 'section-title' }, headTitle),
        planHeader,
        filter !== 'done' ? h('div', { class: 'card quick-add' }, icon('plus', 16), quick) : null,
        h(
          'div',
          { class: 'card task-list-card' },
          list.length
            ? list.map((t) => taskRow(t, { onEdit: editTask, onDelete: deleteTask, showPlan: !plan }))
            : emptyState(
                filter === 'done' ? 'Пока ничего не выполнено' : 'Задач нет',
                filter === 'done' ? 'Отмечай задачи — они появятся здесь.' : 'Добавь первую задачу выше.',
              ),
        ),
      ),
    ),
  );
}
