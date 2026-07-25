'use strict';

const fs = require('fs');
const { query, run, get, lastInsertId } = require('../database/db');
const { AUDIO_EXTENSIONS, MEDIA_TYPES } = require('../../shared/constants');

function detectType(filePath) {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext) ? MEDIA_TYPES.AUDIO : MEDIA_TYPES.VIDEO;
}

function checkAvailable(filePath) {
  try { return fs.existsSync(filePath) ? 1 : 0; } catch { return 0; }
}

const upsertMedia = (req, res, next) => {
  try {
    const { file_path, file_name, duration = 0 } = req.body;
    const media_type = detectType(file_path);
    const available  = checkAvailable(file_path);
    const existing   = get('SELECT id FROM media_history WHERE file_path=?', [file_path]);
    if (existing) {
      run(
        `UPDATE media_history SET file_name=?,duration=CASE WHEN ?> 0 THEN ? ELSE duration END,file_available=?,updated_at=datetime('now') WHERE file_path=?`,
        [file_name, duration, duration, available, file_path]
      );
      res.json({ id: existing.id });
    } else {
      run(
        `INSERT INTO media_history(file_path,file_name,media_type,duration,file_available) VALUES(?,?,?,?,?)`,
        [file_path, file_name, media_type, duration, available]
      );
      res.json({ id: lastInsertId() });
    }
  } catch (e) { next(e); }
};

const recordPlay = (req, res, next) => {
  try {
    const { file_path } = req.body;
    run(
      `UPDATE media_history SET play_count=play_count+1,last_played_at=datetime('now'),updated_at=datetime('now') WHERE file_path=?`,
      [file_path]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
};

const updatePosition = (req, res, next) => {
  try {
    const { file_path, position } = req.body;
    run(
      `UPDATE media_history SET last_position=?,updated_at=datetime('now') WHERE file_path=?`,
      [position, file_path]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
};

const getRecentlyPlayed = (req, res, next) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    res.json(query(
      `SELECT * FROM media_history WHERE last_played_at IS NOT NULL ORDER BY last_played_at DESC LIMIT ?`,
      [limit]
    ));
  } catch (e) { next(e); }
};

const getMostPlayed = (req, res, next) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    res.json(query(
      `SELECT * FROM media_history WHERE play_count>0 ORDER BY play_count DESC LIMIT ?`,
      [limit]
    ));
  } catch (e) { next(e); }
};

const getFavorites = (req, res, next) => {
  try {
    res.json(query(`SELECT * FROM media_history WHERE is_favorite=1 ORDER BY file_name ASC`));
  } catch (e) { next(e); }
};

const toggleFavorite = (req, res, next) => {
  try {
    const { file_path } = req.body;
    const row = get('SELECT is_favorite FROM media_history WHERE file_path=?', [file_path]);
    if (!row) return res.status(404).json({ error: 'Media not found in history' });
    const newVal = row.is_favorite ? 0 : 1;
    run(`UPDATE media_history SET is_favorite=?,updated_at=datetime('now') WHERE file_path=?`, [newVal, file_path]);
    res.json({ is_favorite: newVal });
  } catch (e) { next(e); }
};

const getByPath = (req, res, next) => {
  try {
    const file_path = decodeURIComponent(req.params[0] || req.params.path || '');
    const row = get('SELECT * FROM media_history WHERE file_path=?', [file_path]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
};

const clearHistory = (req, res, next) => {
  try {
    run(`UPDATE media_history SET last_played_at=NULL,play_count=0,last_position=0,updated_at=datetime('now')`);
    res.json({ success: true });
  } catch (e) { next(e); }
};

const updateAvailability = (req, res, next) => {
  try {
    const { file_path, new_path } = req.body;
    const new_name = new_path.split(/[\\/]/).pop();
    run(
      `UPDATE media_history SET file_path=?,file_name=?,file_available=1,updated_at=datetime('now') WHERE file_path=?`,
      [new_path, new_name, file_path]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
};

const getByType = (req, res, next) => {
  try {
    const { type } = req.params;
    if (!['audio','video'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
    res.json(query(`SELECT * FROM media_history WHERE media_type=? ORDER BY file_name ASC`, [type]));
  } catch (e) { next(e); }
};

const search = (req, res, next) => {
  try {
    const q = `%${(req.query.q || '').trim()}%`;
    res.json(query(
      `SELECT * FROM media_history WHERE file_name LIKE ? ORDER BY file_name ASC LIMIT 100`,
      [q]
    ));
  } catch (e) { next(e); }
};

module.exports = {
  upsertMedia, recordPlay, updatePosition,
  getRecentlyPlayed, getMostPlayed, getFavorites,
  toggleFavorite, getByPath, clearHistory,
  updateAvailability, getByType, search,
};
