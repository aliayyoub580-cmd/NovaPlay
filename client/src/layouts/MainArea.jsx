import React, { Suspense, lazy } from 'react';
import { useAppStore } from '../store/appStore';
import { usePlayerStore } from '../store/playerStore';
import PlayerView from '../components/player/PlayerView';
import PlaylistPanel from '../components/playlist/PlaylistPanel';
import './MainArea.css';

const HomePage      = lazy(() => import('../pages/HomePage'));
const PlaylistsPage = lazy(() => import('../pages/PlaylistsPage'));
const FavoritesPage = lazy(() => import('../pages/FavoritesPage'));
const RecentPage    = lazy(() => import('../pages/RecentPage'));
const MostPage      = lazy(() => import('../pages/MostPage'));
const AudioPage     = lazy(() => import('../pages/AudioPage'));
const VideosPage    = lazy(() => import('../pages/VideosPage'));
const SettingsPage  = lazy(() => import('../pages/SettingsPage'));

const PAGE_MAP = {
  home:      HomePage,
  playlists: PlaylistsPage,
  favorites: FavoritesPage,
  recent:    RecentPage,
  most:      MostPage,
  audio:     AudioPage,
  videos:    VideosPage,
  settings:  SettingsPage,
};

export default function MainArea() {
  const { sidebarSection, showPlaylist } = useAppStore();

  // 'home' shows HomePage with player embedded at top if media is playing
  // all other page sections show their own page
  // null/undefined section falls back to pure player view
  const PageComponent = PAGE_MAP[sidebarSection] || null;

  return (
    <div className="main-area">
      <div className="content-pane">
        {PageComponent ? (
          <Suspense fallback={<div className="page-loading">Loading…</div>}>
            <PageComponent />
          </Suspense>
        ) : (
          <PlayerView />
        )}
      </div>
      {showPlaylist && <PlaylistPanel />}
    </div>
  );
}
