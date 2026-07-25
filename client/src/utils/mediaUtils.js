export const AUDIO_EXTS = ['mp3','wav','aac','flac','ogg','m4a','wma','opus','aiff'];
export const VIDEO_EXTS = ['mp4','mkv','avi','webm','mov','wmv','flv','mpeg','mpg','m4v','3gp'];
export const ALL_EXTS   = [...AUDIO_EXTS, ...VIDEO_EXTS];

export function getMediaType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  return 'unknown';
}

export function isSupported(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  return ALL_EXTS.includes(ext);
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  if (bytes < 1024*1024*1024) return `${(bytes/(1024*1024)).toFixed(1)} MB`;
  return `${(bytes/(1024*1024*1024)).toFixed(2)} GB`;
}

export function getFileName(filePath) {
  return filePath.split(/[\\/]/).pop();
}

export function getFileExt(filePath) {
  return filePath.split('.').pop().toLowerCase();
}

export function buildMediaUrl(filePath) {
  if (!filePath) return '';
  // Use Electron's media protocol for local files
  if (window.novaplay) {
    const normalized = filePath.replace(/\\/g, '/');
    return `media://local/${encodeURIComponent(normalized)}`;
  }
  return filePath;
}
