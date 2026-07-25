import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { buildMediaUrl } from '../../utils/mediaUtils';
import { api } from '../../utils/api';
import ResumePrompt from './ResumePrompt';
import AudioVisualizer from './AudioVisualizer';
import VideoControls from './VideoControls';
import AdsterraPauseBanner from '../ads/AdsterraPauseBanner';
import './PlayerView.css';

export default function PlayerView() {
  const {
    currentMedia, playing, volume, muted, speed,
    fullscreen, subtitleFile, aspectRatio, rotation, zoom,
    eqEnabled, eqValues, eqPreamp,
    setPlaying, setDuration, setCurrentTime, setFullscreen,
    next, recordPlay, savePosition, updateDuration,
    resumePrompt, clearResumePrompt,
  } = usePlayerStore();

  const mediaRef        = useRef(null);
  const containerRef    = useRef(null);
  const playCountRef    = useRef(false);
  const audioCtxRef     = useRef(null);
  const sourceNodeRef   = useRef(null);
  const filtersRef      = useRef([]);
  const gainRef         = useRef(null);
  const pendingPlayRef  = useRef(false);   // play as soon as src loads
  const [showControls, setShowControls] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [volumeOverlay, setVolumeOverlay] = useState(null);
  const hideTimer       = useRef(null);
  const volumeTimer     = useRef(null);
  const volumeReady     = useRef(false);
  const pauseAdRef      = useRef(null);

  const isVideo = currentMedia?.media_type === 'video';

  // ── Seek event listener (from PlaybackBar / keyboard) ──────────────────
  useEffect(() => {
    const onSeek = (e) => {
      const el = mediaRef.current;
      if (!el) return;
      const t = Math.max(0, Math.min(isFinite(el.duration) ? el.duration : 0, e.detail));
      el.currentTime = t;
      setCurrentTime(t);
    };
    window.addEventListener('novaplay-seek', onSeek);
    return () => window.removeEventListener('novaplay-seek', onSeek);
  }, [setCurrentTime]);

  // ── Load new source when currentMedia changes ──────────────────────────
  useEffect(() => {
    playCountRef.current = false;
    const el = mediaRef.current;
    if (!el) return;

    if (!currentMedia) {
      el.src = '';
      el.load();
      return;
    }

    pendingPlayRef.current = playing;
    const url = buildMediaUrl(currentMedia.file_path);
    el.src = url;
    el.load();
    // actual play triggered in onCanPlay / playing state sync below
  }, [currentMedia?.file_path]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync playing ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mediaRef.current;
    if (!el || !currentMedia) return;
    if (playing) {
      el.play().catch(err => {
        if (err.name !== 'AbortError') setPlaying(false);
      });
    } else {
      el.pause();
    }
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (playing) pauseAdRef.current?.hide();
  }, [playing]);

  useEffect(() => {
    const onUserPlayback = event => {
      if (event.detail?.paused) pauseAdRef.current?.show();
      else pauseAdRef.current?.hide();
    };
    window.addEventListener('novaplay-user-playback', onUserPlayback);
    return () => {
      window.removeEventListener('novaplay-user-playback', onUserPlayback);
      pauseAdRef.current?.hide();
    };
  }, []);

  // ── Sync volume / mute ─────────────────────────────────────────────────
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.volume = muted ? 0 : Math.max(0, Math.min(1, volume));
  }, [volume, muted]);

  // ── Sync playback speed ────────────────────────────────────────────────
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.playbackRate = speed;
  }, [speed]);

  // ── Build Web Audio EQ chain ───────────────────────────────────────────
  useEffect(() => {
    if (!eqEnabled || !mediaRef.current) {
      // Disconnect EQ if disabled
      if (gainRef.current) { try { gainRef.current.disconnect(); } catch {} }
      return;
    }
    const el = mediaRef.current;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      if (!sourceNodeRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(el);
      }

      // Disconnect old chain
      if (gainRef.current)  { try { gainRef.current.disconnect(); } catch {} }
      filtersRef.current.forEach(f => { try { f.disconnect(); } catch {} });

      const freqs   = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      const filters = freqs.map((freq, i) => {
        const f = ctx.createBiquadFilter();
        f.type  = i === 0 ? 'lowshelf' : i === 9 ? 'highshelf' : 'peaking';
        f.frequency.value = freq;
        f.gain.value      = (eqValues[i] || 0) + eqPreamp;
        return f;
      });

      const gain = ctx.createGain();
      gain.gain.value = 1;
      gainRef.current  = gain;
      filtersRef.current = filters;

      sourceNodeRef.current.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
      filters[filters.length - 1].connect(gain);
      gain.connect(ctx.destination);
    } catch (e) {
      console.warn('[NovaPlay EQ]', e.message);
    }
  }, [eqEnabled, eqValues, eqPreamp]);

  // ── Fullscreen change ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [setFullscreen]);

  useEffect(() => {
    if (!volumeReady.current) {
      volumeReady.current = true;
      return;
    }
    setVolumeOverlay(muted ? 0 : Math.round(volume * 100));
    clearTimeout(volumeTimer.current);
    volumeTimer.current = setTimeout(() => setVolumeOverlay(null), 1200);
    return () => clearTimeout(volumeTimer.current);
  }, [volume, muted]);

  useEffect(() => {
    const onFullscreen = async (event) => {
      if (event.detail) {
        await document.documentElement.requestFullscreen?.().catch(() => {});
        setFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen?.().catch(() => {});
        setFullscreen(false);
      }
    };
    window.addEventListener('novaplay-fullscreen', onFullscreen);
    return () => window.removeEventListener('novaplay-fullscreen', onFullscreen);
  }, [setFullscreen]);

  // ── Media event handlers ───────────────────────────────────────────────
  const handleCanPlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      el.play().catch(err => { if (err.name !== 'AbortError') setPlaying(false); });
    }
  }, [setPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (!playCountRef.current && el.currentTime >= 30 && currentMedia) {
      playCountRef.current = true;
      recordPlay(currentMedia.file_path);
    }
    if (currentMedia) savePosition(currentMedia.file_path, el.currentTime);
  }, [currentMedia, recordPlay, savePosition, setCurrentTime]);

  const handleLoadedMetadata = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    const dur = el.duration;
    setDuration(isFinite(dur) ? dur : 0);
    if (currentMedia && isFinite(dur)) updateDuration(currentMedia.file_path, dur);
  }, [currentMedia, setDuration, updateDuration]);

  const handleEnded = useCallback(() => {
    const { loop } = usePlayerStore.getState();
    if (loop === 'one') {
      const el = mediaRef.current;
      if (el) { el.currentTime = 0; el.play().catch(() => {}); }
    } else {
      next();
    }
  }, [next]);

  const handleError = useCallback(() => {
    const el = mediaRef.current;
    const code = el?.error?.code;
    const msgs = {
      1: 'Playback was aborted',
      2: 'Network error while loading file',
      3: 'File is damaged or codec not supported',
      4: 'Format not supported',
    };
    const msg = msgs[code] || 'Unknown playback error';
    console.error(`[NovaPlay] Media error ${code}: ${msg}`);
    setPlaying(false);
  }, [setPlaying]);

  // ── Double-click: fullscreen (video) ────────────────────────────────────
  const handleDoubleClick = useCallback(() => {
    if (!isVideo) return;
    const newFs = !fullscreen;
    setFullscreen(newFs);
    if (newFs) document.documentElement.requestFullscreen?.().catch(() => {});
    else       document.exitFullscreen?.();
  }, [isVideo, fullscreen, setFullscreen]);

  // ── Mouse move: show video overlay controls ────────────────────────────
  const handleMouseMove = useCallback(() => {
    if (!isVideo) return;
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2500);
  }, [isVideo]);

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const store = usePlayerStore.getState();
    store.setVolume(store.volume + (event.deltaY < 0 ? 0.05 : -0.05));
  }, []);

  const handleMouseDown = useCallback((event) => {
    if (event.button !== 1) return;
    event.preventDefault();
    const store = usePlayerStore.getState();
    store.setPlayingByUser(!store.playing);
  }, []);

  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  // Cleanup
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // ── Video CSS ──────────────────────────────────────────────────────────
  const videoStyle = {
    transform: `rotate(${rotation}deg) scale(${zoom})`,
    objectFit: aspectRatio === 'fill' ? 'fill' : aspectRatio === 'cover' ? 'cover' : 'contain',
    width:  '100%',
    height: '100%',
  };

  // ── Empty state ────────────────────────────────────────────────────────
  if (!currentMedia) {
    return (
      <div className="player-empty">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="1.5" opacity="0.35"/>
          <polygon points="9,7 9,17 18,12" fill="var(--accent)" opacity="0.5"/>
        </svg>
        <p className="player-empty-title">NovaPlay</p>
        <p className="player-empty-hint">Open a file · Drag &amp; drop · Right-click "Open With"</p>
      </div>
    );
  }

  return (
    <div
      className={`player-view${fullscreen ? ' player-fullscreen' : ''}`}
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      {/* ── Video player ── */}
      {isVideo ? (
        <video
          ref={mediaRef}
          className="media-element"
          style={videoStyle}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
          playsInline
        >
          {subtitleFile && (
            <track kind="subtitles" src={buildMediaUrl(subtitleFile)} default />
          )}
        </video>
      ) : (
        /* ── Audio player ── */
        <div className="audio-player-view">
          <audio
            ref={mediaRef}
            onCanPlay={handleCanPlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onError={handleError}
          />
          <div className="audio-artwork" aria-hidden="true">
            <svg width="88" height="88" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="var(--accent)" opacity="0.08"/>
              <circle cx="12" cy="12" r="4.5" fill="var(--accent)" opacity="0.55"/>
              <path d="M15.5 7.5 L20 5.5 L20 13.5 L15.5 11.5 Z" fill="var(--accent)" opacity="0.75"/>
              <circle cx="12" cy="12" r="1.8" fill="var(--bg-primary)" opacity="0.9"/>
            </svg>
          </div>
          <div className="audio-info">
            <p className="audio-title" title={currentMedia.file_name}>
              {currentMedia.file_name}
            </p>
          </div>
          <AudioVisualizer audioRef={mediaRef} enabled={playing} />
        </div>
      )}

      {/* ── Video overlay controls (hover) ── */}
      {isVideo && showControls && (
        <VideoControls mediaRef={mediaRef} containerRef={containerRef} />
      )}

      {volumeOverlay !== null && (
        <div className="volume-overlay" role="status" aria-live="polite">
          Volume {volumeOverlay}%
        </div>
      )}

      <AdsterraPauseBanner ref={pauseAdRef} />

      {/* ── Resume prompt ── */}
      {resumePrompt && (
        <ResumePrompt
          position={resumePrompt.position}
          onResume={() => {
            const el = mediaRef.current;
            if (el) el.currentTime = resumePrompt.position;
            clearResumePrompt();
            api.post('/history', {
              file_path: currentMedia.file_path,
              file_name: currentMedia.file_name,
              duration: 0,
            }).catch(() => {});
            setPlaying(true);
          }}
          onRestart={() => {
            const el = mediaRef.current;
            if (el) el.currentTime = 0;
            clearResumePrompt();
            api.post('/history', {
              file_path: currentMedia.file_path,
              file_name: currentMedia.file_name,
              duration: 0,
            }).catch(() => {});
            setPlaying(true);
          }}
        />
      )}

      {contextMenu && (
        <div
          className="player-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button onClick={() => {
            const store = usePlayerStore.getState();
            store.setPlayingByUser(!store.playing);
            setContextMenu(null);
          }}>{playing ? 'Pause' : 'Play'}</button>
          <button onClick={() => {
            usePlayerStore.getState().toggleMuted();
            setContextMenu(null);
          }}>{muted ? 'Unmute' : 'Mute'}</button>
          {isVideo && <button onClick={() => {
            handleDoubleClick();
            setContextMenu(null);
          }}>{fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>}
        </div>
      )}
    </div>
  );
}
