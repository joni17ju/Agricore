import { useState } from 'react';

/**
 * The two institutional logos — Davao Oriental State University and the
 * BS Agriculture department — as two small round spots, side by side.
 *
 * Drop the image files into frontend/public/images/logos/ with these exact
 * names and they appear everywhere this component is used. Until then each
 * spot is an empty outlined circle: a missing file never shows a broken-image
 * icon. Each spot has a fixed size, so nothing shifts when an image loads.
 */
const LOGOS = [
  { key: 'dorsu', src: '/images/logos/dorsu-logo.png', alt: 'Davao Oriental State University logo' },
  { key: 'bsagri', src: '/images/logos/bsagri-logo.png', alt: 'BS Agriculture department logo' },
];

// Remembered for the session, so a missing file is requested once, not on every page.
const known = new Map();

function LogoSpot({ src, alt }) {
  const [state, setState] = useState(() => known.get(src) ?? 'loading');
  const settle = (next) => {
    known.set(src, next);
    setState(next);
  };

  return (
    <span className={`logo-spot is-${state}`}>
      {state !== 'missing' && (
        <img
          src={src}
          alt={alt}
          width="48"
          height="48"
          decoding="async"
          fetchPriority="low"
          onLoad={() => settle('ok')}
          onError={() => settle('missing')}
        />
      )}
    </span>
  );
}

/** @param {{ className?: string, size?: 'md'|'sm', tone?: 'paper'|'dark' }} props */
export default function LogoPair({ className = '', size = 'md', tone = 'paper' }) {
  return (
    <span className={`logo-pair logo-pair--${size} logo-pair--${tone} ${className}`}>
      {LOGOS.map((logo) => (
        <LogoSpot key={logo.key} src={logo.src} alt={logo.alt} />
      ))}
    </span>
  );
}
