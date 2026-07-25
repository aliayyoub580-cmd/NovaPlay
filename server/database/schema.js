'use strict';

const SCHEMA_SQL = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('audio','video')),
  duration REAL DEFAULT 0,
  last_position REAL DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  last_played_at TEXT,
  file_available INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  media_type TEXT NOT NULL,
  duration REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equalizer_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  band_values TEXT NOT NULL,
  is_custom INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS keyboard_shortcuts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_name TEXT NOT NULL UNIQUE,
  shortcut_key TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_history_file_path ON media_history(file_path);
CREATE INDEX IF NOT EXISTS idx_media_history_last_played ON media_history(last_played_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_history_play_count ON media_history(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_media_history_is_favorite ON media_history(is_favorite);
CREATE INDEX IF NOT EXISTS idx_media_history_media_type ON media_history(media_type);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_sort_order ON playlist_items(sort_order);
`;

module.exports = { SCHEMA_SQL };
