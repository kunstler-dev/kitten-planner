// "Launch: legal" and "Launch: commercial" — ordered roadmaps with per-step progress.
import { h, icon, modal, field, confirmDialog, toast, segmented } from '../ui.js';
import { update, uid } from '../state.js';
import { t, tx, getLang } from '../i18n.js';
import { humanDate } from '../dates.js';
import { ROADMAPS, steps, stepState, progress } from '../launch-model.js';
import { progressBar } from './common.js';

const expanded = { legal: new Set(), commercial: new Set() };
const filters = { legal: 'all', commercial: 'all' };
const STATUSES = ['todo', 'doing', 'done'];

function setStep(kind, id, patch, opts) {
  update((d) => {
    const cur = d.launch[kind][id] || { status: 'todo', note: '', due: null, checks: [] };
    d.launch[kind][id] = { ...cur, ...patch };
  }, opts);
}

function editCustomStep(kind, step) {
  const phases = ROADMAPS[kind].phases;
  return modal({
    title: step ? t('launch.editStep') : t('launch.addStep'),
    build: (close) => {
      const title = h('input', { class: 'input', value: step?.title || '' });
      const desc = h('textarea', { class: 'input', rows: 4 });
      desc.value = step?.desc || '';
      const phase = h(
        'select',
        { class: 'input' },
        phases.map((p) => h('option', { value: p.id, selected: p.id === (step?.phase || phases[0].id) }, tx(p.title))),
      );
      const save = () => {
        if (!title.value.trim()) return title.focus();
        const fields = { title: title.value.trim(), desc: desc.value.trim(), phase: phase.value };
        update((d) => {
          if (step)
            Object.assign(
              d.launch.custom.find((c) => c.id === step.id),
              fields,
            );
          else d.launch.custom.push({ id: uid(), kind, ...fields });
        });
        close(true);
      };
      return h(
        'div',
        { class: 'modal-body' },
        field(t('common.title'), title),
        field(t('common.description'), desc),
        field(t('launch.phase'), phase),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, t('common.cancel')),
          h('button', { class: 'btn btn-primary', onclick: save }, t('common.save')),
        ),
      );
    },
  });
}

function stepCard(kind, step, index, isNext, root) {
  const st = stepState(kind, step.id);
  const open = expanded[kind].has(step.id);
  const todo = step.custom ? [] : step.todo?.[getLang()] || step.todo?.uk || [];
  const toggle = () => {
    if (open) expanded[kind].delete(step.id);
    else expanded[kind].add(step.id);
    renderLaunch(root, { kind });
  };

  const body = open
    ? h(
        'div',
        { class: 'step-body' },
        h('p', { class: 'step-desc' }, step.custom ? step.desc : tx(step.desc)),
        todo.length
          ? h(
              'div',
              { class: 'step-checks' },
              todo.map((label, i) =>
                h(
                  'label',
                  { class: 'step-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: st.checks?.includes(i),
                    onchange: (e) => {
                      const checks = new Set(st.checks || []);
                      if (e.target.checked) checks.add(i);
                      else checks.delete(i);
                      setStep(kind, step.id, { checks: [...checks] });
                    },
                  }),
                  h('span', {}, label),
                ),
              ),
            )
          : null,
        step.links?.length
          ? h(
              'div',
              { class: 'step-links' },
              step.links.map((l) =>
                h('a', { class: 'chip chip-link', href: l.url, target: '_blank' }, icon('link', 12), l.label),
              ),
            )
          : null,
        h(
          'div',
          { class: 'step-meta-row' },
          field(
            t('launch.due'),
            h('input', {
              class: 'input',
              type: 'date',
              value: st.due || '',
              onchange: (e) => setStep(kind, step.id, { due: e.target.value || null }),
            }),
          ),
          h(
            'button',
            {
              class: 'btn btn-soft small',
              onclick: () => {
                update((d) =>
                  d.tasks.push({
                    id: uid(),
                    title: step.custom ? step.title : tx(step.title),
                    notes: '',
                    due: st.due || null,
                    priority: 'normal',
                    planId: null,
                    done: false,
                    doneAt: null,
                    createdAt: Date.now(),
                  }),
                );
                toast(t('launch.taskCreated'), 'success');
              },
            },
            icon('tasks', 15),
            t('launch.toTask'),
          ),
          step.custom
            ? h(
                'div',
                { class: 'row-actions visible' },
                h(
                  'button',
                  { class: 'icon-btn', title: t('common.edit'), onclick: () => editCustomStep(kind, step) },
                  icon('edit', 16),
                ),
                h(
                  'button',
                  {
                    class: 'icon-btn',
                    title: t('common.delete'),
                    onclick: async () => {
                      if (await confirmDialog(t('launch.deleteStep', { title: step.title }))) {
                        update((d) => {
                          d.launch.custom = d.launch.custom.filter((c) => c.id !== step.id);
                          delete d.launch[kind][step.id];
                        });
                      }
                    },
                  },
                  icon('trash', 16),
                ),
              )
            : null,
        ),
        field(
          t('launch.note'),
          (() => {
            const ta = h('textarea', {
              class: 'input',
              rows: 2,
              placeholder: t('launch.notePlaceholder'),
              oninput: (e) => setStep(kind, step.id, { note: e.target.value }, { silent: true }),
            });
            ta.value = st.note || '';
            return ta;
          })(),
        ),
      )
    : null;

  return h(
    'div',
    {
      class: `card step status-${st.status}${isNext ? ' next' : ''}${open ? ' open' : ''}`,
      dataset: { step: step.id },
    },
    h(
      'div',
      { class: 'step-head' },
      h('div', { class: 'step-num' }, st.status === 'done' ? icon('check', 16) : index + 1),
      h(
        'button',
        { class: 'step-title-btn', onclick: toggle },
        h('div', { class: 'step-title' }, step.custom ? step.title : tx(step.title)),
        h(
          'div',
          { class: 'step-sub' },
          isNext ? h('span', { class: 'chip chip-next' }, icon('sparkle', 12), t('launch.next')) : null,
          step.optional ? h('span', { class: 'chip' }, t('launch.optional')) : null,
          step.custom ? h('span', { class: 'chip' }, t('launch.custom')) : null,
          step.time ? h('span', { class: 'chip' }, icon('clock', 12), tx(step.time)) : null,
          st.due ? h('span', { class: 'chip' }, icon('calendar', 12), humanDate(st.due)) : null,
          st.note ? h('span', { class: 'chip' }, icon('note', 12)) : null,
        ),
      ),
      segmented(
        STATUSES.map((s) => ({ value: s, label: t(`launch.status.${s}`) })),
        st.status,
        (status) => setStep(kind, step.id, { status }),
      ),
      h(
        'button',
        { class: `icon-btn chevron${open ? ' up' : ''}`, title: t('common.details'), onclick: toggle },
        icon('chevronRight', 18),
      ),
    ),
    body,
  );
}

