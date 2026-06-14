import React from 'react';

/**
 * Calculates the current moon phase based on Julian Day Number.
 * Fully local — no API needed.
 */
export const getMoonPhase = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Julian Day Number
  const jdn = 367 * year
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

  const phaseInfo = phases.find(p => phase >= p.range[0] && phase < p.range[1]) ?? phases[0];

  // Days until next full moon
  const daysToFull = phase < 14.77
    ? Math.round(14.77 - phase)
    : Math.round(synodicMonth - phase + 14.77);

  const isWaxing = phase < 14.77;

  return { ...phaseInfo, illumination, phase: Math.round(phase), daysToFull, isWaxing };
};

/**
 * Schedules moon phase recalculation at midnight, then every 24 h.
 * Returns a cleanup function. Use inside a useEffect.
 */
export const scheduleMoonRefresh = (onRefresh) => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight - now;

  let dailyInterval = null;

  const timeout = setTimeout(() => {
    onRefresh(getMoonPhase());
    dailyInterval = setInterval(() => onRefresh(getMoonPhase()), 86_400_000);
  }, msUntilMidnight);

  return () => {
    clearTimeout(timeout);
    if (dailyInterval) clearInterval(dailyInterval);
  };
};

/**
 * SVG rendering of the moon's illuminated face.
 * uid must be unique per rendered instance to avoid SVG gradient ID collisions.
 */
export const MoonVisual = ({ illumination, isWaxing, size = 56, uid = 'moon' }) => {
  const R = 20;
  const cx = 24;
  const cy = 24;

  const pct = illumination / 100;
  const rx = Math.abs(R - 2 * R * pct);
  const sweepOuter = isWaxing ? 1 : 0;
  const sweepInner = pct < 0.5 ? (isWaxing ? 0 : 1) : (isWaxing ? 1 : 0);
  const pathD = `M ${cx} ${cy - R} A ${R} ${R} 0 0 ${sweepOuter} ${cx} ${cy + R} A ${rx} ${R} 0 0 ${sweepInner} ${cx} ${cy - R} Z`;

  const isSmall = size < 30;
  const strokeW = isSmall ? 1.6 : 0.8;
  const strokeColor = isSmall ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';
  const darkOpacity0   = isSmall ? 0.95 : 0.8;
  const darkOpacity60  = isSmall ? 0.85 : 0.6;
  const darkOpacity100 = isSmall ? 0.65 : 0.4;

  const litId  = `moon-lit-${uid}`;
  const darkId = `moon-dark-${uid}`;
  const maskId = `moon-mask-${uid}`;

  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="moon-visual-svg">
      <defs>
        <radialGradient id={litId} cx="40%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#fffbeb" />
          <stop offset="65%"  stopColor="#fef08a" />
          <stop offset="90%"  stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>
        <radialGradient id={darkId} cx="40%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#3b4252" stopOpacity={darkOpacity0} />
          <stop offset="60%"  stopColor="#2e3440" stopOpacity={darkOpacity60} />
          <stop offset="100%" stopColor="#1a1c23" stopOpacity={darkOpacity100} />
        </radialGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width="48" height="48" fill="black" />
          <path d={pathD} fill="white" />
        </mask>
      </defs>

      {/* Dark side */}
      <circle cx={cx} cy={cy} r={R} fill={`url(#${darkId})`} stroke={strokeColor} strokeWidth={strokeW} />

      {/* Craters on dark side */}
      <circle cx="16" cy="18" r="1.5" className="moon-crater" style={{ opacity: isSmall ? 0.55 : 0.35 }} />
      <circle cx="14" cy="28" r="2"   className="moon-crater" style={{ opacity: isSmall ? 0.55 : 0.35 }} />
      <circle cx="28" cy="15" r="1.2" className="moon-crater" style={{ opacity: isSmall ? 0.55 : 0.35 }} />

      {/* Illuminated side */}
      <circle cx={cx} cy={cy} r={R} fill={`url(#${litId})`} mask={`url(#${maskId})`} />

      {/* Craters on light side */}
      <g mask={`url(#${maskId})`}>
        <circle cx="20" cy="18" r="2.5" className="moon-crater" />
        <circle cx="15" cy="30" r="1.5" className="moon-crater" />
        <circle cx="28" cy="16" r="2"   className="moon-crater" />
        <circle cx="32" cy="27" r="3"   className="moon-crater" />
        <circle cx="23" cy="33" r="1.5" className="moon-crater" />
      </g>
    </svg>
  );
};
