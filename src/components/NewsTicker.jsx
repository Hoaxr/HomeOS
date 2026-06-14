import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useConfig } from '../context/ConfigContext';
import { AlertCircle } from 'lucide-react';

/* ── Built-in sources ───────────────────────────────────── */
const DEFAULT_SOURCES = [
  { id: 'nos',       label: 'NOS',       color: '#e63946', url: 'https://feeds.nos.nl/nosnieuwsalgemeen' },
  { id: 'tweakers',  label: 'Tweakers',  color: '#f4a261', url: 'https://tweakers.net/feeds/mixed.xml' },
  { id: 'ad',        label: 'AD',        color: '#e9c46a', url: 'https://www.ad.nl/rss.xml' },
  { id: 'crimesite', label: 'Crimesite', color: '#a8dadc', url: 'https://www.crimesite.nl/feed/' },
];

/* ── Relative time helper ─────────────────────────────── */
const formatAge = (pubDate) => {
  if (!pubDate) return '';
  try {
    const d = new Date(pubDate.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return '';
    const diffMin = Math.floor((Date.now() - d) / 60000);
    if (diffMin < 1)  return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const h = Math.floor(diffMin / 60);
    if (h < 24) return `${h}h`;
    return d.toLocaleDateString([], { weekday: 'long' });
  } catch { return ''; }
};

/* ── Parse raw RSS/Atom XML ─────────────────────────────── */
const cleanTitle = (t) => {
  if (!t) return t;
  return t.replace(/\s+Blu-ray and DVD release date.*/i, '')
          .replace(/\s+DVD release date.*/i, '')
          .replace(/\s+release date.*/i, '');
};

const parseXml = (xmlText, limit = 25) => {
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (xml.querySelector('parsererror')) return null;
  const nodes = xml.querySelectorAll('item, entry');
  if (!nodes.length) return null;
  return Array.from(nodes).slice(0, limit).map(el => ({
    title:   cleanTitle((el.querySelector('title')?.textContent || '').trim()),
    link:    (el.querySelector('link')?.textContent
              || el.querySelector('link')?.getAttribute('href')
              || el.querySelector('guid')?.textContent || '#').trim(),
    pubDate: (el.querySelector('pubDate')?.textContent
              || el.querySelector('published')?.textContent
              || el.querySelector('updated')?.textContent || ''),
  })).filter(i => i.title);
};

/* ── Fetch via local proxy → rss2json fallback ──────────── */
const fetchItems = async (rssUrl, limit = 25) => {
  const safe = rssUrl.replace(/^http:\/\//i, 'https://');
  try {
    const r = await fetch(`/api/rss?url=${encodeURIComponent(safe)}`);
    if (r.ok) {
      const parsed = parseXml(await r.text(), limit);
      if (parsed?.length) return parsed;
    }
  } catch (e) { console.warn('[NewsTicker] local proxy failed:', e); }

  try {
    const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(safe)}&count=${limit}`);
    if (r.ok) {
      const d = await r.json();
      if (d?.status === 'ok' && d.items?.length) {
        return d.items.map(item => ({ ...item, title: cleanTitle(item.title) }));
      }
    }
  } catch (e) { console.warn('[NewsTicker] rss2json failed:', e); }

  return null;
};

/* ── Component ────────────────────────────────────────── */
const NewsTicker = ({ feeds }) => {
  const { config } = useConfig();

  // Fixed: use useMemo to produce a stable `sources` reference instead of
  // the previous inline `.map(...).join(',')` trick inside the dependency array
  // (which required an eslint-disable comment).
  const sources = useMemo(
    () => feeds ? feeds : ((config?.rssFeeds?.length > 0) ? config.rssFeeds : DEFAULT_SOURCES),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feeds, config?.rssFeeds]
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [cache, setCache]         = useState({});
  const [paused, setPaused]       = useState(false);
  const [fading, setFading]       = useState(false);
  const trackRef                  = useRef(null);
  const rotateTimer               = useRef(null);

  const activeSource = sources[activeIdx] || sources[0];
  const items        = cache[activeSource?.id] || [];
  const hasError     = cache[activeSource?.id] === null;
  const loading      = cache[activeSource?.id] === undefined;

  const newsLimit     = config?.newsLimit || 25;
  const rotateSeconds = config?.newsRotationSpeed || 30;
  const rotateMs      = rotateSeconds * 1000;

  /* Pre-fetch ALL sources on mount / when sources change */
  useEffect(() => {
    sources.forEach(src => {
      fetchItems(src.url, newsLimit).then(result => {
        setCache(prev => ({ ...prev, [src.id]: result ?? null }));
      });
    });
    // Refresh every 10 min
    const refresh = setInterval(() => {
      setCache({});
      sources.forEach(src => {
        fetchItems(src.url, newsLimit).then(result => {
          setCache(prev => ({ ...prev, [src.id]: result ?? null }));
        });
      });
    }, 10 * 60 * 1000);
    return () => clearInterval(refresh);
  }, [sources, newsLimit]);

  /* Auto-rotate when not paused */
  useEffect(() => {
    if (paused || sources.length < 2) return;
    rotateTimer.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % sources.length);
        setFading(false);
      }, 400);
    }, rotateMs);
    return () => clearInterval(rotateTimer.current);
  }, [paused, sources.length, rotateMs]);

  /* Reset scroll animation on source switch */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = '';
  }, [activeIdx]);

  const displayed = items.length ? [...items, ...items, ...items] : [];
  const speed     = Math.max(60, items.length * 6);

  return (
    <div className="news-ticker-container glass-card">

      {/* Source pill — left side of the bar */}
      <div
        className="news-ticker-source-pill"
        style={{ '--tab-color': activeSource.color }}
      >
        <span className="news-ticker-source-label">{activeSource.label}</span>
        {/* Progress dots */}
        <div className="news-ticker-dots">
          {sources.map((src, i) => (
            <span
              key={src.id}
              className={`news-ticker-dot-ind ${i === activeIdx ? 'active' : ''}`}
              style={{ '--dot-color': src.color }}
            />
          ))}
        </div>
      </div>

      <div className="news-ticker-divider-line" />

      {/* Scroll area */}
      {loading && (
        <div className="news-ticker-loading">
          <span className="news-ticker-spinner" />
          Loading headlines...
        </div>
      )}

      {!loading && hasError && (
        <div className="news-ticker-loading" style={{ color: 'var(--danger)' }}>
          <AlertCircle size={13} />
          Could not load feed
        </div>
      )}

      {!loading && !hasError && items.length > 0 && (
        <div
          className={`news-ticker-scroll-wrapper ${fading ? 'fading' : ''}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            ref={trackRef}
            className={`news-ticker-scroll-track ${paused ? 'paused' : ''}`}
            style={{ '--ticker-duration': `${speed}s`, '--tab-color': activeSource.color }}
          >
            {displayed.map((item, idx) => {
              const age = formatAge(item.pubDate);
              return (
                <React.Fragment key={idx}>
                  <a
                    href={item.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-headline"
                  >
                    {age && <span className="news-headline-time">{age}</span>}
                    <span className="news-headline-text">{item.title}</span>
                  </a>
                  <span className="news-headline-sep" aria-hidden="true">◆</span>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsTicker;
