'use strict';

const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const adRequests = [];
  const adErrors = [];
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
  session.defaultSession.webRequest.onErrorOccurred(
    { urls: ['https://www.highperformanceformat.com/*'] },
    details => adErrors.push({ url: details.url, error: details.error }),
  );

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  await window.loadFile(path.join(__dirname, '../client/dist/index.html'));
  await window.webContents.executeJavaScript(`
    localStorage.removeItem('novaplay.pauseAd.lastShownAt');
    (async () => {
      const response = await fetch('./DAKU.mp3');
      const blob = await response.blob();
      const file = new File([blob], 'DAKU.mp3', { type: 'audio/mpeg' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
    })();
  `);

  await wait(800);
  await window.webContents.executeJavaScript(`
    (() => {
      const button = document.querySelector('.play-btn');
      if (!button) throw new Error('Playback button not found');
      if (button.getAttribute('aria-label') !== 'Pause') button.click();
      setTimeout(() => {
        const pauseButton = document.querySelector('.play-btn');
        if (pauseButton?.getAttribute('aria-label') === 'Pause') pauseButton.click();
      }, 150);
    })();
  `);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = await window.webContents.executeJavaScript(
      `document.querySelector('.pause-ad-overlay')?.dataset.loadState || 'idle'`,
    );
    if (state === 'loaded' || state === 'failed') break;
    await wait(250);
  }
  const pausedState = await window.webContents.executeJavaScript(`
    (() => {
      const overlay = document.querySelector('.pause-ad-overlay');
      return {
        exists: Boolean(overlay),
        visible: overlay?.classList.contains('visible') || false,
        loadState: overlay?.dataset.loadState || null,
        iframeCount: document.querySelectorAll('.pause-ad-frame').length,
        playing: document.querySelector('.play-btn')?.getAttribute('aria-label') === 'Pause',
        srcDocLength: document.querySelector('.pause-ad-frame')?.srcdoc?.length || 0
      };
    })()
  `);

  await window.webContents.executeJavaScript(`document.querySelector('.play-btn')?.click()`);
  await wait(350);
  const hiddenAfterResume = await window.webContents.executeJavaScript(
    `!document.querySelector('.pause-ad-overlay')?.classList.contains('visible')`,
  );
  await window.webContents.executeJavaScript(`document.querySelector('.play-btn')?.click()`);
  await wait(350);
  const cooldownState = await window.webContents.executeJavaScript(`
    (() => ({
      visible: document.querySelector('.pause-ad-overlay')?.classList.contains('visible') || false,
      iframeCount: document.querySelectorAll('.pause-ad-frame').length
    }))()
  `);

  const result = {
    pausedState,
    hiddenAfterResume,
    cooldownState,
    adRequests,
    adErrors,
  };
  result.ok = pausedState.exists && pausedState.visible && pausedState.loadState === 'loaded' &&
    pausedState.iframeCount === 1 && pausedState.playing === false &&
    hiddenAfterResume && cooldownState.visible === false && cooldownState.iframeCount === 1 &&
    adRequests.some(request => request.phase === 'completed' && request.statusCode < 400);
  console.log(JSON.stringify(result, null, 2));
  window.destroy();
  app.exit(result.ok ? 0 : 1);
}).catch(error => {
  console.error(error);
  app.exit(1);
});
