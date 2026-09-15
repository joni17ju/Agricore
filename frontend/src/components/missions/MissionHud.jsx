import { formatClock } from '../../utils/format.js';
import Icon from '../common/Icon.jsx';

/** Row of small status chips shown above a game (level, objectives, …). */
export function HudChip({ icon, children, tone = 'default', className = '' }) {
  return (
    <span className={`hud-chip hud-chip--${tone} ${className}`}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}

/**
 * Countdown ring. Turns amber under 40% and red + pulsing in the last 10 seconds.
 */
export function CountdownTimer({ remaining, total, label = 'Time Left' }) {
  const ratio = total ? remaining / total : 0;
  const tone = remaining <= 10 ? 'danger' : ratio <= 0.4 ? 'warning' : 'ok';
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={`countdown countdown--${tone}`} role="timer" aria-live={remaining <= 10 ? 'assertive' : 'off'} aria-label={`${remaining} seconds left`}>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r={radius} className="countdown__track" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="countdown__fill"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform="rotate(-90 28 28)"
        />
      </svg>
      <div className="countdown__text">
        <span>{label}</span>
        <strong key={remaining <= 10 ? remaining : 'steady'}>{formatClock(remaining)}</strong>
      </div>
    </div>
  );
}
