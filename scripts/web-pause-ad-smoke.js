'use strict';

const { app, BrowserWindow, session } = require('electron');

const SITE_URL = 'https://novaplay-kohl.vercel.app/';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const adRequests = [];
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['https://www.highperformanceformat.com/*'] },
    (details, callback) => {
      adRequests.push({ phase: 'before', url: details.url });
      callback({});
    },
  );
  session.defaultSession.webRequest.onCompleted(
    { urls: ['https://www.highperformanceformat.com/*'] },
    details => adRequests.push({ phase: 'completed', url: details.url, statusCode: details.statusCode }),
  );

  const window = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, webSecurity: true },
  });
  await window.loadURL(SITE_URL);
  await window.webContents.executeJavaScript(`
    localStorage.removeItem('novaplay.pauseAd.lastShownAt');
    const file = new File([new Uint8Array([73, 68, 51, 4, 0, 0, 0, 0, 0, 0])], 'ad-test.mp3', {
      type: 'audio/mpeg'
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    window.dispatchEvent(new DragEvent('drop', {
      dataTransfer: transfer,
      bubbles: true,
      cancelable: true
    }));
  `);
  await wait(500);
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(new CustomEvent('novaplay-user-playback', { detail: { paused: true } }));
  `);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = await window.webContents.executeJavaScript(
      `document.querySelector('.pause-ad-overlay')?.dataset.loadState || 'idle'`,
    );
    if (state === 'loaded' || state === 'failed') break;
    await wait(250);
  }

  const shown = await window.webContents.executeJavaScript(`
    (() => {
      const overlay = document.querySelector('.pause-ad-overlay');
      return {
        visible: overlay?.classList.contains('visible') || false,
        loadState: overlay?.dataset.loadState || null,
        iframeCount: document.querySelectorAll('.pause-ad-frame').length
      };
    })()
  `);
  await window.webContents.executeJavaScript(
    `window.dispatchEvent(new CustomEvent('novaplay-user-playback', { detail: { paused: false } }))`,
  );
  await wait(350);
  const hidden = await window.webContents.executeJavaScript(
    `!document.querySelector('.pause-ad-overlay')?.classList.contains('visible')`,
  );

  const result = { site: SITE_URL, shown, hidden, adRequests };
  result.page = await window.webContents.executeJavaScript(`
    ({
      url: location.href,
      title: document.title,
      bodyText: document.body?.innerText?.slice(0, 300) || '',
      rootHtmlLength: document.querySelector('#root')?.innerHTML.length || 0
    })
  `);
  result.ok = shown.visible && shown.loadState === 'loaded' && shown.iframeCount === 1 &&
    hidden && adRequests.some(request => request.phase === 'completed' && request.statusCode < 400);
  console.log(JSON.stringify(result, null, 2));
  window.destroy();
  app.exit(result.ok ? 0 : 1);
}).catch(error => {
  console.error(error);
  app.exit(1);
});
