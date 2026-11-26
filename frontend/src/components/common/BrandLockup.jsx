import { Logo } from './Display.jsx';
import LogoPair from './LogoPair.jsx';

/**
 * The landing page's brand block, shared by the navbar and the footer:
 *
 *   [DOrSU logo] [BS Agriculture logo]  |  [AgriCore icon] AgriCore
 *
 * The two round logo spots come from LogoPair (empty circles until the image
 * files exist in /images/logos/), so changing the logos or this order happens
 * in one place.
 *
 * @param {{ href?: string, onNavigate?: () => void, className?: string }} props
 *   href — when given, the AgriCore name links there (the navbar links to #home).
 */
export default function BrandLockup({ href, onNavigate, className = '' }) {
  const name = <Logo />;
  return (
    <div className={`brand-lockup ${className}`}>
      <LogoPair className="brand-lockup__logos" />
      <span className="brand-lockup__divider" aria-hidden="true" />
      {href ? (
        <a href={href} className="brand-lockup__name" onClick={onNavigate}>
          {name}
        </a>
      ) : (
        <span className="brand-lockup__name">{name}</span>
      )}
    </div>
  );
}
