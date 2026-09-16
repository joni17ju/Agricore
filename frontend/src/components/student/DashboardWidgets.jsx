/**
 * Student dashboard widgets (Proposal Fig 16).
 */
import { Link } from 'react-router-dom';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { greeting } from '../../utils/format.js';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import { Avatar, CountUp, EmptyState } from '../common/Display.jsx';
import Icon from '../common/Icon.jsx';
import { ProgressBar, ProgressRing } from '../common/Progress.jsx';
import BadgeTile from './BadgeTile.jsx';

export function WelcomeBanner({ student, totalXP, streak, level, currentModule }) {
  return (
    <section className="welcome-banner anim-fade-up">
      <div className="welcome-banner__text">
        <h1>
          {greeting()}, {student.firstName}! <span className="welcome-banner__wave" aria-hidden="true">🌱</span>
        </h1>
        <p>
          {streak > 0 ? `You're on a ${streak}-day streak. ` : 'Start a mission today to begin a streak. '}
          {currentModule && !currentModule.isCleared
            ? `Keep up the great work on Module ${currentModule.module.moduleNumber}.`
            : 'Keep up the great work!'}
        </p>
        <div className="welcome-banner__level">
          <span>Level {level.level}</span>
          <ProgressBar value={level.progressPercent} tone="gold" size="sm" />
          <span>{level.xpIntoLevel}/{level.xpForNextLevel} XP</span>
        </div>
      </div>
      <div className="welcome-banner__stats">
        <div className="welcome-stat">
          <strong><CountUp value={totalXP} duration={1200} /></strong>
          <span>Total XP</span>
        </div>
        <div className="welcome-stat">
          <strong>
            <Icon name="flame" size={22} className="welcome-stat__flame" />
            <CountUp value={streak} />
          </strong>
          <span>Streak</span>
        </div>
      </div>
    </section>
  );
}

export function CurrentModuleCard({ moduleEntry, nextStep, index = 0 }) {
  if (!moduleEntry) return null;
  const { module } = moduleEntry;
  const resumeTo = nextStep?.mission
    ? `/student/missions/${nextStep.mission._id}/play`
    : nextStep?.lesson
      ? `/student/lessons/${nextStep.lesson._id}`
      : `/student/modules/${module._id}`;

  return (
    <Card title="Current Module" icon="book" className="anim-fade-up" style={{ '--i': index }}>
      <div className="current-module">
        <ProgressRing value={moduleEntry.totalLevels ? (moduleEntry.passedLevels / moduleEntry.totalLevels) * 100 : 0} size={104}>
          <div>
            <strong className="current-module__percent">
              {moduleEntry.totalLevels ? Math.round((moduleEntry.passedLevels / moduleEntry.totalLevels) * 100) : 0}%
            </strong>
          </div>
        </ProgressRing>
        <div className="current-module__info">
          <span className="chip">{GAME_TYPE_INFO[module.gameType].label}</span>
          <h3>Module {module.moduleNumber}: {module.title}</h3>
          <p className="text-muted text-sm">
            {moduleEntry.passedLevels} of {moduleEntry.totalLevels} missions completed
          </p>
          {moduleEntry.isCleared ? (
            <Button variant="soft" icon="check" to={`/student/modules/${module._id}`}>Module cleared</Button>
          ) : (
            <Button icon="play" to={resumeTo}>
              {nextStep?.mission ? 'Resume Mission' : 'Continue Learning'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function AchievementsCard({ badges, index = 0 }) {
  return (
    <Card
      title="Achievements"
      icon="award"
      className="anim-fade-up"
      style={{ '--i': index }}
      actions={<Link to="/student/profile" className="text-sm">View all</Link>}
    >
      <div className="badge-grid badge-grid--compact">
        {badges.slice(0, 6).map((badge, i) => (
          <BadgeTile key={badge.code} badge={badge} index={i} compact />
        ))}
      </div>
    </Card>
  );
}

export function LeaderboardPreview({ board, studentId, index = 0 }) {
  if (!board) return null;
  const top = board.rows.slice(0, 4);
  const me = board.rows.find((row) => row.student._id === studentId);
  const rows = me && !top.includes(me) ? [...top.slice(0, 3), me] : top;

  return (
    <Card
      title="Leaderboard"
      icon="trophy"
      className="anim-fade-up"
      style={{ '--i': index }}
      actions={<Link to="/student/leaderboard" className="text-sm">Full ranking</Link>}
    >
      <p className="text-muted text-sm leaderboard-preview__section">{board.section.sectionName} · Overall</p>
      <ol className="leaderboard-preview">
        {rows.map((row) => (
          <li key={row.student._id} className={row.student._id === studentId ? 'is-me' : ''}>
            <span className={`rank-badge rank-badge--${row.rank}`}>{row.rank}</span>
            <Avatar firstName={row.student.firstName} lastName={row.student.lastName} size={28} />
            <span className="leaderboard-preview__name">
              {row.student.firstName} {row.student.lastName[0]}.{row.student._id === studentId && ' (You)'}
            </span>
            <strong>{row.xp.toLocaleString()} XP</strong>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function ActiveObjectives({ objectives, index = 0 }) {
  return (
    <Card title="Active Objectives" icon="target" className="anim-fade-up" style={{ '--i': index }}>
      {objectives.length === 0 ? (
        <EmptyState icon="check-circle" title="All caught up" />
      ) : (
        <ul className="objectives">
          {objectives.map((objective, i) => {
            const content = (
              <>
                <span className={`objectives__dot ${objective.isDone ? 'is-done' : ''} ${objective.isLocked ? 'is-locked' : ''}`}>
                  <Icon name={objective.isDone ? 'check' : objective.isLocked ? 'lock' : 'target'} size={13} strokeWidth={2.6} />
                </span>
                <span className="objectives__label">
                  {objective.label}
                  {objective.progress && (
                    <small> ({objective.progress.current}/{objective.progress.total})</small>
                  )}
                </span>
                {objective.xpReward && <span className="objectives__xp">+{objective.xpReward} XP</span>}
              </>
            );
            const link = objective.missionId && !objective.isLocked && !objective.isDone
              ? `/student/missions/${objective.missionId}/play`
              : objective.lessonId
                ? `/student/lessons/${objective.lessonId}`
                : null;
            return (
              <li key={objective.id} className="anim-fade-up" style={{ '--i': i + index }}>
                {link ? <Link to={link} className="objectives__row">{content}</Link> : <div className="objectives__row">{content}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function WeeklyActivityChart({ days, index = 0 }) {
  const max = Math.max(50, ...days.map((day) => day.xp));
  const total = days.reduce((sum, day) => sum + day.xp, 0);
  return (
    <Card
      title="Weekly Activity"
      icon="chart"
      className="anim-fade-up"
      style={{ '--i': index }}
      actions={<span className="chip">+{total.toLocaleString()} XP this week</span>}
    >
      <div className="weekly-chart" role="img" aria-label={`XP earned over the last 7 days, ${total} total`}>
        {days.map((day, i) => (
          <div key={day.dayKey} className={`weekly-chart__col ${day.isToday ? 'is-today' : ''}`}>
            <span className="weekly-chart__value">{day.xp > 0 ? day.xp : ''}</span>
            <div className="weekly-chart__bar-wrap">
              <div
                className={`weekly-chart__bar ${day.xp === 0 ? 'is-empty' : ''}`}
                style={{ height: `${Math.max(4, (day.xp / max) * 100)}%`, animationDelay: `${i * 70}ms` }}
              />
            </div>
            <span className="weekly-chart__label">{day.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
