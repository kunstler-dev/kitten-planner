const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseSSE, streamChat, describeError } = require('../../src/main/openai');

test('parseSSE extracts deltas and keeps partial line', () => {
  const buf =
    'data: {"choices":[{"delta":{"content":"При"}}]}\n\n' +
    'data: {"choices":[{"delta":{"content":"вет"}}]}\n\ndata: {"choi';
  const r = parseSSE(buf);
  assert.deepEqual(r.deltas, ['При', 'вет']);
  assert.equal(r.rest, 'data: {"choi');
  assert.equal(r.done, false);
  assert.equal(parseSSE('data: [DONE]\n').done, true);
});

test('streamChat streams chunks from a fake fetch', async () => {
  const enc = new TextEncoder();
  const chunks = [
    'data: {"choices":[{"delta":{"content":"Да"}}]}\n',
    '\ndata: {"choices":[{"delta":{"content":", конечно"}}]}\n\ndata: [DONE]\n\n',
  ];
  const fetchImpl = async (url, opts) => {
    assert.equal(JSON.parse(opts.body).stream, true);
    assert.equal(opts.headers.Authorization, 'Bearer sk-x');
    return {
      ok: true,
      body: (async function* () {
        for (const c of chunks) yield enc.encode(c);
      })(),
    };
  };
  const seen = [];
  const text = await streamChat({ apiKey: 'sk-x', model: 'm', messages: [], fetchImpl, onDelta: (d) => seen.push(d) });
  assert.equal(text, 'Да, конечно');
  assert.deepEqual(seen, ['Да', ', конечно']);
});

test('streamChat requires a key and maps HTTP errors', async () => {
  await assert.rejects(streamChat({ apiKey: '', model: 'm', messages: [] }), /API-ключ/);
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => '{"error":{"message":"bad"}}' });
  await assert.rejects(streamChat({ apiKey: 'k', model: 'm', messages: [], fetchImpl }), /Неверный API-ключ/);
  assert.match(describeError(429, '{}'), /лимит/);
});
