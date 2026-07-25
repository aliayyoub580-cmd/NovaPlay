'use strict';

const { query, run, get, lastInsertId } = require('../database/db');
const { AUDIO_EXTENSIONS } = require('../../shared/constants');

function detectType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext) ? 'audio' : 'video';
}

const getAll = (req, res, next) => {
  try {
    const playlists = query('SELECT * FROM playlists ORDER BY name ASC');
    const result = playlists.map(p => {
      const items = query('SELECT COUNT(*) as count FROM playlist_items WHERE playlist_id=?', [p.id]);
      return { ...p, item_count: items[0]?.count || 0 };
    });
    res.json(result);
  } catch (e) { next(e); }
};

const getById = (req, res, next) => {
  try {
    const pl = get('SELECT * FROM playlists WHERE id=?', [req.params.id]);
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });
    const items = query('SELECT * FROM playlist_items WHERE playlist_id=? ORDER BY sort_order ASC', [req.params.id]);
    res.json({ ...pl, items });
  } catch (e) { next(e); }
};

const create = (req, res, next) => {
  try {
    const { name } = req.body;
    run(`INSERT INTO playlists(name) VALUES(?)`, [name]);
    const id = lastInsertId();
    res.status(201).json({ id, name });
  } catch (e) { next(e); }
};

const rename = (req, res, next) => {
  try {
    const { name } = req.body;
    run(`UPDATE playlists SET name=?,updated_at=datetime('now') WHERE id=?`, [name, req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

const remove = (req, res, next) => {
  try {
    run('DELETE FROM playlists WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

const addItems = (req, res, next) => {
  try {
    const { items } = req.body; // [{file_path, file_name, duration}]
    const pl_id = req.params.id;
    const maxRow = get('SELECT MAX(sort_order) as m FROM playlist_items WHERE playlist_id=?', [pl_id]);
    let order = (maxRow?.m || 0) + 1;
    for (const item of items) {
      run(
        `INSERT INTO playlist_items(playlist_id,file_path,file_name,media_type,duration,sort_order) VALUES(?,?,?,?,?,?)`,
        [pl_id, item.file_path, item.file_name, detectType(item.file_path), item.duration || 0, order++]
      );
    }
    res.json({ success: true });
  } catch (e) { next(e); }
};

const removeItem = (req, res, next) => {
  try {
    run('DELETE FROM playlist_items WHERE id=? AND playlist_id=?', [req.params.itemId, req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

const reorderItems = (req, res, next) => {
  try {
    const { order } = req.body; // [{id, sort_order}]
    for (const item of order) {
      run('UPDATE playlist_items SET sort_order=? WHERE id=? AND playlist_id=?', [item.sort_order, item.id, req.params.id]);
    }
    res.json({ success: true });
  } catch (e) { next(e); }
};

const searchItems = (req, res, next) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const rows = query(
      `SELECT * FROM playlist_items WHERE playlist_id=? AND file_name LIKE ? ORDER BY sort_order ASC`,
      [req.params.id, q]
    );
    res.json(rows);
  } catch (e) { next(e); }
};

module.exports = { getAll, getById, create, rename, remove, addItems, removeItem, reorderItems, searchItems };
