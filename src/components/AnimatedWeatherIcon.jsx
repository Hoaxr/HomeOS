import React from 'react';

const AnimatedWeatherIcon = ({ code, size = 48, className = '' }) => {
  // Normalize string codes to numbers or handle directly
  let wmoCode = typeof code === 'number' ? code : null;
  
  if (typeof code === 'string') {
    const lower = code.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) wmoCode = 0;
    else if (lower.includes('partly')) wmoCode = 2;
    else if (lower.includes('rain') || lower.includes('shower') || lower.includes('drizzle')) wmoCode = 63;
    else if (lower.includes('snow')) wmoCode = 73;
    else if (lower.includes('storm') || lower.includes('thunder')) wmoCode = 95;
    else if (lower.includes('fog') || lower.includes('mist')) wmoCode = 45;
    else wmoCode = 3; // default to cloudy
  }

  // Choose the SVG based on WMO code
  if (wmoCode === 0 || wmoCode === 1) {
    // Sunny / Clear sky
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} className={`animated-weather-icon ${className}`}>
        <defs>
          <linearGradient id="sun-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffb300" />
            <stop offset="100%" stopColor="#f4511e" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="14" fill="url(#sun-grad)" />
        <g fill="none" stroke="url(#sun-grad)" strokeWidth="3.5" strokeLinecap="round">
          <line x1="32" y1="6" x2="32" y2="12" />
          <line x1="32" y1="52" x2="32" y2="58" />
          <line x1="6" y1="32" x2="12" y2="32" />
          <line x1="52" y1="32" x2="58" y2="32" />
          <line x1="13.62" y1="13.62" x2="17.86" y2="17.86" />
          <line x1="46.14" y1="46.14" x2="50.38" y2="50.38" />
          <line x1="13.62" y1="50.38" x2="17.86" y2="46.14" />
          <line x1="46.14" y1="17.86" x2="50.38" y2="13.62" />
          <animateTransform 
            attributeName="transform" 
            type="rotate" 
            from="0 32 32" 
            to="360 32 32" 
            dur="30s" 
            repeatCount="indefinite" 
          />
        </g>
      </svg>
    );
  }

  if (wmoCode === 2) {
    // Partly cloudy
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} className={`animated-weather-icon ${className}`}>
        <defs>
          <linearGradient id="sun-grad-pc" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffb300" />
            <stop offset="100%" stopColor="#f4511e" />
          </linearGradient>
          <linearGradient id="cloud-grad-pc" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#8693a1" />
          </linearGradient>
        </defs>
        <g>
          <circle cx="26" cy="26" r="10" fill="url(#sun-grad-pc)" />
          <g fill="none" stroke="url(#sun-grad-pc)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="26" y1="6" x2="26" y2="10" />
            <line x1="26" y1="42" x2="26" y2="46" />
            <line x1="6" y1="26" x2="10" y2="26" />
            <line x1="42" y1="26" x2="46" y2="26" />
            <line x1="12.5" y1="12.5" x2="15.5" y2="15.5" />
            <line x1="36.5" y1="36.5" x2="39.5" y2="39.5" />
            <line x1="12.5" y1="39.5" x2="15.5" y2="36.5" />
            <line x1="36.5" y1="15.5" x2="39.5" y2="12.5" />
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              from="0 26 26" 
              to="360 26 26" 
              dur="30s" 
              repeatCount="indefinite" 
            />
          </g>
        </g>
        <path d="M 44 46 C 49 46 53 42 53 37 C 53 32 49 28 44 28 C 43.5 28 43 28 42.5 28.2 C 40.5 24 36 21 31 21 C 24.5 21 19 26 19 32.5 C 19 33.2 19 34 19.2 34.7 C 16.5 35.8 15 38.5 15 41 C 15 44 17.5 46 21 46 Z" 
              fill="url(#cloud-grad-pc)" className="anim-cloud" />
      </svg>
    );
  }

  if (wmoCode === 45 || wmoCode === 48) {
    // Foggy
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} className={`animated-weather-icon ${className}`}>
        <defs>
          <linearGradient id="cloud-fog" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b0bec5" />
          </linearGradient>
        </defs>
        <path d="M 46 42 C 50.4 42 54 38.4 54 34 C 54 29.6 50.4 26 46 26 C 45.5 26 45.1 26 44.6 26.2 C 42.8 22.4 38.8 19.7 34.3 19.7 C 28.4 19.7 23.5 24.2 23.5 30.1 C 23.5 30.7 23.5 31.4 23.7 32 C 21.2 33 19.8 35.4 19.8 37.7 C 19.8 40.4 22.1 42 25.3 42 Z" 
              fill="url(#cloud-fog)" className="anim-cloud-fog" />
        <g stroke="#cfd8dc" strokeWidth="3" strokeLinecap="round">
          <line x1="16" y1="48" x2="48" y2="48" className="anim-fog-line-1" />
          <line x1="22" y1="54" x2="42" y2="54" className="anim-fog-line-2" />
        </g>
      </svg>
    );
  }

  if (wmoCode === 51 || wmoCode === 53 || wmoCode === 55) {
    // Drizzle
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} className={`animated-weather-icon ${className}`}>
        <defs>
          <linearGradient id="cloud-drizzle" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#90a4ae" />
          </linearGradient>
        </defs>
        <path d="M 46 38 C 50.4 38 54 34.4 54 30 C 54 25.6 50.4 22 46 22 C 45.5 22 45.1 22 44.6 22.2 C 42.8 18.4 38.8 15.7 34.3 15.7 C 28.4 15.7 23.5 20.2 23.5 26.1 C 23.5 26.7 23.5 27.4 23.7 28 C 21.2 29 19.8 31.4 19.8 33.7 C 19.8 36.4 22.1 38 25.3 38 Z" 
              fill="url(#cloud-drizzle)" className="anim-cloud" />
        <g stroke="#90caf9" strokeWidth="2.5" strokeLinecap="round">
          <line x1="26" y1="44" x2="26" y2="48" className="anim-drizzle-1" />
          <line x1="34" y1="44" x2="34" y2="48" className="anim-drizzle-2" />
          <line x1="42" y1="44" x2="42" y2="48" className="anim-drizzle-3" />
        </g>
      </svg>
    );
  }

  if (wmoCode === 71 || wmoCode === 73 || wmoCode === 75) {
    // Snow
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} className={`animated-weather-icon ${className}`}>
        <defs>
          <linearGradient id="cloud-snow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b0bec5" />
          </linearGradient>
        </defs>
        <path d="M 46 38 C 50.4 38 54 34.4 54 30 C 54 25.6 50.4 22 46 22 C 45.5 22 45.1 22 44.6 22.2 C 42.8 18.4 38.8 15.7 34.3 15.7 C 28.4 15.7 23.5 20.2 23.5 26.1 C 23.5 26.7 23.5 27.4 23.7 28 C 21.2 29 19.8 31.4 19.8 33.7 C 19.8 36.4 22.1 38 25.3 38 Z" 
              fill="url(#cloud-snow)" className="anim-cloud" />
        <g fill="#ffffff">
          <circle cx="25" cy="46" r="2.5" className="anim-snow-1" />
          <circle cx="34" cy="48" r="2.5" className="anim-snow-2" />
          <circle cx="43" cy="45" r="2.5" className="anim-snow-3" />
        </g>
      </svg>
    );
  }

  if (wmoCode === 95 || wmoCode === 96) {
    // Thunderstorm
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} className={`animated-weather-icon ${className}`}>
        <defs>
          <linearGradient id="cloud-thunder" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#78909c" />
            <stop offset="100%" stopColor="#37474f" />
          </linearGradient>
          <linearGradient id="lightning-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff176" />
            <stop offset="100%" stopColor="#fbc02d" />
          </linearGradient>
        </defs>
        <path d="M 46 38 C 50.4 38 54 34.4 54 30 C 54 25.6 50.4 22 46 22 C 45.5 22 45.1 22 44.6 22.2 C 42.8 18.4 38.8 15.7 34.3 15.7 C 28.4 15.7 23.5 20.2 23.5 26.1 C 23.5 26.7 23.5 27.4 23.7 28 C 21.2 29 19.8 31.4 19.8 33.7 C 19.8 36.4 22.1 38 25.3 38 Z" 
              fill="url(#cloud-thunder)" className="anim-cloud" />
        <g stroke="#37474f" strokeWidth="2" strokeLinecap="round">
          <line x1="24" y1="44" x2="22" y2="49" className="anim-rain-1" style={{ animationDuration: '0.8s' }} />
          <line x1="42" y1="44" x2="40" y2="49" className="anim-rain-3" style={{ animationDuration: '0.8s' }} />
        </g>
        <path d="M 33 36 L 27 46 L 32 46 L 29 56 L 39 44 L 33 44 Z" fill="url(#lightning-grad)" className="anim-lightning" />
      </svg>
    );
  }

  // Rain / Showers (codes 61, 63, 65, 80, 81, 82)
  if (wmoCode >= 61 && wmoCode <= 82) {
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} className={`animated-weather-icon ${className}`}>
        <defs>
          <linearGradient id="cloud-rain" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#78909c" />
          </linearGradient>
        </defs>
        <path d="M 46 38 C 50.4 38 54 34.4 54 30 C 54 25.6 50.4 22 46 22 C 45.5 22 45.1 22 44.6 22.2 C 42.8 18.4 38.8 15.7 34.3 15.7 C 28.4 15.7 23.5 20.2 23.5 26.1 C 23.5 26.7 23.5 27.4 23.7 28 C 21.2 29 19.8 31.4 19.8 33.7 C 19.8 36.4 22.1 38 25.3 38 Z" 
              fill="url(#cloud-rain)" className="anim-cloud" />
        <g stroke="#29b6f6" strokeWidth="3" strokeLinecap="round">
          <line x1="25" y1="44" x2="22" y2="52" className="anim-rain-1" />
          <line x1="33" y1="44" x2="30" y2="52" className="anim-rain-2" />
          <line x1="41" y1="44" x2="38" y2="52" className="anim-rain-3" />
        </g>
      </svg>
    );
  }

  // Overcast / Cloudy / Default (e.g. code 3)
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`animated-weather-icon ${className}`}>
      <defs>
        <linearGradient id="cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bcc5cf" />
          <stop offset="100%" stopColor="#718096" />
        </linearGradient>
        <linearGradient id="cloud-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#a0aec0" />
        </linearGradient>
      </defs>
      <path d="M 38 38 C 42.5 38 46.1 34.4 46.1 29.9 C 46.1 25.4 42.5 21.8 38 21.8 C 37.5 21.8 37.1 21.8 36.6 22 C 34.8 18.2 30.8 15.5 26.3 15.5 C 20.4 15.5 15.5 20 15.5 25.9 C 15.5 26.5 15.5 27.2 15.7 27.8 C 13.2 28.8 11.8 31.2 11.8 33.5 C 11.8 36.2 14.1 38 17.3 38 Z" 
            fill="url(#cloud-back)" className="anim-cloud-back" />
      <path d="M 46 48 C 50.4 48 54 44.4 54 40 C 54 35.6 50.4 32 46 32 C 45.5 32 45.1 32 44.6 32.2 C 42.8 28.4 38.8 25.7 34.3 25.7 C 28.4 25.7 23.5 30.2 23.5 36.1 C 23.5 36.7 23.5 37.4 23.7 38 C 21.2 39 19.8 41.4 19.8 43.7 C 19.8 46.4 22.1 48 25.3 48 Z" 
            fill="url(#cloud-front)" className="anim-cloud-front" />
    </svg>
  );
};

export default AnimatedWeatherIcon;
