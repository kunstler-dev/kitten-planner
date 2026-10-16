const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../src/renderer/js/calc.js');

test('nicePrice rounds up to ,90', async () => {
  const { nicePrice } = await load();
  assert.equal(nicePrice(24.1), 24.9);
  assert.equal(nicePrice(24.95), 25.9);
  assert.equal(nicePrice(24.9), 24.9);
  assert.equal(nicePrice(0), 0);
});

test('calculate: A5 sewn hardcover has sane numbers', async () => {
  const { calculate, DEFAULT_CONFIG, DEFAULT_MATERIALS } = await load();
  const r = calculate(DEFAULT_CONFIG, DEFAULT_MATERIALS, { vatRate: 19 });
  const leather = r.lines.find((l) => l.id === 'leather');
  assert.ok(leather.qty > 0.08 && leather.qty < 0.2, `leather m2 ${leather.qty}`);
  assert.ok(r.materials > 2 && r.materials < 15, `materials ${r.materials}`);
  assert.ok(r.minutes > 90 && r.minutes < 200);
  assert.equal(r.cost, Math.round((r.materials + r.labor + r.overhead) * 100) / 100);
  assert.ok(r.retail >= r.gross);
  assert.ok(r.profit > 0);
});

test('calculate: Kleinunternehmer (0% VAT) and options', async () => {
  const { calculate, DEFAULT_CONFIG, DEFAULT_MATERIALS } = await load();
  const base = calculate(DEFAULT_CONFIG, DEFAULT_MATERIALS, { vatRate: 0 });
  assert.equal(base.vat, 0);
  assert.equal(base.gross, base.net);
  const rings = calculate({ ...DEFAULT_CONFIG, binding: 'rings', cover: 'soft' }, DEFAULT_MATERIALS, { vatRate: 0 });
  assert.ok(rings.lines.some((l) => l.id === 'rings'));
  assert.ok(!rings.lines.some((l) => l.id === 'board'));
  const fixed = calculate({ ...DEFAULT_CONFIG, minutesOverride: 30 }, DEFAULT_MATERIALS);
  assert.equal(fixed.minutes, 30);
});
