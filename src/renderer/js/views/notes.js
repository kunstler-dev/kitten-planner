import { h, icon, confirmDialog, colorPicker, emptyState, toast } from '../ui.js';
import { state, update, uid } from '../state.js';
import { relativeTime } from '../dates.js';

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
                h('span', { class: 'note-item-title' }, n.title || 'Без названия'),
                n.pinned ? icon('pin', 14) : null,
              ),
              h('div', { class: 'note-item-preview' }, n.body.slice(0, 90) || 'Пустая заметка'),
              h('div', { class: 'muted tiny' }, relativeTime(n.updatedAt)),
            ),
          )
        : [h('div', { class: 'muted soft-empty' }, query ? 'Ничего не найдено' : 'Заметок пока нет')]),
    );
  };

  const renderEditor = () => {
    const note = state.data.notes.find((n) => n.id === selectedId);
    if (!note) {
      editorEl.replaceChildren(emptyState('Выбери заметку или создай новую', 'Записывай идеи, мысли и всё важное.'));
      return;
    }
    const touch = () => {
      note.updatedAt = Date.now();
      update(() => {}, { silent: true });
      renderList();
      saved.textContent = 'Сохранено';
    };
    const saved = h('span', { class: 'muted small' }, `Изменено ${relativeTime(note.updatedAt)}`);
    const title = h('input', {
      class: 'note-title-input',
      placeholder: 'Название',
      value: note.title,
      oninput: (e) => {
        note.title = e.target.value;
        touch();
      },
    });
    const body = h('textarea', {
      class: 'note-body-input',
      placeholder: 'Начни писать…',
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
            title: note.pinned ? 'Открепить' : 'Закрепить',
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
            title: 'Удалить заметку',
            onclick: async () => {
              if (await confirmDialog(`Удалить заметку «${note.title || 'Без названия'}»?`)) {
                update((d) => (d.notes = d.notes.filter((n) => n.id !== note.id)), { silent: true });
                selectedId = sortedNotes()[0]?.id || null;
                renderList();
                renderEditor();
                toast('Заметка удалена');
              }
            },
          },
          icon('trash', 16),
        ),
      ),
      title,
      body,
      h('div', { class: 'muted tiny right' }, `${note.body.trim() ? note.body.trim().split(/\s+/).length : 0} слов`),
    );
    body.addEventListener('input', () => {
      editorEl.lastChild.textContent = `${note.body.trim() ? note.body.trim().split(/\s+/).length : 0} слов`;
    });
    if (!note.title && !note.body) title.focus();
  };

  const search = h(
    'div',
    { class: 'search' },
    icon('search', 16),
    h('input', {
      placeholder: 'Поиск по заметкам',
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
      h('div', {}, h('h1', {}, 'Заметки'), h('div', { class: 'muted' }, 'Идеи, мысли и всё, что важно не забыть')),
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
        'Новая заметка',
      ),
    ),
    h('div', { class: 'notes-layout' }, h('div', { class: 'notes-side card' }, search, listEl), editorEl),
  );
  renderList();
  renderEditor();
}
