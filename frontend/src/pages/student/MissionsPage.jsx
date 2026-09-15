import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { LESSON_STATE } from '../../constants/rules.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { listStudentMissions } from '../../services/missionService.js';
import { missionCode } from '../../utils/format.js';
import Card from '../../components/common/Card.jsx';
import { ErrorState, LoadingState, PageHeader, StatusPill } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import { StatePill, gameIcon } from '../../components/student/CourseMap.jsx';

export default function MissionsPage() {
  useDocumentTitle('Missions');
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAsync(() => listStudentMissions(user._id), [user._id]);

  if (isLoading) return <LoadingState label="Loading missions…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Practice"
        title="Missions"
        subtitle="Each module has its own game. Clear a topic's mission levels to unlock the next topic."
      />
      {data.map((group, groupIndex) => {
        const info = GAME_TYPE_INFO[group.module.gameType];
        const passed = group.levels.filter((level) => level.isPassed).length;
        const isLocked = group.state === LESSON_STATE.LOCKED;
        return (
          <Card key={group.module._id} className={`game-section anim-fade-up ${isLocked ? 'game-section--locked' : ''}`} style={{ '--i': groupIndex }}>
            <div className="game-section__header">
              <span className="game-section__icon"><Icon name={isLocked ? 'lock' : gameIcon(group.module.gameType)} size={26} /></span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <span className="page-header__eyebrow">Module {group.module.moduleNumber} · {info.label}</span>
                <h2>{group.module.title}</h2>
                <p className="text-sm text-muted">{info.shortDescription}</p>
              </div>
              <StatusPill tone={passed === group.levels.length ? 'green' : 'neutral'} icon="target">
                {passed}/{group.levels.length} cleared
              </StatusPill>
              <StatePill state={group.state} />
            </div>
            <ul className="mission-list mission-grid">
              {group.levels.map((level) => {
                const locked = level.state === LESSON_STATE.LOCKED;
                const content = (
                  <>
                    <span className="mission-list__icon">
                      <Icon name={locked ? 'lock' : level.isPassed ? 'check' : 'play'} size={16} />
                    </span>
                    <span className="mission-list__text">
                      <strong>{level.mission.scenarioData.title}</strong>
                      <small>
                        {missionCode(group.module, level.mission)} · {level.lesson.title}
                      </small>
                    </span>
                    <small className="text-muted">{level.bestScore !== null ? `${level.bestScore}%` : `+${level.mission.maxXP}`}</small>
                  </>
                );
                return (
                  <li key={level.mission._id}>
                    {locked ? (
                      <div className="mission-list__item is-locked">{content}</div>
                    ) : (
                      <Link to={`/student/missions/${level.mission._id}/play`} className={`mission-list__item ${level.isPassed ? 'is-passed' : ''}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
