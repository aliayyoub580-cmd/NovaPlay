'use strict';

const { ALL_MEDIA_EXTENSIONS, SUBTITLE_EXTENSIONS } = require('../constants');
const path = require('path');

function isMediaFile(filePath) {
  if (typeof filePath !== 'string') return false;
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  return ALL_MEDIA_EXTENSIONS.includes(ext);
}

function isSubtitleFile(filePath) {
  if (typeof filePath !== 'string') return false;
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  return SUBTITLE_EXTENSIONS.includes(ext);
}

function isSafePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return false;
  // Must be absolute
  return path.isAbsolute(filePath);
}

module.exports = { isMediaFile, isSubtitleFile, isSafePath };
