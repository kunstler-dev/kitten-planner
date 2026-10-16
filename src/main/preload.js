'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function on(channel, cb) {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const invoke = (channel) => (arg) => ipcRenderer.invoke(channel, arg);

contextBridge.exposeInMainWorld('api', {
  loadData: invoke('data:load'),
  saveData: invoke('data:save'),
  exportData: invoke('data:export'),
  importData: invoke('data:import'),

  keyStatus: invoke('key:status'),
  setKey: invoke('key:set'),
  testKey: invoke('key:test'),

  startChat: invoke('chat:start'),
  abortChat: invoke('chat:abort'),
  onChatDelta: (cb) => on('chat:delta', cb),
  onChatDone: (cb) => on('chat:done', cb),
  onChatError: (cb) => on('chat:error', cb),

  saveText: invoke('file:save-text'),
  savePdf: invoke('pdf:save'),
  addDocuments: invoke('docs:add'),
  openDocument: invoke('docs:open'),
  showDocument: invoke('docs:show'),
  removeDocument: invoke('docs:remove'),

  artImage: invoke('art:image'),
  gptLogout: invoke('gpt:logout'),
  openExternal: invoke('app:open-external'),
  openDataFolder: invoke('app:open-data-folder'),
  appInfo: invoke('app:info'),
  setTheme: invoke('app:set-theme'),
  platform: process.platform,
});
