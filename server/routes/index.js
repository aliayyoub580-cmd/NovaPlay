'use strict';

const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const settings = require('../controllers/settingsController');
const history = require('../controllers/historyController');
const playlists = require('../controllers/playlistController');
const eq = require('../controllers/equalizerController');
const shortcuts = require('../controllers/shortcutsController');

// ── Settings ──────────────────────────────────────────────────────────────
router.get('/settings', settings.getAll);
router.put('/settings',
  body('key').isString().notEmpty(),
  body('value').exists(),
  validate,
  settings.update
);
router.put('/settings/bulk',
  body('settings').isObject(),
  validate,
  settings.updateBulk
);

// ── Media History ──────────────────────────────────────────────────────────
router.post('/history',
  body('file_path').isString().notEmpty(),
  body('file_name').isString().notEmpty(),
  validate,
  history.upsertMedia
);
router.post('/history/play',
  body('file_path').isString().notEmpty(),
  validate,
  history.recordPlay
);
router.post('/history/position',
  body('file_path').isString().notEmpty(),
  body('position').isNumeric(),
  validate,
  history.updatePosition
);
router.post('/history/favorite',
  body('file_path').isString().notEmpty(),
  validate,
  history.toggleFavorite
);
router.post('/history/relocate',
  body('file_path').isString().notEmpty(),
  body('new_path').isString().notEmpty(),
  validate,
  history.updateAvailability
);
router.delete('/history', history.clearHistory);
router.get('/history/recent',  history.getRecentlyPlayed);
router.get('/history/most',    history.getMostPlayed);
router.get('/history/favorites', history.getFavorites);
router.get('/history/search',  history.search);
router.get('/history/type/:type', history.getByType);
router.get('/history/item/*',  (req, res, next) => {
  req.params[0] = req.params[0] || '';
  history.getByPath(req, res, next);
});

// ── Playlists ──────────────────────────────────────────────────────────────
router.get('/playlists', playlists.getAll);
router.post('/playlists',
  body('name').isString().notEmpty().isLength({ max: 120 }),
  validate,
  playlists.create
);
router.get('/playlists/:id',     playlists.getById);
router.put('/playlists/:id',
  body('name').isString().notEmpty().isLength({ max: 120 }),
  validate,
  playlists.rename
);
router.delete('/playlists/:id',  playlists.remove);
router.post('/playlists/:id/items',
  body('items').isArray({ min: 1 }),
  validate,
  playlists.addItems
);
router.delete('/playlists/:id/items/:itemId', playlists.removeItem);
router.put('/playlists/:id/reorder',
  body('order').isArray(),
  validate,
  playlists.reorderItems
);
router.get('/playlists/:id/search', playlists.searchItems);

// ── Equalizer ──────────────────────────────────────────────────────────────
router.get('/equalizer', eq.getAll);
router.post('/equalizer',
  body('name').isString().notEmpty(),
  body('values').isArray({ min: 10, max: 10 }),
  validate,
  eq.saveCustom
);
router.delete('/equalizer/:id', eq.deleteCustom);

// ── Shortcuts ──────────────────────────────────────────────────────────────
router.get('/shortcuts', shortcuts.getAll);
router.put('/shortcuts',
  body('action_name').isString().notEmpty(),
  body('shortcut_key').isString().notEmpty(),
  validate,
  shortcuts.update
);
router.post('/shortcuts/reset', shortcuts.reset);

module.exports = router;
