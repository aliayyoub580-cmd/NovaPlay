'use strict';

const path = require('path');
const fs = require('fs');
const { ALL_MEDIA_EXTENSIONS } = require('../../shared/constants');

/**
 * Parse command-line arguments and return valid media file paths.
 */
function parseMediaArgs(argv, isDev) {
  const start = isDev ? 2 : 1;
  return argv.slice(start).filter(arg => {
    try {
      const ext = path.extname(arg).toLowerCase().replace('.', '');
      return ALL_MEDIA_EXTENSIONS.includes(ext) && fs.existsSync(arg);
    } catch {
      return false;
    }
  });
}

module.exports = { parseMediaArgs };
