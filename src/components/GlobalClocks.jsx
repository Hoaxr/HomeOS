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

          const localDayStr = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(now);
          const targetDayStr = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
          relativeDay = localDayStr === targetDayStr ? 'Today' : targetDayStr;

          const localTime = new Date(now.toLocaleString('en-US', { timeZone: undefined }));
          const targetTime = new Date(now.toLocaleString('en-US', { timeZone }));
          const diffMs = targetTime - localTime;
          const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
          if (diffHrs === 0) {
            offsetStr = 'Local';
          } else {
            offsetStr = diffHrs > 0 ? `+${diffHrs}h` : `${diffHrs}h`;
          }
        } catch (e) {
          console.error('Error calculating timezone details:', e);
        }

        const accentColor = isNight ? '#a78bfa' : '#fbbf24';
        const glowColor = isNight ? 'rgba(139, 92, 246, 0.25)' : 'rgba(251, 191, 36, 0.25)';

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

