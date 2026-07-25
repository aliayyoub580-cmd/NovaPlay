import { create } from 'zustand';
import { api } from '../utils/api';
import { getMediaType, getFileName } from '../utils/mediaUtils';

const POSITION_SAVE_INTERVAL = 5000; // ms

export const usePlayerStore = create((set, get) => ({
  // ── Queue ──────────────────────────────────────────────────────────────
  queue:      [],
  queueIndex: -1,
  currentMedia: null,

  // ── Playback ───────────────────────────────────────────────────────────
  playing:  false,
  duration: 0,
  currentTime: 0,
  volume:   0.8,
  muted:    false,
  speed:    1.0,
  loop:     'none',   // 'none' | 'one' | 'all'
  shuffle:  false,

  // ── Video ──────────────────────────────────────────────────────────────
  fullscreen:  false,
  pip:         false,
  aspectRatio: 'contain',
  rotation:    0,
  zoom:        1,

  // ── Subtitle ───────────────────────────────────────────────────────────
  subtitleFile:  null,
  subtitleDelay: 0,
  audioDelay:    0,

  // ── Equalizer ─────────────────────────────────────────────────────────
  eqEnabled: false,
  eqValues:  [0,0,0,0,0,0,0,0,0,0],
  eqPreamp:  0,

  // ── Resume prompt ──────────────────────────────────────────────────────
  resumePrompt: null,   // { filePath, position, duration }

  // internal
  _lastPosSave: 0,

  // ── Simple setters ─────────────────────────────────────────────────────
  setVolume:      (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  setMuted:       (m) => set({ muted: m }),
  toggleMuted:    ()  => set(s => ({ muted: !s.muted })),
  setSpeed:       (v) => set({ speed: v }),
  setLoop:        (v) => set({ loop: v }),
  toggleShuffle:  ()  => set(s => ({ shuffle: !s.shuffle })),
  setFullscreen:  (v) => set({ fullscreen: v }),
  setPip:         (v) => set({ pip: v }),
  setDuration:    (d) => set({ duration: d }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setPlaying:     (p) => set({ playing: p }),
  setPlayingByUser: (p) => {
    const state = get();
    if (state.currentMedia && state.playing !== p) {
      window.dispatchEvent(new CustomEvent('novaplay-user-playback', {
        detail: { paused: !p },
      }));
    }
    set({ playing: p });
  },
  setSubtitleFile:  (f) => set({ subtitleFile: f }),
  setSubtitleDelay: (d) => set({ subtitleDelay: d }),
  setAudioDelay:    (d) => set({ audioDelay: d }),
  setAspectRatio:   (a) => set({ aspectRatio: a }),
  setRotation:  (r) => set({ rotation: r }),
  setZoom:      (z) => set({ zoom: Math.max(0.5, Math.min(4, z)) }),
  setEqEnabled: (v) => set({ eqEnabled: v }),
  setEqValues:  (v) => set({ eqValues: v }),
  setEqPreamp:  (v) => set({ eqPreamp: v }),
  clearResumePrompt: () => set({ resumePrompt: null }),

  // ── Load a new queue and start playing ────────────────────────────────
  loadQueue: async (files, startIndex = 0, options = {}) => {
    if (!files || files.length === 0) return;
    const items = files.map(file => typeof file === 'object' ? file : ({
      file_path: file,
      file_name: getFileName(file),
      media_type: getMediaType(file),
    }));
    set({ queue: items, queueIndex: -1, playing: false, currentTime: 0 });
    await get()._loadIndex(startIndex, true, options.skipResume === true);
  },

  // ── Internal: load index, optionally auto-play ─────────────────────────
  _loadIndex: async (index, autoPlay = false, skipResume = false) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;
    const item = queue[index];

    set({
      queueIndex: index,
      currentMedia: item,
      playing: false,
      currentTime: 0,
      duration: 0,
      resumePrompt: null,
      subtitleFile: null,
    });

    // Check resume history
    try {
      const hist = await api.get(`/history/item/${encodeURIComponent(item.file_path)}`);
      if (
        !skipResume &&
        hist &&
        hist.last_position > 10 &&
        hist.duration > 0 &&
        hist.last_position < hist.duration * 0.97
      ) {
        set({ resumePrompt: { filePath: item.file_path, position: hist.last_position, duration: hist.duration } });
        // Don't auto-play until user picks resume/restart
        return;
      }
    } catch {}

    // Upsert in history
    try {
      await api.post('/history', {
        file_path: item.file_path,
        file_name: item.file_name,
        duration: 0,
      });
    } catch {}

    if (autoPlay) set({ playing: true });
  },

  // Public playIndex (used by playlist panel double-click)
  playIndex: async (index) => {
    await get()._loadIndex(index, true);
  },

  // ── Record play count (after 30 s) ────────────────────────────────────
  recordPlay: async (filePath) => {
    try { await api.post('/history/play', { file_path: filePath }); } catch {}
  },

  // ── Save position (throttled) ─────────────────────────────────────────
  savePosition: async (filePath, position) => {
    const now = Date.now();
    if (now - get()._lastPosSave < POSITION_SAVE_INTERVAL) return;
    set({ _lastPosSave: now });
    try { await api.post('/history/position', { file_path: filePath, position }); } catch {}
  },

  // ── Update duration in history when known ─────────────────────────────
  updateDuration: async (filePath, duration) => {
    try { await api.post('/history', { file_path: filePath, file_name: getFileName(filePath), duration }); } catch {}
  },

  // ── Navigation ────────────────────────────────────────────────────────
  next: async () => {
    const { queue, queueIndex, shuffle, loop } = get();
    if (queue.length === 0) return;
    let nextIdx;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (loop === 'all') nextIdx = 0;
        else { set({ playing: false }); return; }
      }
    }
    await get()._loadIndex(nextIdx, true);
  },

  prev: async () => {
    const { queueIndex, currentTime } = get();
    // If past 3 s, restart current track
    if (currentTime > 3) {
      window.dispatchEvent(new CustomEvent('novaplay-seek', { detail: 0 }));
      return;
    }
    const prevIdx = Math.max(0, queueIndex - 1);
    await get()._loadIndex(prevIdx, true);
  },

  // ── Queue management ───────────────────────────────────────────────────
  addToQueue: (files) => {
    const items = files.map(fp => ({
      file_path: fp,
      file_name: getFileName(fp),
      media_type: getMediaType(fp),
    }));
    set(s => ({ queue: [...s.queue, ...items] }));
  },

  addNextInQueue: (files) => {
    const { queue, queueIndex } = get();
    const items = files.map(fp => ({
      file_path: fp,
      file_name: getFileName(fp),
      media_type: getMediaType(fp),
    }));
    const newQueue = [...queue];
    newQueue.splice(queueIndex + 1, 0, ...items);
    set({ queue: newQueue });
  },

  removeFromQueue: (index) => {
    set(s => {
      const queue = [...s.queue];
      queue.splice(index, 1);
      let qi = s.queueIndex;
      if (index < qi) qi--;
      else if (index === qi) qi = Math.min(qi, queue.length - 1);
      return { queue, queueIndex: qi };
    });
  },

  clearQueue: () => set({
    queue: [], queueIndex: -1, currentMedia: null,
    playing: false, currentTime: 0, duration: 0,
  }),

  moveInQueue: (from, to) => {
    set(s => {
      const queue = [...s.queue];
      const [item] = queue.splice(from, 1);
      queue.splice(to, 0, item);
      let qi = s.queueIndex;
      if      (from === qi)              qi = to;
      else if (from < qi && to >= qi)   qi--;
      else if (from > qi && to <= qi)   qi++;
      return { queue, queueIndex: qi };
    });
  },
}));
