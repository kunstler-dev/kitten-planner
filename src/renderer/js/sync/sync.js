// Cloud sync between the desktop app and the phone through the user's own Google Drive
// (hidden app folder). Runs in the renderer on both platforms; sign-in and token refresh are
// platform specific (window.api.cloud), the merge logic is shared (merge.js).
import { Drive } from './drive.js';
import { reconcile, shareable, withDeviceSettings, merge3, same } from './merge.js';
import { defaultData, normalize } from '../schema.js';
import { state, replaceData, flushSave, onSaved } from '../state.js';

/** Where the phone version is published (GitHub Pages). */
export const WEB_APP_URL = 'https://kunstler-dev.github.io/kitten-planner/';

const DATA_FILE = 'kitten-planner-data.json';
const docFile = (stored) => `doc_${stored}`;
const PERIOD = 2 * 60 * 1000;
const AFTER_EDIT = 6000;

/** state: 'unconfigured' | 'off' | 'syncing' | 'ok' | 'auth' | 'offline' | 'error' */
const status = { state: 'off', lastSync: 0, email: '', detail: '' };
const listeners = new Set();
let drive = null;
let running = false;
let rerun = false;
let timer = null;
let triggersOn = false;
let firstRound = true;

export const syncStatus = () => ({ ...status });

export function onSyncStatus(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setStatus(patch) {
  Object.assign(status, patch);
  listeners.forEach((cb) => cb(syncStatus()));
}

const cloud = () => window.api.cloud;

export async function initSync() {
  const st = await cloud().status();
  const saved = (await window.api.syncState.load()) || {};
  setStatus({ lastSync: saved.lastSync || 0, email: st.email || '' });
  if (!st.configured) return setStatus({ state: 'unconfigured' });
  if (!st.connected) return setStatus({ state: 'off' });
  connectDrive();
  if (!triggersOn) {
    triggersOn = true;
    onSaved(() => syncSoon(AFTER_EDIT));
    window.addEventListener('focus', () => syncSoon(500));
    window.addEventListener('online', () => syncSoon(500));
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncSoon(500));
    setInterval(() => document.visibilityState === 'visible' && syncSoon(0), PERIOD);
  }
  syncSoon(0);
}

function connectDrive() {
  drive = new Drive({ getToken: (opts) => cloud().token(opts) });
}

export async function connectCloud() {
  const res = await cloud().connect();
  if (!res?.ok) {
    if (res?.error) setStatus({ state: 'error', detail: res.error });
    return false;
  }
  setStatus({ email: res.email || '' });
  await initSync();
  return true;
}

export async function disconnectCloud() {
  await cloud().disconnect();
  drive = null;
  clearTimeout(timer);
  await window.api.syncState.save({});
  setStatus({ state: 'off', email: '', lastSync: 0 });
}

export function syncSoon(delay = 0) {
  if (!drive) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, delay);
}

const isEditing = () => {
  const el = document.activeElement;
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) && el.closest('#view'));
};

export async function syncNow() {
  if (!drive) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  setStatus({ state: 'syncing' });
  try {
    await flushSave();
    const saved = (await window.api.syncState.load()) || {};
    const local = shareable(state.data);
    const remoteRaw = await drive.readJson(DATA_FILE);
    const remote = remoteRaw ? shareable(normalize(remoteRaw)) : null;
    const defaults = shareable(defaultData());
    const { merged, pull, push } = reconcile({ base: saved.base, local, remote, defaults });

    if (pull) {
      // Never swap the data under the cursor; try again once she stops typing.
      if (isEditing()) {
        rerun = true;
        setStatus({ state: 'ok' });
        return;
      }
      // Edits made while we were downloading win over the snapshot we merged from.
      const now = shareable(state.data);
      const next = same(now, local) ? merged : merge3(local, now, merged);
      replaceData(withDeviceSettings(normalize(next), state.data));
      await flushSave();
      if (!same(next, merged)) rerun = true;
    }
    if (push) await drive.writeJson(DATA_FILE, merged);
    const uploaded = await syncFiles(saved, merged);
    const lastSync = Date.now();
    await window.api.syncState.save({ base: merged, lastSync, uploaded });
    setStatus({ state: 'ok', lastSync, detail: '' });
  } catch (err) {
    const code = err.code === 'auth' || err.code === 'offline' ? err.code : 'error';
    setStatus({ state: navigator.onLine === false ? 'offline' : code, detail: err.detail || err.message || '' });
    // Phone: the hour-long Google token ran out — refresh it with a quick redirect, but only right
    // after launch, never in the middle of her work.
    if (code === 'auth' && firstRound && cloud().reauth) {
      await flushSave();
      cloud().reauth();
    }
  } finally {
    firstRound = false;
    running = false;
    if (rerun) {
      rerun = false;
      syncSoon(3000);
    }
  }
}

const storedNames = (data) =>
  new Set((data?.documents || []).flatMap((d) => (d.files || []).map((f) => f.stored)).filter(Boolean));

/** Attachments: upload the ones this device has, drop the ones whose document was deleted. */
async function syncFiles(saved, merged) {
  const uploaded = new Set(saved.uploaded || []);
  const now = storedNames(merged);
  for (const stored of now) {
    if (uploaded.has(stored)) continue;
    const bytes = await window.api.readDocument(stored);
    if (!bytes) continue; // added on the other device; downloaded when opened
    await drive.write(docFile(stored), bytes, 'application/octet-stream');
    uploaded.add(stored);
  }
  for (const stored of storedNames(saved.base)) {
    if (now.has(stored)) continue;
    await drive.remove(docFile(stored));
    await window.api.removeDocument(stored);
    uploaded.delete(stored);
  }
  return [...uploaded];
}

/** Makes sure an attachment is on this device (downloads it from the cloud if needed). */
export async function ensureDocument(stored) {
  if (await window.api.hasDocument(stored)) return true;
  if (!drive) return false;
  try {
    const blob = await drive.readBlob(docFile(stored));
    if (!blob) return false;
    await window.api.writeDocument(stored, new Uint8Array(await blob.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}
