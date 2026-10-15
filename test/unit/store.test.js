const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store, normalize, defaultData } = require('../../src/main/store');
const { Secrets } = require('../../src/main/secrets');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kp-'));

test('load returns defaults when no file', () => {
  const store = new Store(tmp());
  assert.deepEqual(store.load(), defaultData());
});

test('save + load roundtrip and backup', () => {
  const dir = tmp();
  const store = new Store(dir);
  const data = defaultData();
  data.notes.push({ id: 'a', title: 'Привет', body: 'мир' });
  store.save(data);
  data.notes.push({ id: 'b', title: 'Второй', body: '' });
  store.save(data);
  assert.equal(store.load().notes.length, 2);
  assert.ok(fs.existsSync(path.join(dir, 'data.backup.json')));
});

test('falls back to backup when main file is corrupted', () => {
  const dir = tmp();
  const store = new Store(dir);
  const data = defaultData();
  data.tasks.push({ id: 't' });
  store.save(data);
  store.save(data);
  fs.writeFileSync(path.join(dir, 'data.json'), '{broken');
  assert.equal(store.load().tasks.length, 1);
});

test('normalize fills missing fields and keeps settings', () => {
  const out = normalize({ notes: [{ id: 1 }], settings: { model: 'gpt-4o' }, junk: true });
  assert.equal(out.notes.length, 1);
  assert.deepEqual(out.tasks, []);
  assert.equal(out.settings.model, 'gpt-4o');
  assert.equal(out.settings.kitten, true);
  assert.equal(out.junk, undefined);
});

test('secrets: plain fallback roundtrip and clearing', () => {
  const s = new Secrets(tmp(), null);
  assert.equal(s.get(), '');
  s.set('sk-test-123');
  assert.equal(s.get(), 'sk-test-123');
  s.set('');
  assert.equal(s.get(), '');
});

test('secrets: uses safeStorage when available', () => {
  const fake = {
    isEncryptionAvailable: () => true,
    encryptString: (v) => Buffer.from(v.split('').reverse().join('')),
    decryptString: (b) => b.toString().split('').reverse().join(''),
  };
  const dir = tmp();
  const s = new Secrets(dir, fake);
  s.set('sk-abc');
  assert.ok(!fs.readFileSync(path.join(dir, 'secret.bin')).toString().includes('sk-abc'));
  assert.equal(s.get(), 'sk-abc');
});
