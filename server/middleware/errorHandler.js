'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function getLogPath() {
  try {
    // Try Electron's userData path first
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'NovaPlay', 'error.log');
  } catch {
    // Fallback for non-Electron context
    return path.join(os.tmpdir(), 'novaplay-error.log');
  }
}

function logError(err) {
  try {
    const logPath = getLogPath();
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const line = `[${new Date().toISOString()}] ${err.stack || err.message}\n`;
    fs.appendFileSync(logPath, line);
  } catch {}
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logError(err);
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'An internal error occurred';
  res.status(status).json({ error: message });
}

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

module.exports = { errorHandler, notFound };
