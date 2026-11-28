import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { GAME_TYPES, GAME_TYPE_INFO, missionGameType } from '../../constants/gameTypes.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { ATTEMPT_ENDED_CODES, getMissionForStudent, startMissionAttempt, submitAttempt } from '../../services/missionService.js';
import { formatClock, missionCode } from '../../utils/format.js';
import Button from '../../components/common/Button.jsx';
import { Avatar, ErrorState, LoadingState, Logo, StatusPill, XPPill } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import ScrollToTopButton from '../../components/common/ScrollToTopButton.jsx';
import MissionResult from '../../components/missions/MissionResult.jsx';
import { HOW_TO_PLAY } from '../../components/missions/missionFeedback.js';
import { gameIcon } from '../../components/student/CourseMap.jsx';
import DecisionGame from '../../components/missions/decision/DecisionGame.jsx';
import IdentificationGame from '../../components/missions/identification/IdentificationGame.jsx';
import MatchingGame from '../../components/missions/matching/MatchingGame.jsx';
import DragDropGame from '../../components/missions/dragdrop/DragDropGame.jsx';
import StrategyGame from '../../components/missions/strategy/StrategyGame.jsx';
import { hasWebGL, prefersReducedMotion } from '../../components/missions3d/capability.js';
import { MissionSoundControl, MissionSoundProvider, useMissionSound } from '../../components/missions/sound/MissionSound.jsx';

/*
 * Every game with a 3D scene is played in 3D. The 3D code is loaded only on a
 * mission page (three.js stays out of every other page), starting while the
 * intro is on screen. The scenes send exactly the same answers as the 2D
 * games, so the server scores them identically.
 */
const LOADERS_3D = {
  [GAME_TYPES.DECISION_MAKING]: () => import('../../components/missions3d/Decision3D.jsx'),
  [GAME_TYPES.IDENTIFICATION]: () => import('../../components/missions3d/Identification3D.jsx'),
  [GAME_TYPES.MATCHING]: () => import('../../components/missions3d/Matching3D.jsx'),
  [GAME_TYPES.DRAG_AND_DROP]: () => import('../../components/missions3d/DragDrop3D.jsx'),
  [GAME_TYPES.STRATEGY_MANAGEMENT]: () => import('../../components/missions3d/Strategy3D.jsx'),
};
const GAMES_3D = Object.fromEntries(Object.entries(LOADERS_3D).map(([type, load]) => [type, lazy(load)]));

/** Shown while the 3D code downloads: a progress bar that fills as it loads. */
function Loading3D() {
  return (
    <div className="m3d-loading" role="progressbar" aria-label="Loading the 3D game" aria-valuetext="Loading">
      <strong>Loading the 3D game…</strong>
      <span className="m3d-loading__bar"><span /></span>
      <small>This takes a moment the first time, especially on mobile data.</small>
    </div>
  );
}

/** Why a mission is in the simple view: only for devices that cannot show 3D. */
function SimpleViewNote({ reason }) {
  return (
    <p className="mission-simple-note" role="note">
      <Icon name="info" size={15} />
      {reason === 'crash'
        ? 'The 3D view stopped working on this device, so the mission continues in the simple view. It plays and scores the same.'
        : 'Your browser cannot show 3D graphics (WebGL is off or not supported), so this mission uses the simple view. It plays and scores the same.'}
    </p>
  );
}

/**
 * The hidden fallback: if a 3D scene cannot run (its graphics context cannot
 * be restored, an old driver), the 2D game takes over with a short note.
 * There is no 2D/3D button.
 */
class Fallback2D extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn('[AgriCore] 3D mission failed, using the simple view instead.', error?.message);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <>
        <SimpleViewNote reason="crash" />
        {this.props.fallback}
      </>
    );
  }
}

/** The 2D games are kept only for devices without WebGL (and the instructor's preview). */
const GAMES = {
  [GAME_TYPES.DECISION_MAKING]: DecisionGame,
  [GAME_TYPES.IDENTIFICATION]: IdentificationGame,
  [GAME_TYPES.MATCHING]: MatchingGame,
  [GAME_TYPES.DRAG_AND_DROP]: DragDropGame,
  [GAME_TYPES.STRATEGY_MANAGEMENT]: StrategyGame,
};

