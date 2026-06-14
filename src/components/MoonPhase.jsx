import React, { useState, useEffect } from 'react';
import { Moon } from 'lucide-react';

// Moon phase calculation — fully local, no API needed.
// Returns a phase object based on the Julian Day Number.
const getMoonPhase = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Julian Day Number
  let jdn = 367 * year
    - Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4)
    + Math.floor((275 * month) / 9)
    + day
    + 1721013.5;

  // Days since known new moon (Jan 6, 2000)
  const knownNew = 2451550.1;
  const synodicMonth = 29.53058867;

  const daysSinceNew = jdn - knownNew;
  const phase = ((daysSinceNew % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = Math.round(
    50 * (1 - Math.cos((phase / synodicMonth) * 2 * Math.PI))
  );

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

  const phaseInfo = phases.find(p => phase >= p.range[0] && phase < p.range[1])
    ?? phases[0];

  // Days until next full moon
  const daysToFull = phase < 14.77
    ? Math.round(14.77 - phase)
    : Math.round(synodicMonth - phase + 14.77);

  const isWaxing = phase < 14.77;

  return { ...phaseInfo, illumination, phase: Math.round(phase), daysToFull, isWaxing };
};

const MoonVisual = ({ illumination, isWaxing, size = 56 }) => {
  const R = 20;
  const cx = 24;
  const cy = 24;
  
  // Calculate horizontal radius of the terminator line
  const pct = illumination / 100;
  const rx = Math.abs(R - 2 * R * pct);
  
  // Determine SVG arc sweep flags
  const sweepOuter = isWaxing ? 1 : 0;
  const sweepInner = pct < 0.5 ? (isWaxing ? 0 : 1) : (isWaxing ? 1 : 0);

  // Mathematically derive the exact path D for crescent and gibbous phases
  const pathD = `M ${cx} ${cy - R} 
                 A ${R} ${R} 0 0 ${sweepOuter} ${cx} ${cy + R} 
                 A ${rx} ${R} 0 0 ${sweepInner} ${cx} ${cy - R} Z`;

  const isSmall = size < 30;
  const strokeW = isSmall ? 1.6 : 0.8;
  const strokeColor = isSmall ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.2)";
  const darkOpacity0 = isSmall ? 0.95 : 0.8;
  const darkOpacity60 = isSmall ? 0.85 : 0.6;
  const darkOpacity100 = isSmall ? 0.65 : 0.4;

  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="moon-visual-svg">
      <defs>
        {/* Glow and 3D Gradients */}
        <radialGradient id={`moon-lit-grad-${size}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="65%" stopColor="#fef08a" />
          <stop offset="90%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>
        <radialGradient id={`moon-dark-grad-${size}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#3b4252" stopOpacity={darkOpacity0} />
          <stop offset="60%" stopColor="#2e3440" stopOpacity={darkOpacity60} />
          <stop offset="100%" stopColor="#1a1c23" stopOpacity={darkOpacity100} />
        </radialGradient>
        
        {/* Mask to clip the illuminated portion */}
        <mask id={`moon-mask-${size}`}>
          <rect x="0" y="0" width="48" height="48" fill="black" />
          <path d={pathD} fill="white" />
        </mask>
      </defs>

      {/* 1. Base dark side of the moon */}
      <circle cx={cx} cy={cy} r={R} fill={`url(#moon-dark-grad-${size})`} stroke={strokeColor} strokeWidth={strokeW} />
      
      {/* 2. Craters on the dark side (subtle) */}
      <circle cx="16" cy="18" r="1.5" className="moon-crater" style={{ opacity: isSmall ? 0.55 : 0.35 }} />
      <circle cx="14" cy="28" r="2" className="moon-crater" style={{ opacity: isSmall ? 0.55 : 0.35 }} />
      <circle cx="28" cy="15" r="1.2" className="moon-crater" style={{ opacity: isSmall ? 0.55 : 0.35 }} />

      {/* 3. Illuminated side of the moon (masked) */}
      <circle cx={cx} cy={cy} r={R} fill={`url(#moon-lit-grad-${size})`} mask={`url(#moon-mask-${size})`} />

      {/* 4. Craters on the light side (visible but blended) */}
      <g mask={`url(#moon-mask-${size})`}>
        <circle cx="20" cy="18" r="2.5" className="moon-crater" />
        <circle cx="15" cy="30" r="1.5" className="moon-crater" />
        <circle cx="28" cy="16" r="2" className="moon-crater" />
        <circle cx="32" cy="27" r="3" className="moon-crater" />
        <circle cx="23" cy="33" r="1.5" className="moon-crater" />
      </g>
    </svg>
  );
};

const MoonPhase = () => {
  const [moon, setMoon] = useState(() => getMoonPhase());

  useEffect(() => {
    // Schedule a recalculation at the next midnight, then every 24 h after that
    const scheduleRefresh = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const msUntilMidnight = midnight - now;

      const timeout = setTimeout(() => {
        setMoon(getMoonPhase());
        const daily = setInterval(() => setMoon(getMoonPhase()), 86_400_000);
        return () => clearInterval(daily);
      }, msUntilMidnight);

      return () => clearTimeout(timeout);
    };
    return scheduleRefresh();
  }, []);

  return (
    <div className="glass-card moon-card">
      <div className="card-header">
        <div className="title">
          <Moon size={20} className="icon" />
          <span>Moon Phase</span>
        </div>
      </div>

      <div className="moon-body">
        <div className="moon-visual">
          <MoonVisual illumination={moon.illumination} isWaxing={moon.isWaxing} />
          <div className="moon-info">
            <span className="moon-phase-name">{moon.name}</span>
            <span className="moon-sub">{moon.illumination}% illuminated</span>
          </div>
        </div>

        <div className="moon-track">
          <div className="moon-track-bar">
            <div
              className="moon-track-fill"
              style={{ width: `${moon.illumination}%` }}
            />
            <div
              className="moon-orb"
              style={{ left: `${moon.illumination}%` }}
              title={`${moon.illumination}% illuminated`}
            >
              <MoonVisual illumination={moon.illumination} isWaxing={moon.isWaxing} size={26} />
            </div>
          </div>
        </div>

        <p className="moon-next">
          {moon.daysToFull === 0
            ? 'Full moon tonight!'
            : `Full moon in ${moon.daysToFull} day${moon.daysToFull !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  );
};

export default MoonPhase;
