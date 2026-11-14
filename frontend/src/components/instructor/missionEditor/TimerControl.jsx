import { useEffect, useId, useState } from 'react';
import { BADGES, BADGE_RULE_TYPES } from '../../../constants/badges.js';
import { TIMER_LIMITS } from '../../../utils/missionValidation.js';
import Button from '../../common/Button.jsx';
import Icon from '../../common/Icon.jsx';
import { FieldIssues } from './fields.jsx';

const PRESETS = [
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '60s' },
  { seconds: 90, label: '90s' },
  { seconds: 120, label: '2m' },
  { seconds: 180, label: '3m' },
];
const STEP = 5;
/** The badge timeLimitSeconds feeds, read from the catalogue rather than restated. */
const QUICK_SCOUT = BADGES.find((badge) => badge.rule.type === BADGE_RULE_TYPES.QUICK_SCOUT);
/** The dial's face covers three minutes; longer times show a full ring. */
const DIAL_SECONDS = 180;

const formatClock = (seconds) => {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

/**
 * Countdown for the games that run on a timer, stored in timeLimitSeconds.
 *
 * The switch is shown locked on: Matching and Drag-and-Drop always run on a
 * countdown — their student screens and Matching's clock bonus depend on it —
 * and no other game reads the value, so "no timer" is not an option here.
 */
export default function TimerControl({ value, onChange, error, rule }) {
  const id = useId();
  /*
   * { from, left } while previewing. Tied to the value it started from, so
   * changing the countdown simply makes an old preview inactive.
   */
  const [run, setRun] = useState(null);
  const seconds = Number.isFinite(value) ? value : 0;
  const preview = run && run.from === value ? run.left : null;
  const shown = preview ?? seconds;

  useEffect(() => {
    if (preview === null) return undefined;
    if (preview <= 0) {
      const done = setTimeout(() => setRun(null), 1200);
      return () => clearTimeout(done);
    }
    const tick = setTimeout(() => setRun((current) => (current ? { ...current, left: current.left - 1 } : null)), 1000);
    return () => clearTimeout(tick);
  }, [preview]);


  const set = (next) => onChange(Math.max(TIMER_LIMITS.min, Math.min(TIMER_LIMITS.max, Math.round(next))));
  const ratio = Math.min(1, shown / DIAL_SECONDS);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const tone = preview !== null && preview <= 10 ? 'danger' : 'ok';

  return (
    <section className="me-panel me-timer" aria-labelledby={`${id}-title`}>
      <header className="me-panel__head">
        <h3 id={`${id}-title`} className="me-panel__title">Countdown</h3>
        <span className="me-switch is-on is-locked" title="This game always runs on a countdown">
          <span className="me-switch__track" aria-hidden="true"><span className="me-switch__thumb" /></span>
          <span>Timer on</span>
        </span>
      </header>
      <div className="me-timer__body">
        <div className={`me-dial me-dial--${tone} ${preview !== null ? 'is-running' : ''}`}>
          <svg viewBox="0 0 120 132" width="120" height="132" aria-hidden="true">
            {/* Stopwatch crown and side button */}
            <rect x="52" y="2" width="16" height="10" rx="3" className="me-dial__crown" />
            <rect x="96" y="22" width="12" height="7" rx="3" transform="rotate(40 102 25)" className="me-dial__crown" />
            <circle cx="60" cy="72" r="56" className="me-dial__case" />
            <circle cx="60" cy="72" r={radius} className="me-dial__track" />
            <circle
              cx="60"
              cy="72"
              r={radius}
              className="me-dial__fill"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ratio)}
              transform="rotate(-90 60 72)"
            />
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="60" y1="31" x2="60" y2={i % 3 === 0 ? 37 : 34} transform={`rotate(${i * 30} 60 72)`} className="me-dial__tick" />
            ))}
          </svg>
          <output className="me-dial__time" aria-live={preview !== null ? 'polite' : 'off'}>
            {formatClock(shown)}
          </output>
        </div>

        <div className="me-timer__controls">
          <div className="me-timer__stepper">
            <Button variant="secondary" size="sm" icon="minus" aria-label={`${STEP} seconds less`} onClick={() => set(seconds - STEP)} disabled={seconds <= TIMER_LIMITS.min} />
            <label className="me-timer__seconds">
              <input
                type="number"
                className={`input ${error ? 'is-invalid' : ''}`}
                min={TIMER_LIMITS.min}
                max={TIMER_LIMITS.max}
                value={Number.isFinite(value) ? value : ''}
                onChange={(event) => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
                aria-label="Countdown in seconds"
                aria-invalid={Boolean(error)}
              />
              <span aria-hidden="true">seconds</span>
            </label>
            <Button variant="secondary" size="sm" icon="plus" aria-label={`${STEP} seconds more`} onClick={() => set(seconds + STEP)} disabled={seconds >= TIMER_LIMITS.max} />
          </div>
          <div className="me-chips" role="group" aria-label="Common countdowns">
            {PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                type="button"
                className={`me-chip ${seconds === preset.seconds ? 'is-selected' : ''}`}
                aria-pressed={seconds === preset.seconds}
                onClick={() => onChange(preset.seconds)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Button
            variant="soft"
            size="sm"
            icon={preview === null ? 'play' : 'x'}
            onClick={() => setRun(preview === null ? { from: value, left: seconds } : null)}
            disabled={!Number.isFinite(value) || value < TIMER_LIMITS.min}
          >
            {preview === null ? 'Preview timer' : 'Stop preview'}
          </Button>
          {rule && <p className="me-note"><Icon name="timer" size={14} /> {rule}</p>}
          {QUICK_SCOUT && (
            <p className="me-note">
              <Icon name="award" size={14} /> Passing with at least {Math.round(QUICK_SCOUT.rule.remainingRatio * 100)}% of the
              countdown left earns the {QUICK_SCOUT.name} badge.
            </p>
          )}
          <FieldIssues errors={error ? [error] : []} />
        </div>
      </div>
    </section>
  );
}
