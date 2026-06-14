import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tv, Calendar, Link } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

const STORAGE_KEY = 'trakt_auth';
const API = 'https://api.trakt.tv';

const loadAuth = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
};
const saveAuth = (auth) => localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
const clearAuth = () => localStorage.removeItem(STORAGE_KEY);

const getRelativeDay = (dateStr) => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
  });
};

// ── Device-code auth flow ──────────────────────────────────────────────────

const DeviceAuthPrompt = ({ clientId, clientSecret, onSuccess }) => {
  const [state, setState] = useState({ status: 'idle' }); // idle | pending | error
  const pollRef = useRef(null);

  const startAuth = useCallback(async () => {
    setState({ status: 'pending', loading: true });
    try {
      const res = await fetch(`${API}/oauth/device/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      const data = await res.json();
      setState({ status: 'pending', loading: false, ...data });

      // Poll until authorized or expired
      const interval = (data.interval ?? 5) * 1000;
      const deadline = Date.now() + (data.expires_in ?? 600) * 1000;

      pollRef.current = setInterval(async () => {
        if (Date.now() > deadline) {
          clearInterval(pollRef.current);
          setState({ status: 'error', message: 'Code expired. Please try again.' });
          return;
        }
        try {
          const tokenRes = await fetch(`${API}/oauth/device/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: data.device_code,
              client_id: clientId,
              client_secret: clientSecret,
            }),
          });
          if (tokenRes.status === 200) {
            clearInterval(pollRef.current);
            const token = await tokenRes.json();
            saveAuth({ ...token, stored_at: Date.now() });
            onSuccess(token);
          }
          // 400 = pending, 404 = expired — just keep polling
        } catch { /* ignore */ }
      }, interval);
    } catch (e) {
      setState({ status: 'error', message: 'Failed to contact Trakt.' });
    }
  }, [clientId, clientSecret, onSuccess]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  if (state.status === 'idle') {
    return (
      <div className="trakt-auth">
        <p className="status-msg">Connect your Trakt account to see your personal watchlist.</p>
        <button className="btn-primary trakt-btn" onClick={startAuth}>
          <Link size={16} /> Connect Trakt
        </button>
      </div>
    );
  }

  if (state.status === 'pending' && state.loading) {
    return <p className="status-msg">Connecting…</p>;
  }

  if (state.status === 'pending' && state.user_code) {
    return (
      <div className="trakt-auth">
        <p className="trakt-instruction">Visit <strong>trakt.tv/activate</strong> and enter:</p>
        <div className="trakt-code">{state.user_code}</div>
        <p className="trakt-wait">Waiting for authorization…<span className="trakt-dot-anim" /></p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="trakt-auth">
        <p className="status-msg error">{state.message}</p>
        <button className="btn-primary trakt-btn" onClick={startAuth}>Try again</button>
      </div>
    );
  }

  return null;
};

// ── Main component ─────────────────────────────────────────────────────────

