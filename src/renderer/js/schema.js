// Data schema for the renderer (web/phone build and sync). Mirrors src/main/store.js —
// test/unit/schema.test.js keeps the two in lockstep.

export const DATA_VERSION = 1;

export function defaultData() {
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
      season: 'auto',
      fx: {},
      sound: false,
      bdaySeen: '',
    },
    art: { opened: {} },
    // Painting quiz: totals and best streak.
    quiz: { best: 0, right: 0, total: 0 },
  };
}

export const ARRAY_KEYS = [
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

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Merge loaded data over defaults so new fields appear after updates. */
export function normalize(raw) {
  const base = defaultData();
  if (!isObj(raw)) return base;
  const out = { ...base };
  for (const key of ARRAY_KEYS) out[key] = Array.isArray(raw[key]) ? raw[key] : [];
  out.profile = { ...base.profile, ...(raw.profile || {}) };
  out.business = { ...base.business, ...(raw.business || {}) };
  const launch = isObj(raw.launch) ? raw.launch : {};
  out.launch = {
    legal: isObj(launch.legal) ? launch.legal : {},
    commercial: isObj(launch.commercial) ? launch.commercial : {},
    custom: Array.isArray(launch.custom) ? launch.custom : [],
  };
  out.settings = { ...base.settings, ...(raw.settings || {}) };
  out.art = { opened: isObj(raw.art?.opened) ? raw.art.opened : {} };
  out.quiz = { ...base.quiz, ...(raw.quiz && typeof raw.quiz === 'object' ? raw.quiz : {}) };
  out.version = DATA_VERSION;
  return out;
}
