import React, { useState } from 'react';
import {
  X, Plus, Search, Trash2, GripVertical,
  Music, Video as VideoIcon, ListPlus
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlayerStore } from '../../store/playerStore';
import { api }            from '../../utils/api';
import { formatTime }     from '../../utils/mediaUtils';
import toast from 'react-hot-toast';
import './PlaylistPanel.css';

// ── Draggable queue item ──────────────────────────────────────────────────
function QueueItem({ item, index, isActive, onClick, onRemove }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.file_path + index });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
      className={`queue-item${isActive ? ' active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-current={isActive ? 'true' : undefined}
      title={item.file_path}
    >
      <span className="qi-grip" {...attributes} {...listeners} aria-label="Drag to reorder">
        <GripVertical size={12} />
      </span>
      <span className="qi-icon" aria-hidden="true">
        {item.media_type === 'audio' ? <Music size={12} /> : <VideoIcon size={12} />}
      </span>
      <span className="qi-name">{item.file_name}</span>
      <button
        className="qi-remove"
        onClick={e => { e.stopPropagation(); onRemove(index); }}
        title="Remove from queue"
        aria-label={`Remove ${item.file_name}`}
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ── PlaylistPanel ─────────────────────────────────────────────────────────
export default function PlaylistPanel() {
  const {
    queue, queueIndex, playIndex, removeFromQueue,
    clearQueue, moveInQueue, addToQueue,
  } = usePlayerStore();

  const [search, setSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = queue.findIndex((item, i) => item.file_path + i === active.id);
    const newIdx = queue.findIndex((item, i) => item.file_path + i === over.id);
    if (oldIdx !== -1 && newIdx !== -1) moveInQueue(oldIdx, newIdx);
  };

  const openFiles = async () => {
    if (!window.novaplay) return;
    const files = await window.novaplay.openMultipleDialog();
    if (files.length > 0) addToQueue(files);
  };

  const saveAsPlaylist = async () => {
    if (queue.length === 0) return;
    const name = `Queue ${new Date().toLocaleString()}`.slice(0, 60);
    try {
      const pl = await api.post('/playlists', { name });
      const items = queue.map(i => ({ file_path: i.file_path, file_name: i.file_name, duration: 0 }));
      await api.post(`/playlists/${pl.id}/items`, { items });
      toast.success(`Saved as playlist: ${name}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const filtered = search
    ? queue.filter(i => i.file_name.toLowerCase().includes(search.toLowerCase()))
    : queue;

  const handlePlay = (realIndex) => {
    playIndex(realIndex);
  };

  return (
    <div className="playlist-panel" aria-label="Playback queue">
      {/* Header */}
      <div className="pp-header">
        <span className="pp-title">Queue ({queue.length})</span>
        <div className="pp-actions">
          <button className="pp-btn" onClick={openFiles} title="Add files"><Plus size={14}/></button>
          <button className="pp-btn" onClick={saveAsPlaylist} title="Save as playlist" disabled={queue.length === 0}>
            <ListPlus size={14}/>
          </button>
          <button className="pp-btn" onClick={clearQueue} title="Clear queue" disabled={queue.length === 0}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="pp-search">
        <Search size={13} aria-hidden="true"/>
        <input
          type="search"
          placeholder="Search queue…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search queue"
        />
      </div>

      {/* Items */}
      <div className="queue-list" role="list">
        {queue.length === 0 ? (
          <div className="queue-empty">
            <p>Queue is empty</p>
            <p style={{fontSize:11,marginTop:4}}>Open files or drag &amp; drop</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={queue.map((item, i) => item.file_path + i)}
              strategy={verticalListSortingStrategy}
            >
              {filtered.map((item) => {
                const realIndex = queue.indexOf(item);
                return (
                  <QueueItem
                    key={item.file_path + realIndex}
                    item={item}
                    index={realIndex}
                    isActive={realIndex === queueIndex}
                    onClick={() => handlePlay(realIndex)}
                    onRemove={removeFromQueue}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
