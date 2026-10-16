// window.api for the phone/web version (GitHub Pages, installed to the iPhone home screen).
// Mirrors the Electron preload bridge: data and attachments live in IndexedDB, the OpenAI key in
// localStorage, files are "saved" through downloads / the share sheet, PDFs through printing.
import { idb } from './idb.js';
import { streamChat, testKey } from './openai-web.js';
import { webCloud, handleOAuthRedirect } from './google-web.js';
import { defaultData, normalize } from '../schema.js';

const KEY_STORAGE = 'kp-openai-key';
const events = { delta: new Set(), done: new Set(), error: new Set() };
const emit = (name, payload) => events[name].forEach((cb) => cb(payload));
const on = (name) => (cb) => {
  events[name].add(cb);
  return () => events[name].delete(cb);
};
const chats = new Map();
let artIndex = null;

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Opens the system file picker; resolves with the chosen File objects (empty when cancelled). */
function pickFiles({ accept = '', multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve([...(input.files || [])]);
      input.remove();
    });
    input.addEventListener('cancel', () => {
      resolve([]);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

function openBlob(blob) {
  const url = URL.createObjectURL(blob);
  if (!window.open(url, '_blank')) location.assign(url);
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}

const randomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, '0')).join('');

const api = {
  platform: 'web',

  async loadData() {
    navigator.storage?.persist?.().catch(() => {});
    const saved = await idb.get('kv', 'data');
    return saved ? normalize(saved) : defaultData();
  },
  async saveData(data) {
    await idb.set('kv', 'data', normalize(JSON.parse(JSON.stringify(data))));
    return true;
  },
  async exportData({ data }) {
    const json = JSON.stringify(normalize(data), null, 2);
    download(
      new Blob([json], { type: 'application/json' }),
      `kitten-planner-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
    return true;
  },
  async importData() {
    const [file] = await pickFiles({ accept: 'application/json,.json' });
    if (!file) return null;
    const data = normalize(JSON.parse(await file.text()));
    await api.saveData(data);
    return data;
  },

  async keyStatus() {
    const key = localStorage.getItem(KEY_STORAGE) || '';
    return { hasKey: Boolean(key), masked: key ? `${key.slice(0, 3)}…${key.slice(-4)}` : '', encrypted: false };
  },
  async setKey(key) {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
    return true;
  },
  async testKey(key) {
    try {
      await testKey(key || localStorage.getItem(KEY_STORAGE));
      return { ok: true };
    } catch (err) {
      return { ok: false, code: err.code || 'network', detail: err.detail || '' };
    }
  },

  async startChat({ id, model, messages }) {
    const controller = new AbortController();
    chats.set(id, controller);
    try {
      const text = await streamChat({
        apiKey: localStorage.getItem(KEY_STORAGE),
        model,
        messages,
        signal: controller.signal,
        onDelta: (delta) => emit('delta', { id, delta }),
      });
      emit('done', { id, text });
    } catch (err) {
      if (err.name === 'AbortError') emit('done', { id, aborted: true });
      else emit('error', { id, code: err.code || 'network', detail: err.detail || '' });
    } finally {
      chats.delete(id);
    }
    return true;
  },
  async abortChat(id) {
    chats.get(id)?.abort();
    return true;
  },
  onChatDelta: on('delta'),
  onChatDone: on('done'),
  onChatError: on('error'),

  async saveText({ content, defaultPath, ext }) {
    const bom = ext === 'csv' ? '﻿' : '';
    download(new Blob([bom + content], { type: ext === 'csv' ? 'text/csv' : 'text/plain' }), defaultPath);
    return true;
  },
  /** Invoices: printed from a hidden frame — on iPhone the print sheet offers "Save as PDF" / share. */
  async savePdf({ html }) {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0';
    frame.srcdoc = html;
    document.body.append(frame);
    await new Promise((r) => frame.addEventListener('load', r, { once: true }));
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 60000);
    return true;
  },

  async addDocuments() {
    const files = await pickFiles({ multiple: true });
    const out = [];
    for (const file of files) {
      const stored = `${randomId()}_${file.name.replace(/[^\w.\-() ]+/g, '_')}`;
      await idb.set('docs', stored, {
        name: file.name,
        type: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      });
      out.push({ name: file.name, stored, size: file.size });
    }
    return out;
  },
  async openDocument(stored) {
    const doc = await idb.get('docs', stored);
    if (!doc) return 'missing';
    openBlob(new Blob([doc.bytes], { type: doc.type || 'application/octet-stream' }));
    return '';
  },
  showDocument: (stored) => api.openDocument(stored),
  async removeDocument(stored) {
    await idb.del('docs', stored);
    return true;
  },
  hasDocument: (stored) => idb.has('docs', stored),
  async readDocument(stored) {
    return (await idb.get('docs', stored))?.bytes || null;
  },
  async writeDocument(stored, bytes) {
    const name = stored.replace(/^[0-9a-f]+_/, '');
    await idb.set('docs', stored, { name, type: '', bytes });
    return true;
  },

  /** Painting images are published next to the app (assets/art/<id>.jpg, listed in art-index.json). */
  async artImage({ id }) {
    artIndex ||= fetch('assets/art-index.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((ids) => new Set(ids))
      .catch(() => new Set());
    const safe = String(id).replace(/[^a-z0-9-]/gi, '');
    return (await artIndex).has(safe) ? `assets/art/${safe}.jpg` : null;
  },

  async gptLogout() {
    return true;
  },
  async openExternal(url) {
    if (/^https:\/\//.test(url)) window.open(url, '_blank', 'noopener');
    return true;
  },
  async openDataFolder() {
    return true;
  },
  async appInfo() {
    return { version: document.documentElement.dataset.version || '', dataDir: '' };
  },
  async setTheme(theme) {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#1d1a22' : '#f8f5f2');
    return true;
  },

  cloud: webCloud,
  syncState: {
    load: async () => (await idb.get('kv', 'sync')) || {},
    save: (value) => idb.set('kv', 'sync', JSON.parse(JSON.stringify(value || {}))),
  },
};

export async function installWebApi() {
  window.api = api;
  document.documentElement.classList.add('is-web');
  await handleOAuthRedirect();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
