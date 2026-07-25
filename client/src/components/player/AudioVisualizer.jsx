import React, { useRef, useEffect } from 'react';

let sharedCtx = null;

function getAudioCtx() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedCtx;
}

export default function AudioVisualizer({ audioRef, enabled }) {
  const canvasRef  = useRef(null);
  const animRef    = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef  = useRef(null);
  const connected  = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const audio  = audioRef?.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;

    try {
      const ctx = getAudioCtx();

      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      // Only create source once per element
      if (!connected.current) {
        try {
          sourceRef.current = ctx.createMediaElementSource(audio);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(ctx.destination);
          connected.current = true;
        } catch {
          // Already captured by another node (e.g. EQ) — just connect analyser to destination
          if (!connected.current) {
            analyserRef.current.connect(ctx.destination);
            connected.current = true;
          }
        }
      }

      const analyser = analyserRef.current;
      const bufLen   = analyser.frequencyBinCount;
      const dataArr  = new Uint8Array(bufLen);
      const c        = canvas.getContext('2d');

      const draw = () => {
        animRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArr);
        c.clearRect(0, 0, canvas.width, canvas.height);
        const barW = (canvas.width / bufLen) * 2.5;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const barH = (dataArr[i] / 255) * canvas.height;
          const alpha = 0.4 + (dataArr[i] / 255) * 0.6;
          c.fillStyle = `rgba(248,124,46,${alpha})`;
          c.fillRect(x, canvas.height - barH, Math.max(1, barW - 1), barH);
          x += barW;
        }
      };
      draw();

      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (e) {
      console.warn('[Visualizer]', e.message);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [enabled]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={80}
      style={{
        borderRadius: 8,
        background: 'rgba(0,0,0,0.25)',
        maxWidth: '100%',
        display: enabled ? 'block' : 'none',
      }}
      aria-hidden="true"
    />
  );
}