export function renderLaunch(root, params = {}) {
  const kind = params.kind;
  const list = steps(kind);
  const pr = progress(kind);
  const nextId = list.find((s) => !s.optional && stepState(kind, s.id).status !== 'done')?.id;
  if (params.stepId) expanded[kind].add(params.stepId);
  else if (nextId && !expanded[kind].size) expanded[kind].add(nextId);

  const filter = filters[kind];
  let index = 0;
  const phases = ROADMAPS[kind].phases.map((phase) => {
    const phaseSteps = list.filter((s) => s.phase === phase.id);
    const cards = [];
    for (const s of phaseSteps) {
      const i = index++;
      const status = stepState(kind, s.id).status;
      if (filter === 'open' && status === 'done') continue;
      if (filter === 'done' && status !== 'done') continue;
      cards.push(stepCard(kind, s, i, s.id === nextId, root));
    }
    const done = phaseSteps.filter((s) => stepState(kind, s.id).status === 'done').length;
    if (!cards.length) return null;
    return h(
      'section',
      { class: 'phase' },
      h(
        'div',
        { class: 'phase-head' },
        h('h2', {}, tx(phase.title)),
        h('span', { class: 'muted small' }, `${done}/${phaseSteps.length}`),
      ),
      h('div', { class: 'phase-steps' }, cards),
    );
  });

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, t(`nav.${kind}`)), h('div', { class: 'muted' }, t(`launch.${kind}.subtitle`))),
      h(
        'button',
        { class: 'btn btn-primary', onclick: () => editCustomStep(kind) },
        icon('plus', 16),
        t('launch.addStep'),
      ),
    ),
    h(
      'div',
      { class: `card launch-summary c-${kind === 'legal' ? 'lavender' : 'powder'}` },
      h('div', { class: 'launch-summary-icon' }, icon(kind === 'legal' ? 'scale' : 'store', 26)),
      h(
        'div',
        { class: 'launch-summary-main' },
        h('div', { class: 'launch-summary-title' }, t('launch.progress', { done: pr.done, total: pr.total })),
        progressBar(pr.pct, kind === 'legal' ? 'lavender' : 'powder'),
        h('div', { class: 'muted small' }, t(`launch.${kind}.hint`)),
      ),
      segmented(
        ['all', 'open', 'done'].map((v) => ({ value: v, label: t(`launch.filter.${v}`) })),
        filter,
        (v) => {
          filters[kind] = v;
          renderLaunch(root, { kind });
        },
      ),
    ),
    kind === 'legal' ? h('div', { class: 'disclaimer' }, icon('lock', 14), t('launch.disclaimer')) : null,
    h('div', { class: 'phases' }, phases),
  );

  if (params.stepId) {
    root.querySelector(`[data-step="${params.stepId}"]`)?.scrollIntoView({ block: 'center' });
  }
}
