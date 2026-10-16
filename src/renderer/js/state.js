// Central app state: loaded once from disk, saved (debounced) on every change.

const listeners = new Set();
const saveListeners = new Set();
let saveTimer = null;

export const state = {
  data: null,
};

export async function initState() {
  state.data = await window.api.loadData();
  return state.data;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Mutate data via fn, then notify views and schedule a save. */
export function update(fn, { silent = false } = {}) {
  fn(state.data);
  scheduleSave();
  if (!silent) listeners.forEach((cb) => cb(state.data));
}

export function replaceData(data) {
  state.data = data;
  listeners.forEach((cb) => cb(state.data));
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 350);
}

export async function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!state.data) return;
  await window.api.saveData(state.data);
  saveListeners.forEach((cb) => cb());
}

/** Called after every save to disk (cloud sync uses it to push local changes). */
export function onSaved(cb) {
  saveListeners.add(cb);
  return () => saveListeners.delete(cb);
}

window.addEventListener('beforeunload', () => {
  if (saveTimer) flushSave();
});
