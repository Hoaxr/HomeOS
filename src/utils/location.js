// Default fallback location — Papendrecht, Netherlands
export const DEFAULT_LOCATION = { city: 'Papendrecht', lat: 51.83, lon: 4.68 };

/**
 * Resolves a valid location object from config.
 * Falls back to Papendrecht if lat/lon are missing, NaN, or invalid.
 */
export const resolveLocation = (config) => {
  const loc = config?.location;
  if (loc && isFinite(loc.lat) && isFinite(loc.lon) && loc.lat !== 0 && loc.lon !== 0) {
    return loc;
  }
  return DEFAULT_LOCATION;
};
