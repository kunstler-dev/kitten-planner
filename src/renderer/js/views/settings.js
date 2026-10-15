import { h, icon, toast, confirmDialog, field } from '../ui.js';
import { state, update, replaceData, flushSave } from '../state.js';
import { MODELS, resetKeyStatus } from './chat.js';
import { setKittenEnabled, setKittenSpeed } from '../kitten.js';

export async function renderSettings(root) {
  const d = state.data;
  const info = await window.api.appInfo();
  const key = await window.api.keyStatus();

  const name = h('input', {
    class: 'input',
    value: d.profile.name || '',
    placeholder: 'Как к тебе обращаться?',
    oninput: (e) => update((x) => (x.profile.name = e.target.value), { silent: true }),
  });

  const keyInput = h('input', {
    class: 'input',
    type: 'password',
    placeholder: key.hasKey ? `Сохранён: ${key.masked}` : 'sk-…',
    autocomplete: 'off',
  });
  const keyMsg = h(
    'div',
    { class: 'small muted' },
    key.hasKey
      ? key.encrypted
        ? 'Ключ хранится зашифрованным средствами Windows.'
        : 'Ключ сохранён локально.'
      : 'Ключ не задан.',
  );

  const toggle = (checked, onchange, label) =>
    h(
      'label',
      { class: 'toggle' },
      h('input', { type: 'checkbox', checked, onchange }),
      h('span', { class: 'toggle-track' }),
      h('span', {}, label),
    );

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Настройки'), h('div', { class: 'muted' }, 'Всё хранится только на этом компьютере')),
    ),
    h(
      'div',
      { class: 'settings-grid' },
      h('section', { class: 'card' }, h('h2', {}, 'Профиль'), field('Имя', name)),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, 'Котёнок'),
        toggle(
          d.settings.kitten,
          (e) => {
            update((x) => (x.settings.kitten = e.target.checked), { silent: true });
            setKittenEnabled(e.target.checked);
          },
          'Показывать котёнка',
        ),
        field(
          'Скорость',
          h('input', {
            type: 'range',
            min: 0.5,
            max: 2,
            step: 0.1,
            value: d.settings.kittenSpeed,
            class: 'range',
            oninput: (e) => {
              const v = Number(e.target.value);
              update((x) => (x.settings.kittenSpeed = v), { silent: true });
              setKittenSpeed(v);
            },
          }),
        ),
        h('div', { class: 'muted small' }, 'Подержи курсор над котёнком — он замурлычет.'),
      ),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, 'ChatGPT'),
        field('API-ключ OpenAI', keyInput),
        keyMsg,
        h(
          'div',
          { class: 'btn-row' },
          h(
            'button',
            {
              class: 'btn btn-primary',
              onclick: async () => {
                const v = keyInput.value.trim();
                if (!v) return keyInput.focus();
                keyMsg.textContent = 'Проверяю…';
                const res = await window.api.testKey(v);
                if (!res.ok) {
                  keyMsg.textContent = res.error;
                  return;
                }
                await window.api.setKey(v);
                resetKeyStatus();
                toast('Ключ сохранён', 'success');
                renderSettings(root);
              },
            },
            'Сохранить ключ',
          ),
          key.hasKey
            ? h(
                'button',
                {
                  class: 'btn btn-ghost danger-text',
                  onclick: async () => {
                    if (await confirmDialog('Удалить сохранённый API-ключ?')) {
                      await window.api.setKey('');
                      resetKeyStatus();
                      renderSettings(root);
                    }
                  },
                },
                'Удалить ключ',
              )
            : null,
        ),
        field(
          'Модель по умолчанию',
          h(
            'select',
            { class: 'input', onchange: (e) => update((x) => (x.settings.model = e.target.value), { silent: true }) },
            MODELS.map((m) => h('option', { value: m.id, selected: m.id === d.settings.model }, m.label)),
          ),
        ),
      ),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, 'Данные'),
        h('div', { class: 'muted small' }, 'Папка с данными:'),
        h('code', { class: 'path' }, info.dataDir),
        h(
          'div',
          { class: 'btn-row' },
          h(
            'button',
            { class: 'btn btn-soft', onclick: () => window.api.openDataFolder() },
            icon('folder', 16),
            'Открыть папку',
          ),
          h(
            'button',
            {
              class: 'btn btn-soft',
              onclick: async () => {
                await flushSave();
                if (await window.api.exportData(state.data)) toast('Резервная копия сохранена', 'success');
              },
            },
            icon('download', 16),
            'Экспорт',
          ),
          h(
            'button',
            {
              class: 'btn btn-soft',
              onclick: async () => {
                if (
                  !(await confirmDialog('Импорт заменит все текущие данные данными из файла. Продолжить?', {
                    okText: 'Импортировать',
                  }))
                )
                  return;
                try {
                  const data = await window.api.importData();
                  if (data) {
                    replaceData(data);
                    toast('Данные восстановлены', 'success');
                  }
                } catch {
                  toast('Не удалось прочитать файл', 'error');
                }
              },
            },
            icon('upload', 16),
            'Импорт',
          ),
        ),
        h('div', { class: 'muted small' }, 'API-ключ не попадает в резервную копию.'),
      ),
      h(
        'section',
        { class: 'card about' },
        icon('paw', 22),
        h('div', {}, h('b', {}, 'Kitten Planner'), h('div', { class: 'muted small' }, `Версия ${info.version}`)),
      ),
    ),
  );
}