const UpcomingShows = () => {
  const { config } = useConfig();
  const [auth, setAuth] = useState(() => loadAuth());
  const [shows, setShows] = useState([]);
  const [watchStats, setWatchStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clientId     = config?.trakt?.clientId;
  const clientSecret = config?.trakt?.clientSecret;
  const hasCredentials = clientId && clientSecret;

  const showLookaheadDays = config?.showLookaheadDays || 4;
  const maxShows = config?.maxShows || 5;

  const handleDisconnect = () => {
    clearAuth();
    setAuth(null);
    setShows([]);
  };

  useEffect(() => {
    if (!auth?.access_token) {
      setLoading(false);
      return;
    }

    const fetchShows = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`${API}/calendars/my/shows/${today}/${showLookaheadDays}`, {
          headers: {
            'Content-Type': 'application/json',
            'trakt-api-version': '2',
            'trakt-api-key': clientId,
            'Authorization': `Bearer ${auth.access_token}`,
          },
        });

        if (res.status === 401) {
          // Token expired
          clearAuth();
          setAuth(null);
          setLoading(false);
          return;
        }

        if (!res.ok) throw new Error(`Trakt ${res.status}`);
        const data = await res.json();

        const groupedMap = new Map();
        data.forEach((item) => {
          const dayStr = getRelativeDay(item.released);
          const key = `${item.show.title}-${dayStr}`;
          
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              id: item.episode.ids.trakt,
              title: item.show.title,
              episodeTitle: item.episode.title,
              day: dayStr,
              season: item.episode.season,
              number: item.episode.number,
              isMultiple: false,
            });
          } else {
            const existing = groupedMap.get(key);
            existing.episodeTitle = 'Multiple episodes';
            existing.isMultiple = true;
          }
        });

        const transformed = Array.from(groupedMap.values()).slice(0, maxShows);

        setShows(transformed);

        // Fetch all-time stats
        try {
          const statsRes = await fetch(`${API}/users/me/stats`, {
            headers: {
              'Content-Type': 'application/json',
              'trakt-api-version': '2',
              'trakt-api-key': clientId,
              Authorization: `Bearer ${auth.access_token}`,
            },
          });
          if (statsRes.ok) {
            const stats = await statsRes.json();
            const totalMins = (stats.movies?.minutes || 0) + (stats.episodes?.minutes || 0);
            const totalHours = Math.floor(totalMins / 60);
            const totalDays = Math.floor(totalHours / 24);
            const remainingHours = totalHours % 24;
            setWatchStats({
              time: totalDays > 0 ? `${totalDays}d ${remainingHours}h` : `${totalHours}h`,
              episodes: stats.episodes?.watched || 0,
              movies: stats.movies?.watched || 0,
            });
          }
        } catch (e) {
          console.warn('Failed to fetch watch stats:', e);
        }

        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Trakt fetch error:', err);
        setError('Failed to load schedule');
        setLoading(false);
      }
    };

    fetchShows();
    const interval = setInterval(fetchShows, 30 * 60 * 1000); // refresh every 30 min
    return () => clearInterval(interval);
  }, [auth, clientId, showLookaheadDays, maxShows]);

  return (
    <div className="glass-card tv-card">
      <div className="card-header">
        <div className="title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <Tv size={20} className="icon" />
          <span style={{ marginRight: '8px' }}>My Shows</span>
          {auth && watchStats && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, opacity: 0.8, maxWidth: 'none', whiteSpace: 'nowrap' }}>
              🍿 {watchStats.movies} movies · 📺 {watchStats.episodes} eps · ⏱️ {watchStats.time}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading && <div className="loading-small" />}
        </div>
      </div>

      <div className="shows-list">
        {/* Not configured */}
        {!hasCredentials && (
          <p className="status-msg">
            Enter your Trakt Client ID &amp; Secret in ⚙ Settings.
          </p>
        )}

        {/* Needs auth */}
        {hasCredentials && !auth && (
          <DeviceAuthPrompt
            clientId={clientId}
            clientSecret={clientSecret}
            onSuccess={(token) => setAuth(token)}
          />
        )}

        {/* Authenticated */}
        {auth && loading && shows.length === 0 && (
          <p className="status-msg">Fetching your schedule…</p>
        )}
        {auth && error && <p className="status-msg error">{error}</p>}
        {auth && !loading && shows.length === 0 && !error && (
          <p className="status-msg">No upcoming episodes in the next 4 days.</p>
        )}
        {auth && shows.map((show) => {
          let pillClass = 'upcoming';
          if (show.day === 'Today') pillClass = 'today';
          else if (show.day === 'Tomorrow') pillClass = 'tomorrow';

          return (
            <div key={show.id} className="show-item">
              <div className="show-info">
                <div className="show-title-row">
                  <span className="show-title">{show.title}</span>
                  {show.isMultiple && <span className="show-badge">MULTI</span>}
                </div>
                <span className="show-episode-text">
                  {show.isMultiple 
                    ? "Multiple episodes" 
                    : `S${String(show.season).padStart(2, '0')}E${String(show.number).padStart(2, '0')} ${show.episodeTitle ? `• ${show.episodeTitle}` : ''}`
                  }
                </span>
              </div>
              <div className={`show-time-pill ${pillClass}`}>
                <Calendar size={12} />
                <span>{show.day}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingShows;
