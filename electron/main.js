'use strict';

const {
  app, BrowserWindow, Tray, Menu, shell, dialog,
  nativeImage, protocol, globalShortcut, session,
} = require('electron');
const path   = require('path');
const fs     = require('fs');
const http   = require('http');
const crypto = require('crypto');
const { createApp }     = require('../server/app');
const { initDatabase }  = require('../server/database/db');
const setupIpc          = require('./ipc');

// ── Dev / prod detection ──────────────────────────────────────────────────
const isDev = !app.isPackaged;

// ── Single instance lock ──────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

let mainWindow   = null;
let tray         = null;
let expressServer= null;
let expressPort  = 0;
const apiToken   = crypto.randomBytes(32).toString('hex');
let pendingFiles = [];
const startupLogPath = path.join(app.getPath('temp'), 'NovaPlay-startup.log');

function logStartup(message) {
  try {
    fs.appendFileSync(startupLogPath, `${new Date().toISOString()} ${message}\n`);
  } catch {}
}

process.on('uncaughtException', (error) => {
  logStartup(`uncaughtException: ${error?.stack || error}`);
});
process.on('unhandledRejection', (error) => {
  logStartup(`unhandledRejection: ${error?.stack || error}`);
});
logStartup(`launch argv=${JSON.stringify(process.argv)} packaged=${app.isPackaged}`);

// ── Collect media paths from argv ─────────────────────────────────────────
const { ALL_MEDIA_EXTENSIONS } = require('../shared/constants');

function collectArgFiles(argv) {
  const start = isDev ? 2 : 1;
  return argv.slice(start).filter(a => {
    try {
      const ext = path.extname(a).toLowerCase().replace('.', '');
      return ALL_MEDIA_EXTENSIONS.includes(ext) && fs.existsSync(a);
    } catch { return false; }
  });
}

// ── Second instance → focus + send files ─────────────────────────────────
app.on('second-instance', (_event, argv) => {
  const files = collectArgFiles(argv);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    if (files.length > 0) mainWindow.webContents.send('open-files', files);
  }
});

// ── Start Express ─────────────────────────────────────────────────────────
async function startExpress() {
  const expressApp = createApp({ apiToken });
  return new Promise((resolve) => {
    expressServer = http.createServer(expressApp);
    expressServer.listen(0, '127.0.0.1', () => {
      expressPort = expressServer.address().port;
      console.log(`[NovaPlay] API on port ${expressPort}`);
      resolve(expressPort);
    });
  });
}

