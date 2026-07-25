import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { api } from '../../utils/api';
import './EqualizerPanel.css';

const FREQS = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];

export default function EqualizerPanel({ onClose }) {
  const { eqEnabled, eqValues, eqPreamp, setEqEnabled, setEqValues, setEqPreamp } = usePlayerStore();
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('Flat');

  useEffect(() => {
    api.get('/equalizer').then(setPresets).catch(() => {});
  }, []);

  const applyPreset = (preset) => {
    setSelectedPreset(preset.name);
    setEqValues(preset.values);
  };

  const handleBandChange = (i, val) => {
    const newVals = [...eqValues];
    newVals[i] = parseFloat(val);
    setEqValues(newVals);
  };

  const saveCustom = async () => {
    const name = `Custom ${Date.now()}`.slice(0, 30);
    try {
      await api.post('/equalizer', { name, values: eqValues });
      const updated = await api.get('/equalizer');
      setPresets(updated);
    } catch {}
  };

  const reset = () => setEqValues(new Array(10).fill(0));

  return (
    <div className="eq-panel">
      <div className="eq-header">
        <span>Equalizer</span>
        <div className="eq-header-right">
          <label className="eq-toggle">
            <input type="checkbox" checked={eqEnabled} onChange={e => setEqEnabled(e.target.checked)} />
            <span>Enable</span>
          </label>
          <button onClick={onClose} className="panel-close">✕</button>
        </div>
      </div>

      {/* Presets */}
      <div className="eq-presets">
        {presets.map(p => (
          <button
            key={p.id}
            className={`eq-preset-btn ${selectedPreset === p.name ? 'active' : ''}`}
            onClick={() => applyPreset(p)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Preamp */}
      <div className="eq-preamp">
        <label>Preamp</label>
        <input
          type="range" min={-12} max={12} step={0.5}
          value={eqPreamp}
          onChange={e => setEqPreamp(parseFloat(e.target.value))}
        />
        <span>{eqPreamp > 0 ? '+' : ''}{eqPreamp} dB</span>
      </div>

      {/* Bands */}
      <div className="eq-bands">
        {FREQS.map((freq, i) => (
          <div key={freq} className="eq-band">
            <span className="eq-val">{eqValues[i] >= 0 ? '+' : ''}{eqValues[i]}</span>
            <input
              type="range"
              min={-12} max={12} step={0.5}
              value={eqValues[i]}
              onChange={e => handleBandChange(i, e.target.value)}
              className="eq-slider"
              orient="vertical"
            />
            <span className="eq-freq">{freq}</span>
          </div>
        ))}
      </div>

      <div className="eq-footer">
        <button className="eq-btn" onClick={reset}>Reset</button>
        <button className="eq-btn accent" onClick={saveCustom}>Save Custom</button>
      </div>
    </div>
  );
}
