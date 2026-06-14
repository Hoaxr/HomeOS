import React, { useState, useEffect } from 'react';
import { Sunrise, Sunset, Sun, Moon } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { resolveLocation } from '../utils/location';
import { parseAstronomyTime } from '../utils/weather';

const SunriseSunset = () => {
  const { config } = useConfig();
  const [sunData, setSunData] = useState(null);
  const [now, setNow] = useState(new Date());

  const location = resolveLocation(config);

  useEffect(() => {
    const fetchSun = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
          `&daily=sunrise,sunset&timezone=auto&forecast_days=1`
        );
        if (!res.ok) throw new Error('Open-Meteo HTTP error ' + res.status);
        const json = await res.json();
        if (json.daily) {
          setSunData({
            sunrise: new Date(json.daily.sunrise[0]),
            sunset: new Date(json.daily.sunset[0]),
          });
          return;
        }
      } catch (e) {
        console.warn('Sun fetch failed from Open-Meteo, attempting wttr.in fallback:', e);
      }

      // wttr.in Fallback
      try {
        const res = await fetch(`https://wttr.in/${location.lat},${location.lon}?format=j1`);
        if (!res.ok) throw new Error('wttr.in HTTP error ' + res.status);
        const json = await res.json();
        const todayForecast = json.weather?.[0];
        const astro = todayForecast?.astronomy?.[0];
        if (astro && todayForecast.date) {
          setSunData({
            sunrise: parseAstronomyTime(todayForecast.date, astro.sunrise),
            sunset: parseAstronomyTime(todayForecast.date, astro.sunset),
          });
        }
      } catch (err) {
        console.error('All sun fetches failed:', err);
      }
    };
    fetchSun();
  }, [location.lat, location.lon]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fmt = (date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const getDayProgress = () => {
    if (!sunData) return 0;
    const { sunrise, sunset } = sunData;
    const total = sunset - sunrise;
    const elapsed = now - sunrise;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const isDay = sunData ? now >= sunData.sunrise && now <= sunData.sunset : true;
  const progress = getDayProgress();

  // Calculate coordinates of the sun/moon along a semi-ellipse centered at (100, 23)
  // with a horizontal radius Rx=90 and vertical radius Ry=15.
  const getSunPosition = () => {
    const x = 10 + (progress / 100) * 180;
    const dx = (x - 100) / 90;
    const y = 23 - 15 * Math.sqrt(1 - dx * dx);
    return { x, y };
  };

  const { x: sunX, y: sunY } = getSunPosition();

  return (
    <div className="glass-card sun-card">
      <div className="card-header">
        <div className="title">
          <Sunrise size={20} className="icon" />
          <span>Sun</span>
        </div>
      </div>

      {sunData ? (
        <div className="sun-body">
          <div className="sun-track-row">
            {/* Sunrise (Left) */}
            <div className="sun-time-item">
              <Sunrise size={16} color="#fbbf24" />
              <div>
                <span className="sun-time">{fmt(sunData.sunrise)}</span>
                <span className="sun-label">Sunrise</span>
              </div>
            </div>

            {/* Arc (Middle) */}
            <div className="sun-track">
              <svg viewBox="0 0 200 28" className="sun-arc-svg">
                <defs>
                  <linearGradient id="sun-arc-fill-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="1" />
                  </linearGradient>
                </defs>
                
                {/* Horizon baseline */}
                <line x1="0" y1="25" x2="200" y2="25" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                
                {/* Background trajectory (dotted arc) */}
                <path 
                  d="M 10,23 A 90,15 0 0,1 190,23" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.04)" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,4" 
                />
                
                {/* Completed trajectory path (gradient fill based on progress) */}
                <path 
                  d="M 10,23 A 90,15 0 0,1 190,23" 
                  fill="none" 
                  stroke="url(#sun-arc-fill-grad)" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeDasharray="190"
                  strokeDashoffset={190 - (progress / 100) * 190}
                  style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
                
                {/* Sun/Moon Orb centered at calculated coordinates */}
                <g transform={`translate(${sunX - 10}, ${sunY - 10})`} className="sun-orb-group">
                  {isDay ? (
                    <Sun size={20} fill="#fbbf24" stroke="#fbbf24" className="sun-orb-glow" />
                  ) : (
                    <Moon size={18} fill="#a78bfa" stroke="#a78bfa" className="moon-orb-glow" />
                  )}
                </g>
              </svg>
            </div>

            {/* Sunset (Right) */}
            <div className="sun-time-item">
              <Sunset size={16} color="#f97316" />
              <div>
                <span className="sun-time">{fmt(sunData.sunset)}</span>
                <span className="sun-label">Sunset</span>
              </div>
            </div>
          </div>

          <p className="sun-status">
            {(() => {
              const formatTime = (totalMins) => {
                const hrs = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                return hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
              };
              if (isDay) {
                return `${formatTime(Math.round((sunData.sunset - now) / 60000))} until sunset`;
              }
              // When it's night: sunrise may already be past (today's) so add 24 h if needed
              let msUntilSunrise = sunData.sunrise - now;
              if (msUntilSunrise < 0) msUntilSunrise += 86_400_000;
              return `${formatTime(Math.round(msUntilSunrise / 60000))} until sunrise`;
            })()}
          </p>
        </div>
      ) : (
        <p className="status-msg">Loading...</p>
      )}
    </div>
  );
};

export default SunriseSunset;
