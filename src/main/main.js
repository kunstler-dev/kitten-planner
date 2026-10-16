'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu, session, net } = require('electron');
const { Store, normalize } = require('./store');
const { Secrets } = require('./secrets');
const { streamChat, testKey } = require('./openai');
const { GoogleAuth } = require('./google');
const googleConfig = require('../google-config.json');

if (process.env.KITTEN_PLANNER_DATA_DIR) {
  app.setPath('userData', process.env.KITTEN_PLANNER_DATA_DIR);
}

const store = new Store(app.getPath('userData'));
const docsDir = path.join(app.getPath('userData'), 'documents');

// Built-in controls (date pickers, spellcheck) follow the saved UI language.
const savedLang = store.load().settings.lang;
app.commandLine.appendSwitch('lang', savedLang === 'de' ? 'de' : 'uk');
// Lets the 3D kitten fall back to software WebGL on PCs/VMs without a usable GPU (content is local and trusted).
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

const isDev = process.argv.includes('--dev');

// Embedded ChatGPT (her own account): a sandboxed <webview> with its own persistent session.
const GPT_PARTITION = 'persist:chatgpt';
const GPT_HOSTS = [/(^|\.)chatgpt\.com$/, /(^|\.)openai\.com$/, /(^|\.)oaistatic\.com$/, /(^|\.)oaiusercontent\.com$/];
const AUTH_HOSTS = [
  /^accounts\.google\.com$/,
  /(^|\.)googleusercontent\.com$/,
  /^login\.live\.com$/,
  /^login\.microsoftonline\.com$/,
  /^appleid\.apple\.com$/,
  /(^|\.)cloudflare\.com$/,
];
function hostMatches(url, list) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && list.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}
const isGptUrl = (url) => hostMatches(url, GPT_HOSTS);
const isGptOrAuthUrl = (url) => hostMatches(url, GPT_HOSTS) || hostMatches(url, AUTH_HOSTS);

app.on('web-contents-created', (_e, contents) => {
  // Only the ChatGPT webview may be attached, never with node access or a preload.
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    if (params.partition !== GPT_PARTITION || !isGptUrl(params.src)) event.preventDefault();
  });
  if (contents.getType() !== 'webview') return;
  contents.setWindowOpenHandler(({ url }) => {
    // Sign-in popups (Google / Microsoft / Apple) open as small windows sharing the ChatGPT session.
    if (isGptOrAuthUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 720,
          parent: mainWindow,
          autoHideMenuBar: true,
          webPreferences: { partition: GPT_PARTITION, sandbox: true, contextIsolation: true, nodeIntegration: false },
        },
      };
    }
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    if (!isGptOrAuthUrl(url)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
});
let secrets;
let google;
let mainWindow;
const activeChats = new Map();

const TITLEBAR = {
  light: { color: '#f8f5f2', symbolColor: '#6e6378' },
  dark: { color: '#1d1a22', symbolColor: '#cfc6da' },
};

