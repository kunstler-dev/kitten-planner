// Three-way merge for cloud sync. Each device keeps the last synced snapshot ("base");
// on sync the local and remote versions are merged against it, field by field, so edits made
// on the computer and on the phone in between both survive. Arrays of records with an `id`
// (notes, tasks, invoices…) are merged per record; deleting on one side and editing on the
// other keeps the edit.

/** Settings that belong to one device (look & feel) and are never synced. */
export const DEVICE_SETTINGS = ['lang', 'theme', 'kitten', 'kittenSpeed', 'pets', 'chatMode'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasId = (x) => isObj(x) && (typeof x.id === 'string' || typeof x.id === 'number');
const isRecordList = (v) => Array.isArray(v) && v.every(hasId);

/** JSON with sorted keys, so equal data always compares equal. */
export function stable(value) {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (isObj(value)) {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export const same = (a, b) => stable(a) === stable(b);

export function merge3(base, local, remote) {
  if (same(local, remote)) return local;
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  // Both sides changed. A deletion loses against an edit.
  if (local === undefined) return remote;
  if (remote === undefined) return local;
  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out = {};
    for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const v = merge3(b[key], local[key], remote[key]);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }
  if (isRecordList(local) && isRecordList(remote) && (base === undefined || isRecordList(base))) {
    return mergeRecords(base || [], local, remote);
  }
  // Same scalar edited on both devices: the device that is syncing right now wins.
  return local;
}

function mergeRecords(base, local, remote) {
  const byId = (list) => new Map(list.map((x) => [x.id, x]));
  const b = byId(base);
  const r = byId(remote);
  const out = [];
  const placed = new Set();
  for (const item of local) {
    placed.add(item.id);
    const v = merge3(b.get(item.id), item, r.get(item.id));
    if (v !== undefined) out.push(v);
  }
  // Records that only exist remotely: new on the other device (or deleted here).
  let anchor = -1;
  for (const item of remote) {
    if (placed.has(item.id)) {
      const at = out.findIndex((x) => x.id === item.id);
      if (at !== -1) anchor = at;
      continue;
    }
    const v = merge3(b.get(item.id), undefined, item);
    if (v === undefined) continue;
    out.splice(anchor + 1, 0, v);
    anchor += 1;
  }
  return out;
}

/** The part of the data that is shared between devices. */
export function shareable(data) {
  const copy = JSON.parse(JSON.stringify(data));
  if (copy.settings) for (const key of DEVICE_SETTINGS) delete copy.settings[key];
  return copy;
}

/** Put this device's own look & feel settings back onto merged data. */
export function withDeviceSettings(merged, local) {
  const out = { ...merged, settings: { ...(merged.settings || {}) } };
  for (const key of DEVICE_SETTINGS) {
    if (local.settings && key in local.settings) out.settings[key] = local.settings[key];
  }
  return out;
}

/**
 * One sync round, as a pure function. `base` is the last synced shared snapshot (null on a device
 * that never synced: then the defaults act as base, so an empty phone simply takes the cloud data),
 * `local` this device's shared data, `remote` the cloud copy (null if there is none yet).
 */
export function reconcile({ base, local, remote, defaults }) {
  if (!remote) return { merged: local, pull: false, push: true };
  const merged = merge3(base || defaults, local, remote);
  return { merged, pull: !same(merged, local), push: !same(merged, remote) };
}
