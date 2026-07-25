'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function basename(filePath) {
  return String(filePath || '').split(/[\\/]/).pop() || '';
}

function extname(filePath) {
  const name = basename(filePath);
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index + 1).toLowerCase() : '';
}

function dirname(filePath) {
  const value = String(filePath || '');
  const index = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
  return index >= 0 ? value.slice(0, index) : '';
}

contextBridge.exposeInMainWorld('novaplay', {
  // ── Window controls ──────────────────────────────────────────────────
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),
  hide:     () => ipcRenderer.send('window-hide'),
  quit:     () => ipcRenderer.send('app-quit'),

  // ── File dialogs ─────────────────────────────────────────────────────
  openFileDialog:     (opts) => ipcRenderer.invoke('open-file-dialog', opts),
  openMultipleDialog: (opts) => ipcRenderer.invoke('open-multiple-dialog', opts),
  openSubtitleDialog: ()     => ipcRenderer.invoke('open-subtitle-dialog'),
  relocateFile:       (old)  => ipcRenderer.invoke('relocate-file', old),

  // ── File utilities ────────────────────────────────────────────────────
  checkFileExists:  (fp)  => ipcRenderer.invoke('check-file-exists', fp),
  getFileUrl:       (fp)  => ipcRenderer.invoke('get-file-url', fp),
  getMediaMetadata: (fp)  => ipcRenderer.invoke('get-media-metadata', fp),
  getServerPort:    ()    => ipcRenderer.invoke('get-server-port'),
  getServerConfig:  ()    => ipcRenderer.invoke('get-server-config'),
  getAppVersion:    ()    => ipcRenderer.invoke('get-app-version'),
  getInitialFiles:  ()    => ipcRenderer.invoke('get-initial-files'),
  rendererReady:    ()    => ipcRenderer.send('renderer-ready'),
  setAlwaysOnTop:   (val) => ipcRenderer.invoke('set-always-on-top', val),
  screenshot:       ()    => ipcRenderer.invoke('screenshot'),

  // ── Events from main → renderer ───────────────────────────────────────
  onOpenFiles: (cb) => {
    const handler = (_, files) => cb(files);
    ipcRenderer.on('open-files', handler);
    return () => ipcRenderer.removeListener('open-files', handler);
  },
  onTrayAction: (cb) => {
    const handler = (_, action) => cb(action);
    ipcRenderer.on('tray-action', handler);
    return () => ipcRenderer.removeListener('tray-action', handler);
  },
  onServerConfig: (cb) => {
    const handler = (_, config) => cb(config);
    ipcRenderer.on('server-config', handler);
    return () => ipcRenderer.removeListener('server-config', handler);
  },

  // ── Path helpers (no fs access in renderer) ────────────────────────────
  basename,
  extname,
  dirname,
});
