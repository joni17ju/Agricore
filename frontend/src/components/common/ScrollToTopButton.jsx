import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * How far down the button appears.
 *
 * A full viewport height reads well in theory, but most AgriCore pages are
 * only 1.2–1.9 screens tall, so their entire scroll range is shorter than that
 * and the button would never show. 320px is roughly "scrolled well past the
 * fold" on this layout: short pages (a barely-scrolling dashboard) never
 * reveal it, while the long ones — leaderboard, performance, achievements,
 * lesson content, long tables — do. The viewport factor only matters on very
 * short viewports, where 320px would be most of the page.
 */
const REVEAL_AT = () => Math.min(window.innerHeight * 0.6, 320);

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Floating "back to top" button, mounted once in AppShell so every role and
 * page gets it. The document itself scrolls (the topbar is sticky, not a
 * separate scroll container), so this listens on window.
 */
export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const frameRef = useRef(0);
  const buttonRef = useRef(null);

  useEffect(() => {
    const update = () => {
      frameRef.current = 0;
      setIsVisible(window.scrollY > REVEAL_AT());
    };
    // Scroll fires far more often than paint, so coalesce into one frame.
    const onScroll = () => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    // The button is about to fade out, so don't leave focus on it.
    buttonRef.current?.blur();
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`scroll-top ${isVisible ? 'is-visible' : ''}`}
      onClick={scrollToTop}
      title="Back to top"
      aria-label="Back to top"
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
    >
      <Icon name="chevron-up" size={22} />
    </button>
  );
}
