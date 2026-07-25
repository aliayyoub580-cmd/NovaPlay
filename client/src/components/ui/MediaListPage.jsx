import React, { useEffect, useState, useCallback } from 'react';
import { Search, Heart, Play, Trash2, FolderSearch } from 'lucide-react';
import { api } from '../../utils/api';
import { usePlayerStore } from '../../store/playerStore';
import { formatTime } from '../../utils/mediaUtils';
import toast from 'react-hot-toast';
import '../../pages/Page.css';

export default function MediaListPage({ title, fetchUrl, emptyMsg, showClear, clearUrl }) {
  const [items, setItems]   = useState([]);
  const [search, setSearch] = useState('');
  const { loadQueue, currentMedia } = usePlayerStore();

  const load = useCallback(() => {
    api.get(fetchUrl).then(setItems).catch(() => {});
  }, [fetchUrl]);

  useEffect(() => { load(); }, [load]);

  const play = (item, playAll) => {
    if (!item.file_available) {
      toast.error('File unavailable. Click ⊕ to locate it.');
      return;
    }
    if (playAll) {
      const available = filtered.filter(i => i.file_available);
      const idx = Math.max(0, available.findIndex(i => i.file_path === item.file_path));
      loadQueue(available.map(i => i.file_path), idx);
    } else {
      loadQueue([item.file_path], 0);
    }
  };

  const toggleFav = async (e, item) => {
    e.stopPropagation();
    try {
      const res = await api.post('/history/favorite', { file_path: item.file_path });
      setItems(prev => prev.map(i =>
        i.file_path === item.file_path ? { ...i, is_favorite: res.is_favorite } : i
      ));
    } catch {}
  };

  const relocate = async (e, item) => {
    e.stopPropagation();
    if (!window.novaplay) return;
    const newPath = await window.novaplay.relocateFile(item.file_path);
    if (!newPath) return;
    try {
      await api.post('/history/relocate', { file_path: item.file_path, new_path: newPath });
      toast.success('File relocated');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const clear = async () => {
    try {
      await api.delete(clearUrl);
      load();
      toast.success('Cleared');
    } catch {}
  };

  const filtered = items.filter(i =>
    i.file_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>{title}</h1>
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <Search size={14} />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {showClear && items.length > 0 && (
          <button className="toolbar-btn danger" onClick={clear}>
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="page-empty"><p>{emptyMsg}</p></div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table className="media-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Name</th>
                <th style={{ width: 60 }}>Type</th>
                <th style={{ width: 70 }}>Duration</th>
                <th style={{ width: 60 }}>Plays</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr
                  key={item.id}
                  className={`mtr ${currentMedia?.file_path === item.file_path ? 'active-row' : ''} ${!item.file_available ? 'unavailable' : ''}`}
                  onDoubleClick={() => play(item, true)}
                >
                  <td className="mtr-icon">{i + 1}</td>
                  <td className="mtr-name mtr-truncate" title={item.file_path}>
                    {!item.file_available && (
                      <span style={{ color: '#e67e22', marginRight: 4 }} title="File unavailable">⚠</span>
                    )}
                    {item.file_name}
                  </td>
                  <td>{item.media_type}</td>
                  <td>{item.duration ? formatTime(item.duration) : '—'}</td>
                  <td>{item.play_count || 0}</td>
                  <td>
                    <div className="row-actions">
                      <button className="row-btn" onClick={() => play(item, false)} title="Play">
                        <Play size={12} />
                      </button>
                      <button
                        className={`row-btn ${item.is_favorite ? 'fav' : ''}`}
                        onClick={e => toggleFav(e, item)}
                        title={item.is_favorite ? 'Unfavorite' : 'Favorite'}
                      >
                        <Heart size={12} fill={item.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                      {!item.file_available && (
                        <button className="row-btn" onClick={e => relocate(e, item)} title="Locate file">
                          <FolderSearch size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
