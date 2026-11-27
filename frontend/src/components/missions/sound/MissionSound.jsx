import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createMissionSoundEngine } from './missionSounds.js';

/**
 * Sound for the mission screens — and only there.
 *
 * MissionSoundProvider is mounted by the mission play page alone. Anywhere
 * else useMissionSound() returns a silent no-op, so no other page can make a
 * sound. Inside a mission:
 *   - the first tap or click creates and unlocks the audio (never on load),
 *   - every tap on a button, card or the 3D scene gives a soft click,
 *   - games call sound.correct() / sound.wrong() / sound.pickup() … for
 *     feedback (correct answers in a row add a rising combo tone),
 *   - sound stops when the tab is hidden and the audio is closed when the
 *     player leaves the mission.
 *
 * To add sound to a new game type: const sound = useMissionSound(); then call
 * sound.correct(), sound.wrong(), sound.pickup(), sound.drop() or
 * sound.tick() where those things happen. Clicks are automatic.
 */
const STORAGE_KEY = 'agricore.mission-sound';
const DEFAULTS = { muted: false, volume: 0.4 };

const silent = () => {};
const NOOP = {
  click: silent, pickup: silent, drop: silent, correct: silent, wrong: silent, tick: silent,
  start: silent, victory: silent, fail: silent, badge: silent, resetStreak: silent,
  enabled: false, muted: true, volume: 0, setMuted: silent, setVolume: silent,
};

const SoundContext = createContext(NOOP);

function readSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return {
      muted: typeof saved?.muted === 'boolean' ? saved.muted : DEFAULTS.muted,
      volume: typeof saved?.volume === 'number' ? Math.min(0.6, Math.max(0, saved.volume)) : DEFAULTS.volume,
    };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable: the setting applies until the page is closed.
  }
}

/** Taps on these give the soft click sound. */
const CLICKABLE = 'button, a, [role="button"], [role="radio"], [role="checkbox"], [role="tab"], select, input, canvas, .decision-card, .match-option, .pathogen-card, .tactic-card, .dd-label, .dd-zone, .id-viewport';

export function MissionSoundProvider({ children }) {
  // One engine for the life of the mission screen (created lazily, no audio until a tap).
  const [engine] = useState(createMissionSoundEngine);
  const [settings, setSettings] = useState(readSettings);
  const streak = useRef(0);

  useEffect(() => {
    engine.setVolume(settings.volume);
    engine.setMuted(settings.muted);
  }, [engine, settings]);

  useEffect(() => {
    // Unlock on the first gesture inside the mission (iOS needs it in the gesture itself).
    const onPointerDown = () => {
      engine.unlock();
      engine.beginTap();
    };
    // Click sound, played after the game's own handlers so a result sound can take its place.
    const onClick = (event) => {
      engine.unlock();
      if (event.target instanceof Element && event.target.closest(CLICKABLE)) {
        engine.tapClick();
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') engine.unlock();
    };
    const onVisibility = () => (document.hidden ? engine.suspend() : engine.resume());
    const onPageHide = () => engine.close();
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      // Leaving the mission: stop everything and release the audio.
      engine.close();
    };
  }, [engine]);

  const setMuted = useCallback((muted) => {
    setSettings((current) => {
      const next = { ...current, muted };
      saveSettings(next);
      return next;
    });
    if (!muted) engine.unlock();
  }, [engine]);

  const setVolume = useCallback((volume) => {
    setSettings((current) => {
      const next = { ...current, volume, muted: volume === 0 ? true : current.muted };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    enabled: true,
    muted: settings.muted,
    volume: settings.volume,
    setMuted,
    setVolume,
    click: () => engine.play('click'),
    pickup: () => engine.play('pickup'),
    drop: () => engine.play('drop'),
    tick: () => engine.play('tick'),
    start: () => {
      streak.current = 0;
      engine.play('start');
    },
    victory: () => engine.play('victory'),
    fail: () => engine.play('fail'),
    badge: () => engine.play('badge'),
    correct: () => {
      streak.current += 1;
      engine.play('correct');
      if (streak.current >= 2) engine.play('combo', streak.current);
    },
    wrong: () => {
      streak.current = 0;
      engine.play('wrong');
    },
    resetStreak: () => {
      streak.current = 0;
    },
  }), [engine, settings.muted, settings.volume, setMuted, setVolume]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

/** Mission sounds; silent everywhere outside a mission. */
export function useMissionSound() {
  return useContext(SoundContext);
}

/** Plays a soft tick each second while a countdown is in its last 10 seconds. */
export function useCountdownTicks(remaining, isRunning = true) {
  const sound = useMissionSound();
  useEffect(() => {
    if (isRunning && typeof remaining === 'number' && remaining > 0 && remaining <= 10) sound.tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);
}

function SpeakerIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <path d="m22 9-6 6" />
          <path d="m16 9 6 6" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

/** Speaker (mute/unmute) button with a small volume slider beside it on wider screens. */
export function MissionSoundControl() {
  const sound = useMissionSound();
  if (!sound.enabled) return null;
  const label = sound.muted ? 'Turn mission sounds on' : 'Mute mission sounds';
  return (
    <div className="mission-sound">
      <button type="button" className={`mission-sound__btn ${sound.muted ? 'is-muted' : ''}`} onClick={() => sound.setMuted(!sound.muted)} aria-label={label} aria-pressed={!sound.muted} title={label}>
        <SpeakerIcon muted={sound.muted} />
      </button>
      <input
        type="range"
        className="mission-sound__volume"
        min="0"
        max="0.6"
        step="0.05"
        value={sound.muted ? 0 : sound.volume}
        onChange={(event) => {
          const volume = Number(event.target.value);
          sound.setVolume(volume);
          if (volume > 0 && sound.muted) sound.setMuted(false);
        }}
        aria-label="Mission sound volume"
      />
    </div>
  );
}
