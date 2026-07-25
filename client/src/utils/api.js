// API client - talks to the local Express server
let BASE_URL = 'http://127.0.0.1:3456/api';
let API_TOKEN = '';
const WEB_STORAGE_KEY = 'novaplay.web.v1';
const DEFAULT_SHORTCUTS = [
  { action_name: 'play_pause', shortcut_key: 'Space' },
  { action_name: 'fullscreen', shortcut_key: 'F' },
  { action_name: 'exit_fullscreen', shortcut_key: 'Escape' },
  { action_name: 'volume_up', shortcut_key: 'ArrowUp' },
  { action_name: 'volume_down', shortcut_key: 'ArrowDown' },
  { action_name: 'skip_forward', shortcut_key: 'ArrowRight' },
  { action_name: 'skip_backward', shortcut_key: 'ArrowLeft' },
  { action_name: 'skip_forward_60', shortcut_key: 'Ctrl+ArrowRight' },
  { action_name: 'skip_backward_60', shortcut_key: 'Ctrl+ArrowLeft' },
  { action_name: 'next_media', shortcut_key: 'N' },
  { action_name: 'prev_media', shortcut_key: 'P' },
  { action_name: 'mute', shortcut_key: 'M' },
];

function isBrowserMode() {
  return typeof window !== 'undefined' && !window.novaplay;
}

function readWebData() {
  const empty = { settings: { theme: 'dark' }, shortcuts: DEFAULT_SHORTCUTS, history: {}, playlists: [], equalizer: [] };
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(WEB_STORAGE_KEY) || '{}') };
  } catch {
    return empty;
  }
}

function writeWebData(data) {
  localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(data));
}

function webRequest(method, path, body) {
  const data = readWebData();
  if (path === '/settings' && method === 'GET') return data.settings;
  if (path === '/settings' && method === 'PUT') {
    data.settings[body.key] = body.value;
    writeWebData(data);
    return data.settings;
  }
  if (path === '/settings/bulk' && method === 'PUT') {
    data.settings = { ...data.settings, ...body.settings };
    writeWebData(data);
    return data.settings;
  }
  if (path === '/shortcuts' && method === 'GET') return data.shortcuts;
  if (path === '/shortcuts' && method === 'PUT') {
    data.shortcuts = data.shortcuts.map(item => item.action_name === body.action_name ? { ...item, shortcut_key: body.shortcut_key } : item);
    writeWebData(data);
    return data.shortcuts;
  }
  if (path === '/shortcuts/reset' && method === 'POST') {
    data.shortcuts = DEFAULT_SHORTCUTS;
    writeWebData(data);
    return data.shortcuts;
  }

  if (path.startsWith('/history/item/') && method === 'GET') {
    return data.history[decodeURIComponent(path.slice('/history/item/'.length))] || null;
  }
  if (path === '/history' && method === 'POST') {
    const previous = data.history[body.file_path] || {};
    data.history[body.file_path] = {
      ...previous, ...body,
      media_type: body.media_type || previous.media_type,
      last_position: previous.last_position || 0,
      play_count: previous.play_count || 0,
      is_favorite: previous.is_favorite || false,
      last_played: Date.now(),
      file_available: true,
    };
    writeWebData(data);
    return data.history[body.file_path];
  }
  if (path === '/history/position' && method === 'POST') {
    if (data.history[body.file_path]) data.history[body.file_path].last_position = Number(body.position) || 0;
    writeWebData(data);
    return { success: true };
  }
  if (path === '/history/play' && method === 'POST') {
    if (data.history[body.file_path]) data.history[body.file_path].play_count = (data.history[body.file_path].play_count || 0) + 1;
    writeWebData(data);
    return { success: true };
  }
  if (path === '/history/favorite' && method === 'POST') {
    const item = data.history[body.file_path];
    if (!item) return { is_favorite: false };
    item.is_favorite = !item.is_favorite;
    writeWebData(data);
    return { is_favorite: item.is_favorite };
  }
  if (path === '/history' && method === 'DELETE') {
    data.history = {};
    writeWebData(data);
    return { success: true };
  }
  if (path.startsWith('/history/') && method === 'GET') {
    let items = Object.values(data.history);
    if (path === '/history/favorites') items = items.filter(item => item.is_favorite);
    if (path === '/history/most') items.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
    if (path === '/history/recent') items.sort((a, b) => (b.last_played || 0) - (a.last_played || 0));
    if (path.startsWith('/history/type/')) items = items.filter(item => item.media_type === path.split('/').pop());
    return items;
  }

  if (path === '/playlists' && method === 'GET') return data.playlists;
  if (path === '/playlists' && method === 'POST') {
    const playlist = { id: Date.now(), name: body.name, items: [] };
    data.playlists.push(playlist);
    writeWebData(data);
    return playlist;
  }
  const playlistMatch = path.match(/^\/playlists\/(\d+)(?:\/items(?:\/(\d+))?)?$/);
  if (playlistMatch) {
    const playlist = data.playlists.find(item => String(item.id) === playlistMatch[1]);
    if (!playlist) return null;
    if (method === 'GET') return playlist;
    if (method === 'PUT' && body.name) playlist.name = body.name;
    if (method === 'POST' && body.items) playlist.items.push(...body.items.map((item, index) => ({ id: Date.now() + index, ...item })));
    if (method === 'DELETE' && playlistMatch[2]) playlist.items = playlist.items.filter(item => String(item.id) !== playlistMatch[2]);
    if (method === 'DELETE' && !playlistMatch[2]) data.playlists = data.playlists.filter(item => item !== playlist);
    writeWebData(data);
    return playlist;
  }

  if (path === '/equalizer' && method === 'GET') return data.equalizer;
  if (path === '/equalizer' && method === 'POST') {
    data.equalizer.push({ id: Date.now(), ...body });
    writeWebData(data);
    return body;
  }
  return { success: true };
}

export function setServerConfig(configOrPort) {
  const config = typeof configOrPort === 'object' ? configOrPort : { port: configOrPort };
  BASE_URL = `http://127.0.0.1:${config.port}/api`;
  API_TOKEN = config.token || '';
}

export const setBaseUrl = setServerConfig;

async function request(method, path, body) {
  if (isBrowserMode()) return webRequest(method, path, body);
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(API_TOKEN ? { 'X-NovaPlay-Token': API_TOKEN } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),
};
