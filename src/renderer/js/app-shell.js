// App chrome: left navigation, top-right language/theme switches, re-render helpers.
import { h, icon } from './ui.js';
import { state, update } from './state.js';
import { t, setLang, getLang, LANG_LABELS } from './i18n.js';
import { navigate, route, getView } from './router.js';

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
        onclick: () => navigate(n.id),
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
    item({ id: 'settings', icon: 'settings' }),
  );
}

export function renderTopbar() {
  const box = document.getElementById('topbar-actions');
  const theme = state.data.settings.theme;
  box.replaceChildren(
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
