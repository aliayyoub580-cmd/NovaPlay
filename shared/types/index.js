'use strict';

/**
 * Shared type definitions (as JSDoc, for IDE support without TypeScript).
 *
 * @typedef {Object} MediaItem
 * @property {string}  file_path
 * @property {string}  file_name
 * @property {'audio'|'video'} media_type
 * @property {number}  duration
 * @property {number}  last_position
 * @property {number}  play_count
 * @property {0|1}     is_favorite
 * @property {string|null} last_played_at
 * @property {0|1}     file_available
 *
 * @typedef {Object} Playlist
 * @property {number} id
 * @property {string} name
 * @property {string} created_at
 * @property {string} updated_at
 * @property {number} [item_count]
 *
 * @typedef {Object} PlaylistItem
 * @property {number} id
 * @property {number} playlist_id
 * @property {string} file_path
 * @property {string} file_name
 * @property {'audio'|'video'} media_type
 * @property {number} duration
 * @property {number} sort_order
 *
 * @typedef {Object} EqualizerPreset
 * @property {number}   id
 * @property {string}   name
 * @property {number[]} values  10-band gains in dB
 * @property {0|1}      is_custom
 *
 * @typedef {Object} KeyboardShortcut
 * @property {number} id
 * @property {string} action_name
 * @property {string} shortcut_key
 */

module.exports = {};
