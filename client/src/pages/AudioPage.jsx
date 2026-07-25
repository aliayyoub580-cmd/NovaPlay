import React from 'react';
import MediaListPage from '../components/ui/MediaListPage';

export default function AudioPage() {
  return (
    <MediaListPage
      title="Audio"
      fetchUrl="/history/type/audio"
      emptyMsg="No audio files played yet"
      showClear={false}
    />
  );
}
