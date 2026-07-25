import React from 'react';
import { usePlayerStore } from '../../store/playerStore';
import './SpeedControl.css';

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export default function SpeedControl({ onClose }) {
  const { speed, setSpeed } = usePlayerStore();

  return (
    <div className="speed-panel">
      <div className="speed-header">
        <span>Playback Speed</span>
        <button onClick={onClose} className="panel-close">✕</button>
      </div>
      <div className="speed-list">
        {SPEEDS.map(s => (
          <button
            key={s}
            className={`speed-item ${speed === s ? 'active' : ''}`}
            onClick={() => { setSpeed(s); onClose(); }}
          >
            {s === 1 ? 'Normal' : `${s}×`}
          </button>
        ))}
      </div>
    </div>
  );
}
