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

// The publisher code is hosted on NovaPlay's normal HTTPS origin so Electron
// avoids the slow file:// initialization path. This URL is stable and the
// iframe is created only once.
const AD_FRAME_URL = 'https://novaplay-app.vercel.app/adsterra-frame.html';

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
      data-creative-rendered={loadState === 'loaded' ? 'true' : 'false'}
    >
      <iframe
        className="pause-ad-frame"
        title="Advertisement"
        width="300"
        height="250"
        src={AD_FRAME_URL}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        scrolling="no"
        referrerPolicy="no-referrer-when-downgrade"
        ref={iframeRef}
      />
    </div>
  );
});

export default AdsterraPauseBanner;