/*
 * Tabs of this browser tell each other when a mission starts, so a tab left
 * open on the same mission says at once that it was replaced, instead of
 * finding out only when its answers are refused. The server enforces the rule
 * either way (one active attempt per mission level); this only makes it
 * visible sooner. Another browser or device learns it on submit.
 */
const CHANNEL_NAME = 'agricore-missions';
const TAB_ID = Math.random().toString(36).slice(2);
const openChannel = () => (typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_NAME) : null);

const ENDED_MESSAGES = {
  attempt_replaced: {
    title: 'Opened in another tab',
    message: 'This mission was opened in another tab. Please continue there or restart.',
  },
  attempt_already_submitted: {
    title: 'Already submitted',
    message: 'These answers were already submitted, so they were not counted twice. Restart to play again.',
  },
  attempt_expired: {
    title: 'This try has expired',
    message: 'This mission was started too long ago. Restart it to play again.',
  },
  attempt_failed: {
    title: 'Not recorded',
    message: 'Your answers could not be recorded. Please restart the mission.',
  },
  attempt_invalid: {
    title: 'Please restart',
    message: 'This try could not be found on the server. Please restart the mission.',
  },
  attempt_required: {
    title: 'AgriCore has been updated',
    message: 'Please reload the page, then start the mission again.',
    reload: true,
  },
};

/** Sound exists only on this page: the provider wraps the mission screen and nothing else. */
export default function MissionPlayPage() {
  return (
    <MissionSoundProvider>
      <MissionPlayScreen />
    </MissionSoundProvider>
  );
}

