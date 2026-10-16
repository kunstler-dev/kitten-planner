// Pure cost/price calculation for the notebook configurator (unit-tested in test/unit/calc.test.js).

export const FORMATS = {
  a6: { w: 105, h: 148, label: 'A6' },
  b6: { w: 125, h: 176, label: 'B6' },
  a5: { w: 148, h: 210, label: 'A5' },
  sq: { w: 200, h: 200, label: '20×20' },
  a4: { w: 210, h: 297, label: 'A4' },
};

// 'cased' = one wrapped cover with spine; 'separate' = two individually covered boards.
export const BINDINGS = {
  coptic: { style: 'separate', minutes: 60 },
  sewn: { style: 'cased', minutes: 90 },
  japanese: { style: 'separate', minutes: 40 },
  rings: { style: 'separate', minutes: 30, material: 'rings' },
};

export const PAPERS = {
  paper90: { thickness: 0.11 },
  paper120: { thickness: 0.15 },
  kraft: { thickness: 0.14 },
};

export const EXTRAS = {
  ribbon: { minutes: 3, material: 'ribbon' },
  elastic: { minutes: 4, material: 'elastic' },
  headband: { minutes: 5, material: 'headband' },
  endpaper: { minutes: 8 },
  pocket: { minutes: 10, material: 'pocket' },
  penloop: { minutes: 5, material: 'penloop' },
  corners: { minutes: 5 },
  emboss: { minutes: 10, material: 'foil' },
};

export const DEFAULT_MATERIALS = [
  { id: 'leather', unit: 'm2', price: 22 },
  { id: 'board', unit: 'm2', price: 4.5 },
  { id: 'paper90', unit: 'm2', price: 0.9 },
  { id: 'paper120', unit: 'm2', price: 1.6 },
  { id: 'kraft', unit: 'm2', price: 1.2 },
  { id: 'endpaper', unit: 'm2', price: 3 },
  { id: 'thread', unit: 'pc', price: 0.25 },
  { id: 'glue', unit: 'pc', price: 0.2 },
  { id: 'ribbon', unit: 'pc', price: 0.25 },
  { id: 'elastic', unit: 'pc', price: 0.35 },
  { id: 'headband', unit: 'pc', price: 0.3 },
  { id: 'rings', unit: 'pc', price: 2.8 },
  { id: 'foil', unit: 'pc', price: 0.4 },
  { id: 'pocket', unit: 'pc', price: 0.4 },
  { id: 'penloop', unit: 'pc', price: 0.45 },
  { id: 'packaging', unit: 'pc', price: 0.6 },
];

export const DEFAULT_CONFIG = {
  type: 'notebook',
  format: 'a5',
  cover: 'hard',
  binding: 'sewn',
  color: 'cognac',
  paper: 'paper90',
  ruling: 'dotted',
  leaves: 96,
  extras: { ribbon: true, elastic: true, headband: true, endpaper: true },
  embossText: '',
  hourlyRate: 18,
  minutesOverride: null,
  overhead: 2,
  margin: 30,
  waste: 12,
  customMaterials: [], // [{ materialId, qty }]
};

const mm2 = (a, b) => (a * b) / 1e6;
const round2 = (v) => Math.round(v * 100) / 100;

/** Round a gross price up to a "nice" retail price ending in ,90. */
export function nicePrice(value) {
  if (value <= 0) return 0;
  const base = Math.ceil(value - 0.9);
  return base + 0.9 < value ? base + 1.9 : base + 0.9;
}

/**
 * Returns { lines: [{ id, qty, unit, cost }], materials, minutes, labor, overhead, cost,
 *           net, vat, gross, retail, profit }.
 */
export function calculate(config, materials, { vatRate = 19 } = {}) {
  const c = { ...DEFAULT_CONFIG, ...config, extras: { ...DEFAULT_CONFIG.extras, ...(config.extras || {}) } };
  const price = (id) => materials.find((m) => m.id === id)?.price ?? 0;
  const unitOf = (id) => materials.find((m) => m.id === id)?.unit ?? 'pc';
  const { w, h } = FORMATS[c.format] || FORMATS.a5;
  const binding = BINDINGS[c.binding] || BINDINGS.sewn;
  const paper = PAPERS[c.paper] || PAPERS.paper90;
  const hard = c.cover === 'hard';
  const spine = c.leaves * paper.thickness + (hard ? 4 : 0);

  const qty = {};
  const add = (id, q) => (qty[id] = (qty[id] || 0) + q);

  // Cover leather + board
  if (binding.style === 'cased') {
    add('leather', mm2(2 * (w + 3) + spine + 2 * 7 + 2 * 15, h + 6 + 2 * 15));
    if (hard) add('board', 2 * mm2(w + 3, h + 6) + mm2(spine, h + 6));
  } else {
    add('leather', 2 * mm2(w + 6 + 30, h + 6 + 30));
    if (hard) add('board', 2 * mm2(w + 3, h + 6));
  }
  add(c.paper, c.leaves * mm2(w, h));
  if (c.extras.endpaper) add('endpaper', 2 * mm2(2 * w, h));
  add('thread', 1);
  add('glue', 1);
  add('packaging', 1);
  if (binding.material) add(binding.material, 1);

  let minutes = binding.minutes + c.leaves * 0.15;
  for (const [id, on] of Object.entries(c.extras)) {
    if (!on || !EXTRAS[id]) continue;
    minutes += EXTRAS[id].minutes;
    if (EXTRAS[id].material) add(EXTRAS[id].material, 1);
  }
  for (const cm of c.customMaterials || []) {
    if (cm.materialId && cm.qty) add(cm.materialId, Number(cm.qty));
  }
  if (c.minutesOverride) minutes = Number(c.minutesOverride);

  const waste = 1 + (Number(c.waste) || 0) / 100;
  const lines = Object.entries(qty).map(([id, q]) => {
    const unit = unitOf(id);
    const factor = unit === 'm2' ? waste : 1;
    return { id, qty: round2(q * factor * 1000) / 1000, unit, cost: round2(q * factor * price(id)) };
  });
  const materialCost = round2(lines.reduce((s, l) => s + l.cost, 0));
  const labor = round2((minutes / 60) * (Number(c.hourlyRate) || 0));
  const overhead = round2(Number(c.overhead) || 0);
  const cost = round2(materialCost + labor + overhead);
  const net = round2(cost * (1 + (Number(c.margin) || 0) / 100));
  const vat = round2(net * (vatRate / 100));
  const gross = round2(net + vat);
  const retail = nicePrice(gross);
  const profit = round2(retail / (1 + vatRate / 100) - cost);
  return {
    lines,
    materials: materialCost,
    minutes: Math.round(minutes),
    labor,
    overhead,
    cost,
    net,
    vat,
    gross,
    retail,
    profit,
    spine: Math.round(spine),
  };
}
