import { useState, useEffect } from 'react';

/**
 * Hook to gently shift the screen to prevent OLED burn-in.
 * It randomly moves the content by a few pixels every minute.
 */
export function usePixelShift(intervalMs = 60000, maxShiftPx = 15) {
  const [shift, setShift] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const shiftInterval = setInterval(() => {
      // Generate random shift between -maxShiftPx and maxShiftPx
      const newX = Math.floor(Math.random() * (maxShiftPx * 2 + 1)) - maxShiftPx;
      const newY = Math.floor(Math.random() * (maxShiftPx * 2 + 1)) - maxShiftPx;
      setShift({ x: newX, y: newY });
    }, intervalMs);

    return () => clearInterval(shiftInterval);
  }, [intervalMs, maxShiftPx]);

  return shift;
}
