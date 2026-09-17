/**
 * Course map pieces: module cards (linear, locked path), topic cards
 * (Proposal Fig 17) and the Learn → Practice → Apply step indicator.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { LESSON_STATE } from '../../constants/rules.js';
import { missionCode } from '../../utils/format.js';
import Button from '../common/Button.jsx';
import { StatusPill } from '../common/Display.jsx';
import Icon from '../common/Icon.jsx';
import { ProgressBar } from '../common/Progress.jsx';
import { summarizeHtml } from '../common/SafeHtml.jsx';

const GAME_ICONS = {
  'decision-making': 'scale',
  identification: 'microscope',
  matching: 'bug',
  'drag-and-drop': 'leaf',
  'strategy-management': 'target',
};

export const gameIcon = (gameType) => GAME_ICONS[gameType] ?? 'target';

const STATE_PILLS = {
  [LESSON_STATE.COMPLETED]: { tone: 'green', icon: 'check', label: 'Cleared' },
  [LESSON_STATE.IN_PROGRESS]: { tone: 'amber', icon: 'clock', label: 'In progress' },
  [LESSON_STATE.AVAILABLE]: { tone: 'blue', icon: 'unlock', label: 'Available' },
  [LESSON_STATE.LOCKED]: { tone: 'neutral', icon: 'lock', label: 'Locked' },
};

export function StatePill({ state, labels = {} }) {
  const pill = STATE_PILLS[state];
  return <StatusPill tone={pill.tone} icon={pill.icon}>{labels[state] ?? pill.label}</StatusPill>;
}

/** Lock icon that bursts open once when an item unlocks for the first time. */
export function UnlockBurst({ play }) {
  if (!play) return null;
  return (
    <span className="unlock-burst" aria-hidden="true">
      <Icon name="lock" size={30} />
    </span>
  );
}

/**
 * Cover image for a module card.
 * Drop your own file at: frontend/public/images/modules/module-<n>-cover.jpg
 * While a file is missing, a soft green gradient with the module's game icon
 * is shown so the grid keeps its shape.
 */
export function ModuleCover({ module, isLocked = false }) {
  const [hasImage, setHasImage] = useState(true);
  const source = `/images/modules/module-${module.moduleNumber}-cover.jpg`;

  return (
    <>
      {hasImage ? (
        <img
          className="module-card__image"
          src={source}
          alt=""
          loading="lazy"
          onError={() => setHasImage(false)}
        />
      ) : (
        <span className={`module-card__image module-card__image--fallback tint-${module.moduleNumber}`}>
          <Icon name={gameIcon(module.gameType)} size={34} />
        </span>
      )}
      {isLocked && (
        <span className="module-card__veil">
          <Icon name="lock" size={26} />
        </span>
      )}
    </>
  );
}

export function ModuleMapCard({ entry, index, playUnlock }) {
  const { module, state } = entry;
  const isLocked = state === LESSON_STATE.LOCKED;
  const info = GAME_TYPE_INFO[module.gameType];

  const body = (
    <>
      <div className="module-card__cover">
        <ModuleCover module={module} isLocked={isLocked} />
        <span className={`module-card__number module-card__number--${state}`}>
          {state === LESSON_STATE.COMPLETED ? <Icon name="check" size={18} strokeWidth={2.8} /> : isLocked ? <Icon name="lock" size={15} /> : module.moduleNumber}
        </span>
        <span className="module-card__state"><StatePill state={state} /></span>
        <UnlockBurst play={playUnlock} />
      </div>

      <div className="module-card__content">
        <span className="module-card__eyebrow">
          <Icon name={gameIcon(module.gameType)} size={13} />
          Module {module.moduleNumber} · {info.label}
        </span>
        <h3>{module.title}</h3>
        <p className="module-card__desc">{info.shortDescription}</p>

        <div className="module-card__progress">
          <ProgressBar value={entry.progressPercent} size="sm" tone="green" />
          <div className="module-card__meta">
            <span title="Topics cleared"><Icon name="book" size={14} /> {entry.completedLessons}/{entry.totalLessons}</span>
            <span title="Missions cleared"><Icon name="target" size={14} /> {entry.passedLevels}/{entry.totalLevels}</span>
            {!isLocked && <Icon name="chevron-right" size={18} className="module-card__chevron" />}
          </div>
        </div>

        {isLocked && <p className="module-card__lock-note"><Icon name="lock" size={14} /> Clear Module {module.moduleNumber - 1} to unlock</p>}
      </div>
    </>
  );

  const className = `module-card module-card--${state} anim-fade-up ${playUnlock ? 'is-unlocking' : ''}`;
  return isLocked ? (
    <div className={className} style={{ '--i': index }} aria-disabled="true">{body}</div>
  ) : (
    <Link to={`/student/modules/${module._id}`} className={className} style={{ '--i': index }}>{body}</Link>
  );
}

