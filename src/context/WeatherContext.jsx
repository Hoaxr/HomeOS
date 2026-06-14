import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useConfig } from './ConfigContext';
import { resolveLocation } from '../utils/location';
import { mapWwoToWmo } from '../utils/weather';

const WeatherContext = createContext(null);

const WMO_TO_FORECAST_CONDITION = (code) => {
  if (code === 0) return 'Sunny';
  if (code <= 3) return 'Cloudy';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'Rain';
  return 'Cloudy';
};

export const WeatherProvider = ({ children }) => {
  const { config } = useConfig();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract primitives so useCallback dependency is stable (fix: was new object every render)
  const location = resolveLocation(config);
  const lat = location.lat;
  const lon = location.lon;

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    let weatherData = null;
    let forecastData = null;
    let aqiVal = null;
    let pollenVal = null;

    // 1. Fetch unified weather data from Open-Meteo
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m` +
        `&hourly=uv_index,precipitation_probability,cloud_cover` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum` +
        `&timezone=auto&forecast_days=7&past_days=3`;

      const res = await fetch(weatherUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.current && json.daily) {
          const nowHour = new Date().getHours();
          
          // Index 0, 1, 2 are past days. Slice(0, 3) gives the first 3 days (past days).
          const pastRainSum = json.daily.precipitation_sum?.slice(0, 3).reduce((a, b) => a + b, 0) ?? 0;

          // Hourly precipitation for today: hours 0-23 of the first forecast day (index 72 onward since past_days=3)
          const todayHourOffset = 3 * 24; // 3 past days × 24 hours
          const hourlyPrecip = json.hourly?.precipitation_probability
            ?.slice(todayHourOffset, todayHourOffset + 24) ?? [];
          const currentCloudCover = json.hourly?.cloud_cover?.[todayHourOffset + nowHour] ?? null;
          
          weatherData = {
            temperature_2m: json.current.temperature_2m,
            apparent_temperature: json.current.apparent_temperature,
            relative_humidity_2m: json.current.relative_humidity_2m,
            precipitation_probability: json.current.precipitation_probability,
            weather_code: json.current.weather_code,
            wind_speed_10m: json.current.wind_speed_10m,
            wind_direction_10m: json.current.wind_direction_10m ?? null,
            uv_index: json.hourly?.uv_index?.[todayHourOffset + nowHour] ?? null,
            past_rain_sum: pastRainSum,
            hourly_precipitation: hourlyPrecip,
            cloud_cover: currentCloudCover,
          };

          // Index 3 is today, index 3 to 7 are the 5 forecast days
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          forecastData = json.daily.time.slice(3, 8).map((t, i) => {
            const date = new Date(t);
            const actualIndex = i + 3; // Shift by 3 to skip past days
            return {
              day: i === 0 ? 'Today' : days[date.getDay()],
              tempMax: Math.round(json.daily.temperature_2m_max[actualIndex]),
              tempMin: Math.round(json.daily.temperature_2m_min[actualIndex]),
              condition: WMO_TO_FORECAST_CONDITION(json.daily.weather_code[actualIndex]),
              rainChance: json.daily.precipitation_probability_max ? json.daily.precipitation_probability_max[actualIndex] : null,
              rainVolume: json.daily.precipitation_sum ? json.daily.precipitation_sum[actualIndex] : 0
            };
          });
        }
      } else {
        throw new Error('Open-Meteo current & forecast failed: ' + res.status);
      }
    } catch (e) {
      console.warn('Weather fetch from Open-Meteo failed, attempting wttr.in fallback:', e);
    }

    // 2. Fallbacks
    // If Open-Meteo failed, use wttr.in to load both current weather and forecast
    if (!weatherData || !forecastData) {
      try {
        const res = await fetch(`https://wttr.in/${lat},${lon}?format=j1`);
        if (res.ok) {
          const json = await res.json();
          const current = json.current_condition?.[0];
          const hourly = json.weather?.[0]?.hourly;
          const nowHour = new Date().getHours();
          const closestIndex = Math.round(nowHour / 3) % 8;
          const hourlyItem = hourly?.[closestIndex] ?? hourly?.[0];

          if (current) {
            weatherData = {
              temperature_2m: parseFloat(current.temp_C),
              apparent_temperature: parseFloat(current.FeelsLikeC),
              relative_humidity_2m: parseInt(current.humidity, 10),
              precipitation_probability: parseInt(json.weather?.[0]?.hourly?.[0]?.chanceofrain ?? '0', 10),
              weather_code: mapWwoToWmo(current.weatherCode),
              wind_speed_10m: parseFloat(current.windspeedKmph),
              uv_index: hourlyItem ? parseFloat(hourlyItem.uvIndex) : parseFloat(current.uvIndex),
              past_rain_sum: 0,
            };
          }

          if (json.weather) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            forecastData = json.weather.slice(0, 5).map((w, i) => {
              const date = new Date(w.date);
              const noonCode = w.hourly?.[4]?.weatherCode ?? w.hourly?.[0]?.weatherCode;
              return {
                day: i === 0 ? 'Today' : days[date.getDay()],
                tempMax: Math.round(parseFloat(w.maxtempC)),
                tempMin: Math.round(parseFloat(w.mintempC)),
                condition: WMO_TO_FORECAST_CONDITION(mapWwoToWmo(noonCode)),
                rainChance: null
              };
            });
          }
        }
      } catch (e) {
        console.error('wttr.in fallback failed:', e);
      }
    }

    // If forecast is still empty, attempt 7timer fallback
    if (!forecastData) {
      try {
        const res = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
        if (res.ok) {
          const json = await res.json();
          if (json.dataseries) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            forecastData = json.dataseries.slice(0, 5).map((w, i) => {
              const dateStr = w.date.toString();
              const year = parseInt(dateStr.substring(0, 4), 10);
              const month = parseInt(dateStr.substring(4, 6), 10) - 1;
              const dayVal = parseInt(dateStr.substring(6, 8), 10);
              const date = new Date(year, month, dayVal);
              
              const map7TimerCondition = (weatherStr) => {
                const str = weatherStr.toLowerCase();
                if (str.includes('clear') || str.includes('sunny')) return 'Sunny';
                if (str.includes('rain') || str.includes('shower') || str.includes('snow') || str.includes('ts') || str.includes('storm')) return 'Rain';
                return 'Cloudy';
              };

              return {
                day: i === 0 ? 'Today' : days[date.getDay()],
                tempMax: Math.round(w.temp2m.max),
                tempMin: Math.round(w.temp2m.min),
                condition: map7TimerCondition(w.weather),
                rainChance: null
              };
            });
          }
        }
      } catch (err) {
        console.error('7timer fallback failed:', err);
      }
    }

    // 3. Fetch AQI and Pollen — only if weather data was successfully retrieved (fix: was firing even when offline)
    if (weatherData) {
      try {
        const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality` +
          `?latitude=${lat}&longitude=${lon}` +
          `&current=european_aqi` +
          `&hourly=grass_pollen,birch_pollen,alder_pollen,mugwort_pollen,ragweed_pollen` +
          `&timezone=auto&forecast_days=1`;

        const res = await fetch(airQualityUrl);
        if (res.ok) {
          const json = await res.json();
          aqiVal = json.current?.european_aqi ?? null;

          if (json.hourly) {
            const h = json.hourly;
            const nowHour = new Date().getHours();
            pollenVal = {
              grass: h.grass_pollen?.[nowHour] ?? 0,
              trees: Math.max(h.birch_pollen?.[nowHour] ?? 0, h.alder_pollen?.[nowHour] ?? 0),
              weeds: Math.max(h.mugwort_pollen?.[nowHour] ?? 0, h.ragweed_pollen?.[nowHour] ?? 0),
            };
          }
        }
      } catch (e) {
        console.warn('AQI and Pollen fetch failed:', e);
      }

      // Combine current weather, AQI, and pollen
      setWeather({
        ...weatherData,
        aqi: aqiVal,
        pollen: pollenVal,
      });
      setError(null);
    } else {
      setError('Could not fetch weather data');
    }

    if (forecastData) {
      setForecast(forecastData);
    }

    setLoading(false);
  }, [lat, lon]);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, [fetchWeather]);

  return (
    <WeatherContext.Provider value={{ weather, forecast, loading, error, refetch: fetchWeather }}>
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};
