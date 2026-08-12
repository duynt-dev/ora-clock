'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const listener = (_e, ...args) => cb(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('api', {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
    reset: () => ipcRenderer.invoke('settings:reset'),
    onChange: on('settings:changed'),
  },
  window: {
    action: (a) => ipcRenderer.invoke('window:action', a),
    setSize: (width, height) => ipcRenderer.invoke('window:size', { width, height }),
    state: () => ipcRenderer.invoke('window:state'),
    onFullscreen: on('window:fullscreen'),
    onMaximized: on('window:maximized'),
    onFocus: on('window:focus'),
  },
  app: {
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
    pickImage: () => ipcRenderer.invoke('app:pick-image'),
    fonts: () => ipcRenderer.invoke('app:fonts'),
    info: () => ipcRenderer.invoke('app:info'),
    onOpenSettings: on('ui:open-settings'),
    onHotkey: on('hotkey'),
  },
  spotify: {
    status: () => ipcRenderer.invoke('spotify:status'),
    authorize: () => ipcRenderer.invoke('spotify:authorize'),
    logout: () => ipcRenderer.invoke('spotify:logout'),
    api: (method, path, body) => ipcRenderer.invoke('spotify:api', { method, path, body }),
  },
});
