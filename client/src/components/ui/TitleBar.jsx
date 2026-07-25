import React from 'react';
import { List, Menu, Minus, Square, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import './TitleBar.css';

export default function TitleBar() {
  const {
    showSidebar, showPlaylist, sidebarSection,
    toggleSidebar, togglePlaylist, setSidebarSection,
  } = useAppStore();
  const minimize = () => window.novaplay?.minimize();
  const maximize = () => window.novaplay?.maximize();
  const close    = () => window.novaplay?.close();

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <div className="titlebar-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="var(--accent)" opacity="0.2"/>
            <polygon points="9,7 9,17 18,12" fill="var(--accent)"/>
          </svg>
          <span className="titlebar-name">NovaPlay</span>
        </div>
        <div className="titlebar-actions">
          <button
            className={`titlebar-action${showSidebar ? ' active' : ''}`}
            onClick={toggleSidebar}
            title={showSidebar ? 'Close menu' : 'Open menu'}
            aria-pressed={showSidebar}
          >
            <Menu size={15} />
            <span>Menu</span>
          </button>
          <button
            className={`titlebar-action${showPlaylist ? ' active' : ''}`}
            onClick={togglePlaylist}
            title={showPlaylist ? 'Close queue' : 'Open queue'}
            aria-pressed={showPlaylist}
          >
            <List size={15} />
            <span>Queue</span>
          </button>
        </div>
        {showSidebar && (
          <nav className="header-menu" aria-label="Main menu">
            {[
              ['home', 'Player'],
              ['playlists', 'Playlists'],
              ['favorites', 'Favorites'],
              ['recent', 'Recent'],
              ['most', 'Most Played'],
              ['audio', 'Audio'],
              ['videos', 'Videos'],
              ['settings', 'Settings'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={sidebarSection === id ? 'active' : ''}
                onClick={() => {
                  setSidebarSection(id);
                  toggleSidebar();
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div className="titlebar-controls">
        <button className="tb-btn" onClick={minimize} title="Minimize"><Minus size={12}/></button>
        <button className="tb-btn" onClick={maximize} title="Maximize"><Square size={12}/></button>
        <button className="tb-btn close" onClick={close} title="Close"><X size={12}/></button>
      </div>
    </div>
  );
}
