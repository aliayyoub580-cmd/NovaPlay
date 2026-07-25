import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, StopCircle, SkipBack, SkipForward,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  Maximize, Minimize, List, Settings2, PictureInPicture
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useAppStore }   from '../../store/appStore';
import { formatTime }    from '../../utils/mediaUtils';
import VolumeSlider      from './VolumeSlider';
import SpeedControl      from './SpeedControl';
import EqualizerPanel    from './EqualizerPanel';
import './PlaybackBar.css';

export default function PlaybackBar() {
  const {
    currentMedia, playing, duration, currentTime,
    volume, muted, speed, loop, shuffle, fullscreen,
    setPlaying, setPlayingByUser, toggleMuted, setVolume, setLoop,
    toggleShuffle, setFullscreen, next, prev, setPip,
    setCurrentTime,
  } = usePlayerStore();

  const { togglePlaylist, showPlaylist } = useAppStore();

  const [showSpeed, setShowSpeed] = useState(false);
  const [showEq,    setShowEq]    = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(true);
  const seekRef = useRef(null);
  const fullscreenTimer = useRef(null);

  useEffect(() => {
    if (!fullscreen) {
      setFullscreenVisible(true);
      clearTimeout(fullscreenTimer.current);
      return undefined;
    }

    const reveal = (event) => {
      const nearBottom = window.innerHeight - event.clientY < 150;
      if (nearBottom) setFullscreenVisible(true);
      clearTimeout(fullscreenTimer.current);
      fullscreenTimer.current = setTimeout(() => setFullscreenVisible(false), 1800);
    };
    window.addEventListener('mousemove', reveal);
    fullscreenTimer.current = setTimeout(() => setFullscreenVisible(false), 1800);
    return () => {
      window.removeEventListener('mousemove', reveal);
      clearTimeout(fullscreenTimer.current);
    };
  }, [fullscreen]);

  const togglePlay = () => setPlayingByUser(!playing);

  const stop = () => {
    setPlaying(false);
    window.dispatchEvent(new CustomEvent('novaplay-seek', { detail: 0 }));
  };

  const cycleLoop = () => {
    const modes = ['none', 'one', 'all'];
    setLoop(modes[(modes.indexOf(loop) + 1) % modes.length]);
  };

  // Seek bar click
  const handleSeekClick = (e) => {
    if (!duration) return;
    const rect = seekRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = ratio * duration;
    setCurrentTime(t);
    window.dispatchEvent(new CustomEvent('novaplay-seek', { detail: t }));
  };

  // Seek bar keyboard
  const handleSeekKey = (e) => {
    const skip = 5;
    if (e.key === 'ArrowRight') window.dispatchEvent(new CustomEvent('novaplay-seek', { detail: Math.min(duration, currentTime + skip) }));
    if (e.key === 'ArrowLeft')  window.dispatchEvent(new CustomEvent('novaplay-seek', { detail: Math.max(0, currentTime - skip) }));
  };

  const progress  = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remaining = Math.max(0, duration - currentTime);
  const LoopIcon  = loop === 'one' ? Repeat1 : Repeat;

  const togglePip = async () => {
    if (!window.novaplay) return;
    // Signal renderer via store
    const { pip } = usePlayerStore.getState();
    setPip(!pip);
    // VideoControls handles the actual browser PiP call via mediaRef
    window.dispatchEvent(new CustomEvent('novaplay-pip', { detail: !pip }));
  };

  return (
    <div className={`playback-bar${fullscreen ? ' fullscreen' : ''}${fullscreenVisible ? ' visible' : ''}`}>
      {/* ── Seek bar ── */}
      <div className="seek-area">
        <span className="time-label" aria-label="Current time">{formatTime(currentTime)}</span>
        <div
          className="seek-bar"
          ref={seekRef}
          onClick={handleSeekClick}
          onKeyDown={handleSeekKey}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
        >
          <div className="seek-track">
            <div className="seek-buffered" />
            <div className="seek-fill" style={{ width: `${progress}%` }} />
            <div className="seek-thumb" style={{ left: `${progress}%` }} />
          </div>
        </div>
        <span className="time-label" aria-label="Remaining time">-{formatTime(remaining)}</span>
      </div>

      {/* ── Controls row ── */}
      <div className="controls-row">

        {/* Left: current media info */}
        <div className="media-info-bar">
          {currentMedia && (
            <>
              <span className="media-type-badge" aria-hidden="true">
                {currentMedia.media_type === 'audio' ? '🎵' : '🎬'}
              </span>
              <span className="media-title-sm" title={currentMedia.file_path}>
                {currentMedia.file_name}
              </span>
            </>
          )}
        </div>

        {/* Center: playback controls */}
        <div className="center-controls" role="group" aria-label="Playback controls">
          <button
            className={`ctrl-btn${shuffle ? ' active' : ''}`}
            onClick={toggleShuffle}
            title="Shuffle"
            aria-pressed={shuffle}
          >
            <Shuffle size={15} />
          </button>

          <button className="ctrl-btn" onClick={prev} title="Previous (Ctrl+←)">
            <SkipBack size={18} />
          </button>

          <button
            className="ctrl-btn play-btn"
            onClick={togglePlay}
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button className="ctrl-btn" onClick={next} title="Next (Ctrl+→)">
            <SkipForward size={18} />
          </button>

          <button className="ctrl-btn" onClick={stop} title="Stop (S)">
            <StopCircle size={16} />
          </button>

          <button
            className={`ctrl-btn${loop !== 'none' ? ' active' : ''}`}
            onClick={cycleLoop}
            title={`Loop: ${loop}`}
            aria-label={`Loop mode: ${loop}`}
          >
            <LoopIcon size={15} />
          </button>
        </div>

        {/* Right: volume + extras */}
        <div className="right-controls" role="group" aria-label="Volume and settings">
          <button
            className="ctrl-btn"
            onClick={toggleMuted}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
            aria-pressed={muted}
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <VolumeSlider
            value={muted ? 0 : volume}
            onChange={v => { setVolume(v); if (v > 0 && muted) usePlayerStore.getState().setMuted(false); }}
          />

          <div className="ctrl-divider" aria-hidden="true" />

          {/* Speed */}
          <button
            className={`ctrl-btn text-btn${showSpeed ? ' active' : ''}`}
            onClick={() => { setShowSpeed(s => !s); setShowEq(false); }}
            title="Playback speed"
            aria-expanded={showSpeed}
          >
            {speed === 1 ? '1×' : `${speed}×`}
          </button>

          {/* Equalizer */}
          <button
            className={`ctrl-btn${showEq ? ' active' : ''}`}
            onClick={() => { setShowEq(s => !s); setShowSpeed(false); }}
            title="Equalizer"
            aria-expanded={showEq}
          >
            <Settings2 size={15} />
          </button>

          {/* PiP (video only) */}
          {currentMedia?.media_type === 'video' && (
            <button className="ctrl-btn" onClick={togglePip} title="Picture-in-Picture">
              <PictureInPicture size={15} />
            </button>
          )}

          {/* Toggle playlist panel */}
          <button
            className={`ctrl-btn${showPlaylist ? ' active' : ''}`}
            onClick={togglePlaylist}
            title="Toggle queue (Ctrl+L)"
            aria-pressed={showPlaylist}
          >
            <List size={16} />
          </button>

          {/* Fullscreen (video only) */}
          {currentMedia?.media_type === 'video' && (
            <button
              className="ctrl-btn"
              onClick={() => {
                const newFs = !fullscreen;
                setFullscreen(newFs);
                window.dispatchEvent(new CustomEvent('novaplay-fullscreen', { detail: newFs }));
              }}
              title={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
              aria-pressed={fullscreen}
            >
              {fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* ── Popover panels ── */}
      {showSpeed && <SpeedControl onClose={() => setShowSpeed(false)} />}
      {showEq    && <EqualizerPanel onClose={() => setShowEq(false)} />}
    </div>
  );
}
