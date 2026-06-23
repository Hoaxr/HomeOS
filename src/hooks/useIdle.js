import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track if the user has been idle for a specified duration.
 * It listens to various interaction events to reset the idle timer.
 */
export function useIdle(timeoutMs = 300000) {
  const [isIdle, setIsIdle] = useState(false);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
  }, []);

  useEffect(() => {
    let timeoutId;

    const handleActivity = () => {
      resetTimer();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsIdle(true), timeoutMs);
    };

    // Set initial timeout
    timeoutId = setTimeout(() => setIsIdle(true), timeoutMs);

    // Add event listeners for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [timeoutMs, resetTimer]);

  return isIdle;
}
