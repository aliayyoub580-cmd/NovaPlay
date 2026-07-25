'use strict';

const path = require('path');
const fs = require('fs');
const { DEFAULT_SHORTCUTS, DEFAULT_SETTINGS, EQUALIZER_PRESETS } = require('../../shared/constants');
const { SCHEMA_SQL } = require('./schema');

let db = null;
let dbPath = null;
let SQL = null;

async function initDatabase(userDataPath) {
  dbPath = path.join(userDataPath, 'NovaPlay', 'novaplay.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  // Resolve sql.js WASM — works in dev and packaged Electron
  const sqlJsPath = require.resolve('sql.js');
  const sqlJsDir  = path.dirname(sqlJsPath);
  const wasmPath  = path.join(sqlJsDir, 'sql-wasm.wasm');

  const initSqlJs = require('sql.js');
  SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  let fileBuffer = null;
  if (fs.existsSync(dbPath)) {
    fileBuffer = fs.readFileSync(dbPath);
  }

  db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
  db.run(SCHEMA_SQL);
  seedDefaults();
  persistSync();
  return db;
}

function persistSync() {
  if (!db || !dbPath) return;
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (e) {
    console.error('[DB] persist error:', e.message);
  }
}

function seedDefaults() {
  // Settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    db.run(
      `INSERT OR IGNORE INTO settings(setting_key, setting_value) VALUES(?,?)`,
      [key, String(value)]
    );
  }
  // Shortcuts
  // Keyboard controls are intentionally fixed so upgraded installations cannot
  // retain obsolete bindings from older releases.
  db.run('DELETE FROM keyboard_shortcuts');
  for (const s of DEFAULT_SHORTCUTS) {
    db.run(
      `INSERT INTO keyboard_shortcuts(action_name, shortcut_key) VALUES(?,?)`,
      [s.action_name, s.shortcut_key]
    );
  }
  // EQ presets
  for (const [name, values] of Object.entries(EQUALIZER_PRESETS)) {
    db.run(
      `INSERT OR IGNORE INTO equalizer_presets(name, band_values, is_custom) VALUES(?,?,?)`,
      [name, JSON.stringify(values), name === 'Custom' ? 1 : 0]
    );
  }
}

// Auto-persist every 5 s
const _persistTimer = setInterval(persistSync, 5000);
if (_persistTimer.unref) _persistTimer.unref(); // don't keep process alive

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

/** Execute SQL and return rows as plain objects. */
function query(sql, params = []) {
  const result = getDb().exec(sql, params);
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

/** Execute a write statement. Returns rows modified. */
function run(sql, params = []) {
  getDb().run(sql, params);
  persistSync();
}

/** Return first matching row or null. */
function get(sql, params = []) {
  return query(sql, params)[0] || null;
}

/** Last inserted rowid. */
function lastInsertId() {
  const row = get('SELECT last_insert_rowid() as id');
  return row ? row.id : null;
}

module.exports = { initDatabase, getDb, persistSync, query, run, get, lastInsertId };
