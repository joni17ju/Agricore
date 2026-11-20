import { useEffect, useState } from 'react';

/**
 * The id of the page section currently in the middle of the viewport, for
 * highlighting the matching in-page nav link. Null until one is found, and
 * always null without IntersectionObserver (the links simply stay plain).
 *
 * The root margin narrows the viewport to a band around its middle, so
 * exactly one section counts as "current" at a time.
 *
 * @param {string[]} ids section element ids, in page order
 * @returns {string|null}
 */
export function useActiveSection(ids) {
  const [active, setActive] = useState(null);
  const key = ids.join(',');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const nodes = key.split(',').map((id) => document.getElementById(id)).filter(Boolean);
    if (nodes.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [key]);

  return active;
}
