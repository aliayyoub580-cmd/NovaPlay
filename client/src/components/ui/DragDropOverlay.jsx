import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { isSupported, getFileName } from '../../utils/mediaUtils';
import toast from 'react-hot-toast';
import './DragDropOverlay.css';

export default function DragDropOverlay() {
  const [dragging, setDragging] = useState(false);
  const { loadQueue } = usePlayerStore();

  useEffect(() => {
    let counter = 0;

    const onDragEnter = (e) => {
      e.preventDefault();
      counter++;
      if (e.dataTransfer.types.includes('Files')) setDragging(true);
    };

    const onDragLeave = (e) => {
      counter--;
      if (counter === 0) setDragging(false);
    };

    const onDragOver = (e) => { e.preventDefault(); };

    const onDrop = (e) => {
      e.preventDefault();
      counter = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer.files)
        .filter(file => isSupported(file.name))
        .map(file => {
          if (window.novaplay && file.path) return file.path;
          return {
            file_path: URL.createObjectURL(file),
            file_name: file.name,
            media_type: file.type.startsWith('video/') ? 'video' : 'audio',
            browser_file: true,
          };
        });
      if (files.length === 0) {
        toast.error('No supported media files dropped');
        return;
      }
      loadQueue(files, 0);
      toast.success(`Loaded ${files.length} file(s)`);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  if (!dragging) return null;

  return (
    <div className="drag-overlay">
      <div className="drag-overlay-inner">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="1.5"/>
          <path d="M12 8v8M8 12h8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p>Drop media files to play</p>
      </div>
    </div>
  );
}
