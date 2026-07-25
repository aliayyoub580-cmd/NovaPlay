import React from 'react';
import { formatTime } from '../../utils/mediaUtils';
import './ResumePrompt.css';

export default function ResumePrompt({ position, onResume, onRestart }) {
  return (
    <div className="resume-overlay">
      <div className="resume-card">
        <p className="resume-title">Resume Playback?</p>
        <p className="resume-pos">Last position: {formatTime(position)}</p>
        <div className="resume-actions">
          <button className="btn-resume" onClick={onResume}>Resume</button>
          <button className="btn-restart" onClick={onRestart}>Start Over</button>
        </div>
      </div>
    </div>
  );
}
