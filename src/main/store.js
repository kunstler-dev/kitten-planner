'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DATA_VERSION = 1;

function defaultData() {
  return {
    version: DATA_VERSION,
    profile: { name: '' },
    business: {
      company: '',
      owner: '',
      address: '',
      email: '',
      phone: '',
      taxNumber: '',
      vatId: '',
      iban: '',
      bic: '',
      bank: '',
      kleinunternehmer: true,
    },
    notes: [],
    plans: [],
    tasks: [],
    events: [],
    chats: [],
    // Launch roadmaps: per-step state keyed by step id, plus user-added steps.
    launch: { legal: {}, commercial: {}, custom: [] },
    materials: [],
    products: [],
    transactions: [],
    invoices: [],
    documents: [],
    settings: {
      model: 'gpt-4o-mini',
      kitten: true,
      kittenSpeed: 1,
      pets: true,
      chatUsesContext: true,
      lang: 'uk',
      theme: 'light',
      chatMode: 'account',
    },
    // Art calendar: dates (YYYY-MM-DD) whose painting was already opened.
    art: { opened: {} },
  };
}

const ARRAY_KEYS = [
  'notes',
  'plans',
  'tasks',
  'events',
  'chats',
  'materials',
  'products',
  'transactions',
  'invoices',
  'documents',
];

/** Merge loaded data over defaults so new fields appear after updates. */
function normalize(raw) {
  const base = defaultData();
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base };
  for (const key of ARRAY_KEYS) {
    out[key] = Array.isArray(raw[key]) ? raw[key] : [];
  }
  out.profile = { ...base.profile, ...(raw.profile || {}) };
  out.business = { ...base.business, ...(raw.business || {}) };
  const launch = raw.launch && typeof raw.launch === 'object' ? raw.launch : {};
  out.launch = {
    legal: launch.legal && typeof launch.legal === 'object' ? launch.legal : {},
    commercial: launch.commercial && typeof launch.commercial === 'object' ? launch.commercial : {},
    custom: Array.isArray(launch.custom) ? launch.custom : [],
  };
  out.settings = { ...base.settings, ...(raw.settings || {}) };
  out.art = { opened: raw.art?.opened && typeof raw.art.opened === 'object' ? raw.art.opened : {} };
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
