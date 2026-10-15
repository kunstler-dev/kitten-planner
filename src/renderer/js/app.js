import { h, icon } from './ui.js';
import { initState, subscribe, state } from './state.js';
import { registerView, navigate, onRoute, route, getView } from './router.js';
import { renderHome } from './views/home.js';
import { renderNotes } from './views/notes.js';
import { renderTasks } from './views/tasks.js';
import { renderCalendar } from './views/calendar.js';
import { renderChat, initChatEvents } from './views/chat.js';
import { renderSettings } from './views/settings.js';
import { initKitten } from './kitten.js';

const NAV = [
  { id: 'home', label: 'Главная', icon: 'home' },
  { id: 'tasks', label: 'Планы и задачи', icon: 'tasks' },
  { id: 'calendar', label: 'Календарь', icon: 'calendar' },
  { id: 'notes', label: 'Заметки', icon: 'note' },
  { id: 'chat', label: 'ИИ-помощник', icon: 'chat' },
];

registerView('home', renderHome);
registerView('notes', renderNotes);
registerView('tasks', renderTasks);
registerView('calendar', renderCalendar);
registerView('chat', renderChat);
registerView('settings', renderSettings);

const view = document.getElementById('view');
const nav = document.getElementById('nav');

function renderNav() {
  const item = (n) =>
    h(
      'button',
      {
        class: `nav-item${route.name === n.id ? ' active' : ''}`,
        dataset: { view: n.id },
        onclick: () => navigate(n.id),
      },
      icon(n.icon, 19),
      h('span', {}, n.label),
    );
  nav.replaceChildren(
    ...NAV.map(item),
    h('div', { class: 'nav-spacer' }),
    item({ id: 'settings', label: 'Настройки', icon: 'settings' }),
  );
}

function renderView(params = route.params) {
  getView(route.name)?.(view, params);
}

onRoute(() => {
  renderNav();
  view.classList.remove('enter');
  void view.offsetWidth;
  view.classList.add('enter');
  view.scrollTop = 0;
  renderView();
});

async function boot() {
  await initState();
  initChatEvents();
  subscribe(() => renderView({}));
  renderNav();
  renderView();
  initKitten({ enabled: state.data.settings.kitten, speed: state.data.settings.kittenSpeed });

  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.altKey) return;
    const idx = Number(e.key) - 1;
    if (idx >= 0 && idx < NAV.length) {
      e.preventDefault();
      navigate(NAV[idx].id);
    }
  });
  document.body.classList.add('ready');
}

boot();
