'use strict';

const AUDIO_EXTENSIONS = ['mp3','wav','aac','flac','ogg','m4a','wma','opus','aiff'];
const VIDEO_EXTENSIONS = ['mp4','mkv','avi','webm','mov','wmv','flv','mpeg','mpg','m4v','3gp'];
const SUBTITLE_EXTENSIONS = ['srt','vtt','ass','ssa'];
const ALL_MEDIA_EXTENSIONS = [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS];

const MEDIA_TYPES = { AUDIO: 'audio', VIDEO: 'video' };

const DEFAULT_SHORTCUTS = [
  { action_name: 'play_pause',       shortcut_key: 'Space' },
  { action_name: 'fullscreen',       shortcut_key: 'F' },
  { action_name: 'exit_fullscreen',  shortcut_key: 'Escape' },
  { action_name: 'volume_up',        shortcut_key: 'ArrowUp' },
  { action_name: 'volume_down',      shortcut_key: 'ArrowDown' },
  { action_name: 'skip_forward',     shortcut_key: 'ArrowRight' },
  { action_name: 'skip_backward',    shortcut_key: 'ArrowLeft' },
  { action_name: 'skip_forward_60',  shortcut_key: 'Ctrl+ArrowRight' },
  { action_name: 'skip_backward_60', shortcut_key: 'Ctrl+ArrowLeft' },
  { action_name: 'next_media',       shortcut_key: 'N' },
  { action_name: 'prev_media',       shortcut_key: 'P' },
  { action_name: 'mute',             shortcut_key: 'M' },
];

const DEFAULT_SETTINGS = {
  volume: 80,
  playback_speed: 1.0,
  skip_forward_duration: 10,
  skip_backward_duration: 10,
  resume_playback: true,
  always_on_top: false,
  minimize_to_tray: true,
  continue_when_minimized: false,
  hardware_acceleration: true,
  default_subtitle_language: 'en',
  equalizer_preset: 'Flat',
  theme: 'dark',
};

const EQUALIZER_PRESETS = {
  Flat:       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 2, 4, 5, 6, 6],
  Rock:       [4, 3, 2, 0, -1, -1, 0, 2, 3, 4],
  Pop:        [-1, 2, 4, 4, 2, 0, -1, -1, -1, -1],
  Classical:  [4, 3, 3, 0, 0, 0, 0, 2, 3, 4],
  Jazz:       [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  Electronic: [5, 4, 2, 0, -2, 0, 2, 3, 4, 5],
  Vocal:      [-2, -2, 0, 2, 4, 4, 2, 0, -1, -2],
  Custom:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

module.exports = {
  AUDIO_EXTENSIONS,
  VIDEO_EXTENSIONS,
  SUBTITLE_EXTENSIONS,
  ALL_MEDIA_EXTENSIONS,
  MEDIA_TYPES,
  DEFAULT_SHORTCUTS,
  DEFAULT_SETTINGS,
  EQUALIZER_PRESETS,
  EQ_FREQUENCIES,
};
