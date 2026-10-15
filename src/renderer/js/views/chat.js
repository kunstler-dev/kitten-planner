import { h, icon, toast, confirmDialog, emptyState } from '../ui.js';
import { state, update, uid } from '../state.js';
import { todayKey, humanDate } from '../dates.js';
import { planProgress } from './common.js';
import { createNote } from './notes.js';
import { route } from '../router.js';

export const MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini — быстро и недорого' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini' },
  { id: 'gpt-5', label: 'GPT-5' },
];

const SUGGESTIONS = [
  'Помоги составить простой бизнес-план для моей идеи',
  'Разбей мою главную цель на конкретные шаги на месяц',
  'Предложи 10 идей для продвижения в соцсетях',
  'Как посчитать цену на мои услуги?',
  'Придумай несколько вариантов названия для бренда',
];

let activeChatId = null;
let keyStatus = null;
let streaming = null; // { reqId, chatId, text }
let rootRef = null;

function systemPrompt() {
  const d = state.data;
  let text =
    'Ты — тёплый, внимательный и практичный помощник девушки, которая начинает своё дело. ' +
    'Помогаешь с планами, идеями, маркетингом, финансами и мотивацией. Отвечай по-русски, ' +
    'структурированно и по делу: короткие абзацы, списки, конкретные шаги. ' +
    'Поддерживай, но не льсти; если видишь риски — мягко скажи о них.';
  if (d.profile.name) text += `\nЕё зовут ${d.profile.name}.`;
  text += `\nСегодня ${humanDate(todayKey(), { withWeekday: true })} (${todayKey()}).`;
  if (!d.settings.chatUsesContext) return text;

  const plans = d.plans.map((p) => {
    const pr = planProgress(p.id);
    return `- ${p.title}${p.deadline ? ` (дедлайн ${p.deadline})` : ''}: ${pr.done}/${pr.total} задач выполнено${p.description ? `. ${p.description}` : ''}`;
  });
  const tasks = d.tasks
    .filter((t) => !t.done)
    .slice(0, 40)
    .map((t) => `- ${t.title}${t.due ? ` [срок ${t.due}]` : ''}${t.priority === 'high' ? ' [важно]' : ''}`);
  const today = todayKey();
  const events = d.events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 15)
    .map((e) => `- ${e.date}${e.time ? ` ${e.time}` : ''}: ${e.title}`);
  if (plans.length) text += `\n\nЕё планы:\n${plans.join('\n')}`;
  if (tasks.length) text += `\n\nАктивные задачи:\n${tasks.join('\n')}`;
  if (events.length) text += `\n\nБлижайшие события:\n${events.join('\n')}`;
  return text;
}

function md(text) {
  return window.DOMPurify.sanitize(window.marked.parse(text || '', { breaks: true, gfm: true }));
}

function activeChat() {
  return state.data.chats.find((c) => c.id === activeChatId);
}