function createWindow() {
  const theme = store.load().settings.theme === 'dark' ? 'dark' : 'light';
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1040,
    minHeight: 660,
    show: false,
    backgroundColor: TITLEBAR[theme].color,
    title: 'Kitten Planner',
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...TITLEBAR[theme], height: 44 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Links open in the system browser, never inside the app.
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

/** Resolve a stored document name inside docsDir, rejecting path traversal. */
function docPath(stored) {
  const name = path.basename(String(stored || ''));
  if (!name || name !== stored) throw new Error('invalid document name');
  return path.join(docsDir, name);
}

async function saveWithDialog({ title, defaultPath, filters, write }) {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { title, defaultPath, filters });
  if (canceled || !filePath) return false;
  await write(filePath);
  return true;
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
      return { ok: false, code: err.code || 'network', detail: err.detail || '' };
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
      else send('chat:error', { code: err.code || 'network', detail: err.detail || '' });
    } finally {
      activeChats.delete(id);
    }
    return true;
  });
  ipcMain.handle('chat:abort', (_e, id) => {
    activeChats.get(id)?.abort();
    return true;
  });

  // Painting-of-the-day images: bundled with the build, else cached, else fetched once from Wikipedia.
  ipcMain.handle('art:image', async (_e, { id, wiki }) => {
    const safeId = String(id).replace(/[^a-z0-9-]/gi, '');
    const toDataUrl = (file) => `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
    const bundled = path.join(__dirname, '..', 'renderer', 'assets', 'art', `${safeId}.jpg`);
    if (fs.existsSync(bundled)) return toDataUrl(bundled);
    const cacheDir = path.join(app.getPath('userData'), 'art-cache');
    const cached = path.join(cacheDir, `${safeId}.jpg`);
    if (fs.existsSync(cached)) return toDataUrl(cached);
    try {
      const headers = { 'User-Agent': 'KittenPlanner/1.0 (https://github.com/kunstler-dev/kitten-planner)' };
      const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&piprop=thumbnail&pithumbsize=900&redirects=1&titles=${encodeURIComponent(wiki)}`;
      const info = await (await net.fetch(api, { headers })).json();
      const src = info.query?.pages?.[0]?.thumbnail?.source;
      if (!src) return null;
      const res = await net.fetch(src, { headers });
      if (!res.ok) return null;
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
      return toDataUrl(cached);
    } catch {
      return null;
    }
  });

  ipcMain.handle('gpt:logout', async () => {
    await session.fromPartition(GPT_PARTITION).clearStorageData();
    return true;
  });
  ipcMain.handle('app:open-external', (_e, url) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return true;
  });

  ipcMain.handle('app:open-data-folder', () => shell.openPath(app.getPath('userData')));
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), dataDir: app.getPath('userData') }));
  ipcMain.handle('app:set-theme', (_e, theme) => {
    const colors = TITLEBAR[theme] || TITLEBAR.light;
    try {
      mainWindow.setTitleBarOverlay?.({ ...colors, height: 44 });
    } catch {
      // not supported on this platform
    }
    mainWindow.setBackgroundColor(colors.color);
    return true;
  });

  ipcMain.handle('data:export', (_e, { data, title }) =>
    saveWithDialog({
      title,
      defaultPath: `kitten-planner-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
      write: (file) => fs.writeFileSync(file, JSON.stringify(normalize(data), null, 2), 'utf8'),
    }),
  );
  ipcMain.handle('data:import', async (_e, { title }) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title,
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePaths[0]) return null;
    const data = normalize(JSON.parse(fs.readFileSync(filePaths[0], 'utf8')));
    store.save(data);
    return data;
  });

  ipcMain.handle('file:save-text', (_e, { content, defaultPath, title, ext }) =>
    saveWithDialog({
      title,
      defaultPath,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      // BOM so Excel opens UTF-8 CSV with umlauts correctly
      write: (file) => fs.writeFileSync(file, (ext === 'csv' ? '﻿' : '') + content, 'utf8'),
    }),
  );

  // Renders an HTML string (invoice) to PDF in a hidden, script-less window.
  ipcMain.handle('pdf:save', async (_e, { html, defaultPath, title }) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, javascript: false, contextIsolation: true },
    });
    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      const pdf = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true });
      return await saveWithDialog({
        title,
        defaultPath,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        write: async (file) => {
          fs.writeFileSync(file, pdf);
          shell.openPath(file);
        },
      });
    } finally {
      win.destroy();
    }
  });

  ipcMain.handle('docs:add', async (_e, { title }) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title,
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled) return [];
    fs.mkdirSync(docsDir, { recursive: true });
    return filePaths.map((src) => {
      const name = path.basename(src);
      const stored = `${crypto.randomBytes(5).toString('hex')}_${name.replace(/[^\w.\-() ]+/g, '_')}`;
      fs.copyFileSync(src, path.join(docsDir, stored));
      return { name, stored, size: fs.statSync(src).size };
    });
  });
  ipcMain.handle('docs:has', (_e, stored) => fs.existsSync(docPath(stored)));
  ipcMain.handle('docs:read', (_e, stored) => {
    const file = docPath(stored);
    return fs.existsSync(file) ? new Uint8Array(fs.readFileSync(file)) : null;
  });
  ipcMain.handle('docs:write', (_e, { stored, bytes }) => {
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(docPath(stored), Buffer.from(bytes));
    return true;
  });

  // Cloud sync via the user's Google Drive (the merge itself runs in the renderer).
  const syncFile = path.join(app.getPath('userData'), 'sync.json');
  ipcMain.handle('sync:load', () => {
    try {
      return JSON.parse(fs.readFileSync(syncFile, 'utf8'));
    } catch {
      return {};
    }
  });
  ipcMain.handle('sync:save', (_e, data) => {
    fs.writeFileSync(`${syncFile}.tmp`, JSON.stringify(data || {}), 'utf8');
    fs.renameSync(`${syncFile}.tmp`, syncFile);
    return true;
  });
  ipcMain.handle('cloud:status', () => google.status());
  ipcMain.handle('cloud:connect', async () => {
    const res = await google.connect();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    return res;
  });
  ipcMain.handle('cloud:disconnect', () => google.disconnect());
  ipcMain.handle('cloud:token', async (_e, opts) => {
    try {
      return await google.token(opts || {});
    } catch {
      return null;
    }
  });

  ipcMain.handle('docs:open', (_e, stored) => shell.openPath(docPath(stored)));
  ipcMain.handle('docs:show', (_e, stored) => shell.showItemInFolder(docPath(stored)));
  ipcMain.handle('docs:remove', (_e, stored) => {
    const file = docPath(stored);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return true;
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
    // Look like regular Chrome to the ChatGPT / Google sign-in pages.
    session
      .fromPartition(GPT_PARTITION)
      .setUserAgent(app.userAgentFallback.replace(/ Electron\/\S+/, '').replace(/ kitten-planner\/\S+/i, ''));
    secrets = new Secrets(app.getPath('userData'), safeStorage);
    google = new GoogleAuth({
      dir: app.getPath('userData'),
      safeStorage,
      config: googleConfig,
      openBrowser: (url) => shell.openExternal(url),
      fetchImpl: (...args) => net.fetch(...args),
    });
    registerIpc();
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
