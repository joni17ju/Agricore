import { Link } from 'react-router-dom';
import Button from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';

/**
 * The "what next" block on the mission result screen. `step` comes from
 * lessonNextStep() (utils/curriculum.js): one primary
 * action, an optional note saying what unlocks what, and an optional
 * secondary link. There is never a disabled button: when the way forward is
 * locked, the note explains it instead.
 */
const ICONS = { mission: 'target', lesson: null, module: null, dashboard: 'home', 'module-page': 'arrow-left' };

export function NextStepActions({ step, primaryLabel, className = '' }) {
  if (!step?.primary) return null;
  const { primary, secondary, note, isCourseComplete } = step;
  const leadingIcon = ICONS[primary.kind] ?? null;
  const trailingIcon = primary.kind === 'lesson' || primary.kind === 'module' ? 'arrow-right' : undefined;

  return (
    <div className={`next-step ${className}`}>
      {isCourseComplete && (
        <p className="next-step__done">
          <Icon name="trophy" size={18} /> Course complete
        </p>
      )}
      <Button
        size="lg"
        icon={leadingIcon ?? undefined}
        iconRight={trailingIcon}
        to={primary.to}
        className="next-step__primary"
        aria-label={primaryLabel ? undefined : primary.ariaLabel}
      >
        {primaryLabel ?? primary.label}
      </Button>
      {note && (
        <p className="next-step__note" role="note">
          <Icon name={primary.kind === 'mission' ? 'lock' : 'info'} size={15} /> {note}
        </p>
      )}
      {secondary && (
        <Link to={secondary.to} className="next-step__secondary" aria-label={secondary.ariaLabel}>
          {secondary.label} <Icon name="arrow-right" size={14} />
        </Link>
      )}
    </div>
  );
}