// ── Create main window ────────────────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  860,
    minHeight: 560,
    frame: false,
    backgroundColor: '#1a1a1a',
    show: false,
    title: 'NovaPlay',
    ...(icon && !icon.isEmpty() ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation:  true,
      nodeIntegration:   false,
      webSecurity:       true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    logStartup(`preload failed path=${preloadPath}: ${error?.stack || error}`);
  });

  // IPC must exist before loadURL: preload/React can invoke these handlers as
  // soon as the renderer starts.
  setupIpc(mainWindow, expressPort, apiToken, () => {
    const files = pendingFiles;
    pendingFiles = [];
    logStartup(`renderer requested initial files=${JSON.stringify(files)}`);
    return files;
  });

  // Send server port once renderer is ready
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('server-config', { port: expressPort, token: apiToken });
    if (process.argv.includes('--novaplay-smoke-test')) {
      setTimeout(async () => {
        try {
          const state = await mainWindow.webContents.executeJavaScript(`(() => {
            const media = document.querySelector('video, audio');
            return {
              mediaFound: !!media,
              currentTime: media?.currentTime || 0,
              duration: media?.duration || 0,
              readyState: media?.readyState || 0,
              paused: media?.paused ?? true,
              src: media?.currentSrc || media?.src || '',
              error: media?.error ? { code: media.error.code, message: media.error.message } : null,
              bridge: typeof window.novaplay,
              bridgeKeys: window.novaplay ? Object.keys(window.novaplay) : [],
              bodyText: document.body.innerText.slice(0, 300),
            };
          })()`);
          logStartup(`smoke state=${JSON.stringify(state)}`);
          app.exit(state.mediaFound && state.currentTime > 0 ? 0 : 2);
        } catch (error) {
          logStartup(`smoke failed=${error?.stack || error}`);
          app.exit(3);
        }
      }, 10000);
    }
  });

  // Load URL
  const url = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../client/dist/index.html')}`;
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Minimize to tray instead of closing (checked against settings later)
  mainWindow.on('close', (e) => {
    if (tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Taskbar thumbnail buttons (Windows)
  if (process.platform === 'win32') {
    mainWindow.setThumbarButtons([
      {
        tooltip: 'Previous',
        icon: nativeImage.createEmpty(),
        click() { mainWindow?.webContents.send('tray-action', 'prev'); },
      },
      {
        tooltip: 'Play / Pause',
        icon: nativeImage.createEmpty(),
        click() { mainWindow?.webContents.send('tray-action', 'play_pause'); },
      },
      {
        tooltip: 'Next',
        icon: nativeImage.createEmpty(),
        click() { mainWindow?.webContents.send('tray-action', 'next'); },
      },
    ]);
  }
}

// ── Create system tray ────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray.png');
  const fallback = path.join(__dirname, '../assets/icon.png');
  const imgPath  = fs.existsSync(iconPath) ? iconPath : (fs.existsSync(fallback) ? fallback : null);
  const img      = imgPath ? nativeImage.createFromPath(imgPath) : nativeImage.createEmpty();

  tray = new Tray(img);
  tray.setToolTip('NovaPlay');

  const ctxMenu = Menu.buildFromTemplate([
    { label: 'NovaPlay', enabled: false, icon: img.resize({ width: 16, height: 16 }) },
    { type: 'separator' },
    { label: 'Play / Pause', click: () => mainWindow?.webContents.send('tray-action', 'play_pause') },
    { label: 'Previous',     click: () => mainWindow?.webContents.send('tray-action', 'prev') },
    { label: 'Next',         click: () => mainWindow?.webContents.send('tray-action', 'next') },
    { type: 'separator' },
    { label: 'Show NovaPlay', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { shutdownAndQuit(); } },
  ]);
  tray.setContextMenu(ctxMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ── App ready ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  logStartup('app ready');
  // Warm the two HTTPS connections used by the already-mounted pause banner
  // while the local database and API initialize. This removes DNS/TLS work
  // from the first ad-frame load without making an impression or loading a
  // second copy of the advertisement.
  try {
    session.defaultSession.preconnect({
      url: 'https://novaplay-app.vercel.app',
      numSockets: 1,
    });
    session.defaultSession.preconnect({
      url: 'https://www.highperformanceformat.com',
      numSockets: 1,
    });
  } catch {}
  // Register media:// protocol for local file access
  protocol.registerFileProtocol('media', (request, callback) => {
    try {
      const parsed = new URL(request.url);
      let filePath = decodeURIComponent(parsed.pathname);
      if (process.platform === 'win32' && /^\/[A-Za-z]:\//.test(filePath)) {
        filePath = filePath.slice(1);
      }
      callback({ path: filePath });
    } catch {
      callback({ error: -2 });
    }
  });

  // Disable hardware acceleration if requested (read raw settings file)
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'NovaPlay');
  // (Check after DB is loaded — default is enabled)

  // Init DB
  try {
    await initDatabase(userDataPath);
    logStartup('database ready');
    console.log('[NovaPlay] Database ready');
  } catch (e) {
    console.error('[NovaPlay] DB init failed:', e.message);
  }

  // Start Express
  await startExpress();
  logStartup(`api ready port=${expressPort}`);

  // Collect pending files from CLI args
  pendingFiles = collectArgFiles(process.argv);
  logStartup(`initial files=${JSON.stringify(pendingFiles)}`);

  // Create UI
  createWindow();
  createTray();
  logStartup('window, tray, and ipc ready');

  // Media keys (best-effort)
  try {
    globalShortcut.register('MediaPlayPause', () => mainWindow?.webContents.send('tray-action', 'play_pause'));
    globalShortcut.register('MediaNextTrack',  () => mainWindow?.webContents.send('tray-action', 'next'));
    globalShortcut.register('MediaPreviousTrack', () => mainWindow?.webContents.send('tray-action', 'prev'));
  } catch {}
}).catch((error) => {
  logStartup(`startup failed: ${error?.stack || error}`);
  dialog.showErrorBox('NovaPlay startup error', error?.message || String(error));
  app.exit(1);
});

// ── Window lifecycle ──────────────────────────────────────────────────────
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') shutdownAndQuit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  if (tray) { tray.destroy(); tray = null; }
});

function shutdownAndQuit() {
  if (expressServer) {
    expressServer.close(() => app.exit(0));
    setTimeout(() => app.exit(0), 2000);
  } else {
    app.exit(0);
  }
}

// ── Security: block external navigation ──────────────────────────────────
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (e, url) => {
    const allowed = [
      'http://localhost:5173',
      `http://127.0.0.1:${expressPort}`,
    ];
    const isFile     = url.startsWith('file://');
    const isAllowed  = allowed.some(a => url.startsWith(a));
    const isDevTools = url.startsWith('devtools://');
    if (!isFile && !isAllowed && !isDevTools) {
      e.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
