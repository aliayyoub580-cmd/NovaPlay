import React from 'react';
import {
  Home, ListMusic, Heart,
  Clock, BarChart2, Music, Video, Settings
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'home',      label: 'Home',           icon: Home },
  { id: 'playlists', label: 'Playlists',       icon: ListMusic },
  { id: 'favorites', label: 'Favorites',       icon: Heart },
  { id: 'recent',    label: 'Recently Played', icon: Clock },
  { id: 'most',      label: 'Most Played',     icon: BarChart2 },
  { id: 'audio',     label: 'Audio',           icon: Music },
  { id: 'videos',    label: 'Videos',          icon: Video },
  { id: 'settings',  label: 'Settings',        icon: Settings },
];

export default function Sidebar() {
  const { sidebarSection, setSidebarSection } = useAppStore();

  const handleClick = (id) => {
    setSidebarSection(id);
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = sidebarSection === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => handleClick(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {active && <div className="nav-indicator" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
