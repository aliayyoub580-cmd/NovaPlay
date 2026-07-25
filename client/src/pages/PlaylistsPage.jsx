import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Search, Play, List,
  ChevronRight, ChevronDown, Music, Video as VideoIcon,
  X, Heart, GripVertical
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../utils/api';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/mediaUtils';
import toast from 'react-hot-toast';
import './Page.css';
import './PlaylistsPage.css';

function SortablePlaylistItem({ item, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="pli-row">
      <span className="pli-grip" {...attributes} {...listeners}><GripVertical size={12} /></span>
      <span className="pli-icon">{item.media_type === 'audio' ? <Music size={12}/> : <VideoIcon size={12}/>}</span>
      <span className="pli-name">{item.file_name}</span>
      <span className="pli-dur">{item.duration ? formatTime(item.duration) : '—'}</span>
      <button className="pli-rm" onClick={() => onRemove(item.id)}><X size={11}/></button>
    </div>
  );
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const { loadQueue } = usePlayerStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadPlaylists = () => api.get('/playlists').then(setPlaylists).catch(() => {});
  useEffect(() => { loadPlaylists(); }, []);

  const loadDetail = async (id) => {
    try { setDetail(await api.get(`/playlists/${id}`)); } catch {}
  };

  const select = async (pl) => {
    setSelected(pl.id);
    await loadDetail(pl.id);
  };

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    try {
      await api.post('/playlists', { name: newName.trim() });
      setNewName(''); setCreating(false);
      await loadPlaylists();
      toast.success('Playlist created');
    } catch (e) { toast.error(e.message); }
  };

  const renamePlaylist = async (id) => {
    if (!renameVal.trim()) return;
    try {
      await api.put(`/playlists/${id}`, { name: renameVal.trim() });
      setRenaming(null);
      await loadPlaylists();
      if (detail?.id === id) await loadDetail(id);
      toast.success('Renamed');
    } catch (e) { toast.error(e.message); }
  };

  const deletePlaylist = async (id) => {
    try {
      await api.delete(`/playlists/${id}`);
      await loadPlaylists();
      if (selected === id) { setSelected(null); setDetail(null); }
      toast.success('Deleted');
    } catch (e) { toast.error(e.message); }
  };

  const addFiles = async () => {
    if (!selected || !window.novaplay) return;
    const files = await window.novaplay.openMultipleDialog();
    if (!files.length) return;
    const items = files.map(fp => ({ file_path: fp, file_name: fp.split(/[\\/]/).pop(), duration: 0 }));
    try {
      await api.post(`/playlists/${selected}/items`, { items });
      await loadDetail(selected);
      toast.success(`Added ${files.length} file(s)`);
    } catch (e) { toast.error(e.message); }
  };

  const removeItem = async (itemId) => {
    if (!selected) return;
    try {
      await api.delete(`/playlists/${selected}/items/${itemId}`);
      await loadDetail(selected);
    } catch {}
  };

  const playAll = () => {
    if (!detail?.items?.length) return;
    const available = detail.items.filter(i => i.file_path);
    loadQueue(available.map(i => i.file_path), 0);
    toast.success(`Playing ${available.length} tracks`);
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id || !detail) return;
    const items = [...detail.items];
    const oi = items.findIndex(i => i.id === active.id);
    const ni = items.findIndex(i => i.id === over.id);
    const [moved] = items.splice(oi, 1);
    items.splice(ni, 0, moved);
    const reordered = items.map((item, idx) => ({ id: item.id, sort_order: idx + 1 }));
    setDetail(d => ({ ...d, items }));
    try { await api.put(`/playlists/${selected}/reorder`, { order: reordered }); } catch {}
  };

  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredItems = (detail?.items || []).filter(i =>
    i.file_name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="page playlists-layout">
      {/* Left: playlist list */}
      <div className="pl-sidebar">
        <div className="pl-sidebar-header">
          <span className="pl-sidebar-title">Playlists</span>
          <button className="pp-btn" onClick={() => setCreating(true)} title="New playlist">
            <Plus size={14}/>
          </button>
        </div>
        <div className="page-search" style={{margin:'8px 12px'}}>
          <Search size={13}/>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        {creating && (
          <div className="pl-new-row">
            <input
              autoFocus
              className="pl-input"
              placeholder="Playlist name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createPlaylist(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
            />
            <button className="pl-save-btn" onClick={createPlaylist}>Save</button>
          </div>
        )}

        <div className="pl-list">
          {filteredPlaylists.map(pl => (
            <div key={pl.id} className={`pl-item ${selected === pl.id ? 'active' : ''}`} onClick={() => select(pl)}>
              {renaming === pl.id ? (
                <input
                  autoFocus
                  className="pl-inline-input"
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renamePlaylist(pl.id); if (e.key === 'Escape') setRenaming(null); }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <List size={14} className="pl-icon"/>
                  <span className="pl-name">{pl.name}</span>
                  <span className="pl-count">{pl.item_count}</span>
                  <div className="pl-actions">
                    <button onClick={e => { e.stopPropagation(); setRenaming(pl.id); setRenameVal(pl.name); }} title="Rename"><Pencil size={11}/></button>
                    <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }} title="Delete"><Trash2 size={11}/></button>
                  </div>
                </>
              )}
            </div>
          ))}
          {filteredPlaylists.length === 0 && (
            <div className="pl-empty">No playlists yet</div>
          )}
        </div>
      </div>

      {/* Right: playlist detail */}
      <div className="pl-detail">
        {detail ? (
          <>
            <div className="pl-detail-header">
              <div>
                <h2 className="pl-detail-title">{detail.name}</h2>
                <p className="pl-detail-sub">{detail.items?.length || 0} items</p>
              </div>
              <div className="pl-detail-actions">
                <button className="toolbar-btn" onClick={addFiles}><Plus size={13}/> Add Files</button>
                <button className="toolbar-btn" onClick={playAll} disabled={!detail.items?.length}><Play size={13}/> Play All</button>
              </div>
            </div>
            <div className="page-search" style={{maxWidth:320, marginBottom:12}}>
              <Search size={13}/>
              <input placeholder="Search in playlist…" value={itemSearch} onChange={e => setItemSearch(e.target.value)}/>
            </div>
            <div className="pl-items-list">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={(detail.items||[]).map(i=>i.id)} strategy={verticalListSortingStrategy}>
                  {filteredItems.map(item => (
                    <SortablePlaylistItem key={item.id} item={item} onRemove={removeItem}/>
                  ))}
                </SortableContext>
              </DndContext>
              {filteredItems.length === 0 && (
                <div className="pl-empty" style={{padding:'24px 0'}}>No items. Click "Add Files" to add media.</div>
              )}
            </div>
          </>
        ) : (
          <div className="pl-no-selection">
            <List size={40} style={{opacity:0.2}}/>
            <p>Select a playlist to view its contents</p>
          </div>
        )}
      </div>
    </div>
  );
}
