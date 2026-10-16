import { h, icon, toast, confirmDialog, emptyState } from '../ui.js';
import { state, update, uid } from '../state.js';
import { todayKey } from '../dates.js';
import { t, tx, money } from '../i18n.js';
import { planProgress } from './common.js';
import { createNote } from './notes.js';
import { route } from '../router.js';
import { progress, nextSteps } from '../launch-model.js';

export const MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini' },
  { id: 'gpt-5', label: 'GPT-5' },
];

const SUGGESTION_COUNT = 5;

let activeChatId = null;
let keyStatus = null;
let streaming = null; // { reqId, chatId, text }
let rootRef = null;

export function chatErrorText(code, detail) {
  const base = t(`chat.err.${code}`);
  return detail && code !== 'bad_key' ? `${base} (${detail})` : base;
}

function systemPrompt() {
  const d = state.data;
  let text = t('chat.system');
  if (d.profile.name) text += `\n${t('chat.sysName', { name: d.profile.name })}`;
  text += `\n${t('chat.sysToday', { date: todayKey() })}`;
  if (!d.settings.chatUsesContext) return text;

  const lines = [];
  for (const kind of ['legal', 'commercial']) {
    const pr = progress(kind);
    lines.push(
      `${t(`nav.${kind}`)}: ${pr.done}/${pr.total}. ${t('launch.next')}: ${nextSteps(kind, 3)
        .map((s) => (s.custom ? s.title : tx(s.title)))
        .join('; ')}`,
    );
  }
  text += `\n\n${t('chat.sysLaunch')}\n${lines.join('\n')}`;

  const plans = d.plans.map((p) => {
    const pr = planProgress(p.id);
    return `- ${p.title}${p.deadline ? ` (${p.deadline})` : ''}: ${pr.done}/${pr.total}`;
  });
  const tasks = d.tasks
    .filter((x) => !x.done)
    .slice(0, 40)
    .map((x) => `- ${x.title}${x.due ? ` [${x.due}]` : ''}`);
  const today = todayKey();
  const events = d.events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 15)
    .map((e) => `- ${e.date}${e.time ? ` ${e.time}` : ''}: ${e.title}`);
  const products = d.products
    .slice(0, 20)
    .map((p) => `- ${p.name}: ${money(p.price)} (${t('ws.costShort')} ${money(p.cost)})`);
  if (plans.length) text += `\n\n${t('chat.sysPlans')}\n${plans.join('\n')}`;
  if (tasks.length) text += `\n\n${t('chat.sysTasks')}\n${tasks.join('\n')}`;
  if (events.length) text += `\n\n${t('chat.sysEvents')}\n${events.join('\n')}`;
  if (products.length) text += `\n\n${t('chat.sysProducts')}\n${products.join('\n')}`;
  return text;
}

function md(text) {
  return window.DOMPurify.sanitize(window.marked.parse(text || '', { breaks: true, gfm: true }));
}

function activeChat() {
  return state.data.chats.find((c) => c.id === activeChatId);
}

function newChat() {
  const chat = { id: uid(), title: '', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  update((d) => d.chats.unshift(chat), { silent: true });
  activeChatId = chat.id;
  return chat;
}

function send(text) {
  text = text.trim();
  if (!text || streaming) return;
  const chat = activeChat() || newChat();
  update(
    () => {
      chat.messages.push({ role: 'user', content: text, ts: Date.now() });
      if (!chat.title) chat.title = text.slice(0, 48) + (text.length > 48 ? '…' : '');
      chat.updatedAt = Date.now();
    },
    { silent: true },
  );
  const reqId = uid();
  streaming = { reqId, chatId: chat.id, text: '' };
  const history = chat.messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map(({ role, content }) => ({ role, content }));
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
  window.api.onChatError(({ id, code, detail }) => {
    if (streaming?.reqId === id) finish(streaming.text, chatErrorText(code, detail));
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
    status.textContent = t('chat.checkingKey');
    const res = await window.api.testKey(key);
    if (!res.ok) {
      status.textContent = chatErrorText(res.code, res.detail);
      status.className = 'small danger-text';
      return;
    }
    await window.api.setKey(key);
    keyStatus = await window.api.keyStatus();
    toast(t('chat.keySaved'), 'success');
    onDone();
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && save());
  return h(
    'div',
    { class: 'card key-setup' },
    h('div', { class: 'key-icon' }, icon('key', 26)),
    h('h2', {}, t('chat.connect')),
    h(
      'p',
      { class: 'muted' },
      t('chat.keyHelp1'),
      h('a', { href: 'https://platform.openai.com/api-keys', target: '_blank' }, 'platform.openai.com/api-keys'),
      t('chat.keyHelp2'),
    ),
    h('div', { class: 'key-row' }, input, h('button', { class: 'btn btn-primary', onclick: save }, t('common.save'))),
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
    h('div', {}, h('h1', {}, t('nav.chat')), h('div', { class: 'muted' }, t('chat.subtitle'))),
    h(
      'div',
      { class: 'head-actions' },
      h(
        'label',
        { class: 'toggle', title: t('chat.contextHint') },
        h('input', {
          type: 'checkbox',
          checked: d.settings.chatUsesContext,
          onchange: (e) => update((x) => (x.settings.chatUsesContext = e.target.checked), { silent: true }),
        }),
        h('span', { class: 'toggle-track' }),
        h('span', { class: 'small' }, t('chat.useContext')),
      ),
      h(
        'select',
        {
          class: 'input select-sm',
          title: t('chat.model'),
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
      t('chat.new'),
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
          h('span', { class: 'ellipsis' }, c.title || t('chat.new')),
          h(
            'button',
            {
              class: 'icon-btn small',
              title: t('common.delete'),
              onclick: async (e) => {
                e.stopPropagation();
                if (await confirmDialog(t('chat.delete', { title: c.title || t('chat.new') }))) {
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
        emptyState(t('chat.welcome'), t('chat.welcomeHint')),
        h(
          'div',
          { class: 'suggestions' },
          Array.from({ length: SUGGESTION_COUNT }, (_, i) => t(`chat.suggest.${i}`)).map((s) =>
            h('button', { class: 'chip-btn', onclick: () => send(s) }, s),
          ),
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
                  onclick: () => (navigator.clipboard.writeText(m.content), toast(t('chat.copied'))),
                },
                t('chat.copy'),
              ),
              h(
                'button',
                {
                  class: 'link small',
                  onclick: () => {
                    const firstLine = m.content.split('\n').find((l) => l.trim()) || t('nav.chat');
                    createNote({
                      title: firstLine
                        .replace(/[#*_`>]/g, '')
                        .trim()
                        .slice(0, 60),
                      body: m.content,
                      color: 'lavender',
                    });
                    toast(t('chat.savedToNotes'), 'success');
                  },
                },
                t('chat.toNotes'),
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
    placeholder: t('chat.placeholder'),
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
        { class: 'btn btn-soft send-btn', title: t('chat.stop'), onclick: () => window.api.abortChat(streaming.reqId) },
        icon('stop', 18),
      )
    : h(
        'button',
        { class: 'btn btn-primary send-btn', title: t('chat.send'), onclick: () => send(input.value) },
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
