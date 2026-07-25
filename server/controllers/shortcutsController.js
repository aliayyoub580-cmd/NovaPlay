'use strict';

const { query, run } = require('../database/db');
const { DEFAULT_SHORTCUTS } = require('../../shared/constants');

const getAll = (req, res, next) => {
  try {
    res.json(query('SELECT * FROM keyboard_shortcuts ORDER BY action_name ASC'));
  } catch (e) { next(e); }
};

const update = (req, res, next) => {
  try {
    const { action_name, shortcut_key } = req.body;
    run(
      `UPDATE keyboard_shortcuts SET shortcut_key=?,updated_at=datetime('now') WHERE action_name=?`,
      [shortcut_key, action_name]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
};

const reset = (req, res, next) => {
  try {
    for (const s of DEFAULT_SHORTCUTS) {
      run(
        `UPDATE keyboard_shortcuts SET shortcut_key=?,updated_at=datetime('now') WHERE action_name=?`,
        [s.shortcut_key, s.action_name]
      );
    }
    res.json({ success: true });
  } catch (e) { next(e); }
};

module.exports = { getAll, update, reset };
