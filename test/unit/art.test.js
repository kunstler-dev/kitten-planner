const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../src/renderer/js/data/art/index.js');
const RUSSIAN_ONLY = /[ыэъёЫЭЪЁ]/;

test('every day from START to END has a painting, no painting repeats', async () => {
  const art = await load();
  const schedule = art.buildSchedule();
  assert.ok(art.PAINTINGS.length >= schedule.size, `${art.PAINTINGS.length} paintings for ${schedule.size} days`);
  const ids = [...schedule.values()].map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids[0], art.BY_ID[art.PINS[art.START]].id);
  assert.ok(art.paintingFor('2030-05-05'), 'cycles outside the range');
});

test('ids are unique and pins point to existing paintings once', async () => {
  const art = await load();
  const ids = art.PAINTINGS.map((p) => p.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
  const pinned = Object.values(art.PINS);
  assert.equal(new Set(pinned).size, pinned.length);
  for (const [date, id] of Object.entries(art.PINS)) {
    assert.ok(art.BY_ID[id], `pin ${date} → ${id}`);
    assert.ok(date >= art.START && date <= art.END, `pin ${date} in range`);
  }
});

test('every entry is complete in Ukrainian and German', async () => {
  const art = await load();
  for (const p of art.PAINTINGS) {
    assert.ok(p.id && p.wiki && p.y, `${p.id}: id/wiki/year`);
    assert.ok(art.ARTISTS[p.a], `${p.id}: unknown artist ${p.a}`);
    for (const key of ['t', 's', 'm', 'l', 'd']) {
      for (const lang of ['uk', 'de']) {
        const v = p[key]?.[lang];
        assert.ok(typeof v === 'string' && v.trim(), `${p.id}.${key}.${lang}`);
        if (lang === 'uk') assert.doesNotMatch(v, RUSSIAN_ONLY, `${p.id}.${key}.uk`);
      }
    }
    assert.ok(p.d.uk.split('\n').length >= 2 && p.d.de.split('\n').length >= 2, `${p.id}: two paragraphs`);
  }
});
