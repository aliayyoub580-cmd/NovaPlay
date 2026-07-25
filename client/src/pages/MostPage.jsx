import React from 'react';
import MediaListPage from '../components/ui/MediaListPage';

export default function MostPage() {
  return (
    <MediaListPage
      title="Most Played"
      fetchUrl="/history/most?limit=100"
      emptyMsg="No play statistics yet"
      showClear
      clearUrl="/history"
    />
  );
}
