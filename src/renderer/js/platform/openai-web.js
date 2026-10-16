// Browser version of src/main/openai.js (streaming Chat Completions); errors carry the same codes.
const API_URL = 'https://api.openai.com/v1/chat/completions';

export class ChatError extends Error {
  constructor(code, detail = '') {
    super(detail || code);
    this.code = code;
    this.detail = detail;
  }
}

function describeError(status, body) {
  let detail;
  try {
    detail = JSON.parse(body).error?.message || '';
  } catch {
    detail = body?.slice(0, 300) || '';
  }
  if (status === 401) return new ChatError('bad_key', detail);
  if (status === 429) return new ChatError('rate_limit', detail);
  if (status === 404) return new ChatError('model', detail);
  return new ChatError('http', `${status} ${detail}`.trim());
}

async function post(url, init) {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ChatError('network', err.message);
  }
}

export async function streamChat({ apiKey, model, messages, signal, onDelta }) {
  if (!apiKey) throw new ChatError('no_key');
  const res = await post(API_URL, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!res.ok) throw describeError(res.status, await res.text());
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const payload = line.trim().startsWith('data:') ? line.trim().slice(5).trim() : '';
      if (!payload || payload === '[DONE]') continue;
      try {
        const text = JSON.parse(payload).choices?.[0]?.delta?.content;
        if (text) {
          full += text;
          onDelta?.(text);
        }
      } catch {
        // keep-alive or partial line
      }
    }
  }
  return full;
}

export async function testKey(apiKey) {
  const res = await post('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw describeError(res.status, await res.text());
  return true;
}
