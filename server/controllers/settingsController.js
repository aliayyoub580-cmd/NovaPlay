'use strict';

const { query, run, get } = require('../database/db');

const getAll = (req, res, next) => {
  try {
    const rows = query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json(settings);
  } catch (e) { next(e); }
};

const update = (req, res, next) => {
  try {
    const { key, value } = req.body;
    run(
      `INSERT INTO settings(setting_key, setting_value, updated_at)
       VALUES(?,?,datetime('now'))
       ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at`,
      [key, String(value)]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
};

const updateBulk = (req, res, next) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      run(
        `INSERT INTO settings(setting_key, setting_value, updated_at)
         VALUES(?,?,datetime('now'))
         ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at`,
        [key, String(value)]
      );
    }
    res.json({ success: true });
  } catch (e) { next(e); }
};

module.exports = { getAll, update, updateBulk };
