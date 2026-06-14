import React, { useState, useEffect } from 'react';
import { Moon } from 'lucide-react';
import { getMoonPhase, scheduleMoonRefresh, MoonVisual } from '../utils/moon';

const MoonPhase = () => {
  const [moon, setMoon] = useState(() => getMoonPhase());

  useEffect(() => {
    // Schedule recalculation at midnight, then every 24 h.
    // scheduleMoonRefresh returns a cleanup that clears both the
    // initial timeout AND the daily interval — fixing the leak where
    // the inner interval cleanup was previously unreachable.
    return scheduleMoonRefresh(setMoon);
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
          <MoonVisual illumination={moon.illumination} isWaxing={moon.isWaxing} uid="moonphase-main" />
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
              <MoonVisual illumination={moon.illumination} isWaxing={moon.isWaxing} size={26} uid="moonphase-sm" />
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
