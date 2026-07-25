import React, { useEffect, useState } from 'react';
import { Save, RotateCcw, Sun, Moon, Trash2, Info } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import './Page.css';
import './SettingsPage.css';

const ACTION_LABELS = {
  play_pause:      'Play / Pause',
  fullscreen:      'Fullscreen',
  exit_fullscreen: 'Exit Fullscreen',
  volume_up:       'Volume Up',
  volume_down:     'Volume Down',
  skip_forward:    'Skip Forward',
  skip_backward:   'Skip Backward',
  skip_forward_60: 'Seek Forward 60 Seconds',
  skip_backward_60:'Seek Backward 60 Seconds',
  next_media:      'Next Media',
  prev_media:      'Previous Media',
  mute:            'Mute',
};

export default function SettingsPage() {
  const { settings, saveSetting, shortcuts, loadShortcuts, updateShortcut, resetShortcuts, theme, setTheme } = useAppStore();
  const [localSettings, setLocalSettings] = useState({});
  const [recording, setRecording] = useState(null);
  const [localShortcuts, setLocalShortcuts] = useState([]);

  useEffect(() => {
    setLocalSettings({ ...settings });
    loadShortcuts();
  }, [settings]);

  useEffect(() => {
    setLocalShortcuts(shortcuts);
  }, [shortcuts]);

  const set = (key, value) => setLocalSettings(s => ({ ...s, [key]: value }));

  const saveAll = async () => {
    try {
      await api.put('/settings/bulk', { settings: localSettings });
      for (const [k, v] of Object.entries(localSettings)) saveSetting(k, v);
      if (localSettings.theme) setTheme(localSettings.theme);
      if (localSettings.always_on_top !== undefined) {
        window.novaplay?.setAlwaysOnTop(localSettings.always_on_top === 'true' || localSettings.always_on_top === true);
      }
      toast.success('Settings saved');
    } catch (e) { toast.error('Failed to save: ' + e.message); }
  };

  const clearHistory = async () => {
    try {
      await api.delete('/history');
      toast.success('Playback history cleared');
    } catch {}
  };

  const startRecord = (action) => {
    setRecording(action);
  };

  const handleKeyDown = async (e) => {
    if (!recording) return;
    e.preventDefault();
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    const key = e.key === ' ' ? 'Space' : e.key;
    if (!['Control','Shift','Alt','Meta'].includes(key)) parts.push(key);
    const combo = parts.join('+');
    if (combo) {
      await updateShortcut(recording, combo);
      setLocalShortcuts(prev => prev.map(s => s.action_name === recording ? { ...s, shortcut_key: combo } : s));
      toast.success(`Shortcut updated: ${combo}`);
    }
    setRecording(null);
  };

  const doResetShortcuts = async () => {
    await resetShortcuts();
    toast.success('Shortcuts reset to defaults');
  };

  return (
    <div className="page settings-page" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* Theme */}
      <section className="settings-section">
        <h2 className="settings-section-title">Appearance</h2>
        <div className="settings-row">
          <label>Theme</label>
          <div className="theme-btns">
            <button
              className={`theme-btn ${(localSettings.theme || 'dark') === 'dark' ? 'active' : ''}`}
              onClick={() => set('theme', 'dark')}
            >
              <Moon size={14}/> Dark
            </button>
            <button
              className={`theme-btn ${localSettings.theme === 'light' ? 'active' : ''}`}
              onClick={() => set('theme', 'light')}
            >
              <Sun size={14}/> Light
            </button>
          </div>
        </div>
      </section>

      {/* Playback */}
      <section className="settings-section">
        <h2 className="settings-section-title">Playback</h2>

        <div className="settings-row">
          <label>Default Volume</label>
          <div className="settings-ctrl">
            <input type="range" min={0} max={100} value={parseInt(localSettings.volume ?? 80)}
              onChange={e => set('volume', e.target.value)} />
            <span>{localSettings.volume ?? 80}%</span>
          </div>
        </div>

        <div className="settings-row">
          <label>Default Speed</label>
          <select value={localSettings.playback_speed ?? '1.0'} onChange={e => set('playback_speed', e.target.value)}>
            {[0.25,0.5,0.75,1,1.25,1.5,1.75,2,2.5,3].map(s => (
              <option key={s} value={s}>{s === 1 ? 'Normal (1×)' : `${s}×`}</option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <label>Skip Forward (seconds)</label>
          <input type="number" min={1} max={120} value={localSettings.skip_forward_duration ?? 10}
            onChange={e => set('skip_forward_duration', e.target.value)} />
        </div>

        <div className="settings-row">
          <label>Skip Backward (seconds)</label>
          <input type="number" min={1} max={120} value={localSettings.skip_backward_duration ?? 10}
            onChange={e => set('skip_backward_duration', e.target.value)} />
        </div>

        <div className="settings-row">
          <label>Resume Playback</label>
          <label className="toggle-switch">
            <input type="checkbox"
              checked={localSettings.resume_playback === 'true' || localSettings.resume_playback === true}
              onChange={e => set('resume_playback', e.target.checked)} />
            <span className="toggle-track"/>
          </label>
        </div>

        <div className="settings-row">
          <label>Default Subtitle Language</label>
          <input type="text" maxLength={10} placeholder="en"
            value={localSettings.default_subtitle_language ?? 'en'}
            onChange={e => set('default_subtitle_language', e.target.value)} />
        </div>
      </section>

      {/* Window */}
      <section className="settings-section">
        <h2 className="settings-section-title">Window</h2>

        <div className="settings-row">
          <label>Always On Top</label>
          <label className="toggle-switch">
            <input type="checkbox"
              checked={localSettings.always_on_top === 'true' || localSettings.always_on_top === true}
              onChange={e => set('always_on_top', e.target.checked)} />
            <span className="toggle-track"/>
          </label>
        </div>

        <div className="settings-row">
          <label>Minimize to Tray</label>
          <label className="toggle-switch">
            <input type="checkbox"
              checked={localSettings.minimize_to_tray === 'true' || localSettings.minimize_to_tray === true}
              onChange={e => set('minimize_to_tray', e.target.checked)} />
            <span className="toggle-track"/>
          </label>
        </div>

        <div className="settings-row">
          <label>Continue When Minimized</label>
          <label className="toggle-switch">
            <input type="checkbox"
              checked={localSettings.continue_when_minimized === 'true' || localSettings.continue_when_minimized === true}
              onChange={e => set('continue_when_minimized', e.target.checked)} />
            <span className="toggle-track"/>
          </label>
        </div>

        <div className="settings-row">
          <label>Hardware Acceleration</label>
          <label className="toggle-switch">
            <input type="checkbox"
              checked={localSettings.hardware_acceleration !== 'false' && localSettings.hardware_acceleration !== false}
              onChange={e => set('hardware_acceleration', e.target.checked)} />
            <span className="toggle-track"/>
          </label>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Keyboard Shortcuts</h2>
          <button className="toolbar-btn" onClick={doResetShortcuts}><RotateCcw size={12}/> Reset All</button>
        </div>
        {recording && (
          <div className="shortcut-recording-hint">Press any key combination… (Esc to cancel)</div>
        )}
        <div className="shortcuts-grid">
          {localShortcuts.map(s => (
            <div key={s.action_name} className={`shortcut-row ${recording === s.action_name ? 'recording' : ''}`}>
              <span className="shortcut-label">{ACTION_LABELS[s.action_name] || s.action_name}</span>
              <button
                className="shortcut-key-btn"
                onClick={() => recording === s.action_name ? setRecording(null) : startRecord(s.action_name)}
              >
                {recording === s.action_name ? '…listening' : s.shortcut_key}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Data */}
      <section className="settings-section">
        <h2 className="settings-section-title">Data</h2>
        <div className="settings-row">
          <label>Clear Playback History</label>
          <button className="toolbar-btn danger" onClick={clearHistory}><Trash2 size={13}/> Clear History</button>
        </div>
      </section>

      {/* About */}
      <section className="settings-section">
        <h2 className="settings-section-title">About</h2>
        <div className="about-card">
          <div className="about-logo">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="var(--accent)" opacity="0.2"/>
              <polygon points="9,7 9,17 18,12" fill="var(--accent)"/>
            </svg>
            <div>
              <p className="about-name">NovaPlay</p>
              <p className="about-ver">Advanced Desktop Media Player</p>
            </div>
          </div>
          <p className="about-desc">
            A professional music and video player built with Electron, React, Express, and SQLite.
            Supports all major audio and video formats with advanced playback features.
          </p>
        </div>
      </section>

      {/* Save */}
      <div className="settings-footer">
        <button className="save-btn" onClick={saveAll}><Save size={15}/> Save Settings</button>
      </div>
    </div>
  );
}
