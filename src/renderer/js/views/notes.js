import { h, icon, confirmDialog, colorPicker, emptyState, toast } from '../ui.js';
import { state, update, uid } from '../state.js';
import { relativeTime } from '../dates.js';
import { t } from '../i18n.js';

let selectedId = null;
let query = '';

function sortedNotes() {
  const q = query.trim().toLowerCase();
  return state.data.notes
    .filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
}

export function createNote(fields = {}) {
  const note = {
    id: uid(),
    title: '',
    body: '',
    color: 'cream',
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...fields,
  };
  update((d) => d.notes.push(note), { silent: true });
  return note;
}

export function renderNotes(root, params = {}) {
  if (params.noteId) selectedId = params.noteId;
  if (!state.data.notes.find((n) => n.id === selectedId)) selectedId = sortedNotes()[0]?.id || null;

  const listEl = h('div', { class: 'notes-list' });
  const editorEl = h('div', { class: 'notes-editor card' });

  const renderList = () => {
    const notes = sortedNotes();
    listEl.replaceChildren(
      ...(notes.length
        ? notes.map((n) =>
            h(
              'button',
              {
                class: `note-item c-${n.color}${n.id === selectedId ? ' active' : ''}`,
                onclick: () => {
                  selectedId = n.id;
                  renderList();
                  renderEditor();
                },
              },
              h(
                'div',
                { class: 'note-item-head' },
                h('span', { class: 'note-item-title' }, n.title || t('notes.untitled')),
                n.pinned ? icon('pin', 14) : null,
              ),
              h('div', { class: 'note-item-preview' }, n.body.slice(0, 90) || t('notes.empty')),
              h('div', { class: 'muted tiny' }, relativeTime(n.updatedAt)),
            ),
          )
        : [h('div', { class: 'muted soft-empty' }, query ? t('common.nothingFound') : t('notes.none'))]),
    );
  };

  const renderEditor = () => {
    const note = state.data.notes.find((n) => n.id === selectedId);
    if (!note) {
      editorEl.replaceChildren(emptyState(t('notes.pick'), t('notes.pickHint')));
      return;
    }
    const touch = () => {
      note.updatedAt = Date.now();
      update(() => {}, { silent: true });
      renderList();
      saved.textContent = t('common.saved');
    };
    const saved = h('span', { class: 'muted small' }, t('notes.edited', { when: relativeTime(note.updatedAt) }));
    const title = h('input', {
      class: 'note-title-input',
      placeholder: t('common.title'),
      value: note.title,
      oninput: (e) => {
        note.title = e.target.value;
        touch();
      },
    });
    const body = h('textarea', {
      class: 'note-body-input',
      placeholder: t('notes.startWriting'),
      oninput: (e) => {
        note.body = e.target.value;
        touch();
      },
    });
    body.value = note.body;
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        body.focus();
      }
    });

    editorEl.className = `notes-editor card c-${note.color}`;
    editorEl.replaceChildren(
      h(
        'div',
        { class: 'note-toolbar' },
        colorPicker(note.color, (c) => {
          note.color = c;
          editorEl.className = `notes-editor card c-${c}`;
          touch();
        }),
        h('div', { class: 'spacer' }),
        saved,
        h(
          'button',
          {
            class: `icon-btn${note.pinned ? ' active' : ''}`,
            title: note.pinned ? t('notes.unpin') : t('notes.pin'),
            onclick: (e) => {
              note.pinned = !note.pinned;
              e.currentTarget.classList.toggle('active', note.pinned);
              touch();
            },
          },
          icon('pin', 16),
        ),
        h(
          'button',
          {
            class: 'icon-btn',
            title: t('common.delete'),
            onclick: async () => {
              if (await confirmDialog(t('notes.delete', { title: note.title || t('notes.untitled') }))) {
                update((d) => (d.notes = d.notes.filter((n) => n.id !== note.id)), { silent: true });
                selectedId = sortedNotes()[0]?.id || null;
                renderList();
                renderEditor();
                toast(t('common.deleted'));
              }
            },
          },
          icon('trash', 16),
        ),
      ),
      title,
      body,
      h(
        'div',
        { class: 'muted tiny right' },
        t('notes.words', { n: note.body.trim() ? note.body.trim().split(/\s+/).length : 0 }),
      ),
    );
    body.addEventListener('input', () => {
      editorEl.lastChild.textContent = t('notes.words', {
        n: note.body.trim() ? note.body.trim().split(/\s+/).length : 0,
      });
    });
    if (!note.title && !note.body) title.focus();
  };

  const search = h(
    'div',
    { class: 'search' },
    icon('search', 16),
    h('input', {
      placeholder: t('notes.search'),
      value: query,
      oninput: (e) => {
        query = e.target.value;
        renderList();
      },
    }),
  );

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, t('nav.notes')), h('div', { class: 'muted' }, t('notes.subtitle'))),
      h(
        'button',
        {
          class: 'btn btn-primary',
          onclick: () => {
            query = '';
            selectedId = createNote().id;
            renderNotes(root);
          },
        },
        icon('plus', 16),
        t('notes.new'),
      ),
    ),
    h('div', { class: 'notes-layout' }, h('div', { class: 'notes-side card' }, search, listEl), editorEl),
  );
  renderList();
  renderEditor();
}
