'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const mediaFiles = process.argv.slice(2).map(file => path.resolve(file));

async function inspectMedia(window, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const tag = extension === '.mp4' ? 'video' : 'audio';
  const source = pathToFileURL(filePath).href;
  return window.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const media = document.createElement(${JSON.stringify(tag)});
      const timeout = setTimeout(() => resolve({
        ok: false,
        error: 'Timed out waiting for media metadata'
      }), 15000);
      const finish = (result) => {
        clearTimeout(timeout);
        media.removeAttribute('src');
        media.load();
        resolve(result);
      };
      media.preload = 'metadata';
      media.onloadedmetadata = () => finish({
        ok: true,
        duration: media.duration,
        videoWidth: media.videoWidth || 0,
        videoHeight: media.videoHeight || 0,
        canPlay: media.readyState >= HTMLMediaElement.HAVE_METADATA
      });
      media.onerror = () => finish({
        ok: false,
        error: media.error ? {
          code: media.error.code,
          message: media.error.message
        } : 'Unknown media error'
      });
      media.src = ${JSON.stringify(source)};
      media.load();
    })
  `, true);
}

app.whenReady().then(async () => {
  if (mediaFiles.length === 0) {
    console.error('No media files supplied.');
    app.exit(2);
    return;
  }

  const missing = mediaFiles.filter(file => !fs.existsSync(file));
  if (missing.length) {
    console.error(`Missing media files: ${missing.join(', ')}`);
    app.exit(2);
    return;
  }

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  await window.loadFile(path.join(__dirname, '../client/dist/index.html'));
  const results = [];
  for (const file of mediaFiles) {
    results.push({ file, ...(await inspectMedia(window, file)) });
  }

  console.log(JSON.stringify(results, null, 2));
  window.destroy();
  app.exit(results.every(result => result.ok) ? 0 : 1);
}).catch(error => {
  console.error(error);
  app.exit(1);
});

