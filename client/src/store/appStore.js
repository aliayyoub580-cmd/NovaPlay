import { create } from 'zustand';
import { api } from '../utils/api';

export const useAppStore = create((set, get) => ({
  settings: {},
  shortcuts: [],
  theme: 'dark',
  sidebarSection: 'home',
  showSidebar: false,
  showPlaylist: false,
  serverPort: null,
  loading: false,

  setServerPort: (port) => set({ serverPort: port }),
  setSidebarSection: (s) => set({ sidebarSection: s }),
  toggleSidebar: () => set(s => ({ showSidebar: !s.showSidebar })),
  togglePlaylist: () => set(s => ({ showPlaylist: !s.showPlaylist })),
  setTheme: (t) => {
    set({ theme: t });
    document.body.className = t === 'light' ? 'light' : '';
  },

  loadSettings: async () => {
    try {
      const s = await api.get('/settings');
      set({ settings: s });
      if (s.theme) {
        document.body.className = s.theme === 'light' ? 'light' : '';
        set({ theme: s.theme });
      }
    } catch {}
  },

  saveSetting: async (key, value) => {
    set(s => ({ settings: { ...s.settings, [key]: value } }));
    try { await api.put('/settings', { key, value }); } catch {}
  },

  loadShortcuts: async () => {
    try {
      const shortcuts = await api.get('/shortcuts');
      set({ shortcuts });
    } catch {}
  },

  updateShortcut: async (action_name, shortcut_key) => {
    try {
      await api.put('/shortcuts', { action_name, shortcut_key });
      await get().loadShortcuts();
    } catch {}
  },

  resetShortcuts: async () => {
    try {
      await api.post('/shortcuts/reset', {});
      await get().loadShortcuts();
    } catch {}
  },
}));
