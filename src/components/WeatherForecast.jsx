import React from 'react';
import { Droplet } from 'lucide-react';
import { useWeather } from '../context/WeatherContext';
import AnimatedWeatherIcon from './AnimatedWeatherIcon';

// Fixed: WeatherIcon moved outside WeatherForecast so React doesn't
// unmount/remount it on every parent re-render (was a new function ref each time).
const WeatherIcon = ({ condition }) => (
  <AnimatedWeatherIcon code={condition} size={24} />
);

const WeatherForecast = () => {
  const { forecast, loading } = useWeather();

  if (loading && forecast.length === 0) {
    return (
      <div className="glass-card forecast-container">
        <p>Loading forecast...</p>
      </div>
    );
  }

  return (
    <div className="glass-card forecast-container">
      <div className="forecast-days-row">
        {forecast.map((item, i) => (
          <div key={i} className="forecast-item">
            <span className="day">{item.day}</span>
            <div className="forecast-icon-badge">
              <WeatherIcon condition={item.condition} />
            </div>
            <div className="forecast-temp-range">
              <span className="forecast-temp-max">{item.tempMax}°</span>
              <span className="forecast-temp-divider">/</span>
              <span className="forecast-temp-min">{item.tempMin}°</span>
            </div>
            {item.rainChance !== null && item.rainChance >= 10 && (
              <div className="forecast-rain-chance" title="Precipitation">
                <Droplet size={10} fill="#38bdf8" />
                <span>
                  {item.rainChance}%
                  {item.rainVolume !== undefined && item.rainVolume !== null && ` · ${item.rainVolume}mm`}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherForecast;
