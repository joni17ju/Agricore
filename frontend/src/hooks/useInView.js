import { useEffect, useRef, useState } from 'react';

/**
 * Tells you when an element has scrolled into view, once.
 *
 * Used for entrance animations, so it deliberately does not switch back off
 * when the element leaves again — a section that re-animates every time you
 * scroll past it is distracting rather than lively.
 *
 * Returns true immediately when IntersectionObserver is unavailable or the
 * reader has asked for reduced motion, so the content is never hidden behind
 * an animation that will not run.
 *
 * Triggers on any intersection with a slightly shortened viewport rather than
 * on a fraction of the element. A ratio would be the obvious choice, but it is
 * unreachable for an element taller than the viewport: a long section on a
 * phone in landscape can never be 15% visible, so it would stay hidden for
 * good. The negative bottom margin is what delays the trigger until the
 * element has genuinely come into view.
 *
 * @param {{ rootMargin?: string, threshold?: number }} options
 * @returns {[React.RefObject, boolean]} ref to attach, and whether it is in view
 */
export function useInView({ rootMargin = '0px 0px -10% 0px', threshold = 0 } = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsInView(true);
            // One-shot: stop watching as soon as it has been seen.
            observer.disconnect();
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return [ref, isInView];
}
