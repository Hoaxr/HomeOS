import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, Maximize2, WifiOff } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

const REFRESH_DELAY_MS = 150; // Delay between successful frames (approx 6-7 fps)
const RETRY_DELAY_MS = 2000;  // Delay after a connection failure

const DoorbellFeed = () => {
  const { config } = useConfig();
  const doorbellConfig = config?.reolink;
  
  const [error, setError] = useState(false);
  // Fixed: removed lastRefresh state — it was set on every frame (~7fps) but
  // never displayed in JSX, causing needless re-renders.
  const [initialSrc, setInitialSrc] = useState(null);
  
  const imgRef = useRef(null);
  const activeRef = useRef(true);
  const timeoutIdRef = useRef(null);

  const isConfigured = !!doorbellConfig?.ip;

  const loadNextFrame = useCallback(() => {
    if (!isConfigured || !activeRef.current) return;

    // Fetch snapshot with unique timestamp to bypass browser cache
    const url = `/api/snap?ts=${Date.now()}`;
    const preloader = new Image();
    
    preloader.src = url;
    preloader.onload = () => {
      if (!activeRef.current) return;
      
      setError(false);
      
      // Swap the source directly for instant, flicker-free rendering
      if (imgRef.current) {
        imgRef.current.src = url;
      } else {
        setInitialSrc(url);
      }
      
      // Schedule the next frame only after the current one has successfully loaded
      timeoutIdRef.current = setTimeout(loadNextFrame, REFRESH_DELAY_MS);
    };

    preloader.onerror = () => {
      if (!activeRef.current) return;
      setError(true);
      
      // Retry after a longer delay on network error to prevent hammering the network
      timeoutIdRef.current = setTimeout(loadNextFrame, RETRY_DELAY_MS);
    };
  }, [isConfigured]);

  useEffect(() => {
    activeRef.current = true;
    if (isConfigured) {
      loadNextFrame();
    }
    return () => {
      activeRef.current = false;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [isConfigured, loadNextFrame]);

  return (
    <div className="glass-card doorbell-card">
      <div className="card-header">
        <div className="title">
          <Camera size={20} className="icon" />
          <span>Reolink Doorbell</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="status-badge">
            <div className="pulse-dot" />
            LIVE
          </div>
        </div>
      </div>

      <div className="video-container">
        {!isConfigured ? (
          /* Demo placeholder when not configured */
          <>
            <img
              src="https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=800"
              alt="Doorbell demo"
              className="video-feed"
            />
            <div className="doorbell-unconfigured">
              <WifiOff size={24} />
              <span>Enter Reolink IP in ⚙ Settings to enable live feed</span>
            </div>
          </>
        ) : error ? (
          <div className="doorbell-error">
            <WifiOff size={32} />
            <p>Cannot reach camera</p>
            <p className="doorbell-error-sub">http://{doorbellConfig?.ip?.split(':')[0]}/cgi-bin/api.cgi</p>
            <button className="btn-secondary" onClick={loadNextFrame} style={{ marginTop: 12 }}>
              Retry
            </button>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={initialSrc}
            alt="Doorbell Feed"
            className="video-feed"
            onError={() => setError(true)}
            onLoad={() => setError(false)}
          />
        )}

        <div className="video-overlay">
          <div className="controls">
            <button className="icon-btn" onClick={loadNextFrame} title="Refresh now">
              <RefreshCw size={18} />
            </button>
            <button
              className="icon-btn"
              title="Open in new tab"
              onClick={() => imgRef.current?.src && window.open(imgRef.current.src, '_blank')}
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoorbellFeed;
