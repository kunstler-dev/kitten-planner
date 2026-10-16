import { h, icon, toast, confirmDialog, field, segmented } from '../ui.js';
import { state, update, replaceData, flushSave } from '../state.js';
import { t } from '../i18n.js';
import { MODELS, resetKeyStatus, chatErrorText } from './chat.js';
import { setKittenEnabled, setKittenSpeed } from '../kitten.js';
import { setPetsEnabled } from '../pets.js';
import { applyLang, applyTheme } from '../app-shell.js';
import { syncStatus, onSyncStatus, syncNow, connectCloud, disconnectCloud, WEB_APP_URL } from '../sync/sync.js';
import { relativeTime } from '../dates.js';

const BUSINESS_FIELDS = [
  ['company', 'set.company', 'set.companyPlaceholder'],
  ['owner', 'set.owner', ''],
  ['email', 'set.email', ''],
  ['phone', 'set.phone', ''],
  ['taxNumber', 'set.taxNumber', '123/456/78901'],
  ['vatId', 'set.vatId', 'DE…'],
  ['bank', 'set.bank', ''],
  ['iban', 'set.iban', 'DE00 0000 …'],
  ['bic', 'set.bic', ''],
];

const isWeb = () => window.api.platform === 'web';
let unsubscribeSync = null;

/** "Sync with the phone" card; repaints itself on sync status changes (never the whole page). */
function syncCard() {
  const card = h('section', { class: 'card sync-card', id: 'sync' });
  const busy = h('div', { class: 'small muted' });
  const paint = () => {
    const st = syncStatus();
    const connected = !['off', 'unconfigured'].includes(st.state);
    const when = st.lastSync ? relativeTime(st.lastSync) : '';
    card.replaceChildren(
      h('h2', {}, icon('phone', 18), t('sync.title')),
      h('div', { class: 'muted small' }, t('sync.intro')),
      st.state === 'unconfigured'
        ? h('div', { class: 'sync-note' }, t('sync.unconfigured'))
        : connected
          ? h(
              'div',
              { class: 'sync-row' },
              h('span', { class: `sync-dot s-${st.state}` }),
              h(
                'div',
                { class: 'sync-text' },
                h('b', {}, t(`sync.state.${st.state}`, { when })),
                st.email ? h('div', { class: 'muted small' }, t('sync.account', { email: st.email })) : null,
              ),
              h(
                'div',
                { class: 'btn-row' },
                h('button', { class: 'btn btn-soft', onclick: () => syncNow() }, icon('cloudSync', 16), t('sync.now')),
                h(
                  'button',
                  {
                    class: 'btn btn-ghost',
                    onclick: async () => {
                      if (await confirmDialog(t('sync.disconnectConfirm'), { okText: t('sync.disconnect') }))
                        await disconnectCloud();
                    },
                  },
                  t('sync.disconnect'),
                ),
              ),
            )
          : h(
              'div',
              { class: 'btn-row' },
              h(
                'button',
                {
                  class: 'btn btn-primary',
                  onclick: async () => {
                    busy.textContent = isWeb() ? '' : t('sync.connecting');
                    const ok = await connectCloud();
                    busy.textContent = '';
                    toast(ok ? t('sync.connected') : t('sync.connectFailed'), ok ? 'success' : 'error');
                  },
                },
                icon('cloud', 16),
                t('sync.connect'),
              ),
            ),
      busy,
      h(
        'div',
        { class: 'muted small sync-hint' },
        isWeb() ? t('sync.phoneHintWeb') : t('sync.phoneHint', { url: WEB_APP_URL }),
      ),
    );
  };
  paint();
  unsubscribeSync?.();
  unsubscribeSync = onSyncStatus(() => (card.isConnected ? paint() : unsubscribeSync?.()));
  return card;
}

