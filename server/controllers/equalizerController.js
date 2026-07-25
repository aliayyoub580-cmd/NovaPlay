'use strict';

const { query, run, get, lastInsertId } = require('../database/db');

const getAll = (req, res, next) => {
  try {
    const rows = query('SELECT * FROM equalizer_presets ORDER BY name ASC');
    res.json(rows.map(r => ({ ...r, values: JSON.parse(r.band_values || '[]') })));
  } catch (e) { next(e); }
};

const saveCustom = (req, res, next) => {
  try {
    const { name, values } = req.body;
    const existing = get('SELECT id FROM equalizer_presets WHERE name=?', [name]);
    if (existing) {
      run(
        `UPDATE equalizer_presets SET band_values=?,is_custom=1,updated_at=datetime('now') WHERE name=?`,
        [JSON.stringify(values), name]
      );
      res.json({ id: existing.id });
    } else {
      run(
        `INSERT INTO equalizer_presets(name,band_values,is_custom) VALUES(?,?,1)`,
        [name, JSON.stringify(values)]
      );
      res.json({ id: lastInsertId() });
    }
  } catch (e) { next(e); }
};

const deleteCustom = (req, res, next) => {
  try {
    run('DELETE FROM equalizer_presets WHERE id=? AND is_custom=1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

module.exports = { getAll, saveCustom, deleteCustom };
