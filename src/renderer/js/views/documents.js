// Documents: local archive of business paperwork (files are copied into the app's data folder)
// with categories, search and deadline reminders.
import { h, icon, modal, field, confirmDialog, toast, select, emptyState } from '../ui.js';
import { state, update, uid } from '../state.js';
import { t } from '../i18n.js';
import { numericDate, todayKey, addDays, humanDate } from '../dates.js';

export const DOC_CATEGORIES = [
  'registration',
  'tax',
  'contracts',
  'insurance',
  'bank',
  'receipts',
  'suppliers',
  'other',
];
let category = 'all';
let query = '';

function sizeLabel(bytes) {
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

async function editDocument(doc) {
  const draft = doc
    ? structuredClone(doc)
    : {
        title: '',
        category: category === 'all' ? 'registration' : category,
        date: todayKey(),
        deadline: '',
        note: '',
        files: [],
      };
  const added = [];
  const result = await modal({
    title: doc ? t('docs.edit') : t('docs.add'),
    width: 560,
    build: (close) => {
      const title = h('input', { class: 'input', value: draft.title, placeholder: t('docs.titlePlaceholder') });
      const date = h('input', { class: 'input', type: 'date', value: draft.date || '' });
      const deadline = h('input', { class: 'input', type: 'date', value: draft.deadline || '' });
      const note = h('textarea', { class: 'input', rows: 3 });
      note.value = draft.note || '';
      const filesBox = h('div', { class: 'doc-files' });
      const renderFiles = () =>
        filesBox.replaceChildren(
          ...draft.files.map((f, i) =>
            h(
              'div',
              { class: 'doc-file' },
              icon('docs', 15),
              h('span', { class: 'ellipsis' }, f.name),
              h('span', { class: 'muted tiny' }, sizeLabel(f.size)),
              h(
                'button',
                {
                  class: 'icon-btn small',
                  title: t('common.delete'),
                  onclick: () => (draft.files.splice(i, 1), renderFiles()),
                },
                icon('close', 13),
              ),
            ),
          ),
          h(
            'button',
            {
              class: 'btn btn-soft small',
              onclick: async () => {
                const files = await window.api.addDocuments({ title: t('docs.pickFiles') });
                added.push(...files);
                draft.files.push(...files);
                if (!title.value && files[0]) title.value = files[0].name.replace(/\.[^.]+$/, '');
                renderFiles();
              },
            },
            icon('plus', 14),
            t('docs.attach'),
          ),
        );
      renderFiles();
      let cat = draft.category;
      const finish = async (saved) => {
        // Clean up copied files that are no longer referenced.
        const keep = new Set(saved ? draft.files.map((f) => f.stored) : (doc?.files || []).map((f) => f.stored));
        const removed = [...added, ...(saved ? doc?.files || [] : [])].filter((f) => !keep.has(f.stored));
        for (const f of removed) await window.api.removeDocument(f.stored);
      };
      const save = async () => {
        if (!title.value.trim()) return title.focus();
        const fields = {
          title: title.value.trim(),
          category: cat,
          date: date.value || null,
          deadline: deadline.value || null,
          note: note.value.trim(),
          files: draft.files,
        };
        await finish(true);
        update((d) => {
          if (doc)
            Object.assign(
              d.documents.find((x) => x.id === doc.id),
              fields,
            );
          else d.documents.push({ id: uid(), createdAt: Date.now(), ...fields });
        });
        close(true);
      };
      return h(
        'div',
        { class: 'modal-body' },
        field(t('common.title'), title),
        h(
          'div',
          { class: 'field-row three' },
          field(
            t('docs.category'),
            select(
              DOC_CATEGORIES.map((c) => ({ value: c, label: t(`docs.cat.${c}`) })),
              cat,
              (v) => (cat = v),
            ),
          ),
          field(t('docs.date'), date),
          field(t('docs.deadline'), deadline),
        ),
        field(t('docs.files'), filesBox),
        field(t('launch.note'), note),
        h(
          'div',
          { class: 'modal-actions' },
          h(
            'button',
            { class: 'btn btn-ghost', onclick: async () => (await finish(false), close(false)) },
            t('common.cancel'),
          ),
          h('button', { class: 'btn btn-primary', onclick: save }, t('common.save')),
        ),
      );
    },
  });
  // Closed with Esc / backdrop: drop files copied during this dialog.
  if (result === undefined) for (const f of added) await window.api.removeDocument(f.stored);
}

export function renderDocuments(root) {
  const today = todayKey();
  const q = query.trim().toLowerCase();
  const list = state.data.documents
    .filter((d) => category === 'all' || d.category === category)
    .filter(
      (d) =>
        !q ||
        d.title.toLowerCase().includes(q) ||
        (d.note || '').toLowerCase().includes(q) ||
        d.files.some((f) => f.name.toLowerCase().includes(q)),
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  const counts = Object.fromEntries(
    DOC_CATEGORIES.map((c) => [c, state.data.documents.filter((d) => d.category === c).length]),
  );
  const soon = state.data.documents
    .filter((d) => d.deadline && d.deadline <= addDays(today, 30))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const side = h(
    'div',
    { class: 'tasks-side card' },
    h(
      'button',
      {
        class: `side-item${category === 'all' ? ' active' : ''}`,
        onclick: () => ((category = 'all'), renderDocuments(root)),
      },
      icon('docs', 16),
      h('span', {}, t('common.all')),
      h('span', { class: 'count' }, state.data.documents.length),
    ),
    DOC_CATEGORIES.map((c) =>
      h(
        'button',
        {
          class: `side-item${category === c ? ' active' : ''}`,
          onclick: () => ((category = c), renderDocuments(root)),
        },
        icon('folder', 16),
        h('span', {}, t(`docs.cat.${c}`)),
        h('span', { class: 'count' }, counts[c]),
      ),
    ),
  );

  const rows = list.map((d) =>
    h(
      'div',
      { class: 'card doc-card' },
      h('div', { class: 'doc-icon' }, icon('docs', 22)),
      h(
        'div',
        { class: 'doc-main' },
        h('div', { class: 'doc-title' }, d.title),
        h(
          'div',
          { class: 'task-meta' },
          h('span', { class: 'chip' }, t(`docs.cat.${d.category}`)),
          d.date ? h('span', { class: 'chip' }, icon('calendar', 11), numericDate(d.date)) : null,
          d.deadline
            ? h(
                'span',
                {
                  class: `chip ${d.deadline < today ? 'chip-danger' : d.deadline <= addDays(today, 14) ? 'chip-warn' : ''}`,
                },
                icon('clock', 11),
                `${t('docs.deadline')}: ${humanDate(d.deadline)}`,
              )
            : null,
        ),
        d.note ? h('div', { class: 'muted small' }, d.note) : null,
        d.files.length
          ? h(
              'div',
              { class: 'doc-file-links' },
              d.files.map((f) =>
                h(
                  'button',
                  {
                    class: 'chip chip-link',
                    title: t('docs.openFile'),
                    onclick: async () => {
                      const err = await window.api.openDocument(f.stored);
                      if (err) toast(t('docs.openError'), 'error');
                    },
                  },
                  icon('eye', 12),
                  f.name,
                ),
              ),
            )
          : null,
      ),
      h(
        'div',
        { class: 'row-actions visible' },
        d.files[0]
          ? h(
              'button',
              {
                class: 'icon-btn',
                title: t('docs.showInFolder'),
                onclick: () => window.api.showDocument(d.files[0].stored),
              },
              icon('folder', 16),
            )
          : null,
        h('button', { class: 'icon-btn', title: t('common.edit'), onclick: () => editDocument(d) }, icon('edit', 16)),
        h(
          'button',
          {
            class: 'icon-btn',
            title: t('common.delete'),
            onclick: async () => {
              if (!(await confirmDialog(t('docs.delete', { title: d.title })))) return;
              for (const f of d.files) await window.api.removeDocument(f.stored);
              update((x) => (x.documents = x.documents.filter((y) => y.id !== d.id)));
            },
          },
          icon('trash', 16),
        ),
      ),
    ),
  );

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, t('nav.documents')), h('div', { class: 'muted' }, t('docs.subtitle'))),
      h('button', { class: 'btn btn-primary', onclick: () => editDocument() }, icon('plus', 16), t('docs.add')),
    ),
    h(
      'div',
      { class: 'tasks-layout' },
      side,
      h(
        'div',
        { class: 'tasks-main' },
        soon.length
          ? h(
              'div',
              { class: 'card deadline-banner' },
              icon('clock', 18),
              h(
                'div',
                {},
                h('b', {}, t('docs.upcomingDeadlines')),
                h('div', { class: 'small' }, soon.map((d) => `${d.title} — ${humanDate(d.deadline)}`).join(' · ')),
              ),
            )
          : null,
        h(
          'div',
          { class: 'search card-search' },
          icon('search', 16),
          h('input', {
            placeholder: t('docs.search'),
            value: query,
            oninput: (e) => {
              query = e.target.value;
              renderDocuments(root);
              const el = root.querySelector('.card-search input');
              el?.focus();
              el?.setSelectionRange(query.length, query.length);
            },
          }),
        ),
        rows.length
          ? h('div', { class: 'doc-list' }, rows)
          : h('div', { class: 'card' }, emptyState(t('docs.none'), t('docs.noneHint'))),
        h('div', { class: 'muted tiny' }, t('docs.storageHint')),
      ),
    ),
  );
}
