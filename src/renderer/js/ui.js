// Small DOM toolkit: element builder, icons, modals, toasts.
import { t } from './i18n.js';

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
  scale: '<path d="M12 4v16M7 20h10M5 7h14M12 4l-1 3M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
  store:
    '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5 11.5V20h14v-8.5M10 20v-5h4v5"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M9 7h6"/>',
  wallet:
    '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2.5"/><circle cx="16" cy="13.5" r="1.2"/>',
  docs: '<path d="M8 3h8l4 4v11H8z"/><path d="M16 3v4h4"/><path d="M4 7v14h12"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.1 4.7 4.7 0 0 0 7 18.5z"/>',
  cloudOk:
    '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.1 4.7 4.7 0 0 0 7 18.5z"/><path d="m9.5 13.5 2 2 3.5-3.5"/>',
  cloudOff:
    '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.1 4.7 4.7 0 0 0 7 18.5z"/><path d="m4 4 16 16"/>',
  cloudSync:
    '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.1 4.7 4.7 0 0 0 7 18.5z"/><path d="M9.5 13a2.5 2.5 0 0 1 4.6-1.3M14.5 14a2.5 2.5 0 0 1-4.6 1.3"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  volumeOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 10 4 4M20 10l-4 4"/>',
  palette:
    '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-1 .8-1.7 1.9-1.7h2a3.8 3.8 0 0 0 3.8-3.8C20.5 6.7 16.7 3.5 12 3.5z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10" cy="7.3" r="1.1"/><circle cx="14.5" cy="7.3" r="1.1"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zM12 9c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  invoice: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
};

export function icon(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return span;
}

export function toast(message, kind = 'info') {
  const host = document.getElementById('toasts');
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
        h('button', { class: 'icon-btn', title: t('common.close'), onclick: () => close(undefined) }, icon('close')),
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

export function confirmDialog(text, { okText, danger = true } = {}) {
  okText = okText || t('common.delete');
  return modal({
    title: t('common.confirmTitle'),
    width: 380,
    build: (close) =>
      h(
        'div',
        { class: 'modal-body' },
        h('p', { class: 'muted' }, text),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, t('common.cancel')),
          h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onclick: () => close(true) }, okText),
        ),
      ),
  });
}

/** Labeled form field wrapper. */
export function field(label, control) {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control);
}

export const COLORS = ['lavender', 'powder', 'peach', 'mint', 'sky', 'cream'];

export function colorPicker(value, onChange) {
  const wrap = h('div', { class: 'color-picker' });
  const render = () => {
    wrap.replaceChildren(
      ...COLORS.map((c) =>
        h('button', {
          type: 'button',
          class: `swatch c-${c}${c === value ? ' active' : ''}`,
          title: t(`color.${c}`),
          onclick: () => {
            value = c;
            onChange(c);
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

/** Button row of mutually exclusive options. */
export function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'segmented' });
  const render = () =>
    wrap.replaceChildren(
      ...options.map((o) =>
        h(
          'button',
          {
            type: 'button',
            class: o.value === value ? 'active' : '',
            onclick: () => {
              value = o.value;
              onChange(o.value);
              render();
            },
          },
          o.label,
        ),
      ),
    );
  render();
  return wrap;
}

export function select(options, value, onChange, attrs = {}) {
  return h(
    'select',
    { class: 'input', ...attrs, onchange: (e) => onChange(e.target.value) },
    options.map((o) => h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)),
  );
}

export function numberInput(value, onChange, attrs = {}) {
  return h('input', {
    class: 'input',
    type: 'number',
    value,
    ...attrs,
    // commit on change (blur/Enter) so re-renders don't steal focus while typing
    onchange: (e) => onChange(e.target.value === '' ? 0 : Number(e.target.value)),
  });
}
