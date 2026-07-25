import React from 'react';
import MediaListPage from '../components/ui/MediaListPage';

export default function RecentPage() {
  return (
    <MediaListPage
      title="Recently Played"
      fetchUrl="/history/recent?limit=100"
      emptyMsg="No recently played media"
      showClear
      clearUrl="/history"
    />
  );
}