function MissionPlayScreen() {
  const { missionId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const sound = useMissionSound();
  const { data, error, isLoading, reload } = useAsync(() => getMissionForStudent(user._id, missionId), [user._id, missionId]);
  const [phase, setPhase] = useState('intro');
  const [attemptKey, setAttemptKey] = useState(0);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [ended, setEnded] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  // Checked once: a device without WebGL gets the simple view automatically.
  const [webgl] = useState(hasWebGL);
  const [calm] = useState(prefersReducedMotion);
  const startedAt = useRef(0);
  // The server's id for the current play, and guards against double clicks.
  const attemptIdRef = useRef(null);
  const isStartingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const phaseRef = useRef(phase);
  const channelRef = useRef(null);
  useDocumentTitle(data?.mission.scenarioData.title ?? 'Mission');

  // Read by the other-tab listener, which is set up once per mission.
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Start downloading the 3D scene while the intro is read, so Start opens it quickly.
  const loadedGameType = data ? missionGameType(data.module, data.mission) : null;
  useEffect(() => {
    if (webgl && LOADERS_3D[loadedGameType]) LOADERS_3D[loadedGameType]().catch(() => {});
  }, [webgl, loadedGameType]);

  // While playing: no pull-to-refresh or overscroll bounce (see mission-phone.css).
  const isPlaying = phase === 'playing' || phase === 'submitting';
  useEffect(() => {
    if (!isPlaying) return undefined;
    const root = document.documentElement;
    root.classList.add('is-mission-playing');
    return () => root.classList.remove('is-mission-playing');
  }, [isPlaying]);

  useEffect(() => {
    setPhase('intro');
    setResult(null);
    setEnded(null);
    attemptIdRef.current = null;
  }, [missionId]);

  useEffect(() => {
    const channel = openChannel();
    channelRef.current = channel;
    if (!channel) return undefined;
    channel.onmessage = (event) => {
      const note = event.data;
      if (note?.type !== 'mission-started' || note.tabId === TAB_ID || note.missionId !== missionId) return;
      if (phaseRef.current === 'playing') {
        attemptIdRef.current = null;
        setEnded(ENDED_MESSAGES.attempt_replaced);
        setPhase('ended');
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
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
  const gameType = missionGameType(module, mission);
  const Game = GAMES[gameType];
  const howTo = HOW_TO_PLAY[gameType];

  /*
   * Starting asks the server for a fresh attempt first. Only then does the
   * game appear, so what the student plays is always the attempt the server
   * will accept. `isStarting` keeps the current screen up meanwhile.
   */
  const start = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setIsStarting(true);
    try {
      const started = await startMissionAttempt(missionId);
      attemptIdRef.current = started.attemptId;
      channelRef.current?.postMessage({ type: 'mission-started', missionId, tabId: TAB_ID });
      startedAt.current = Date.now();
      sound.start();
      setEnded(null);
      setResult(null);
      setAttemptKey((key) => key + 1);
      setPhase('playing');
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  };

  const handleComplete = async (gameAnswers) => {
    // One submission per attempt, however fast the button is pressed.
    if (isSubmittingRef.current || !attemptIdRef.current) return;
    isSubmittingRef.current = true;
    setPhase('submitting');
    setAnswers(gameAnswers);
    try {
      const attemptResult = await submitAttempt({
        studentId: user._id,
        missionId,
        attemptId: attemptIdRef.current,
        answers: gameAnswers,
        timeSpentSeconds: (Date.now() - startedAt.current) / 1000,
      });
      attemptIdRef.current = null;
      setResult(attemptResult);
      setPhase('result');
      reload();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (ATTEMPT_ENDED_CODES.includes(err.code)) {
        attemptIdRef.current = null;
        setEnded(ENDED_MESSAGES[err.code] ?? ENDED_MESSAGES.attempt_invalid);
        setPhase('ended');
      } else {
        // Nothing was recorded (too fast, offline, a server error): the answers are still on screen to send again.
        toast.error(err.message);
        setPhase('playing');
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className={`mission-page mission-page--${gameType} ${phase === 'playing' || phase === 'submitting' ? 'mission-page--playing' : ''}`}>
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
          <MissionSoundControl />
          <XPPill xp={result?.totalXP ?? totalXP} prefix="" />
          <Avatar firstName={user.firstName} lastName={user.lastName} size={34} src={user.avatarUrl} />
        </div>
      </header>

      <main className="mission-main">
        {phase === 'intro' && (
          <section className="mission-intro anim-scale-in">
            <div className="mission-intro__badge">
              <Icon name={gameIcon(gameType)} size={36} />
            </div>
            <span className="page-header__eyebrow">
              {missionCode(module, mission)} · {GAME_TYPE_INFO[gameType].label} Game
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
              <Button size="lg" icon="play" onClick={start} isLoading={isStarting} disabled={isStarting}>
                {bestScore !== null ? 'Play Again' : 'Start Mission'}
              </Button>
            </div>
          </section>
        )}

        {phase === 'ended' && ended && (
          <section className="mission-intro mission-ended anim-scale-in" role="alert">
            <div className="mission-intro__badge">
              <Icon name="info" size={32} />
            </div>
            <h1>{ended.title}</h1>
            <p className="text-muted">{ended.message}</p>
            <div className="mission-intro__actions">
              <Button variant="secondary" icon="arrow-left" to={`/student/modules/${module._id}`}>Back to module</Button>
              {ended.reload ? (
                <Button size="lg" icon="refresh" onClick={() => window.location.reload()}>Reload page</Button>
              ) : (
                <Button size="lg" icon="refresh" onClick={start} isLoading={isStarting} disabled={isStarting}>Restart mission</Button>
              )}
            </div>
          </section>
        )}

        {(phase === 'playing' || phase === 'submitting') && (
          <div className={`mission-stage ${phase === 'submitting' ? 'is-submitting' : ''}`}>
            {GAMES_3D[gameType] && webgl ? (
              <Fallback2D key={attemptKey} fallback={<Game key={attemptKey} mission={mission} module={module} totalLevels={totalLevels} onComplete={handleComplete} />}>
                <Suspense fallback={<Loading3D />}>
                  {(() => {
                    const Game3D = GAMES_3D[gameType];
                    return <Game3D key={attemptKey} mission={mission} module={module} totalLevels={totalLevels} onComplete={handleComplete} calm={calm} />;
                  })()}
                </Suspense>
              </Fallback2D>
            ) : (
              <>
                {GAMES_3D[gameType] && <SimpleViewNote reason="no-webgl" />}
                <Game key={attemptKey} mission={mission} module={module} totalLevels={totalLevels} onComplete={handleComplete} />
              </>
            )}
            {phase === 'submitting' && <LoadingState label="Scoring your mission…" />}
          </div>
        )}

        {phase === 'result' && result && (
          <MissionResult result={result} answers={answers} mission={mission} module={module} onRetry={start} isRetrying={isStarting} />
        )}
      </main>

      {/* Missions run outside AppShell, so this page mounts the button itself. */}
      <ScrollToTopButton />
    </div>
  );
}
