import React from 'react';
import PlayerView from '../components/player/PlayerView';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="homepage-layout">
      <div className="homepage-player">
        <PlayerView />
      </div>
    </div>
  );
}
