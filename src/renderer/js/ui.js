// Small DOM toolkit: element builder, icons, modals, toasts.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/>',
  tasks: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
  pin: '<path d="M9 4h6l-1 5 3 3H7l3-3z"/><path d="M12 12v8"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  folder: '<path d="M3.5 6.5h6l2 2h9v10h-17z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l2 2M14 9l2 2"/>',
  paw: '<circle cx="7" cy="10" r="1.8"/><circle cx="10.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12.5 11c-3 0-5.5 4-5.5 6 0 1.5 1.2 2.5 2.8 2.5 1 0 1.7-.5 2.7-.5s1.7.5 2.7.5c1.6 0 2.8-1 2.8-2.5 0-2-2.5-6-5.5-6z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
};

export function icon(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return span;
}

export function toast(message, kind = 'info') {
  let host = document.getElementById('toasts');
  const el = h('div', { class: `toast toast-${kind}` }, message);
  host.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

/**
 * Opens a modal. `build(close)` returns the body node.
 * Resolves with whatever close(value) is called with.
 */
export function modal({ title, build, width = 460 }) {
  return new Promise((resolve) => {
    const backdrop = h('div', { class: 'modal-backdrop' });
    const close = (value) => {
      backdrop.classList.remove('show');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => backdrop.remove(), 200);
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(undefined);
    };
    const box = h(
      'div',
      { class: 'modal card', style: { width: `${width}px` }, role: 'dialog' },
      h(
        'div',
        { class: 'modal-head' },
        h('h3', {}, title),
        h('button', { class: 'icon-btn', title: 'Закрыть', onclick: () => close(undefined) }, icon('close')),
      ),
      build(close),
    );
    backdrop.append(box);
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) close(undefined);
    });
    document.addEventListener('keydown', onKey);
    document.body.append(backdrop);
    requestAnimationFrame(() => {
      backdrop.classList.add('show');
      box.querySelector('input, textarea, select')?.focus();
    });
  });
}

export function confirmDialog(text, { okText = 'Удалить', danger = true } = {}) {
  return modal({
    title: 'Подтвердите',
    width: 380,
    build: (close) =>
      h(
        'div',
        { class: 'modal-body' },
        h('p', { class: 'muted' }, text),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, 'Отмена'),
          h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onclick: () => close(true) }, okText),
        ),
      ),
  });
}

/** Labeled form field wrapper. */
export function field(label, control) {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control);
}

export const COLORS = [
  { id: 'lavender', name: 'Лаванда' },
  { id: 'powder', name: 'Пудра' },
  { id: 'peach', name: 'Персик' },
  { id: 'mint', name: 'Мята' },
  { id: 'sky', name: 'Небо' },
  { id: 'cream', name: 'Крем' },
];

export function colorPicker(value, onChange) {
  const wrap = h('div', { class: 'color-picker' });
  const render = () => {
    wrap.replaceChildren(
      ...COLORS.map((c) =>
        h('button', {
          type: 'button',
          class: `swatch c-${c.id}${c.id === value ? ' active' : ''}`,
          title: c.name,
          onclick: () => {
            value = c.id;
            onChange(c.id);
            render();
          },
        }),
      ),
    );
  };
  render();
  return wrap;
}

export function emptyState(text, sub) {
  return h(
    'div',
    { class: 'empty' },
    h('div', { class: 'empty-paw' }, icon('paw', 34)),
    h('div', { class: 'empty-title' }, text),
    sub ? h('div', { class: 'muted small' }, sub) : null,
  );
}
