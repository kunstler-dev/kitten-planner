const { test } = require('node:test');
const assert = require('node:assert/strict');

const merge = () => import('../../src/renderer/js/sync/merge.js');
const schema = () => import('../../src/renderer/js/schema.js');
const driveMod = () => import('../../src/renderer/js/sync/drive.js');

test('renderer schema matches the main-process store', async () => {
  const { defaultData, normalize } = await schema();
  const store = require('../../src/main/store.js');
  assert.deepEqual(defaultData(), store.defaultData());
  const raw = { notes: [{ id: 'a' }], settings: { lang: 'de' }, launch: { legal: { x: { status: 'done' } } }, junk: 1 };
  assert.deepEqual(normalize(raw), store.normalize(raw));
  assert.deepEqual(normalize(null), store.normalize(null));
});

test('edits on both devices to different records are combined', async () => {
  const { merge3 } = await merge();
  const base = {
    notes: [
      { id: 'a', t: 'A' },
      { id: 'b', t: 'B' },
    ],
  };
  const local = {
    notes: [
      { id: 'a', t: 'A (desk)' },
      { id: 'b', t: 'B' },
      { id: 'c', t: 'new on desk' },
    ],
  };
  const remote = {
    notes: [
      { id: 'a', t: 'A' },
      { id: 'b', t: 'B (phone)' },
      { id: 'd', t: 'new on phone' },
    ],
  };
  const out = merge3(base, local, remote);
  assert.deepEqual(
    out.notes.map((n) => [n.id, n.t]),
    [
      ['a', 'A (desk)'],
      ['b', 'B (phone)'],
      ['d', 'new on phone'],
      ['c', 'new on desk'],
    ],
  );
});

test('deletions sync, but an edit wins over a deletion', async () => {
  const { merge3 } = await merge();
  const base = {
    tasks: [
      { id: 1, done: false },
      { id: 2, done: false },
    ],
  };
  const local = { tasks: [{ id: 2, done: false }] }; // deleted 1 here
  const remote = {
    tasks: [
      { id: 1, done: false },
      { id: 2, done: true },
    ],
  };
  assert.deepEqual(merge3(base, local, remote).tasks, [{ id: 2, done: true }]);
  const remoteEdited = {
    tasks: [
      { id: 1, done: true },
      { id: 2, done: false },
    ],
  };
  // The kept record goes back to its place in the other device's order.
  assert.deepEqual(merge3(base, local, remoteEdited).tasks, [
    { id: 1, done: true },
    { id: 2, done: false },
  ]);
});

test('fields of the same record merge separately; same-field conflict keeps this device', async () => {
  const { merge3 } = await merge();
  const base = { business: { company: '', iban: '' }, launch: { legal: {} } };
  const local = { business: { company: 'Lederwerk', iban: '' }, launch: { legal: { s1: { status: 'done' } } } };
  const remote = { business: { company: '', iban: 'DE12' }, launch: { legal: { s2: { status: 'doing' } } } };
  assert.deepEqual(merge3(base, local, remote), {
    business: { company: 'Lederwerk', iban: 'DE12' },
    launch: { legal: { s1: { status: 'done' }, s2: { status: 'doing' } } },
  });
  assert.equal(merge3({ v: 1 }, { v: 2 }, { v: 3 }).v, 2);
});

test('first sync of an empty phone takes the cloud data; device look & feel is not shared', async () => {
  const { reconcile, shareable, withDeviceSettings } = await merge();
  const { defaultData } = await schema();
  const defaults = shareable(defaultData());
  const cloud = shareable({
    ...defaultData(),
    profile: { name: 'Olena' },
    notes: [{ id: 'n1' }],
    settings: { ...defaultData().settings, model: 'gpt-4o' },
  });
  const phone = { ...defaultData(), settings: { ...defaultData().settings, theme: 'dark' } };
  const { merged, pull, push } = reconcile({ base: null, local: shareable(phone), remote: cloud, defaults });
  assert.equal(pull, true);
  assert.equal(push, false);
  assert.equal(merged.profile.name, 'Olena');
  assert.equal(merged.settings.model, 'gpt-4o');
  assert.equal('theme' in merged.settings, false);
  assert.equal(withDeviceSettings(merged, phone).settings.theme, 'dark');
  assert.deepEqual(reconcile({ base: null, local: cloud, remote: null, defaults }), {
    merged: cloud,
    pull: false,
    push: true,
  });
});

test('Drive client: finds, creates and updates files in appDataFolder, refreshes an expired token', async () => {
  const { Drive } = await driveMod();
  const calls = [];
  let tokenCalls = 0;
  const files = new Map();
  const fakeFetch = async (url, init = {}) => {
    calls.push(`${init.method || 'GET'} ${url.split('?')[0]}`);
    if (init.headers.Authorization === 'Bearer old') return new Response('expired', { status: 401 });
    if (url.includes('/drive/v3/files?spaces=appDataFolder')) {
      const found = [...files.keys()].map((id) => ({ id, version: '1' }));
      return Response.json({ files: found });
    }
    if (url.includes('uploadType=multipart')) {
      files.set('f1', await new Response(init.body).text());
      return Response.json({ id: 'f1', version: '1' });
    }
    if (url.includes('uploadType=media')) {
      files.set('f1', await new Response(init.body).text());
      return Response.json({ id: 'f1', version: '2' });
    }
    if (url.includes('alt=media')) return new Response(files.get('f1'));
    return new Response('?', { status: 500 });
  };
  const drive = new Drive({
    getToken: async ({ force }) => {
      tokenCalls += 1;
      return force ? 'fresh' : 'old';
    },
    fetchImpl: fakeFetch,
  });
  assert.equal(await drive.readJson('data.json'), null);
  await drive.writeJson('data.json', { a: 1 });
  assert.match(files.get('f1'), /"parents":\["appDataFolder"\]/);
  assert.match(files.get('f1'), /\{"a":1\}/);
  assert.equal(await drive.writeJson('data.json', { a: 2 }), '2');
  assert.deepEqual(await drive.readJson('data.json'), { a: 2 });
  assert.ok(tokenCalls >= 2);
  assert.ok(calls.some((c) => c.startsWith('PATCH')));
});
