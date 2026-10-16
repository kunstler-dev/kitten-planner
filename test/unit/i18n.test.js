// Every UI string must exist in both languages, and every static key used in code must be defined.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..', 'src', 'renderer', 'js');
const load = async (lang) => (await import(`../../src/renderer/js/locales/${lang}.js`)).default;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'locales' ? [] : sourceFiles(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

test('uk and de define the same keys', async () => {
  const uk = Object.keys(await load('uk')).sort();
  const de = Object.keys(await load('de')).sort();
  assert.deepEqual(
    uk.filter((k) => !de.includes(k)),
    [],
    'missing in de',
  );
  assert.deepEqual(
    de.filter((k) => !uk.includes(k)),
    [],
    'missing in uk',
  );
});

test('static t() keys used in the renderer exist', async () => {
  const uk = await load('uk');
  const missing = new Set();
  for (const file of sourceFiles(root)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) {
      if (!(m[1] in uk) && m[1] !== 'a.b') missing.add(`${m[1]} (${path.basename(file)})`);
    }
  }
  assert.deepEqual([...missing], []);
});

test('no Russian-only letters in UI strings', async () => {
  for (const lang of ['uk', 'de']) {
    const dict = await load(lang);
    for (const [k, v] of Object.entries(dict)) assert.ok(!/[ыэъёЫЭЪЁ]/.test(v), `${lang}.${k}: ${v}`);
  }
});
