'use strict';

const path = require('node:path');
const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu } = require('electron');
const { Store, normalize } = require('./store');
const { Secrets } = require('./secrets');
const { streamChat, testKey } = require('./openai');

if (process.env.KITTEN_PLANNER_DATA_DIR) {
  app.setPath('userData', process.env.KITTEN_PLANNER_DATA_DIR);
}

// Russian UI for built-in controls (date/time pickers, spellcheck, dialogs).
app.commandLine.appendSwitch('lang', 'ru');

const isDev = process.argv.includes('--dev');
let store;
let secrets;
let mainWindow;
const activeChats = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    show: false,
    backgroundColor: '#f8f5f2',
    title: 'Kitten Planner',
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#f8f5f2', symbolColor: '#6e6378', height: 40 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Links from chat / notes open in the system browser, never inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
}

function registerIpc() {
  ipcMain.handle('data:load', () => store.load());
  ipcMain.handle('data:save', (_e, data) => store.save(data));

  ipcMain.handle('key:status', () => {
    const key = secrets.get();
    return {
      hasKey: Boolean(key),
      masked: key ? `${key.slice(0, 3)}…${key.slice(-4)}` : '',
      encrypted: secrets.canEncrypt(),
    };
  });
  ipcMain.handle('key:set', (_e, key) => {
    secrets.set(key);
    return true;
  });
  ipcMain.handle('key:test', async (_e, key) => {
    try {
      await testKey({ apiKey: key || secrets.get() });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('chat:start', async (event, { id, model, messages }) => {
    const controller = new AbortController();
    activeChats.set(id, controller);
    const send = (channel, payload) => {
      if (!event.sender.isDestroyed()) event.sender.send(channel, { id, ...payload });
    };
    try {
      const text = await streamChat({
        apiKey: secrets.get(),
        model,
        messages,
        signal: controller.signal,
        onDelta: (delta) => send('chat:delta', { delta }),
      });
      send('chat:done', { text });
    } catch (err) {
      if (err.name === 'AbortError') send('chat:done', { aborted: true });
      else {
        const msg =
          err.cause?.code === 'ENOTFOUND' || err.message === 'fetch failed'
            ? 'Нет соединения с интернетом или OpenAI недоступен.'
            : err.message;
        send('chat:error', { error: msg });
      }
    } finally {
      activeChats.delete(id);
    }
    return true;
  });
  ipcMain.handle('chat:abort', (_e, id) => {
    activeChats.get(id)?.abort();
    return true;
  });

  ipcMain.handle('app:open-data-folder', () => shell.openPath(app.getPath('userData')));
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    dataDir: app.getPath('userData'),
  }));

  ipcMain.handle('data:export', async (_e, data) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Сохранить резервную копию',
      defaultPath: `kitten-planner-backup-${stamp}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return false;
    require('node:fs').writeFileSync(filePath, JSON.stringify(normalize(data), null, 2), 'utf8');
    return true;
  });
  ipcMain.handle('data:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Восстановить из резервной копии',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePaths[0]) return null;
    const raw = JSON.parse(require('node:fs').readFileSync(filePaths[0], 'utf8'));
    const data = normalize(raw);
    store.save(data);
    return data;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    store = new Store(app.getPath('userData'));
    secrets = new Secrets(app.getPath('userData'), safeStorage);
    registerIpc();
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