export function TopicCard({ entry, module, index, playUnlock }) {
  const { lesson, state, levels } = entry;
  const isLocked = state === LESSON_STATE.LOCKED;
  const nextLevel = levels.find((level) => !level.isPassed);

  let status;
  if (state === LESSON_STATE.COMPLETED) status = <span className="topic-card__status is-cleared"><Icon name="check-circle" size={16} /> Mission Cleared</span>;
  else if (isLocked) status = <span className="topic-card__status is-locked"><Icon name="lock" size={16} /> Locked — Complete previous topic first</span>;
  else if (levels.some((level) => level.isAttempted)) status = <span className="topic-card__status is-progress"><Icon name="clock" size={16} /> In progress</span>;
  else status = <span className="topic-card__status is-ready"><Icon name="alert" size={16} /> Ready to attempt</span>;

  return (
    <article className={`topic-card topic-card--${state} anim-fade-up ${playUnlock ? 'is-unlocking' : ''}`} style={{ '--i': index }}>
      <UnlockBurst play={playUnlock} />
      <h3>Topic {lesson.lessonNumber}: {lesson.title}</h3>
      <p className="topic-card__summary">{summarizeHtml(lesson.contentBody)}</p>

      {levels.length > 0 && (
        <div className="topic-card__levels" aria-label="Mission levels">
          {levels.map((level) => (
            <span key={level.mission._id} className={`level-dot ${level.isPassed ? 'is-passed' : level.isAttempted ? 'is-attempted' : ''}`} title={`${missionCode(module, level.mission)}${level.bestScore !== null ? ` · best ${level.bestScore}%` : ''}`}>
              {level.isPassed ? <Icon name="check" size={12} strokeWidth={3} /> : level.mission.levelNumber}
            </span>
          ))}
        </div>
      )}

      <div className="topic-card__footer">
        {status}
        <div className="topic-card__actions">
          {isLocked ? (
            <Button variant="secondary" size="sm" icon="lock" disabled aria-label="Locked" />
          ) : (
            <>
              <Button variant={state === LESSON_STATE.COMPLETED ? 'primary' : 'soft'} size="sm" icon="book" to={`/student/lessons/${lesson._id}`}>View Content</Button>
              {nextLevel && (
                <Button size="sm" icon="play" to={`/student/missions/${nextLevel.mission._id}/play`}>
                  Start Mission Assessment
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/** Learn → Practice → Apply indicator (Proposal §1.1). */
export function LearnPracticeApply({ active = 'learn', completed = [] }) {
  const steps = [
    { key: 'learn', label: 'Learn', hint: 'Study the topic', icon: 'book' },
    { key: 'practice', label: 'Practice', hint: 'Play the mission', icon: 'target' },
    { key: 'apply', label: 'Apply', hint: 'Clear every level', icon: 'shield' },
  ];
  return (
    <ol className="lpa">
      {steps.map((step) => (
        <li key={step.key} className={`lpa__step ${active === step.key ? 'is-active' : ''} ${completed.includes(step.key) ? 'is-done' : ''}`}>
          <span className="lpa__icon"><Icon name={completed.includes(step.key) ? 'check' : step.icon} size={16} /></span>
          <span>
            <strong>{step.label}</strong>
            <small>{step.hint}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}
