import { missionCode } from '../../utils/format.js';
import Button from '../common/Button.jsx';
import { CountUp, StatusPill } from '../common/Display.jsx';
import Icon from '../common/Icon.jsx';
import { ProgressBar, ProgressRing } from '../common/Progress.jsx';
import BadgeTile from '../student/BadgeTile.jsx';
import { describeFeedback } from './missionFeedback.js';

const LEAVES = Array.from({ length: 14 }, (_, i) => i);

function nextStepLink(nextStep) {
  if (!nextStep) return null;
  if (nextStep.mission) {
    return { to: `/student/missions/${nextStep.mission._id}/play`, label: 'Next Level' };
  }
  return { to: `/student/lessons/${nextStep.lesson._id}`, label: 'Next Topic' };
}

/** Result screen after a mission attempt: score, XP, badges, unlocks and feedback. */
export default function MissionResult({ result, answers, mission, module, onRetry }) {
  const { isPassed, score, xpEarned, totalXP, level, leveledUp, newBadges, unlockedLessons, unlockedModule, moduleCleared, rankBefore, rankAfter } = result;
  const feedback = describeFeedback({ gameType: module.gameType, scenarioData: mission.scenarioData, breakdown: result.breakdown, answers });
  const next = nextStepLink(result.nextStep);
  const rankImproved = rankBefore && rankAfter && rankAfter < rankBefore;

  return (
    <div className={`mission-result ${isPassed ? 'is-success' : 'is-failure'}`}>
      {isPassed && (
        <div className="leaf-confetti" aria-hidden="true">
          {LEAVES.map((i) => (
            <span key={i} style={{ '--x': `${(i * 37) % 100}%`, '--delay': `${(i % 7) * 120}ms`, '--drift': `${((i % 5) - 2) * 30}px`, '--turn': `${180 + i * 30}deg` }} />
          ))}
        </div>
      )}

      <section className="mission-result__hero">
        <span className="mission-result__icon">
          <Icon name={isPassed ? 'trophy' : 'refresh'} size={34} />
        </span>
        <p className="mission-result__code">{missionCode(module, mission)} · {mission.scenarioData.title}</p>
        <h1>{isPassed ? (moduleCleared ? 'Module Cleared!' : 'Mission Cleared!') : 'Not quite yet'}</h1>
        <p className="text-muted">
          {isPassed
            ? 'Great work protecting the crops. Your progress has been saved.'
            : 'You need 70% to pass. Review the feedback below and try again — only improvements earn more XP.'}
        </p>

        <div className="mission-result__scores">
          <ProgressRing value={score} size={128} stroke={12} tone={isPassed ? 'green' : 'amber'} label={`Score ${score}%`}>
            <div>
              <strong className="mission-result__score"><CountUp value={score} />%</strong>
              <span className="mission-result__score-label">Score</span>
            </div>
          </ProgressRing>

          <div className="mission-result__xp">
            <div className="mission-result__xp-gain">
              <Icon name="star" size={22} />
              +<CountUp value={xpEarned} duration={1100} /> XP
              {xpEarned > 0 && <span className="xp-float" aria-hidden="true">+{xpEarned}</span>}
            </div>
            {xpEarned === 0 && isPassed && <small className="text-muted">Beat your best score to earn more XP.</small>}
            <ProgressBar value={level.progressPercent} tone="gold" label={`Level ${level.level}`} showValue />
            <div className="row">
              <StatusPill tone="green" icon="star">
                <CountUp value={totalXP} /> total XP
              </StatusPill>
              {leveledUp && <StatusPill tone="gold" icon="sparkles" className="anim-pop">Level up!</StatusPill>}
              {rankImproved && <StatusPill tone="blue" icon="trend-up" className="anim-pop">Rank #{rankBefore} → #{rankAfter}</StatusPill>}
            </div>
          </div>
        </div>
      </section>

      {(unlockedModule || unlockedLessons.length > 0) && (
        <section className="mission-result__unlocks">
          {unlockedModule && (
            <div className="unlock-banner anim-pop" style={{ '--i': 1 }}>
              <span className="unlock-banner__icon"><Icon name="unlock" size={20} /></span>
              <span>Module {unlockedModule.moduleNumber}: <strong>{unlockedModule.title}</strong> unlocked!</span>
            </div>
          )}
          {unlockedLessons.map((lesson, index) => (
            <div key={lesson._id} className="unlock-banner anim-pop" style={{ '--i': index + 3 }}>
              <span className="unlock-banner__icon"><Icon name="unlock" size={20} /></span>
              <span>New topic unlocked: <strong>{lesson.title}</strong></span>
            </div>
          ))}
        </section>
      )}

      {newBadges.length > 0 && (
        <section className="mission-result__badges">
          <h2><Icon name="award" size={20} /> New badge{newBadges.length > 1 ? 's' : ''} earned</h2>
          <div className="badge-grid">
            {newBadges.map((badge, index) => (
              <BadgeTile key={badge.code} badge={{ ...badge, isEarned: true }} index={index + 2} reveal />
            ))}
          </div>
        </section>
      )}

      <section className="mission-result__feedback">
        <h2><Icon name="clipboard" size={20} /> Feedback</h2>
        <ul className="feedback-list">
          {feedback.map((line, index) => (
            <li key={index} className={`feedback-list__item ${line.ok ? 'is-ok' : 'is-miss'} anim-fade-up`} style={{ '--i': index + 3 }}>
              <span className="feedback-list__icon"><Icon name={line.ok ? 'check' : 'x'} size={14} strokeWidth={2.6} /></span>
              <div>
                <strong>{line.title}</strong>
                {line.detail && <p>{line.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mission-result__actions">
        <Button variant="secondary" icon="arrow-left" to={`/student/modules/${module._id}`}>Back to Module</Button>
        <Button variant={isPassed ? 'secondary' : 'primary'} icon="refresh" onClick={onRetry}>
          {isPassed ? 'Play Again' : 'Try Again'}
        </Button>
        {isPassed && next && (
          <Button size="lg" iconRight="arrow-right" to={next.to}>{next.label}</Button>
        )}
      </footer>
    </div>
  );
}
