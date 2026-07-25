// API client - talks to the local Express server
let BASE_URL = 'http://127.0.0.1:3456/api';
let API_TOKEN = '';

export function setServerConfig(configOrPort) {
  const config = typeof configOrPort === 'object' ? configOrPort : { port: configOrPort };
  BASE_URL = `http://127.0.0.1:${config.port}/api`;
  API_TOKEN = config.token || '';
}

export const setBaseUrl = setServerConfig;

async function request(method, path, body) {
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
