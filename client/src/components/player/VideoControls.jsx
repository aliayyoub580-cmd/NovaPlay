import React, { useEffect } from 'react';
import {
  Maximize, Minimize, PictureInPicture, RotateCcw, RotateCw,
  ZoomIn, ZoomOut, Camera, Subtitles, MonitorPlay
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import toast from 'react-hot-toast';
import './VideoControls.css';

export default function VideoControls({ mediaRef, containerRef }) {
  const {
    fullscreen, setFullscreen,
    rotation, setRotation,
    zoom, setZoom,
    aspectRatio, setAspectRatio,
    setSubtitleFile,
  } = usePlayerStore();

  // Listen for PiP event from PlaybackBar
  useEffect(() => {
    const onPip = async (e) => {
      const el = mediaRef.current;
      if (!el) return;
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await el.requestPictureInPicture();
        }
      } catch (err) {
        toast.error('Picture-in-Picture not available');
      }
    };
    window.addEventListener('novaplay-pip', onPip);
    return () => window.removeEventListener('novaplay-pip', onPip);
  }, []);

  // Listen for fullscreen event from PlaybackBar
  useEffect(() => {
    const onFs = (e) => {
      if (e.detail) {
        containerRef.current?.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.();
      }
    };
    window.addEventListener('novaplay-fullscreen', onFs);
    return () => window.removeEventListener('novaplay-fullscreen', onFs);
  }, []);

  const toggleFs = () => {
    const newFs = !fullscreen;
    setFullscreen(newFs);
    if (newFs) containerRef.current?.requestFullscreen?.().catch(() => {});
    else       document.exitFullscreen?.();
  };

  const togglePip = async () => {
    const el = mediaRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch {
      toast.error('Picture-in-Picture not available');
    }
  };

  const screenshot = async () => {
    if (!window.novaplay) return;
    const r = await window.novaplay.screenshot();
    if (r?.success) toast.success('Screenshot saved to Downloads');
    else toast.error(r?.error || 'Screenshot failed');
  };

  const loadSubtitle = async () => {
    if (!window.novaplay) return;
    const file = await window.novaplay.openSubtitleDialog();
    if (file) { setSubtitleFile(file); toast.success('Subtitle loaded'); }
  };

  const cycleAspect = () => {
    const options = ['contain', 'cover', 'fill'];
    const next = options[(options.indexOf(aspectRatio) + 1) % options.length];
    setAspectRatio(next);
    toast(`Aspect: ${next}`, { duration: 1200 });
  };

  return (
    <div className="video-controls-overlay" onClick={e => e.stopPropagation()}>
      <div className="vc-group">
        <button className="vc-btn" onClick={toggleFs} title={fullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}>
          {fullscreen ? <Minimize size={15}/> : <Maximize size={15}/>}
        </button>
        <button className="vc-btn" onClick={togglePip} title="Picture-in-Picture">
          <PictureInPicture size={15}/>
        </button>
        <button className="vc-btn" onClick={screenshot} title="Screenshot">
          <Camera size={15}/>
        </button>
        <button className="vc-btn" onClick={loadSubtitle} title="Load Subtitle File">
          <Subtitles size={15}/>
        </button>
        <button className="vc-btn" onClick={cycleAspect} title="Cycle Aspect Ratio">
          <MonitorPlay size={15}/>
        </button>
        <button className="vc-btn" onClick={() => setRotation((rotation - 90 + 360) % 360)} title="Rotate Left 90°">
          <RotateCcw size={15}/>
        </button>
        <button className="vc-btn" onClick={() => setRotation((rotation + 90) % 360)} title="Rotate Right 90°">
          <RotateCw size={15}/>
        </button>
        <button className="vc-btn" onClick={() => setZoom(Math.min(4, zoom + 0.1))} title="Zoom In">
          <ZoomIn size={15}/>
        </button>
        <button className="vc-btn" onClick={() => setZoom(1)} title="Reset Zoom">
          <span style={{fontSize:10,fontWeight:700,letterSpacing:-0.5}}>1:1</span>
        </button>
        <button className="vc-btn" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} title="Zoom Out">
          <ZoomOut size={15}/>
        </button>
      </div>
    </div>
  );
}
