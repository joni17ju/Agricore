import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';
import { formatClock } from '../../utils/format.js';
import './missions3d.css';
import { useCountdownTicks, useMissionSound } from '../missions/sound/MissionSound.jsx';

/**
 * The frame around every 3D mission: a short "how to play" card before the
 * game starts, a heads-up display (progress, timer, streak or lives), XP
 * pop-ups, and a victory or retry animation before the result screen.
 *
 * `landscapeHint` shows a small, dismissible "rotate your phone" tip on
 * phones held upright, for scenes that are much easier to read sideways.
 *
 * The 3D scene goes in `stage`; `panel` holds the same choices as plain
 * buttons, so the game works with a keyboard, a screen reader or a very small
 * screen as well as by tapping the 3D objects.
 *
 * The score the player sees at the end of the animation is a local preview
 * with the same rules as the server; the result screen that follows shows the
 * server's own score and XP.
 */
export function useXpPops() {
  const [pops, setPops] = useState([]);
  const next = useRef(0);
  const sound = useMissionSound();
  const pop = useCallback((text, tone = 'good') => {
    // Each pop-up carries its sound: good → chime (+ rising combo), bad → gentle buzz.
    if (tone === 'good') sound.correct();
    else if (tone === 'bad') sound.wrong();
    else if (tone === 'warn') sound.resetStreak();
    const id = (next.current += 1);
    setPops((list) => [...list, { id, text, tone }]);
    window.setTimeout(() => setPops((list) => list.filter((p) => p.id !== id)), 1300);
  }, [sound]);
  return { pops, pop };
}

export default function Shell3D({
  title,
  kicker,
  steps,
  hud,
  stage,
  panel,
  pops = [],
  finale = null,
  landscapeHint = false,
  started,
  onStart,
}) {
  const startRef = useRef(null);
  useCountdownTicks(hud.timeLeft, started && !finale);
  const [hintClosed, setHintClosed] = useState(false);
  useEffect(() => {
    if (!started) startRef.current?.focus();
  }, [started]);

  return (
    <div className={`m3d ${started ? 'is-started' : ''}`}>
      <header className="m3d__hud" aria-label="Game status">
        <div className="m3d__hud-title">
          <span className="m3d__kicker">{kicker}</span>
          <strong>{title}</strong>
        </div>
        <div className="m3d__hud-items">
          {hud.progress && (
            <div className="m3d__progress" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={hud.progress.total} aria-valuenow={hud.progress.done}>
              <span className="m3d__progress-fill" style={{ width: `${(100 * hud.progress.done) / Math.max(1, hud.progress.total)}%` }} />
              <span className="m3d__progress-text">{hud.progress.done}/{hud.progress.total}</span>
            </div>
          )}
          {typeof hud.timeLeft === 'number' && (
            <span className={`m3d__chip ${hud.timeLeft <= 10 ? 'is-danger' : ''}`} role="timer" aria-label={`${hud.timeLeft} seconds left`}>
              <Icon name="timer" size={15} /> {formatClock(hud.timeLeft)}
            </span>
          )}
          {typeof hud.streak === 'number' && (
            <span className={`m3d__chip ${hud.streak >= 2 ? 'is-hot' : ''}`} title="Correct answers in a row">
              <Icon name="flame" size={15} /> {hud.streak > 1 ? `${hud.streak}× combo` : `Streak ${hud.streak}`}
            </span>
          )}
          {typeof hud.lives === 'number' && (
            <span className="m3d__chip" aria-label={`${hud.lives} lives left`}>
              {Array.from({ length: hud.maxLives ?? 3 }, (_, i) => (
                <Icon key={i} name="leaf" size={15} className={i < hud.lives ? 'm3d__life' : 'm3d__life is-lost'} />
              ))}
            </span>
          )}
        </div>
      </header>

      <div className="m3d__body">
        <div className="m3d__stage-wrap">
          {stage}
          <div className="m3d__pops" aria-live="polite">
            {pops.map((p) => (
              <span key={p.id} className={`m3d__pop is-${p.tone}`}>{p.text}</span>
            ))}
          </div>
          {landscapeHint && started && !hintClosed && !finale && (
            // Shown only on a phone held upright (CSS), never blocking: the game plays either way.
            <div className="m3d__rotate" role="note">
              <Icon name="refresh" size={15} /> Rotate your phone for a better view
              <button type="button" onClick={() => setHintClosed(true)} aria-label="Hide this tip">
                <Icon name="x" size={14} />
              </button>
            </div>
          )}
          {finale && (
            <div className={`m3d__finale is-${finale.passed ? 'win' : 'retry'}`} role="status">
              <Icon name={finale.passed ? 'trophy' : 'refresh'} size={40} />
              <strong>{finale.passed ? 'Mission complete!' : 'Not quite — keep going!'}</strong>
              <span>Scoring your answers…</span>
            </div>
          )}
        </div>
        <section className="m3d__panel" aria-label="Your choices">
          {panel}
        </section>
      </div>

      {!started && (
        <div className="m3d__intro" role="dialog" aria-modal="true" aria-labelledby="m3d-intro-title">
          <div className="m3d__intro-card">
            <span className="m3d__kicker">{kicker}</span>
            <h2 id="m3d-intro-title">{title}</h2>
            <ol>
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <p className="m3d__intro-note">
              <Icon name="info" size={15} /> Tap or click the objects in the scene, or use the buttons beside it (keyboard friendly).
            </p>
            <Button ref={startRef} size="lg" icon="play" onClick={onStart}>Let&apos;s play</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shows the finale animation for a moment, then hands the answers over.
 * `passed` is the local preview; the server decides the real result.
 */
export function useFinale(onComplete, calm) {
  const [finale, setFinale] = useState(null);
  const finish = useCallback(
    (answers, passed) => {
      setFinale({ passed });
      window.setTimeout(() => onComplete(answers), calm ? 300 : 1500);
    },
    [onComplete, calm],
  );
  return { finale, finish };
}
