import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animate a number from its previous value (or `from`) to `target`. */
export function useCountUp(target, { duration = 900, from = 0 } = {}) {
  const [value, setValue] = useState(from);
  const previous = useRef(from);

  useEffect(() => {
    const start = previous.current;
    const end = Number(target) || 0;
    if (start === end || prefersReducedMotion()) {
      previous.current = end;
      setValue(end);
      return undefined;
    }

    let frame;
    const startedAt = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else previous.current = end;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      previous.current = end;
    };
  }, [target, duration]);

  return value;
}
