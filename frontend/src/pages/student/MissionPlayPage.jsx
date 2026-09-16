import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { GAME_TYPES, GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getMissionForStudent, submitAttempt } from '../../services/missionService.js';
import { formatClock, missionCode } from '../../utils/format.js';
import Button from '../../components/common/Button.jsx';
import { Avatar, ErrorState, LoadingState, Logo, StatusPill, XPPill } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import MissionResult from '../../components/missions/MissionResult.jsx';
import { HOW_TO_PLAY } from '../../components/missions/missionFeedback.js';
import { gameIcon } from '../../components/student/CourseMap.jsx';
import DecisionGame from '../../components/missions/decision/DecisionGame.jsx';
import IdentificationGame from '../../components/missions/identification/IdentificationGame.jsx';
import MatchingGame from '../../components/missions/matching/MatchingGame.jsx';
import DragDropGame from '../../components/missions/dragdrop/DragDropGame.jsx';
import StrategyGame from '../../components/missions/strategy/StrategyGame.jsx';

/** Each module's game type has its own, separate game component. */
const GAMES = {
  [GAME_TYPES.DECISION_MAKING]: DecisionGame,
  [GAME_TYPES.IDENTIFICATION]: IdentificationGame,
  [GAME_TYPES.MATCHING]: MatchingGame,
  [GAME_TYPES.DRAG_AND_DROP]: DragDropGame,
  [GAME_TYPES.STRATEGY_MANAGEMENT]: StrategyGame,
};

export default function MissionPlayPage() {
  const { missionId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, isLoading, reload } = useAsync(() => getMissionForStudent(user._id, missionId), [user._id, missionId]);
  const [phase, setPhase] = useState('intro');
  const [attemptKey, setAttemptKey] = useState(0);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState(null);
  const startedAt = useRef(0);
  useDocumentTitle(data?.mission.scenarioData.title ?? 'Mission');

  useEffect(() => {
    setPhase('intro');
    setResult(null);
  }, [missionId]);

  if (isLoading && !data) return <div className="mission-page"><LoadingState label="Preparing mission…" /></div>;
  if (error) {
    return (
      <div className="mission-page">
        <ErrorState error={error} onRetry={reload} backTo="/student/modules" />
      </div>
    );
  }

  const { mission, module, lesson, totalLevels, totalXP, bestScore } = data;
  const Game = GAMES[module.gameType];
  const howTo = HOW_TO_PLAY[module.gameType];

  const start = () => {
    startedAt.current = Date.now();
    setAttemptKey((key) => key + 1);
    setPhase('playing');
    window.scrollTo({ top: 0 });
  };

  const handleComplete = async (gameAnswers) => {
    setPhase('submitting');
    setAnswers(gameAnswers);
    try {
      const attemptResult = await submitAttempt({
        studentId: user._id,
        missionId,
        answers: gameAnswers,
        timeSpentSeconds: (Date.now() - startedAt.current) / 1000,
      });
      setResult(attemptResult);
      setPhase('result');
      reload();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.message);
      setPhase('playing');
    }
  };

  return (
    <div className={`mission-page mission-page--${module.gameType}`}>
      <header className="mission-topbar">
        <Link to={`/student/modules/${module._id}`} className="mission-topbar__back" aria-label="Leave mission">
          <Icon name="arrow-left" size={20} />
        </Link>
        <Link to="/student" className="mission-topbar__logo" aria-label="AgriCore dashboard"><Logo compact /></Link>
        <nav className="mission-topbar__crumbs" aria-label="Breadcrumb">
          <span className="hide-sm">Principles of Crop Protection I</span>
          <Icon name="chevron-right" size={14} className="hide-sm" />
          <span className="hide-sm">Module {module.moduleNumber}: {module.title}</span>
          <Icon name="chevron-right" size={14} className="hide-sm" />
          <strong>{lesson.title}</strong>
        </nav>
        <div className="mission-topbar__right">
          <XPPill xp={result?.totalXP ?? totalXP} prefix="" />
          <Avatar firstName={user.firstName} lastName={user.lastName} size={34} />
        </div>
      </header>

      <main className="mission-main">
        {phase === 'intro' && (
          <section className="mission-intro anim-scale-in">
            <div className="mission-intro__badge">
              <Icon name={gameIcon(module.gameType)} size={36} />
            </div>
            <span className="page-header__eyebrow">
              {missionCode(module, mission)} · {GAME_TYPE_INFO[module.gameType].label} Game
            </span>
            <h1>{mission.scenarioData.title}</h1>
            <p className="text-muted">{mission.scenarioData.instructions}</p>

            <div className="mission-intro__facts">
              <StatusPill tone="blue" icon="layers">Level {mission.levelNumber} of {totalLevels}</StatusPill>
              <StatusPill tone="gold" icon="star">Up to {mission.maxXP} XP</StatusPill>
              {mission.scenarioData.timeLimitSeconds && (
                <StatusPill tone="amber" icon="timer">{formatClock(mission.scenarioData.timeLimitSeconds)} countdown</StatusPill>
              )}
              {bestScore !== null && <StatusPill tone="green" icon="trophy">Best {bestScore}%</StatusPill>}
            </div>

            <ol className="mission-intro__how">
              {howTo.map((step, index) => (
                <li key={step} className="anim-fade-up" style={{ '--i': index + 1 }}>
                  <span>{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>

            <div className="mission-intro__actions">
              <Button variant="secondary" icon="book" to={`/student/lessons/${lesson._id}`}>Review Topic</Button>
              <Button size="lg" icon="play" onClick={start}>{bestScore !== null ? 'Play Again' : 'Start Mission'}</Button>
            </div>
          </section>
        )}

        {(phase === 'playing' || phase === 'submitting') && (
          <div className={`mission-stage ${phase === 'submitting' ? 'is-submitting' : ''}`}>
            <Game key={attemptKey} mission={mission} module={module} totalLevels={totalLevels} onComplete={handleComplete} />
            {phase === 'submitting' && <LoadingState label="Scoring your mission…" />}
          </div>
        )}

        {phase === 'result' && result && (
          <MissionResult result={result} answers={answers} mission={mission} module={module} onRetry={start} />
        )}
      </main>
    </div>
  );
}
