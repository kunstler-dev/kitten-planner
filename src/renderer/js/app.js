import { initState, subscribe, state } from './state.js';
import { setLang } from './i18n.js';
import { registerView, navigate, onRoute } from './router.js';
import { renderNav, renderTopbar, renderView, NAV_GROUPS } from './app-shell.js';
import { renderHome } from './views/home.js';
import { renderLaunch } from './views/launch.js';
import { renderWorkshop } from './views/workshop.js';
import { renderFinance } from './views/finance.js';
import { renderDocuments } from './views/documents.js';
import { renderNotes } from './views/notes.js';
import { renderTasks } from './views/tasks.js';
import { renderCalendar } from './views/calendar.js';
import { renderChat, initChatEvents } from './views/chat.js';
import { renderSettings } from './views/settings.js';
import { initKitten } from './kitten.js';
import { initSync } from './sync/sync.js';

registerView('home', renderHome);
registerView('legal', (root, params) => renderLaunch(root, { ...params, kind: 'legal' }));
registerView('commercial', (root, params) => renderLaunch(root, { ...params, kind: 'commercial' }));
registerView('workshop', renderWorkshop);
registerView('finance', renderFinance);
registerView('documents', renderDocuments);
registerView('plans', renderTasks);
registerView('calendar', renderCalendar);
registerView('notes', renderNotes);
registerView('chat', renderChat);
registerView('settings', renderSettings);

const view = document.getElementById('view');

onRoute(() => {
  renderNav();
  view.classList.remove('enter');
  void view.offsetWidth;
  view.classList.add('enter');
  view.scrollTop = 0;
  renderView();
});

async function boot() {
  // Phone/web build: no Electron preload, so install the browser implementation of window.api.
  if (!window.api) await (await import('./platform/web.js')).installWebApi();
  await initState();
  setLang(state.data.settings.lang);
  document.documentElement.dataset.theme = state.data.settings.theme;
  initChatEvents();
  subscribe(() => renderView({}));
  renderNav();
  renderTopbar();
  renderView();
  initKitten({ enabled: state.data.settings.kitten, speed: state.data.settings.kittenSpeed });

  // Ctrl+1..9 jumps between sections in sidebar order.
  const order = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.altKey) return;
    const idx = Number(e.key) - 1;
    if (idx >= 0 && idx < order.length) {
      e.preventDefault();
      navigate(order[idx]);
    }
  });
  document.body.classList.add('ready');
  initSync().catch(() => {});
}

boot();
