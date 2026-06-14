import { useState, useEffect } from 'react';

export const useLocationSearch = (initialQuery = '') => {
  const [locationSearch, setLocationSearch] = useState(initialQuery);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (locationSearch.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

    const delayDebounceId = setTimeout(async () => {
      setLocationLoading(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationSearch)}&count=5&language=en&format=json`);
        if (res.ok) {
          const json = await res.json();
          setLocationSuggestions(json.results || []);
        }
      } catch (err) {
        console.error('Geocoding failed:', err);
      } finally {
        setLocationLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceId);
  }, [locationSearch]);

  return {
    locationSearch,
    setLocationSearch,
    locationSuggestions,
    setLocationSuggestions,
    locationLoading
  };
};
