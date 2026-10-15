'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DATA_VERSION = 1;

function defaultData() {
  return {
    version: DATA_VERSION,
    profile: { name: '' },
    notes: [],
    plans: [],
    tasks: [],
    events: [],
    chats: [],
    settings: {
      model: 'gpt-4o-mini',
      kitten: true,
      kittenSpeed: 1,
      chatUsesContext: true,
    },
  };
}

/** Merge loaded data over defaults so new fields appear after updates. */
function normalize(raw) {
  const base = defaultData();
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base };
  for (const key of ['notes', 'plans', 'tasks', 'events', 'chats']) {
    out[key] = Array.isArray(raw[key]) ? raw[key] : [];
  }
  out.profile = { ...base.profile, ...(raw.profile || {}) };
  out.settings = { ...base.settings, ...(raw.settings || {}) };
  out.version = DATA_VERSION;
  return out;
}

class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'data.json');
    this.backup = path.join(dir, 'data.backup.json');
  }

  load() {
    for (const file of [this.file, this.backup]) {
      try {
        if (fs.existsSync(file)) {
          return normalize(JSON.parse(fs.readFileSync(file, 'utf8')));
        }
      } catch {
        // corrupted file: fall through to the backup / defaults
      }
    }
    return defaultData();
  }

  /** Atomic write: tmp file + rename, previous version kept as backup. */
  save(data) {
    const clean = normalize(data);
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(clean, null, 2), 'utf8');
    if (fs.existsSync(this.file)) {
      try {
        fs.copyFileSync(this.file, this.backup);
      } catch {
        // backup is best-effort
      }
    }
    fs.renameSync(tmp, this.file);
    return true;
  }
}

module.exports = { Store, defaultData, normalize, DATA_VERSION };
