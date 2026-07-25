'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp({ apiToken } = {}) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin(origin, callback) {
      // Packaged file:// pages send Origin: null. The server is bound to
      // loopback and separately protected by a per-launch API token.
      const allowed = !origin || origin === 'null' || origin === 'http://localhost:5173';
      callback(allowed ? null : new Error('Origin not allowed'), allowed);
    },
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok', app: 'NovaPlay' }));

  app.use('/api', (req, res, next) => {
    if (!apiToken || req.get('X-NovaPlay-Token') === apiToken) return next();
    return res.status(401).json({ error: 'Unauthorized local API request' });
  });
  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
