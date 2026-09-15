import { useEffect, useState } from 'react';

/** Animates from 0 to the value on mount, then transitions on change. */
function useAnimatedValue(value) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplayed(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return displayed;
}

const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export function ProgressBar({ value, tone = 'green', size = 'md', label, showValue = false, className = '' }) {
  const percent = useAnimatedValue(clamp(value));
  return (
    <div className={`progress ${className}`}>
      {(label || showValue) && (
        <div className="progress__meta">
          {label && <span>{label}</span>}
          {showValue && <strong>{Math.round(clamp(value))}%</strong>}
        </div>
      )}
      <div
        className={`progress__track progress__track--${size}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamp(value))}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        <div className={`progress__fill progress__fill--${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ProgressRing({ value, size = 96, stroke = 10, tone = 'green', children, label }) {
  const percent = useAnimatedValue(clamp(value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(clamp(value))}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className={`ring__fill ring__fill--${tone}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__content">{children}</div>
    </div>
  );
}

/** Segmented progress (e.g. "Challenge 2 of 5"). */
export function SegmentedProgress({ total, current, completed = current - 1 }) {
  return (
    <div className="segments" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`segments__item ${index < completed ? 'is-done' : ''} ${index === current - 1 ? 'is-current' : ''}`}
        />
      ))}
    </div>
  );
}
