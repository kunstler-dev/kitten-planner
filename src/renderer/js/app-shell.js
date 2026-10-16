// App chrome: left navigation, top-right language/theme switches, re-render helpers.
import { h, icon } from './ui.js';
import { state, update } from './state.js';
import { t, setLang, getLang, LANG_LABELS } from './i18n.js';
import { navigate, route, getView } from './router.js';
import { petCorner } from './pets.js';
import { syncStatus, onSyncStatus, syncNow, connectCloud } from './sync/sync.js';
import { relativeTime } from './dates.js';

export const NAV_GROUPS = [
  { items: [{ id: 'home', icon: 'home' }] },
  {
    title: 'nav.groupBusiness',
    items: [
      { id: 'legal', icon: 'scale' },
      { id: 'commercial', icon: 'store' },
      { id: 'workshop', icon: 'book' },
      { id: 'finance', icon: 'wallet' },
      { id: 'documents', icon: 'docs' },
    ],
  },
  {
    title: 'nav.groupOrganize',
    items: [
      { id: 'plans', icon: 'tasks' },
      { id: 'calendar', icon: 'calendar' },
      { id: 'notes', icon: 'note' },
      { id: 'chat', icon: 'chat' },
    ],
  },
];

export function renderNav() {
  const nav = document.getElementById('nav');
  const item = (n) =>
    h(
      'button',
      {
        class: `nav-item${route.name === n.id ? ' active' : ''}`,
        dataset: { view: n.id },
        onclick: () => {
          setNavOpen(false);
          navigate(n.id);
        },
      },
      icon(n.icon, 19),
      h('span', {}, t(`nav.${n.id}`)),
    );
  nav.replaceChildren(
    ...NAV_GROUPS.map((g) =>
      h(
        'div',
        { class: 'nav-group' },
        g.title ? h('div', { class: 'nav-group-title' }, t(g.title)) : null,
        g.items.map(item),
      ),
    ),
    h('div', { class: 'nav-spacer' }),
    petCorner(),
    item({ id: 'settings', icon: 'settings' }),
  );
}

const SYNC_ICONS = { ok: 'cloudOk', syncing: 'cloudSync', off: 'cloudOff', unconfigured: 'cloudOff' };

function syncTitle(st) {
  const when = st.lastSync ? relativeTime(st.lastSync) : '';
  return t(`sync.state.${st.state}`, { when });
}

/** Cloud button in the top bar: shows the sync state; click syncs now (or opens the settings). */
function syncButton() {
  const btn = h('button', {
    class: 'sync-switch',
    id: 'sync-toggle',
    onclick: () => {
      const st = syncStatus();
      if (st.state === 'auth') connectCloud();
      else if (st.state === 'off' || st.state === 'unconfigured') navigate('settings', { section: 'sync' });
      else syncNow();
    },
  });
  const paint = (st) => {
    btn.dataset.state = st.state;
    btn.title = syncTitle(st);
    btn.replaceChildren(icon(SYNC_ICONS[st.state] || 'cloud', 18));
  };
  paint(syncStatus());
  return { btn, paint };
}

let unsubscribeSync = null;

// Phone layout: the sidebar becomes a drawer behind the ☰ button.
export function setNavOpen(open) {
  document.body.classList.toggle('nav-open', open);
}

export function renderTopbar() {
  const box = document.getElementById('topbar-actions');
  const theme = state.data.settings.theme;
  const menu = document.getElementById('menu-toggle');
  if (menu && !menu.firstChild) {
    menu.append(icon('menu', 20));
    menu.setAttribute('aria-label', 'Menu');
    menu.onclick = () => setNavOpen(!document.body.classList.contains('nav-open'));
    document.getElementById('nav-backdrop').onclick = () => setNavOpen(false);
  }
  const sync = syncButton();
  unsubscribeSync?.();
  unsubscribeSync = onSyncStatus(sync.paint);
  box.replaceChildren(
    sync.btn,
    h(
      'div',
      { class: 'lang-switch', role: 'group', 'aria-label': t('set.language') },
      Object.keys(LANG_LABELS).map((l) =>
        h(
          'button',
          { class: getLang() === l ? 'active' : '', dataset: { lang: l }, onclick: () => applyLang(l) },
          LANG_LABELS[l],
        ),
      ),
    ),
    h(
      'button',
      {
        class: 'theme-switch',
        id: 'theme-toggle',
        title: theme === 'dark' ? t('set.themeLight') : t('set.themeDark'),
        onclick: () => applyTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      icon(theme === 'dark' ? 'sun' : 'moon', 17),
    ),
  );
}

export function renderView(params = route.params) {
  getView(route.name)?.(document.getElementById('view'), params);
}

export function refreshAll() {
  renderNav();
  renderTopbar();
  renderView({ ...route.params, kind: route.params.kind });
}

export function applyLang(lang) {
  update((d) => (d.settings.lang = lang), { silent: true });
  setLang(lang);
  refreshAll();
}

export function applyTheme(theme) {
  update((d) => (d.settings.theme = theme), { silent: true });
  document.documentElement.dataset.theme = theme;
  window.api.setTheme(theme);
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  refreshAll();
}
