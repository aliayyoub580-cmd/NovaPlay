import React from 'react';
import MediaListPage from '../components/ui/MediaListPage';

export default function FavoritesPage() {
  return (
    <MediaListPage
      title="Favorites"
      fetchUrl="/history/favorites"
      emptyMsg="No favorites yet — heart a file to add it"
      showClear={false}
    />
  );
}