export async function renderSettings(root, params = {}) {
  const d = state.data;
  const info = await window.api.appInfo();
  const key = await window.api.keyStatus();

  const name = h('input', {
    class: 'input',
    value: d.profile.name || '',
    placeholder: t('set.namePlaceholder'),
    oninput: (e) => update((x) => (x.profile.name = e.target.value), { silent: true }),
  });
  const keyInput = h('input', {
    class: 'input',
    type: 'password',
    placeholder: key.hasKey ? t('set.keySaved', { key: key.masked }) : 'sk-…',
    autocomplete: 'off',
  });
  const keyMsg = h(
    'div',
    { class: 'small muted' },
    key.hasKey ? (key.encrypted ? t('set.keyEncrypted') : t('set.keyLocal')) : t('set.keyNone'),
  );
  const toggle = (checked, onchange, label) =>
    h(
      'label',
      { class: 'toggle' },
      h('input', { type: 'checkbox', checked, onchange }),
      h('span', { class: 'toggle-track' }),
      h('span', {}, label),
    );

  const address = h('textarea', {
    class: 'input',
    rows: 3,
    placeholder: t('set.addressPlaceholder'),
    oninput: (e) => update((x) => (x.business.address = e.target.value), { silent: true }),
  });
  address.value = d.business.address || '';

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, t('nav.settings')), h('div', { class: 'muted' }, t('set.subtitle'))),
    ),
    h(
      'div',
      { class: 'settings-grid' },
      h(
        'section',
        { class: 'card' },
        h('h2', {}, t('set.profile')),
        field(t('set.name'), name),
        field(
          t('set.language'),
          segmented(
            [
              { value: 'uk', label: 'Українська' },
              { value: 'de', label: 'Deutsch' },
            ],
            d.settings.lang,
            (v) => applyLang(v),
          ),
        ),
        field(
          t('set.theme'),
          segmented(
            [
              { value: 'light', label: t('set.themeLight') },
              { value: 'dark', label: t('set.themeDark') },
            ],
            d.settings.theme,
            (v) => applyTheme(v),
          ),
        ),
      ),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, t('set.kitten')),
        toggle(
          d.settings.kitten,
          (e) => {
            update((x) => (x.settings.kitten = e.target.checked), { silent: true });
            setKittenEnabled(e.target.checked);
          },
          t('set.kittenShow'),
        ),
        toggle(
          d.settings.pets,
          (e) => {
            update((x) => (x.settings.pets = e.target.checked), { silent: true });
            setPetsEnabled(e.target.checked);
          },
          t('set.petsShow'),
        ),
        field(
          t('set.kittenSpeed'),
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
        h('div', { class: 'muted small' }, t('set.kittenHint')),
      ),
      h(
        'section',
        { class: 'card span-2' },
        h('h2', {}, t('set.business')),
        h('div', { class: 'muted small' }, t('set.businessHint')),
        h(
          'div',
          { class: 'biz-grid' },
          BUSINESS_FIELDS.map(([k, label, ph]) =>
            field(
              t(label),
              h('input', {
                class: 'input',
                value: d.business[k] || '',
                placeholder: ph.startsWith('set.') ? t(ph) : ph,
                oninput: (e) => update((x) => (x.business[k] = e.target.value), { silent: true }),
              }),
            ),
          ),
          field(t('set.address'), address),
        ),
        toggle(
          d.business.kleinunternehmer,
          (e) => update((x) => (x.business.kleinunternehmer = e.target.checked), { silent: true }),
          t('set.ku'),
        ),
        h('div', { class: 'muted small' }, t('set.kuHint')),
      ),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, 'ChatGPT'),
        field(t('set.apiKey'), keyInput),
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
                keyMsg.textContent = t('chat.checkingKey');
                const res = await window.api.testKey(v);
                if (!res.ok) {
                  keyMsg.textContent = chatErrorText(res.code, res.detail);
                  return;
                }
                await window.api.setKey(v);
                resetKeyStatus();
                toast(t('chat.keySaved'), 'success');
                renderSettings(root);
              },
            },
            t('set.saveKey'),
          ),
          key.hasKey
            ? h(
                'button',
                {
                  class: 'btn btn-ghost danger-text',
                  onclick: async () => {
                    if (await confirmDialog(t('set.deleteKeyConfirm'))) {
                      await window.api.setKey('');
                      resetKeyStatus();
                      renderSettings(root);
                    }
                  },
                },
                t('set.deleteKey'),
              )
            : null,
        ),
        field(
          t('set.model'),
          h(
            'select',
            { class: 'input', onchange: (e) => update((x) => (x.settings.model = e.target.value), { silent: true }) },
            MODELS.map((m) => h('option', { value: m.id, selected: m.id === d.settings.model }, m.label)),
          ),
        ),
      ),
      syncCard(),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, t('set.data')),
        isWeb()
          ? h('div', { class: 'muted small' }, t('set.dataWeb'))
          : h('div', { class: 'muted small' }, t('set.dataFolder')),
        isWeb() ? null : h('code', { class: 'path' }, info.dataDir),
        h(
          'div',
          { class: 'btn-row' },
          isWeb()
            ? null
            : h(
                'button',
                { class: 'btn btn-soft', onclick: () => window.api.openDataFolder() },
                icon('folder', 16),
                t('set.openFolder'),
              ),
          h(
            'button',
            {
              class: 'btn btn-soft',
              onclick: async () => {
                await flushSave();
                if (await window.api.exportData({ data: state.data, title: t('set.export') }))
                  toast(t('set.exported'), 'success');
              },
            },
            icon('download', 16),
            t('set.export'),
          ),
          h(
            'button',
            {
              class: 'btn btn-soft',
              onclick: async () => {
                if (!(await confirmDialog(t('set.importConfirm'), { okText: t('set.import') }))) return;
                try {
                  const data = await window.api.importData({ title: t('set.import') });
                  if (data) {
                    replaceData(data);
                    toast(t('set.imported'), 'success');
                  }
                } catch {
                  toast(t('set.importError'), 'error');
                }
              },
            },
            icon('upload', 16),
            t('set.import'),
          ),
        ),
        h('div', { class: 'muted small' }, t('set.backupHint')),
      ),
      h(
        'section',
        { class: 'card about' },
        icon('paw', 22),
        h(
          'div',
          {},
          h('b', {}, 'Kitten Planner'),
          h('div', { class: 'muted small' }, t('set.version', { v: info.version })),
        ),
      ),
    ),
  );
  if (params.section === 'sync') document.getElementById('sync')?.scrollIntoView({ block: 'center' });
}
