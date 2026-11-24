import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { missionCode } from '../../utils/format.js';
import Icon from '../common/Icon.jsx';

const STORAGE_KEY = 'agricore.lesson-mission-panel';

/** Storage can throw (private window, blocked site data); the panel then simply starts open. */
function readClosed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'closed';
  } catch {
    return false;
  }
}
function writeClosed(closed) {
  try {
    window.localStorage.setItem(STORAGE_KEY, closed ? 'closed' : 'open');
  } catch {
    // The choice still applies for this visit.
  }
}

/** The mission panel's open/closed choice, remembered between visits. */
export function useMissionPanelState() {
  const [closed, setClosed] = useState(readClosed);
  const toggle = () => setClosed((value) => {
    writeClosed(!value);
    return !value;
  });
  return [closed, toggle];
}

/** not started → in progress → cleared, from the student's attempts on this topic's levels. */
export function missionStatus(levels) {
  if (levels.length > 0 && levels.every((level) => level.isPassed)) return 'cleared';
  if (levels.some((level) => level.isPassed || level.bestScore !== null)) return 'in-progress';
  return 'not-started';
}

const STATUS_TEXT = { 'not-started': 'Not started', 'in-progress': 'In progress', cleared: 'Cleared' };

function StatusDot({ status }) {
  return <span className={`status-dot status-dot--${status}`} aria-hidden="true" />;
}

/**
 * "Practice: Mission" side panel. The chevron closes it to a slim tab that
 * keeps the status dot visible; the tab reopens it. On narrow layouts the
 * panel always shows in full below the lesson and the toggle is hidden (CSS).
 */
export default function LessonMissionPanel({ module, levels, closed, onToggle }) {
  const panelId = useId();
  const status = missionStatus(levels);
  const passed = levels.filter((level) => level.isPassed).length;
  const nextLevel = levels.find((level) => !level.isPassed) ?? levels[0];
  const tabRef = useRef(null);
  const toggleRef = useRef(null);
  const userToggled = useRef(false);

  // After the reader opens or closes the panel, keep keyboard focus on the control that is now visible.
  useEffect(() => {
    if (!userToggled.current) return;
    userToggled.current = false;
    (closed ? tabRef.current : toggleRef.current)?.focus();
  }, [closed]);

  const toggle = () => {
    userToggled.current = true;
    onToggle();
  };

  return (
    <div className={`mission-dock ${closed ? 'is-closed' : 'is-open'}`}>
      <button
        ref={tabRef}
        type="button"
        className="mission-dock__tab"
        aria-expanded={false}
        aria-controls={panelId}
        aria-label={`Show mission panel. Status: ${STATUS_TEXT[status]}`}
        onClick={toggle}
      >
        <Icon name="chevron-left" size={16} />
        <StatusDot status={status} />
        <span className="mission-dock__tab-text">Mission</span>
      </button>

      <section id={panelId} className="mission-panel" aria-labelledby={`${panelId}-title`}>
        <header className="mission-panel__head">
          <div>
            <p className="mission-panel__kicker">Practice</p>
            <h2 id={`${panelId}-title`} className="mission-panel__title">Mission</h2>
          </div>
          <button
            ref={toggleRef}
            type="button"
            className="mission-panel__toggle"
            aria-expanded={true}
            aria-controls={panelId}
            aria-label="Hide mission panel"
            onClick={toggle}
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </header>

        <p className="mission-panel__status">
          <StatusDot status={status} />
          <span>{STATUS_TEXT[status]}</span>
          {levels.length > 0 && <span className="mission-panel__count">{passed} of {levels.length} {levels.length === 1 ? 'level' : 'levels'} cleared</span>}
        </p>

        {levels.length === 0 ? (
          <p className="mission-panel__empty">This topic has no mission yet.</p>
        ) : (
          <ol className="mission-levels">
            {levels.map((level) => (
              <li key={level.mission._id} className={level.isPassed ? 'is-passed' : ''}>
                <span className="mission-levels__code">{missionCode(module, level.mission)}</span>
                <span className="mission-levels__title">{level.mission.scenarioData.title}</span>
                <span className="mission-levels__meta">
                  {level.isPassed ? 'Cleared' : level.bestScore !== null ? 'Attempted' : 'Not played'}
                  {' · '}
                  {level.bestScore !== null ? `best ${level.bestScore}%` : `${level.mission.maxXP} XP`}
                </span>
                <Link
                  to={`/student/missions/${level.mission._id}/play`}
                  className="mission-levels__play"
                  aria-label={`${level.isPassed ? 'Replay' : 'Play'} ${level.mission.scenarioData.title}`}
                >
                  {level.isPassed ? 'Replay' : 'Play'}
                </Link>
              </li>
            ))}
          </ol>
        )}

        {nextLevel && status !== 'cleared' && (
          <Link to={`/student/missions/${nextLevel.mission._id}/play`} className="btn btn--primary btn--sm btn--block mission-panel__start">
            Start {missionCode(module, nextLevel.mission)}
          </Link>
        )}
      </section>
    </div>
  );
}
