'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function on(channel, cb) {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  exportData: (data) => ipcRenderer.invoke('data:export', data),
  importData: () => ipcRenderer.invoke('data:import'),

  keyStatus: () => ipcRenderer.invoke('key:status'),
  setKey: (key) => ipcRenderer.invoke('key:set', key),
  testKey: (key) => ipcRenderer.invoke('key:test', key),

  startChat: (req) => ipcRenderer.invoke('chat:start', req),
  abortChat: (id) => ipcRenderer.invoke('chat:abort', id),
  onChatDelta: (cb) => on('chat:delta', cb),
  onChatDone: (cb) => on('chat:done', cb),
  onChatError: (cb) => on('chat:error', cb),

  openDataFolder: () => ipcRenderer.invoke('app:open-data-folder'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  platform: process.platform,
});
