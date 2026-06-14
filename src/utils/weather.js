// Weather utility with mappings and fallback to wttr.in

/**
 * Maps World Weather Online (WWO) weather codes (used by wttr.in) to WMO codes (used by Open-Meteo).
 */
export const mapWwoToWmo = (wwoCode) => {
  const code = parseInt(wwoCode, 10);
  if (code === 113) return 0; // Clear
  if (code === 116) return 2; // Partly cloudy
  if (code === 119 || code === 122) return 3; // Overcast
  if (code === 143 || code === 248 || code === 251 || code === 260) return 45; // Fog
  if ([176, 263, 266, 293, 296].includes(code)) return 61; // Light rain/drizzle
  if ([302, 305, 353, 356].includes(code)) return 63; // Rain/showers
  if ([308, 359, 389].includes(code)) return 65; // Heavy rain
  if ([179, 227, 230, 323, 326, 329, 332, 335, 338, 368, 371, 395].includes(code)) return 73; // Snow
  if ([200, 386, 392].includes(code)) return 95; // Thunderstorm
  return 3; // Default to overcast / cloudy
};

/**
 * Parses wttr.in astronomy times ("05:26 AM") into Date objects.
 */
export const parseAstronomyTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return new Date();
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  
  const d = new Date(dateStr);
  d.setHours(hours, minutes, 0, 0);
  return d;
};
