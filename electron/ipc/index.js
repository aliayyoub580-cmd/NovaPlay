'use strict';

const { ipcMain, dialog, app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');
const { ALL_MEDIA_EXTENSIONS, SUBTITLE_EXTENSIONS } = require('../../shared/constants');

const AUDIO_FILTER = { name: 'Audio Files', extensions: ['mp3','wav','aac','flac','ogg','m4a','wma','opus','aiff'] };
const VIDEO_FILTER = { name: 'Video Files', extensions: ['mp4','mkv','avi','webm','mov','wmv','flv','mpeg','mpg','m4v','3gp'] };
const ALL_FILTER   = { name: 'All Media',   extensions: ALL_MEDIA_EXTENSIONS };
const SUB_FILTER   = { name: 'Subtitles',   extensions: SUBTITLE_EXTENSIONS };

function sanitizePath(fp) {
  if (typeof fp !== 'string') throw new Error('Invalid path type');
  // Allow only absolute paths — prevent traversal tricks
  const resolved = path.resolve(fp);
  return resolved;
}

module.exports = function setupIpc(mainWindow, _port, apiToken, takeInitialFiles = () => []) {
  // ── Window controls ─────────────────────────────────────────────────────
  ipcMain.on('window-minimize', () => mainWindow?.minimize());

  ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });

  ipcMain.on('window-close', () => {
    // Destroy tray first so the close event doesn't hide the window
    const { app: electronApp } = require('electron');
    // Actually just call destroy on tray via a require of main — simpler:
    mainWindow?.destroy();
    electronApp.exit(0);
  });

  ipcMain.on('window-hide', () => mainWindow?.hide());

  ipcMain.on('app-quit', () => {
    mainWindow?.destroy();
    app.exit(0);
  });

  // ── File dialogs ─────────────────────────────────────────────────────────
  ipcMain.handle('open-file-dialog', async (_event, opts = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [ALL_FILTER, AUDIO_FILTER, VIDEO_FILTER],
      ...opts,
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('open-multiple-dialog', async (_event, opts = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [ALL_FILTER, AUDIO_FILTER, VIDEO_FILTER],
      ...opts,
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('open-subtitle-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [SUB_FILTER],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // ── File utilities ────────────────────────────────────────────────────────
  ipcMain.handle('check-file-exists', (_event, fp) => {
    try { return fs.existsSync(sanitizePath(fp)); } catch { return false; }
  });

  ipcMain.handle('get-file-url', (_event, fp) => {
    try {
      const safe = sanitizePath(fp);
      return `media://local/${encodeURIComponent(safe.replace(/\\/g, '/'))}`;
    } catch { return null; }
  });

  ipcMain.handle('get-media-metadata', async (_event, fp) => {
    try {
      const safe = sanitizePath(fp);
      if (!fs.existsSync(safe)) return { error: 'File not found' };
      const stat = fs.statSync(safe);
      return {
        file_path: safe,
        file_name: path.basename(safe),
        ext: path.extname(safe).toLowerCase().replace('.', ''),
        size: stat.size,
      };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('get-server-port', () => _port);
  ipcMain.handle('get-server-config', () => ({ port: _port, token: apiToken }));
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-initial-files', () => takeInitialFiles());
  ipcMain.on('renderer-ready', () => {
    const files = takeInitialFiles();
    if (files.length > 0 && !mainWindow?.isDestroyed()) {
      mainWindow.webContents.send('open-files', files);
    }
  });

  ipcMain.handle('set-always-on-top', (_event, val) => {
    mainWindow?.setAlwaysOnTop(!!val);
    return true;
  });

  // ── Screenshot ────────────────────────────────────────────────────────────
  ipcMain.handle('screenshot', async () => {
    try {
      const image = await mainWindow.webContents.capturePage();
      const dest  = path.join(app.getPath('downloads'), `NovaPlay_${Date.now()}.png`);
      fs.writeFileSync(dest, image.toPNG());
      return { success: true, path: dest };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ── Relocate missing file ─────────────────────────────────────────────────
  ipcMain.handle('relocate-file', async (_event, oldPath) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [ALL_FILTER, AUDIO_FILTER, VIDEO_FILTER],
      title: `Locate: ${path.basename(oldPath)}`,
    });
    return result.canceled ? null : result.filePaths[0];
  });
};
