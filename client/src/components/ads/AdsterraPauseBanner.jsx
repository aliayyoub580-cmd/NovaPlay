import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import './AdsterraPauseBanner.css';

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
      window.__novaplayAdFailed = false;
      window.__novaplayReportCreative = () => {
        const creative = document.querySelector('iframe, object, embed');
        if (!creative || window.__novaplayCreativeReported) return;
        window.__novaplayCreativeReported = true;
        parent.postMessage({ source: ${source}, status: 'rendered' }, '*');
      };
      const creativeObserver = new MutationObserver(window.__novaplayReportCreative);
      creativeObserver.observe(document.documentElement, { childList: true, subtree: true });
    </script>
    <script
      src=${scriptUrl}
      onerror="window.__novaplayAdFailed = true"
    ></script>
    <script>
      if (window.__novaplayAdFailed) {
        parent.postMessage({ source: ${source}, status: 'failed' }, '*');
      } else {
        window.__novaplayReportCreative();
      }
    </script>
  </body>
</html>`;
}

const AD_DOCUMENT = createAdDocument();

const AdsterraPauseBanner = forwardRef(function AdsterraPauseBanner(_, ref) {
  const [visible, setVisible] = useState(false);
  const [loadState, setLoadState] = useState('loading');
  const shouldBeVisibleRef = useRef(false);
  const loadTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const iframeRef = useRef(null);

  const hide = () => {
    shouldBeVisibleRef.current = false;
    if (mountedRef.current) setVisible(false);
  };

  const show = () => {
    if (loadState === 'failed') return false;
    shouldBeVisibleRef.current = true;
    if (loadState === 'loaded') {
      flushSync(() => setVisible(true));
    }
    return true;
  };

  useImperativeHandle(ref, () => ({ show, hide }), [loadState]);

  useEffect(() => {
    mountedRef.current = true;
    const onMessage = event => {
      if (event.data?.source !== AD_MESSAGE_SOURCE) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      clearTimeout(loadTimerRef.current);
      if (event.data.status === 'failed') {
        shouldBeVisibleRef.current = false;
        setLoadState('failed');
        setVisible(false);
        return;
      }
      if (event.data.status !== 'rendered') return;
      setLoadState('loaded');
      if (shouldBeVisibleRef.current) setVisible(true);
    };
    window.addEventListener('message', onMessage);
    return () => {
      mountedRef.current = false;
      clearTimeout(loadTimerRef.current);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  useEffect(() => {
    if (loadState !== 'loading') return undefined;
    loadTimerRef.current = setTimeout(() => {
      shouldBeVisibleRef.current = false;
      setLoadState('failed');
      setVisible(false);
    }, 30000);
    return () => clearTimeout(loadTimerRef.current);
  }, [loadState]);

  return (
    <div
      className={`pause-ad-overlay${visible ? ' visible' : ''}`}
      aria-hidden={!visible}
      data-load-state={loadState}
    >
      <iframe
        className="pause-ad-frame"
        title="Advertisement"
        width="300"
        height="250"
        srcDoc={AD_DOCUMENT}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        scrolling="no"
        referrerPolicy="no-referrer-when-downgrade"
        ref={iframeRef}
      />
    </div>
  );
});

export default AdsterraPauseBanner;
