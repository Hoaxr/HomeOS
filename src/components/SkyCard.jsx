import React, { useState, useEffect } from 'react';
import { Sunrise, Sunset, Sun, Moon, Telescope } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useWeather } from '../context/WeatherContext';
import { resolveLocation } from '../utils/location';
import { parseAstronomyTime } from '../utils/weather';

// ─── Moon Phase Calculation ──────────────────────────────────────────────────
const getMoonPhase = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let jdn = 367 * year
    - Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4)
    + Math.floor((275 * month) / 9)
    + day
    + 1721013.5;

  const knownNew = 2451550.1;
  const synodicMonth = 29.53058867;

  const daysSinceNew = jdn - knownNew;
  const phase = ((daysSinceNew % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = Math.round(50 * (1 - Math.cos((phase / synodicMonth) * 2 * Math.PI)));

  const phases = [
    { name: 'New Moon',        emoji: '🌑', range: [0, 1.85] },
    { name: 'Waxing Crescent', emoji: '🌒', range: [1.85, 7.38] },
    { name: 'First Quarter',   emoji: '🌓', range: [7.38, 11.08] },
    { name: 'Waxing Gibbous',  emoji: '🌔', range: [11.08, 14.77] },
    { name: 'Full Moon',       emoji: '🌕', range: [14.77, 16.61] },
    { name: 'Waning Gibbous',  emoji: '🌖', range: [16.61, 22.15] },
    { name: 'Last Quarter',    emoji: '🌗', range: [22.15, 25.84] },
    { name: 'Waning Crescent', emoji: '🌘', range: [25.84, 29.53] },
  ];

  const phaseInfo = phases.find(p => phase >= p.range[0] && phase < p.range[1]) ?? phases[0];
  const daysToFull = phase < 14.77
    ? Math.round(14.77 - phase)
    : Math.round(synodicMonth - phase + 14.77);
  const isWaxing = phase < 14.77;

  return { ...phaseInfo, illumination, phase: Math.round(phase), daysToFull, isWaxing };
};

// ─── Moon SVG Visual ─────────────────────────────────────────────────────────
const MoonVisual = ({ illumination, isWaxing, size = 52, uid = 'main' }) => {
  const R = 20, cx = 24, cy = 24;
  const pct = illumination / 100;
  const rx = Math.abs(R - 2 * R * pct);
  const sweepOuter = isWaxing ? 1 : 0;
  const sweepInner = pct < 0.5 ? (isWaxing ? 0 : 1) : (isWaxing ? 1 : 0);
  const pathD = `M ${cx} ${cy - R} A ${R} ${R} 0 0 ${sweepOuter} ${cx} ${cy + R} A ${rx} ${R} 0 0 ${sweepInner} ${cx} ${cy - R} Z`;

  const isSmall = size < 30;
  const strokeW = isSmall ? 1.6 : 0.8;
  const strokeColor = isSmall ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';
  const darkOpacity0 = isSmall ? 0.95 : 0.8;
  const darkOpacity60 = isSmall ? 0.85 : 0.6;
  const darkOpacity100 = isSmall ? 0.65 : 0.4;

  const gradId = `moon-${uid}-${size}`;

  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="moon-visual-svg">
      <defs>
        <radialGradient id={`moon-lit-${gradId}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#fffbeb" />
          <stop offset="65%"  stopColor="#fef08a" />
          <stop offset="90%"  stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>
        <radialGradient id={`moon-dark-${gradId}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#3b4252" stopOpacity={darkOpacity0} />
          <stop offset="60%"  stopColor="#2e3440" stopOpacity={darkOpacity60} />
          <stop offset="100%" stopColor="#1a1c23" stopOpacity={darkOpacity100} />
        </radialGradient>
        <mask id={`moon-mask-${gradId}`}>
          <rect x="0" y="0" width="48" height="48" fill="black" />
          <path d={pathD} fill="white" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill={`url(#moon-dark-${gradId})`} stroke={strokeColor} strokeWidth={strokeW} />
      <circle cx="16" cy="18" r="1.5" className="moon-crater" style={{ opacity: isSmall ? 0.55 : 0.35 }} />
      <circle cx="14" cy="28" r="2"   className="moon-crater" style={{ opacity: isSmall ? 0.55 : 0.35 }} />
      <circle cx="28" cy="15" r="1.2" className="moon-crater" style={{ opacity: isSmall ? 0.55 : 0.35 }} />
      <circle cx={cx} cy={cy} r={R} fill={`url(#moon-lit-${gradId})`} mask={`url(#moon-mask-${gradId})`} />
      <g mask={`url(#moon-mask-${gradId})`}>
        <circle cx="20" cy="18" r="2.5" className="moon-crater" />
        <circle cx="15" cy="30" r="1.5" className="moon-crater" />
        <circle cx="28" cy="16" r="2"   className="moon-crater" />
        <circle cx="32" cy="27" r="3"   className="moon-crater" />
        <circle cx="23" cy="33" r="1.5" className="moon-crater" />
      </g>
    </svg>
  );
};

// ─── Combined Sky Card ────────────────────────────────────────────────────────
const SkyCard = () => {
  const { config } = useConfig();
  const { weather } = useWeather();
  const [moon] = useState(() => getMoonPhase());
  const [sunData, setSunData] = useState(null);
  const [now, setNow] = useState(new Date());

  const location = resolveLocation(config);

  // Fetch sunrise/sunset
  useEffect(() => {
    const fetchSun = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
          `&daily=sunrise,sunset&timezone=auto&forecast_days=1`
        );
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (json.daily) {
          setSunData({
            sunrise: new Date(json.daily.sunrise[0]),
            sunset:  new Date(json.daily.sunset[0]),
          });
          return;
        }
      } catch (e) {
        console.warn('Sun fetch failed, trying wttr.in fallback:', e);
      }
      try {
        const res = await fetch(`https://wttr.in/${location.lat},${location.lon}?format=j1`);
        if (!res.ok) throw new Error('wttr.in HTTP ' + res.status);
        const json = await res.json();
        const todayForecast = json.weather?.[0];
        const astro = todayForecast?.astronomy?.[0];
        if (astro && todayForecast.date) {
          setSunData({
            sunrise: parseAstronomyTime(todayForecast.date, astro.sunrise),
            sunset:  parseAstronomyTime(todayForecast.date, astro.sunset),
          });
        }
      } catch (err) {
        console.error('All sun fetches failed:', err);
      }
    };
    fetchSun();
  }, [location.lat, location.lon]);

  // Tick every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const getProgress = () => {
    if (!sunData) return { pct: 0, isDay: true };
    const { sunrise, sunset } = sunData;

    if (now >= sunrise && now <= sunset) {
      // Day mode
      const pct = ((now - sunrise) / (sunset - sunrise)) * 100;
      return { pct, isDay: true };
    } else if (now > sunset) {
      // Night mode (after sunset today)
      const nextSunrise = new Date(sunrise.getTime() + 86400000);
      const pct = ((now - sunset) / (nextSunrise - sunset)) * 100;
      return { pct, isDay: false };
    } else {
      // Night mode (before sunrise today)
      const prevSunset = new Date(sunset.getTime() - 86400000);
      const pct = ((now - prevSunset) / (sunrise - prevSunset)) * 100;
      return { pct, isDay: false };
    }
  };

  const { pct: progress, isDay } = getProgress();

  // Sun position along semi-ellipse
  const getSunPos = () => {
    const x = 10 + (progress / 100) * 180;
    const dx = (x - 100) / 90;
    const y = 23 - 15 * Math.sqrt(1 - dx * dx);
    return { x, y };
  };
  const { x: sunX, y: sunY } = getSunPos();

  // Countdown label
  const getSunStatus = () => {
    if (!sunData) return '';
    const formatTime = (totalMins) => {
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
    };
    if (isDay) return `${formatTime(Math.round((sunData.sunset - now) / 60000))} until sunset`;
    let msUntilSunrise = sunData.sunrise - now;
    if (msUntilSunrise < 0) msUntilSunrise += 86_400_000;
    return `${formatTime(Math.round(msUntilSunrise / 60000))} until sunrise`;
  };

  // Compute golden & blue hours from sunrise/sunset
  const getGoldenBlueHours = () => {
    if (!sunData) return null;
    const addMin = (date, mins) => new Date(date.getTime() + mins * 60000);
    const fmtT = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return {
      morningGold:  `${fmtT(sunData.sunrise)}–${fmtT(addMin(sunData.sunrise, 40))}`,
      eveningGold:  `${fmtT(addMin(sunData.sunset, -40))}–${fmtT(sunData.sunset)}`,
    };
  };
  const goldenBlue = getGoldenBlueHours();

  // Stargazing score: cloud cover (70% weight) + moon darkness (30% weight)
  const cloudCover = weather?.cloud_cover ?? null;
  const starzScore = cloudCover !== null
    ? Math.round(((100 - cloudCover) / 100) * 70 + ((100 - moon.illumination) / 100) * 30)
    : null;
  const starzInfo = starzScore === null ? null
    : starzScore >= 80 ? { label: 'Excellent', icon: '⭐', color: '#fbbf24' }
    : starzScore >= 60 ? { label: 'Good',      icon: '🌟', color: '#a3e635' }
    : starzScore >= 40 ? { label: 'Fair',      icon: '🌥️', color: '#f59e0b' }
    :                    { label: 'Poor',      icon: '☁️',  color: '#94a3b8' };

  const uvIndex = weather?.uv_index ?? null;

  return (
    <div className="glass-card sky-card">
      {/* ── Header ── */}
      <div className="card-header">
        <div className="title">
          <Sunrise size={20} className="icon" />
          <span>Sky</span>
        </div>
      </div>

      {/* ── Main body: Moon left | Sun arc right ── */}
      <div className="sky-body">

        {/* Moon column */}
        <div className="sky-moon-col">
          <MoonVisual illumination={moon.illumination} isWaxing={moon.isWaxing} size={52} uid="sky" />
          <div className="moon-info">
            <span className="moon-phase-name">{moon.name}</span>
            <span className="moon-sub">{moon.illumination}% illuminated</span>
          </div>
        </div>

        {/* Divider */}
        <div className="sky-divider" />

        {/* Sun column */}
        <div className="sky-sun-col">
          {sunData ? (
            <>
              <div className="sun-track-row">
                <div className="sun-time-item">
                  {isDay ? <Sunrise size={14} color="#fbbf24" /> : <Sunset size={14} color="#818cf8" />}
                  <div>
                    <span className="sun-time">{fmt(isDay ? sunData.sunrise : sunData.sunset)}</span>
                    <span className="sun-label">{isDay ? 'Sunrise' : 'Sunset'}</span>
                  </div>
                </div>

                <div className="sun-track">
                  <svg viewBox="0 0 200 28" className="sun-arc-svg">
                    <defs>
                      <linearGradient id="sky-arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        {isDay ? (
                          <>
                            <stop offset="0%"   stopColor="#fbbf24" stopOpacity="1" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="1" />
                          </>
                        ) : (
                          <>
                            <stop offset="0%"   stopColor="#818cf8" stopOpacity="1" />
                            <stop offset="100%" stopColor="#c084fc" stopOpacity="1" />
                          </>
                        )}
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="25" x2="200" y2="25" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <path d="M 10,23 A 90,15 0 0,1 190,23" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" strokeDasharray="4,4" />
                    <path
                      d="M 10,23 A 90,15 0 0,1 190,23"
                      fill="none"
                      stroke="url(#sky-arc-grad)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="190"
                      strokeDashoffset={190 - (progress / 100) * 190}
                      style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                    <g transform={`translate(${sunX - 10}, ${sunY - 10})`} className="sun-orb-group">
                      {isDay
                        ? <Sun  size={20} fill="#fbbf24" stroke="#fbbf24" className="sun-orb-glow" />
                        : <Moon size={18} fill="#a78bfa" stroke="#a78bfa" className="moon-orb-glow" />
                      }
                    </g>
                  </svg>
                </div>

                <div className="sun-time-item">
                  {isDay ? <Sunset size={14} color="#f97316" /> : <Sunrise size={14} color="#c084fc" />}
                  <div>
                    <span className="sun-time">{fmt(isDay ? sunData.sunset : sunData.sunrise)}</span>
                    <span className="sun-label">{isDay ? 'Sunset' : 'Sunrise'}</span>
                  </div>
                </div>
              </div>
              <p className="sun-status" style={{ marginTop: '6px' }}>{getSunStatus()}</p>
            </>
          ) : (
            <p className="status-msg">Loading sun data...</p>
          )}
        </div>
      </div>

      {/* ── Moon illumination track ── */}
      <div className="sky-footer">
        <div className="moon-track">
          <div className="moon-track-bar">
            <div className="moon-track-fill" style={{ width: `${moon.illumination}%` }} />
            <div className="moon-orb" style={{ left: `${moon.illumination}%` }} title={`${moon.illumination}% illuminated`}>
              <MoonVisual illumination={moon.illumination} isWaxing={moon.isWaxing} size={26} uid="sky-sm" />
            </div>
          </div>
        </div>
        <p className="moon-next">
          {moon.daysToFull === 0 ? 'Full moon tonight!' : `Full moon in ${moon.daysToFull} day${moon.daysToFull !== 1 ? 's' : ''}`}
        </p>

        {/* Stargazing conditions */}
        {starzInfo && (
          <div className="sky-starz-row">
            <span className="sky-starz-icon">&#x1F52D;</span>
            <span className="sky-starz-label">Stargazing:</span>
            <span className="sky-starz-value" style={{ color: starzInfo.color }}>
              {starzInfo.icon} {starzInfo.label} ({starzScore}/100)
            </span>
            {cloudCover !== null && (
              <span className="sky-starz-detail">{cloudCover}% clouds · {moon.illumination}% moon</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkyCard;
