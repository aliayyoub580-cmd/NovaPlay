# NovaPlay — Advanced Desktop Music & Video Player

A professional, premium-quality desktop media player built with **Electron**, **React**, **Node.js**, **Express**, and **SQLite**.

---

## Features

- **Universal media support** — MP3, WAV, AAC, FLAC, OGG, M4A, WMA, OPUS, AIFF (audio) and MP4, MKV, AVI, WebM, MOV, WMV, FLV, MPEG, MPG, M4V, 3GP (video)
- **Modern VLC-inspired UI** — dark/light themes, orange accent, custom title bar
- **Full playback controls** — play, pause, stop, seek, skip, repeat, shuffle, speed control
- **Equalizer** — 10-band EQ with presets (Flat, Bass Boost, Rock, Pop, Classical, Jazz, Electronic, Vocal, Custom)
- **Playlist management** — create, rename, delete, drag-to-reorder playlists
- **Queue system** — add, remove, reorder the playback queue
- **Resume playback** — picks up where you left off
- **Favorites, Recently Played, Most Played** — automatically tracked
- **Keyboard shortcuts** — fully customizable
- **Subtitle support** — SRT, VTT, ASS, SSA; subtitle delay control
- **Picture-in-Picture** — browser native PiP
- **Fullscreen mode** — double-click video or press F
- **System tray** — play/pause/next/prev from tray; minimize to tray
- **Open With integration** — register as default media player
- **Drag & drop** — drop files anywhere onto the app
- **Single instance** — opening files while app is running sends them to the existing window
- **SQLite database** — all history, settings, playlists stored locally in `%APPDATA%\NovaPlay\`
- **Express.js local API** — runs on localhost only, dynamically assigned port
- **Secure Electron** — contextIsolation, no nodeIntegration, preload script only

---

## Project Structure

```
novaplay-app/
├── electron/           # Electron main process
│   ├── main.js         # App entry, window, tray, single-instance
│   ├── preload.js      # Secure contextBridge API
│   ├── ipc/            # IPC handlers (file dialogs, window controls)
│   ├── services/       # Media argument parsing
│   └── fileAssociations/
├── client/             # React frontend (Vite)
│   └── src/
│       ├── components/ # UI components (player, playlist, sidebar, ui)
│       ├── pages/      # Home, Playlists, Favorites, Recent, Most, Audio, Videos, Settings
│       ├── layouts/    # MainArea layout
│       ├── hooks/      # useKeyboardShortcuts
│       ├── store/      # Zustand stores (playerStore, appStore)
│       └── utils/      # api.js, mediaUtils.js
├── server/             # Express.js backend
│   ├── app.js          # Express app factory
│   ├── routes/         # All API routes
│   ├── controllers/    # settings, history, playlist, equalizer, shortcuts
│   ├── middleware/     # error handler, validator
│   └── database/       # sql.js init, schema, helpers
├── shared/
│   └── constants/      # Media extensions, defaults, EQ presets
├── assets/             # App icons
└── package.json
```

---

## Prerequisites

- **Node.js** v18+ (v24 tested)
- **npm** v9+

---

## Development

```bash
# 1. Install root dependencies
npm install

# 2. Install client dependencies
cd client && npm install --legacy-peer-deps && cd ..

# 3. Run in development mode (starts Vite + Electron)
npm run dev
```

> Vite dev server runs on `http://localhost:5173`.  
> Electron loads that URL in development mode.

---

## Production Build

```bash
# Build the React client
npm run build:client

# Package the Electron app (Windows NSIS installer + portable)
npm run dist
```

Output is in the `dist-app/` folder.

## Web deployment

The React interface can be deployed to Vercel from the repository root. The
included `vercel.json` installs and builds only the `client/` application:

```bash
vercel
vercel --prod
```

The Windows desktop integration, local Express API, file associations, and
Electron-only features remain available in the installed desktop application.

## Media smoke test

The repository includes an Electron-based smoke test that loads the supplied
MP3 and MP4 through Chromium's real audio/video engine and verifies that media
metadata can be decoded:

```bash
npm run test:media
```

The command exits non-zero if either file is missing, unsupported, damaged, or
cannot be decoded.

---

## Installation

After running `npm run dist`, find the installer in `dist/NovaPlay Setup x.x.x.exe`.

The installer will:
- Install NovaPlay to Program Files
- Create desktop and Start Menu shortcuts
- Register file associations for all supported media formats
- Allow "Open With → NovaPlay" from Windows Explorer

---

## Usage

### Opening Files
1. **File → Open File** (sidebar or `Ctrl+O`)
2. **Drag & drop** any media file onto the app
3. **Right-click** a media file in Explorer → **Open With → NovaPlay**
4. **Double-click** a media file (after setting NovaPlay as default player)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `F` | Fullscreen |
| `Esc` | Exit Fullscreen |
| `↑` / `↓` | Volume Up / Down |
| `→` / `←` | Skip Forward / Backward |
| `Ctrl+→` / `Ctrl+←` | Next / Previous |
| `M` | Mute |
| `S` | Stop |
| `Ctrl+O` | Open File |
| `Ctrl+Shift+O` | Open Multiple |
| `Ctrl+L` | Toggle Playlist |
| `[` / `]` | Speed Down / Up |
| `0` | Reset Speed |

All shortcuts are customizable in **Settings → Keyboard Shortcuts**.

---

## Database

SQLite database is stored at:  
`%APPDATA%\NovaPlay\novaplay.db`

Logs are stored at:  
`%APPDATA%\NovaPlay\error.log`

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 31 |
| Frontend | React 18, Vite 8, Zustand |
| Backend API | Express.js 4 |
| Database | sql.js (SQLite) |
| Drag & sort | @dnd-kit |
| Icons | Lucide React |
| Notifications | react-hot-toast |
| Packaging | electron-builder |
