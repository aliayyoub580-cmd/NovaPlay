import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = async (e) => {
      // Don't fire when typing in an input
      const target = e.target;
      if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;

      const store = usePlayerStore.getState();
      const key = e.key.toLowerCase();
      const seek = (seconds) => {
        window.dispatchEvent(new CustomEvent('novaplay-seek', {
          detail: Math.max(0, Math.min(store.duration || Infinity, store.currentTime + seconds)),
        }));
      };

      if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        seek(60);
      } else if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        seek(-60);
      } else if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        seek(10);
      } else if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        seek(-10);
      } else if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        store.setVolume(store.volume + 0.05);
      } else if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        store.setVolume(store.volume - 0.05);
      } else if (!e.ctrlKey && !e.altKey && !e.shiftKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        store.setPlaying(!store.playing);
      } else if (!e.ctrlKey && !e.altKey && !e.shiftKey && key === 'm') {
        e.preventDefault();
        store.toggleMuted();
      } else if (!e.ctrlKey && !e.altKey && !e.shiftKey && key === 'n') {
        e.preventDefault();
        store.next();
      } else if (!e.ctrlKey && !e.altKey && !e.shiftKey && key === 'p') {
        e.preventDefault();
        store.prev();
      } else if (!e.ctrlKey && !e.altKey && !e.shiftKey && key === 'f') {
        e.preventDefault();
        if (document.fullscreenElement) {
          await document.exitFullscreen?.();
          store.setFullscreen(false);
        } else {
          await document.documentElement.requestFullscreen?.();
          store.setFullscreen(true);
        }
      } else if (e.key === 'Escape' && document.fullscreenElement) {
        e.preventDefault();
        await document.exitFullscreen?.();
        store.setFullscreen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
