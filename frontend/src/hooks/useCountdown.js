import { useEffect, useRef, useState } from 'react';

/**
 * Countdown timer in whole seconds.
 * Calls `onExpire` once when it reaches zero. Pause by passing `isRunning: false`.
 */
export function useCountdown(totalSeconds, { isRunning = true, onExpire } = {}) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (!isRunning || !totalSeconds) return undefined;
    const interval = setInterval(() => {
      setRemaining((seconds) => {
        if (seconds <= 1) {
          clearInterval(interval);
          setTimeout(() => onExpireRef.current?.(), 0);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, totalSeconds]);

  return remaining;
}
