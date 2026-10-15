'use strict';

const API_URL = 'https://api.openai.com/v1/chat/completions';

/** Parse an SSE text buffer; returns [deltas, rest]. */
function parseSSE(buffer) {
  const deltas = [];
  let done = false;
  const lines = buffer.split('\n');
  const rest = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') {
      done = true;
      continue;
    }
    try {
      const json = JSON.parse(payload);
      const text = json.choices?.[0]?.delta?.content;
      if (text) deltas.push(text);
    } catch {
      // partial / keep-alive line
    }
  }
  return { deltas, rest, done };
}

function describeError(status, body) {
  let message;
  try {
    message = JSON.parse(body).error?.message || '';
  } catch {
    message = body?.slice(0, 300) || '';
  }
  if (status === 401) return 'Неверный API-ключ. Проверьте его в настройках.';
  if (status === 429) return `Превышен лимит запросов или закончился баланс. ${message}`.trim();
  if (status === 404) return `Модель недоступна для этого ключа. ${message}`.trim();
  return `Ошибка OpenAI (${status}). ${message}`.trim();
}

/**
 * Streams a chat completion. Calls onDelta(text) for each chunk.
 * Resolves with the full text.
 */
async function streamChat({ apiKey, model, messages, signal, onDelta, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('Добавьте API-ключ OpenAI в настройках чата.');
  const res = await fetchImpl(API_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!res.ok) {
    throw new Error(describeError(res.status, await res.text()));
  }
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const parsed = parseSSE(buffer);
    buffer = parsed.rest;
    for (const d of parsed.deltas) {
      full += d;
      onDelta?.(d);
    }
    if (parsed.done) break;
  }
  return full;
}

async function testKey({ apiKey, fetchImpl = fetch }) {
  const res = await fetchImpl('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(describeError(res.status, await res.text()));
  return true;
}

module.exports = { streamChat, testKey, parseSSE, describeError };
