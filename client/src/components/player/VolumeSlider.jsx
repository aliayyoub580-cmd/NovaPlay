import React, { useRef } from 'react';
import './VolumeSlider.css';

export default function VolumeSlider({ value, onChange }) {
  const ref = useRef(null);

  const handleClick = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onChange(ratio);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    onChange(Math.max(0, Math.min(1, value + delta)));
  };

  return (
    <div
      className="vol-slider"
      ref={ref}
      onClick={handleClick}
      onWheel={handleWheel}
      role="slider"
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      title={`Volume: ${Math.round(value * 100)}%`}
    >
      <div className="vol-track">
        <div className="vol-fill" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}
