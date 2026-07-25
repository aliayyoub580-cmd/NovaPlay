import React from 'react';
import MediaListPage from '../components/ui/MediaListPage';

export default function VideosPage() {
  return (
    <MediaListPage
      title="Videos"
      fetchUrl="/history/type/video"
      emptyMsg="No video files played yet"
      showClear={false}
    />
  );
}
