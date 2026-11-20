import { useEffect, useState } from 'react';

/**
 * Whether the tab is currently visible. Lets ambient, looping animations be
 * paused while nobody can see them.
 *
 * @returns {boolean}
 */
export function usePageVisible() {
  const [isVisible, setIsVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');

  useEffect(() => {
    const onChange = () => setIsVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return isVisible;
}
