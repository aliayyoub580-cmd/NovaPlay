'use strict';

/**
 * Register NovaPlay as the default media player (Windows).
 * This is typically handled by electron-builder's nsis file associations.
 * This module provides runtime helpers if needed.
 */

const { app } = require('electron');

function setAsDefault() {
  if (process.platform !== 'win32') return;
  try {
    app.setAsDefaultProtocolClient('novaplay');
  } catch {}
}

module.exports = { setAsDefault };
