import React from 'react';
import { Thermometer, Droplets, Umbrella, Wind, Sun, Activity, Shield, Shirt, Bike } from 'lucide-react';
import { useWeather } from '../context/WeatherContext';
import AnimatedWeatherIcon from './AnimatedWeatherIcon';

// ── Precipitation Bar Chart ───────────────────────────────────────────────────
const PrecipChart = ({ data }) => {
  const now = new Date().getHours();
  if (!data || data.length === 0) return null;

  const getBarColor = (val) => {
    if (val >= 70) return '#3b82f6';
    if (val >= 40) return '#60a5fa';
    if (val >= 20) return '#93c5fd';
    return 'rgba(255,255,255,0.12)';
  };

  return (
    <div className="precip-chart-wrap">
      <span className="cw-section-title">Rain probability</span>
      <div className="precip-bars">
        {data.map((val, i) => (
          <div key={i} className="precip-bar-col">
            <div
              className={`precip-bar ${i === now ? 'precip-bar-now' : ''}`}
              style={{ height: `${Math.max(3, val)}%`, background: getBarColor(val) }}
            />
            {(i % 6 === 0) && (
              <span className="precip-hour-label">{String(i).padStart(2,'0')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const WMO_DESCRIPTIONS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Showers', 81: 'Rain showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm w/ hail',
};

const POLLEN_LEVELS = [
  { max: 0,        label: 'None',      color: '#64748b' },
  { max: 10,       label: 'Low',       color: '#22c55e' },
  { max: 30,       label: 'Moderate',  color: '#f59e0b' },
  { max: 80,       label: 'High',      color: '#ef4444' },
  { max: Infinity, label: 'Very High', color: '#a855f7' },
];

const getPollenLevel = (value) =>
  POLLEN_LEVELS.find((l) => (value ?? 0) <= l.max) ?? POLLEN_LEVELS.at(-1);

const getAqiLabel = (v) => {
  if (v === null) return '—';
  if (v <= 20) return 'Good';
  if (v <= 40) return 'Fair';
  if (v <= 60) return 'Moderate';
  if (v <= 80) return 'Poor';
  return 'Very Poor';
};

const getAqiColor = (v) => {
  if (v === null) return 'var(--text-secondary)';
  if (v <= 20) return '#22c55e';
  if (v <= 40) return '#a3e635';
  if (v <= 60) return '#f59e0b';
  if (v <= 80) return '#ef4444';
  return '#a855f7';
};

// Fixed: added null-guard — value can be null/undefined from the AQI API
const PollenRow = ({ label, value }) => {
  const safeValue = value ?? 0;
  const level = getPollenLevel(safeValue);
  return (
    <div className="cw-pollen-row">
      <span className="cw-pollen-label">{label}</span>
      <span className="cw-pollen-value" style={{ color: level.color }}>
        {level.label} ({safeValue.toFixed(1)})
      </span>
    </div>
  );
};

const CurrentWeather = () => {
  const { weather, loading } = useWeather();

  const wearShorts = weather && (weather.temperature_2m >= 18 && (weather.precipitation_probability ?? 0) < 20);

  let canDirtbike = false;
  let dirtbikeReason = '';
  if (weather) {
    const isRainingNow = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96].includes(weather.weather_code);
    const isTooWetCurrent = isRainingNow || (weather.precipitation_probability ?? 0) >= 20 || (weather.relative_humidity_2m ?? 0) > 85;
    const isTooWetPast = weather.past_rain_sum !== undefined ? weather.past_rain_sum > 2.0 : false;
    canDirtbike = !isTooWetCurrent && !isTooWetPast;

    if (isRainingNow) dirtbikeReason = 'MCV de Belt: Currently raining';
    else if ((weather.precipitation_probability ?? 0) >= 20) dirtbikeReason = 'MCV de Belt: High risk of rain';
    else if ((weather.relative_humidity_2m ?? 0) > 85) dirtbikeReason = 'MCV de Belt: Too humid to dry';
    else if (isTooWetPast) dirtbikeReason = `MCV de Belt: Rain in past 3 days (${weather.past_rain_sum.toFixed(1)}mm)`;
    else dirtbikeReason = 'MCV de Belt: Conditions are dry';
  }

  return (
    <div className="glass-card current-weather-card">
      <div className="card-header">
        <div className="title">
          <Thermometer size={20} className="icon" />
          <span>Today</span>
        </div>
        {loading && <div className="loading-small" />}
      </div>

      {weather ? (
        <>
          <div className="today-body-split">
            <div className="today-left-col">
              <div className="cw-main">
                <AnimatedWeatherIcon code={weather.weather_code} size={56} />
                <div className="cw-temps">
                  <span className="cw-temp">{Math.round(weather.temperature_2m)}°C</span>
                  <span className="cw-feels">Feels {Math.round(weather.apparent_temperature)}°C</span>
                </div>
              </div>
              <p className="cw-desc">{WMO_DESCRIPTIONS[weather.weather_code] ?? 'Unknown'}</p>
            </div>
            <div className="today-right-col">
              <div className="cw-stats">
                <div className="cw-stat">
                  <Droplets size={14} style={{ color: '#38bdf8' }} />
                  <span>{weather.relative_humidity_2m}%</span>
                  <span className="cw-stat-label">Humidity</span>
                </div>
                <div className="cw-stat">
                  <Umbrella size={14} style={{ color: '#60a5fa' }} />
                  <span>{weather.precipitation_probability ?? 0}%</span>
                  <span className="cw-stat-label">Rain</span>
                </div>
                <div className="cw-stat">
                  <Wind size={14} style={{ color: '#38bdf8' }} />
                  <span>{Math.round(weather.wind_speed_10m)} km/h</span>
                  <span className="cw-stat-label">Wind</span>
                </div>
                <div className="cw-stat">
                  <Sun size={14} style={{ color: '#fbbf24' }} />
                  <span>{weather.uv_index !== null ? weather.uv_index.toFixed(1) : '—'}</span>
                  <span className="cw-stat-label">UV Index</span>
                </div>
                {weather.aqi !== null && (
                  <div className="cw-stat">
                    <Activity size={14} style={{ color: getAqiColor(weather.aqi) }} />
                    <span>{weather.aqi} AQI</span>
                    <span className="cw-stat-label">{getAqiLabel(weather.aqi)}</span>
                  </div>
                )}
                <div className="cw-stat">
                  <Shield size={14} style={{ color: weather.uv_index !== null && weather.uv_index >= 3 ? '#fbbf24' : '#94a3b8' }} />
                  <span>{weather.uv_index !== null && weather.uv_index >= 3 ? 'Yes' : 'No'}</span>
                  <span className="cw-stat-label">Sunscreen</span>
                </div>
                <div className="cw-stat">
                  <Shirt size={14} style={{ color: wearShorts ? '#22c55e' : '#94a3b8' }} />
                  <span style={{ color: wearShorts ? '#22c55e' : 'inherit' }}>{wearShorts ? 'Yes' : 'No'}</span>
                  <span className="cw-stat-label">Shorts</span>
                </div>
                <div className="cw-stat" title={dirtbikeReason}>
                  <Bike size={14} style={{ color: canDirtbike ? '#22c55e' : '#ef4444' }} />
                  <span style={{ color: canDirtbike ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
                    {canDirtbike ? 'Yes' : 'Too Wet'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {weather.pollen && (
            <div className="cw-pollen-bottom">
              <span className="cw-section-title">Pollen Count</span>
              <div className="cw-pollen-horizontal">
                <PollenRow label="🌾 Grass" value={weather.pollen.grass} />
                <PollenRow label="🌲 Trees" value={weather.pollen.trees} />
                <PollenRow label="🌿 Weeds" value={weather.pollen.weeds} />
              </div>
            </div>
          )}
          {weather.hourly_precipitation?.length > 0 && (
            <PrecipChart data={weather.hourly_precipitation} />
          )}
        </>
      ) : (
        !loading && <p className="status-msg">No data</p>
      )}
    </div>
  );
};

export default CurrentWeather;
