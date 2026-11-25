/**
 * Small display components: status pills, XP pill, count-up numbers, avatars,
 * stat tiles, empty/loading/error states and page headers.
 */
import { Link } from 'react-router-dom';
import { useCountUp } from '../../hooks/useCountUp.js';
import Button from './Button.jsx';
import Icon from './Icon.jsx';

export function StatusPill({ tone = 'neutral', icon, children, className = '' }) {
  return (
    <span className={`pill pill--${tone} ${className}`}>
      {icon && <Icon name={icon} size={14} strokeWidth={2.2} />}
      {children}
    </span>
  );
}

export function CountUp({ value, duration, format = (n) => n.toLocaleString() }) {
  const displayed = useCountUp(value, { duration });
  return <>{format(displayed)}</>;
}

export function XPPill({ xp, prefix = '', animate = true, className = '' }) {
  return (
    <span className={`xp-pill ${className}`}>
      <Icon name="star" size={15} strokeWidth={2.2} />
      {prefix}
      {animate ? <CountUp value={xp} /> : xp.toLocaleString()} XP
    </span>
  );
}

const AVATAR_TONES = ['green', 'teal', 'amber', 'blue', 'rose', 'olive'];

/**
 * Initials avatar, or the user's uploaded picture when `src` is given.
 * `src` is the user record's optional avatarUrl (a data URL in the prototype);
 * without it this falls back to the coloured initials exactly as before.
 */
export function Avatar({ firstName = '', lastName = '', size = 36, className = '', src = null }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const tone = AVATAR_TONES[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_TONES.length];
  if (src) {
    return (
      <img
        // Keyed on the src so a newly picked picture fades in instead of swapping.
        key={src}
        src={src}
        alt=""
        className={`avatar avatar--photo ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className={`avatar avatar--${tone} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function StatTile({ label, value, icon, tone = 'green', suffix = '', hint, index = 0 }) {
  return (
    <div className={`stat-tile stat-tile--${tone} anim-fade-up`} style={{ '--i': index }}>
      {icon && (
        <span className="stat-tile__icon">
          <Icon name={icon} size={20} />
        </span>
      )}
      <div>
        <div className="stat-tile__value">
          {typeof value === 'number' ? <CountUp value={value} /> : value}
          {suffix}
        </div>
        <div className="stat-tile__label">{label}</div>
        {hint && <div className="stat-tile__hint">{hint}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'leaf', title, message, action }) {
  return (
    <div className="empty-state anim-fade-in">
      <span className="empty-state__icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      {message && <p className="text-muted">{message}</p>}
      {action}
    </div>
  );
}

/**
 * The app's one loading animation: a sprout whose stem grows and whose two
 * leaves unfold, then starts again. Pure SVG and CSS, in forest green on the
 * paper background. With reduced motion it is a still sprout.
 */
export function SproutLoader({ size = 44 }) {
  return (
    <svg className="sprout-loader" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path className="sprout-loader__soil" d="M10 41.5h28" />
      <path className="sprout-loader__stem" d="M24 41V20" pathLength="1" />
      <path className="sprout-loader__leaf sprout-loader__leaf--right" d="M24 24c0-7 4.6-11.5 12-11.5 0 7.8-4.6 11.8-12 11.5Z" />
      <path className="sprout-loader__leaf sprout-loader__leaf--left" d="M24 30c0-6-3.9-9.6-10-9.6 0 6.6 3.9 10 10 9.6Z" />
    </svg>
  );
}

export function LoadingState({ label = 'Loading…', compact = false }) {
  return (
    <div className={`loading-state ${compact ? 'loading-state--compact' : ''}`} role="status" aria-live="polite">
      <SproutLoader size={compact ? 30 : 44} />
      <span>{label}</span>
    </div>
  );
}

/** Full-height loader for first load and route changes. */
export function PageLoader({ label = 'Loading AgriCore…', children }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <SproutLoader size={56} />
      <span className="page-loader__label">{label}</span>
      {children}
    </div>
  );
}

/**
 * Placeholders shaped like what is coming: `cards` for a grid of cards,
 * `list` for rows (leaderboards, tables), `page` for a header with both.
 */
export function SkeletonBlock({ variant = 'list', rows = 5, label = 'Loading' }) {
  const items = Array.from({ length: rows }, (_, index) => index);
  return (
    <div className={`skeleton-block skeleton-block--${variant}`} role="status" aria-label={label}>
      {variant === 'page' && (
        <div className="skeleton-block__head">
          <span className="skeleton" style={{ width: '38%', height: '1.6em' }} />
          <span className="skeleton" style={{ width: '58%' }} />
        </div>
      )}
      {(variant === 'cards' || variant === 'page') && (
        <div className="skeleton-block__cards">
          {items.slice(0, variant === 'page' ? 3 : rows).map((i) => (
            <div key={i} className="skeleton-block__card">
              <span className="skeleton" style={{ width: '45%' }} />
              <span className="skeleton" style={{ width: '80%', height: '1.4em' }} />
              <span className="skeleton" style={{ width: '65%' }} />
            </div>
          ))}
        </div>
      )}
      {(variant === 'list' || variant === 'page') && (
        <div className="skeleton-block__list">
          {items.map((i) => (
            <div key={i} className="skeleton-block__row">
              <span className="skeleton skeleton--circle" />
              <span className="skeleton" style={{ width: `${70 - ((i * 13) % 30)}%` }} />
              <span className="skeleton" style={{ width: '14%', marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Placeholder bar for a value that has not arrived yet.
 *
 * For cells whose data loads separately from the rows around them: rendering
 * the eventual empty value ("—", 0%) makes a still-loading table look like a
 * table with missing data. `width` is any CSS length.
 */
export function Skeleton({ width = '100%', label = 'Loading' }) {
  return <span className="skeleton" style={{ width }} role="status" aria-label={label} />;
}

export function ErrorState({ error, onRetry, backTo }) {
  const isLocked = error?.status === 403;
  return (
    <div className="empty-state anim-fade-in">
      <span className={`empty-state__icon ${isLocked ? '' : 'empty-state__icon--error'}`}>
        <Icon name={isLocked ? 'lock' : 'alert'} size={28} />
      </span>
      <h3>{isLocked ? 'Not available yet' : 'Something went wrong'}</h3>
      <p className="text-muted">{error?.message ?? 'Please try again.'}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        {backTo && <Button variant="secondary" to={backTo} icon="arrow-left">Go back</Button>}
        {onRetry && !isLocked && <Button onClick={onRetry} icon="refresh">Try again</Button>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, backTo, backLabel = 'Back', actions, eyebrow }) {
  return (
    <header className="page-header anim-fade-up">
      <div className="page-header__main">
        {backTo && (
          <Link to={backTo} className="page-header__back" aria-label={backLabel}>
            <Icon name="arrow-left" size={20} />
          </Link>
        )}
        <div>
          {eyebrow && <div className="page-header__eyebrow">{eyebrow}</div>}
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export function Logo({ light = false, compact = false }) {
  return (
    <span className={`logo ${light ? 'logo--light' : ''}`}>
      <span className="logo__mark">
        <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
          <path d="M16 27V15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M16 17c0-5.5 3.8-9.5 10-9.5 0 6.5-3.8 9.8-10 9.5Z" fill="currentColor" opacity="0.75" />
          <path d="M16 21c0-4.8-3.2-8-8.5-8 0 5.6 3.2 8.4 8.5 8Z" fill="currentColor" />
        </svg>
      </span>
      {!compact && <span className="logo__text">AgriCore</span>}
    </span>
  );
}
