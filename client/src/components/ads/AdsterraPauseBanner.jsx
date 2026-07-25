import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import './AdsterraPauseBanner.css';

const COOLDOWN_MS = 15 * 60 * 1000;
const LAST_SHOWN_KEY = 'novaplay.pauseAd.lastShownAt';
const AD_MESSAGE_SOURCE = 'novaplay-adsterra-pause-banner';

/*
 * ADSTERRA 300x250 CODE — REPLACE ONLY THIS BLOCK WHEN THE AD UNIT CHANGES.
 *
 * Equivalent Adsterra code:
 *   atOptions = {
 *     key: 'ae37bf79b18906b85bf4cd794d6ff7a8',
 *     format: 'iframe',
 *     height: 250,
 *     width: 300,
 *     params: {}
 *   };
 *   <script src="https://www.highperformanceformat.com/ae37bf79b18906b85bf4cd794d6ff7a8/invoke.js"></script>
 */
const ADSTERRA_OPTIONS = {
  key: 'ae37bf79b18906b85bf4cd794d6ff7a8',
  format: 'iframe',
  height: 250,
  width: 300,
  params: {},
};
const ADSTERRA_SCRIPT_URL =
  'https://www.highperformanceformat.com/ae37bf79b18906b85bf4cd794d6ff7a8/invoke.js';

function createAdDocument() {
  const options = JSON.stringify(ADSTERRA_OPTIONS).replace(/</g, '\\u003c');
  const scriptUrl = JSON.stringify(ADSTERRA_SCRIPT_URL);
  const source = JSON.stringify(AD_MESSAGE_SOURCE);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=300, initial-scale=1">
    <style>
      html, body { width: 300px; height: 250px; margin: 0; overflow: hidden; background: transparent; }
    </style>
  </head>
  <body>
    <script>
      window.atOptions = ${options};
    </script>
    <script
      src=${scriptUrl}
      onerror="window.__novaplayAdFailed = true"
    ></script>
    <script>
      parent.postMessage({
        source: ${source},
        status: window.__novaplayAdFailed ? 'failed' : 'loaded'
      }, '*');
    </script>
  </body>
</html>`;
}

const AdsterraPauseBanner = forwardRef(function AdsterraPauseBanner(_, ref) {
  const [initialized, setInitialized] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loadState, setLoadState] = useState('idle');
  const pendingShowRef = useRef(false);
  const loadTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const hide = () => {
    pendingShowRef.current = false;
    if (mountedRef.current) setVisible(false);
  };

  const revealIfEligible = () => {
    const lastShownAt = Number(localStorage.getItem(LAST_SHOWN_KEY) || 0);
    if (Date.now() - lastShownAt < COOLDOWN_MS) return false;
    localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
    setVisible(true);
    return true;
  };

  const show = () => {
    const lastShownAt = Number(localStorage.getItem(LAST_SHOWN_KEY) || 0);
    if (Date.now() - lastShownAt < COOLDOWN_MS || loadState === 'failed') return false;
    if (loadState === 'loaded') return revealIfEligible();
    pendingShowRef.current = true;
    if (!initialized) {
      setInitialized(true);
      setLoadState('loading');
    }
    return true;
  };

  useImperativeHandle(ref, () => ({ show, hide }), [initialized, loadState]);

  useEffect(() => {
    mountedRef.current = true;
    const onMessage = event => {
      if (event.data?.source !== AD_MESSAGE_SOURCE) return;
      clearTimeout(loadTimerRef.current);
      if (event.data.status === 'failed') {
        pendingShowRef.current = false;
        setLoadState('failed');
        setVisible(false);
        return;
      }
      setLoadState('loaded');
      if (pendingShowRef.current) {
        pendingShowRef.current = false;
        revealIfEligible();
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      mountedRef.current = false;
      clearTimeout(loadTimerRef.current);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  useEffect(() => {
    if (!initialized || loadState !== 'loading') return undefined;
    loadTimerRef.current = setTimeout(() => {
      pendingShowRef.current = false;
      setLoadState('failed');
      setVisible(false);
    }, 30000);
    return () => clearTimeout(loadTimerRef.current);
  }, [initialized, loadState]);

  return (
    <div
      className={`pause-ad-overlay${visible ? ' visible' : ''}`}
      aria-hidden={!visible}
      data-load-state={loadState}
    >
      {initialized && (
        <iframe
          className="pause-ad-frame"
          title="Advertisement"
          width="300"
          height="250"
          srcDoc={createAdDocument()}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          scrolling="no"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </div>
  );
});

export default AdsterraPauseBanner;
