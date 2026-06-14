import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

const GlobalClocks = () => {
  const { config } = useConfig();
  const [now, setNow] = useState(new Date());

  const clocks = config?.clocks || [
    { id: 'nl', label: 'Netherlands', flag: '🇳🇱', timeZone: 'Europe/Amsterdam' },
    { id: 'us-ny', label: 'America', flag: '🇺🇸', timeZone: 'America/New_York' },
    { id: 'ru', label: 'Russia', flag: '🇷🇺', timeZone: 'Europe/Moscow' },
    { id: 'cn', label: 'China', flag: '🇨🇳', timeZone: 'Asia/Shanghai' },
  ];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Derives the UTC-offset difference (in whole hours) between the browser's
   * local timezone and a target IANA timezone, using only Intl.DateTimeFormat.
   * This avoids the non-standard `new Date(toLocaleString(...))` pattern that
   * breaks on Firefox.
   */
  const getOffsetHours = (timeZone) => {
    try {
      // Extract the numeric hour in 24h format for both timezones from the
      // same instant, then subtract. We use 'en-US' with hour12:false and
      // a known reference point (the current Date) for both.
      const fmt = (tz) =>
        new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        }).formatToParts(now);

      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const toParts = (parts) => {
        const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
        const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
        return h * 60 + m;
      };

      const localMins  = toParts(fmt(localTz));
      const targetMins = toParts(fmt(timeZone));

      // Account for day boundary wrap-around (±720 minutes = ±12 hours)
      let diffMins = targetMins - localMins;
      if (diffMins > 720)  diffMins -= 1440;
      if (diffMins < -720) diffMins += 1440;

      return Math.round(diffMins / 60);
    } catch {
      return null;
    }
  };

  return (
    <div className="clock-container">
      {clocks.map(({ id, label, flag, timeZone }, index) => {
        let hhmm = '--:--';
        let ss = '--';
        let relativeDay = 'Today';
        let offsetStr = 'Local';
        let isNight = false;

        try {
          const hourStr = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: '2-digit',
            hour12: false,
          }).format(now);
          const hour = parseInt(hourStr, 10);
          isNight = hour < 6 || hour >= 18;

          const timeParts = new Intl.DateTimeFormat('en-GB', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }).formatToParts(now);

          let parsedHhmm = '';
          let parsedSs = '';
          timeParts.forEach(part => {
            if (part.type === 'hour') parsedHhmm += part.value;
            else if (part.type === 'literal' && parsedHhmm.length === 2 && parsedSs.length === 0) parsedHhmm += part.value;
            else if (part.type === 'minute') parsedHhmm += part.value;
            else if (part.type === 'second') parsedSs += part.value;
          });
          if (parsedHhmm) hhmm = parsedHhmm;
          if (parsedSs) ss = parsedSs;

          const localDayStr  = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(now);
          const targetDayStr = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
          relativeDay = localDayStr === targetDayStr ? 'Today' : targetDayStr;

          // Use the standards-compliant offset helper (fixes Firefox breakage)
          const diffHrs = getOffsetHours(timeZone);
          if (diffHrs === null || diffHrs === 0) {
            offsetStr = 'Local';
          } else {
            offsetStr = diffHrs > 0 ? `+${diffHrs}h` : `${diffHrs}h`;
          }
        } catch (e) {
          console.error('Error calculating timezone details:', e);
        }

        const accentColor = isNight ? '#a78bfa' : '#fbbf24';
        const glowColor   = isNight ? 'rgba(139, 92, 246, 0.25)' : 'rgba(251, 191, 36, 0.25)';

        return (
          <div
            key={id || index}
            className="clock-card"
            style={{
              '--clock-accent-color': accentColor,
              '--clock-glow-color': glowColor,
            }}
          >
            <div className="clock-avatar">{flag}</div>
            
            <div className="clock-info">
              <span className="clock-name">{label}</span>
              <div className="clock-meta-tags">
                <span className="clock-pill day-pill">{relativeDay}</span>
                <span className="clock-pill offset-pill">{offsetStr}</span>
              </div>
            </div>

            <div className="clock-time-group">
              <div className="clock-time-digits">
                <span className="clock-time-hhmm">{hhmm}</span>
                <span className="clock-time-ss">:{ss}</span>
              </div>
              
              <div className="clock-status-icon pulse" title={isNight ? 'Night' : 'Day'}>
                {isNight ? (
                  <Moon size={12} fill="#a78bfa" stroke="#a78bfa" />
                ) : (
                  <Sun size={12} fill="#fbbf24" stroke="#fbbf24" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GlobalClocks;
