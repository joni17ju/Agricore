import { useId } from 'react';
import { PASSING_SCORE } from '../../../constants/rules.js';
import { xpForScore } from '../../../utils/gamification.js';
import { MAX_XP_LIMIT } from '../../../utils/missionValidation.js';
import { XP_TIERS } from './editorUtils.js';
import { FieldIssues } from './fields.jsx';

/**
 * Max XP: a glowing gem with the value, a slider, a number field, tier chips,
 * and what passing and a perfect run are worth under the real scoring rules.
 *
 * PASSING_SCORE and xpForScore are imported from the shared rules (the same
 * values the server scores with), not restated here.
 */
export default function XpControl({ value, onChange, attemptCount = 0, error }) {
  const id = useId();
  const safe = Number.isFinite(value) ? value : 0;
  const percent = Math.min(100, (safe / MAX_XP_LIMIT) * 100);

  return (
    <section className="me-panel me-xp" aria-labelledby={`${id}-title`}>
      <header className="me-panel__head">
        <h3 id={`${id}-title`} className="me-panel__title">Max XP</h3>
      </header>
      <div className="me-xp__body">
        <div className="me-gem" aria-hidden="true" key={safe}>
          <svg viewBox="0 0 64 64" width="64" height="64">
            <defs>
              <linearGradient id={`${id}-gem`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7ef0b0" />
                <stop offset="0.55" stopColor="#22b35e" />
                <stop offset="1" stopColor="#0b5d31" />
              </linearGradient>
            </defs>
            <path d="M14 8h36l10 16-28 34L4 24Z" fill={`url(#${id}-gem)`} />
            <path d="M4 24h56M32 58 22 24l10-16 10 16Z" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
            <path d="M18 12h10l-6 9Z" fill="rgba(255,255,255,0.5)" />
          </svg>
          <span className="me-gem__value">{safe}</span>
        </div>

        <div className="me-xp__controls">
          <div className="me-xp__row">
            <input
              type="range"
              min={0}
              max={MAX_XP_LIMIT}
              step={10}
              value={Math.min(safe, MAX_XP_LIMIT)}
              onChange={(event) => onChange(Number(event.target.value))}
              aria-label="Max XP"
              aria-valuetext={`${safe} XP`}
              style={{ '--fill': `${percent}%` }}
              className="me-xp__range"
            />
            <label className="me-xp__number">
              <span className="visually-hidden">Max XP value</span>
              <input
                type="number"
                className={`input ${error ? 'is-invalid' : ''}`}
                min={0}
                max={MAX_XP_LIMIT}
                step={1}
                value={Number.isFinite(value) ? value : ''}
                onChange={(event) => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
                aria-invalid={Boolean(error)}
              />
              <span aria-hidden="true">XP</span>
            </label>
          </div>
          <div className="me-chips" role="group" aria-label="Common Max XP values">
            {XP_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                className={`me-chip ${safe === tier ? 'is-selected' : ''}`}
                aria-pressed={safe === tier}
                onClick={() => onChange(tier)}
              >
                {tier}
              </button>
            ))}
          </div>
          <p className="me-xp__line" aria-live="polite">
            Pass ({PASSING_SCORE}%) = <strong>{xpForScore(safe, PASSING_SCORE)} XP</strong>
            <span aria-hidden="true"> · </span>
            Perfect = <strong>{xpForScore(safe, 100)} XP</strong>
          </p>
          <FieldIssues errors={error ? [error] : []} />
          {attemptCount > 0 && (
            <p className="me-note">
              <strong>{attemptCount} attempt{attemptCount === 1 ? '' : 's'}</strong> already recorded keep the XP they earned.
              A new value only affects future attempts.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
