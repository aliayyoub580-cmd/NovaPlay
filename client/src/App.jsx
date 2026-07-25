import React, { useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import TitleBar from './components/ui/TitleBar';
import MainArea from './layouts/MainArea';
import PlaybackBar from './components/player/PlaybackBar';
import { useAppStore } from './store/appStore';
import { usePlayerStore } from './store/playerStore';
import { setServerConfig } from './utils/api';
import { isSupported } from './utils/mediaUtils';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import DragDropOverlay from './components/ui/DragDropOverlay';
import './App.css';

export default function App() {
  const { loadSettings, loadShortcuts, setServerPort } = useAppStore();
  const { loadQueue } = usePlayerStore();
  const initialized = useRef(false);
  useKeyboardShortcuts();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Get server port
    if (window.novaplay) {
      window.novaplay.getServerConfig().then(config => {
        setServerConfig(config);
        setServerPort(config.port);
        loadSettings();
        loadShortcuts();
      });

      // Listen for files opened via OS / drag
      const disposeOpenFiles = window.novaplay.onOpenFiles((files) => {
        const valid = files.filter(isSupported);
        if (valid.length > 0) loadQueue(valid, 0, { skipResume: true });
        else toast.error('No supported media files found');
      });
      window.novaplay.rendererReady();

      // Tray actions
      const disposeTrayAction = window.novaplay.onTrayAction((action) => {
        const store = usePlayerStore.getState();
        if (action === 'play_pause') store.setPlayingByUser(!store.playing);
        if (action === 'next') store.next();
        if (action === 'prev') store.prev();
      });

      // Server port via event
      const disposeServerConfig = window.novaplay.onServerConfig((config) => {
        setServerConfig(config);
        setServerPort(config.port);
        loadSettings();
        loadShortcuts();
      });
      return () => {
        disposeOpenFiles?.();
        disposeTrayAction?.();
        disposeServerConfig?.();
      };
    } else {
      // Dev mode fallback
      loadSettings();
      loadShortcuts();
    }
  }, []);

  return (
    <div className="app-root">
      <TitleBar />
      <div className="app-body">
        <MainArea />
      </div>
      <PlaybackBar />
      <DragDropOverlay />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          },
          success: { iconTheme: { primary: 'var(--accent)', secondary: '#fff' } },
        }}
      />
    </div>
  );
}
