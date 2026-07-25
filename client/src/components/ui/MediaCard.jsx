import React from 'react';
import { Music, Video, Heart } from 'lucide-react';
import { formatTime } from '../../utils/mediaUtils';
import './MediaCard.css';

export default function MediaCard({ item, onClick }) {
  return (
    <div className="media-card" onClick={onClick} title={item.file_path}>
      <div className="mc-icon">
        {item.media_type === 'audio' ? <Music size={24} /> : <Video size={24} />}
        {item.is_favorite ? <Heart size={11} className="mc-fav" fill="currentColor" /> : null}
      </div>
      <div className="mc-info">
        <p className="mc-name">{item.file_name}</p>
        {item.duration > 0 && <p className="mc-dur">{formatTime(item.duration)}</p>}
        {item.play_count > 0 && <p className="mc-plays">{item.play_count} plays</p>}
      </div>
      {!item.file_available && <div className="mc-unavailable" title="File unavailable">⚠</div>}
    </div>
  );
}