function newChat() {
  const chat = { id: uid(), title: 'Новый разговор', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  update((d) => d.chats.unshift(chat), { silent: true });
  activeChatId = chat.id;
  return chat;
}

function send(text) {
  text = text.trim();
  if (!text || streaming) return;
  let chat = activeChat() || newChat();
  update(
    () => {
      chat.messages.push({ role: 'user', content: text, ts: Date.now() });
      if (chat.title === 'Новый разговор') chat.title = text.slice(0, 48) + (text.length > 48 ? '…' : '');
      chat.updatedAt = Date.now();
    },
    { silent: true },
  );
  const reqId = uid();
  streaming = { reqId, chatId: chat.id, text: '' };
  const history = chat.messages.slice(-20).map(({ role, content }) => ({ role, content }));
  window.api.startChat({
    id: reqId,
    model: state.data.settings.model,
    messages: [{ role: 'system', content: systemPrompt() }, ...history],
  });
  rerender();
}

function finish(text, error) {
  if (!streaming) return;
  const chat = state.data.chats.find((c) => c.id === streaming.chatId);
  const content = text ?? streaming.text;
  if (chat) {
    update(
      () => {
        if (content) chat.messages.push({ role: 'assistant', content, ts: Date.now() });
        if (error) chat.messages.push({ role: 'error', content: error, ts: Date.now() });
        chat.updatedAt = Date.now();
      },
      { silent: true },
    );
  }
  streaming = null;
  rerender();
}

export function initChatEvents() {
  window.api.onChatDelta(({ id, delta }) => {
    if (!streaming || streaming.reqId !== id) return;
    streaming.text += delta;
    const el = document.querySelector('.msg.streaming .msg-body');
    if (el) {
      el.innerHTML = md(streaming.text);
      scrollToBottom();
    }
  });
  window.api.onChatDone(({ id, text, aborted }) => {
    if (streaming?.reqId === id) finish(aborted ? streaming.text : text);
  });
  window.api.onChatError(({ id, error }) => {
    if (streaming?.reqId === id) finish(streaming.text, error);
  });
}

function rerender() {
  if (rootRef && route.name === 'chat' && rootRef.isConnected) renderChat(rootRef);
}

function scrollToBottom() {
  const box = document.querySelector('.chat-messages');
  if (box) box.scrollTop = box.scrollHeight;
}

function keySetup(onDone) {
  const input = h('input', { class: 'input', type: 'password', placeholder: 'sk-…', autocomplete: 'off' });
  const status = h('div', { class: 'small muted' });
  const save = async () => {
    const key = input.value.trim();
    if (!key) return input.focus();
    status.textContent = 'Проверяю ключ…';
    const res = await window.api.testKey(key);
    if (!res.ok) {
      status.textContent = res.error;
      status.className = 'small danger-text';
      return;
    }
    await window.api.setKey(key);
    keyStatus = await window.api.keyStatus();
    toast('Ключ сохранён', 'success');
    onDone();
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && save());
  return h(
    'div',
    { class: 'card key-setup' },
    h('div', { class: 'key-icon' }, icon('key', 26)),
    h('h2', {}, 'Подключи ChatGPT'),
    h(
      'p',
      { class: 'muted' },
      'Вставь свой API-ключ OpenAI. Его можно получить на ',
      h('a', { href: 'https://platform.openai.com/api-keys', target: '_blank' }, 'platform.openai.com/api-keys'),
      '. Ключ хранится только на этом компьютере в зашифрованном виде.',
    ),
    h('div', { class: 'key-row' }, input, h('button', { class: 'btn btn-primary', onclick: save }, 'Сохранить')),
    status,
  );
}

export async function renderChat(root, params = {}) {
  rootRef = root;
  if (!keyStatus) keyStatus = await window.api.keyStatus();
  const d = state.data;
  if (!activeChatId || !activeChat()) activeChatId = d.chats[0]?.id || null;

  const header = h(
    'div',
    { class: 'page-head' },
    h('div', {}, h('h1', {}, 'ИИ-помощник'), h('div', { class: 'muted' }, 'Обсуди идеи, планы и следующие шаги')),
    h(
      'div',
      { class: 'head-actions' },
      h(
        'label',
        { class: 'toggle', title: 'Помощник будет видеть твои планы, задачи и события' },
        h('input', {
          type: 'checkbox',
          checked: d.settings.chatUsesContext,
          onchange: (e) => update((x) => (x.settings.chatUsesContext = e.target.checked), { silent: true }),
        }),
        h('span', { class: 'toggle-track' }),
        h('span', { class: 'small' }, 'Учитывать мои планы'),
      ),
      h(
        'select',
        {
          class: 'input select-sm',
          title: 'Модель',
          onchange: (e) => update((x) => (x.settings.model = e.target.value), { silent: true }),
        },
        MODELS.map((m) => h('option', { value: m.id, selected: m.id === d.settings.model }, m.label)),
        MODELS.some((m) => m.id === d.settings.model)
          ? null
          : h('option', { value: d.settings.model, selected: true }, d.settings.model),
      ),
    ),
  );

  if (!keyStatus.hasKey) {
    root.replaceChildren(
      header,
      keySetup(() => renderChat(root)),
    );
    return;
  }

  const chat = activeChat();
  const side = h(
    'div',
    { class: 'card chat-side' },
    h(
      'button',
      { class: 'btn btn-soft full', onclick: () => (newChat(), renderChat(root)) },
      icon('plus', 16),
      'Новый разговор',
    ),
    h(
      'div',
      { class: 'chat-list' },
      d.chats.map((c) =>
        h(
          'div',
          {
            class: `chat-item${c.id === activeChatId ? ' active' : ''}`,
            onclick: () => ((activeChatId = c.id), renderChat(root)),
          },
          h('span', { class: 'ellipsis' }, c.title),
          h(
            'button',
            {
              class: 'icon-btn small',
              title: 'Удалить разговор',
              onclick: async (e) => {
                e.stopPropagation();
                if (await confirmDialog(`Удалить разговор «${c.title}»?`)) {
                  update((x) => (x.chats = x.chats.filter((y) => y.id !== c.id)), { silent: true });
                  if (activeChatId === c.id) activeChatId = null;
                  renderChat(root);
                }
              },
            },
            icon('trash', 14),
          ),
        ),
      ),
    ),
  );

  const messages = h('div', { class: 'chat-messages' });
  const list = chat?.messages || [];
  if (!list.length && !streaming) {
    messages.append(
      h(
        'div',
        { class: 'chat-welcome' },
        emptyState('С чего начнём?', 'Выбери подсказку или напиши свой вопрос'),
        h(
          'div',
          { class: 'suggestions' },
          SUGGESTIONS.map((s) => h('button', { class: 'chip-btn', onclick: () => send(s) }, s)),
        ),
      ),
    );
  }
  for (const m of list) {
    if (m.role === 'error') {
      messages.append(h('div', { class: 'msg error' }, h('div', { class: 'msg-body' }, m.content)));
      continue;
    }
    const body = h('div', { class: 'msg-body' });
    if (m.role === 'assistant') body.innerHTML = md(m.content);
    else body.textContent = m.content;
    messages.append(
      h(
        'div',
        { class: `msg ${m.role}` },
        body,
        m.role === 'assistant'
          ? h(
              'div',
              { class: 'msg-actions' },
              h(
                'button',
                {
                  class: 'link small',
                  onclick: () => {
                    navigator.clipboard.writeText(m.content);
                    toast('Скопировано');
                  },
                },
                'Копировать',
              ),
              h(
                'button',
                {
                  class: 'link small',
                  onclick: () => {
                    const firstLine = m.content.split('\n').find((l) => l.trim()) || 'Из чата';
                    createNote({
                      title: firstLine
                        .replace(/[#*_`>]/g, '')
                        .trim()
                        .slice(0, 60),
                      body: m.content,
                      color: 'lavender',
                    });
                    toast('Сохранено в заметки', 'success');
                  },
                },
                'В заметки',
              ),
            )
          : null,
      ),
    );
  }
  if (streaming && streaming.chatId === activeChatId) {
    const body = h('div', { class: 'msg-body' });
    body.innerHTML = streaming.text ? md(streaming.text) : '<span class="typing"><i></i><i></i><i></i></span>';
    messages.append(h('div', { class: 'msg assistant streaming' }, body));
  }

  const input = h('textarea', {
    class: 'chat-input',
    rows: 1,
    placeholder: 'Напиши сообщение… (Enter — отправить, Shift+Enter — новая строка)',
    oninput: (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
    },
    onkeydown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(input.value);
      }
    },
  });
  if (params.prompt) input.value = params.prompt;

  const sendBtn = streaming
    ? h(
        'button',
        { class: 'btn btn-soft send-btn', title: 'Остановить', onclick: () => window.api.abortChat(streaming.reqId) },
        icon('stop', 18),
      )
    : h(
        'button',
        { class: 'btn btn-primary send-btn', title: 'Отправить', onclick: () => send(input.value) },
        icon('send', 18),
      );

  root.replaceChildren(
    header,
    h(
      'div',
      { class: 'chat-layout' },
      side,
      h('div', { class: 'card chat-main' }, messages, h('div', { class: 'composer' }, input, sendBtn)),
    ),
  );
  scrollToBottom();
  input.focus();
  if (params.prompt) route.params = {};
}

export function resetKeyStatus() {
  keyStatus = null;
}
