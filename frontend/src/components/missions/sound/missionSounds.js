/**
 * Mission sound effects, synthesised with the Web Audio API.
 *
 * Every sound is generated in code from simple tones (no audio files, so
 * nothing to download and no licensing). Sounds are short and soft, under a
 * master volume, and they cannot pile up into noise:
 *   - at most MAX_VOICES sounds play at once (extra short sounds are dropped),
 *   - a click is skipped when a result sound (correct, wrong, fanfare…) has
 *     just started, so feedback stays clear.
 *
 * The AudioContext is created only by unlock(), which is called from a user
 * tap or click inside a mission — browsers (and iOS in particular) block audio
 * before a user gesture, and nothing should sound on page load.
 */
const MAX_VOICES = 6;
const RESULT_SOUNDS = new Set(['correct', 'wrong', 'victory', 'fail', 'badge', 'start', 'combo']);

const NOTE = { C4: 261.63, E4: 329.63, G4: 392.0, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };

export function createMissionSoundEngine() {
  let ctx = null;
  let master = null;
  let volume = 0.4;
  let muted = false;
  let voices = 0;
  let lastResultAt = -Infinity;
  // The tap being handled, and whether a result sound started while handling it.
  let tapToken = 0;
  let resultOnTap = -1;
  let tapOpen = false;

  const now = () => (ctx ? ctx.currentTime : 0);

  /** One enveloped tone. Returns its end time. */
  function tone({ freq, type = 'sine', start = 0, duration = 0.12, gain = 0.3, attack = 0.005, slideTo = null, filter = null }) {
    const t0 = now() + start;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    let node = osc;
    if (filter) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = filter;
      osc.connect(lp);
      node = lp;
    }
    node.connect(amp);
    amp.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
    voices += 1;
    osc.onended = () => {
      voices = Math.max(0, voices - 1);
      osc.disconnect();
      amp.disconnect();
    };
    return t0 + duration;
  }

  const SOUNDS = {
    click: () => tone({ freq: 880, type: 'triangle', duration: 0.045, gain: 0.18 }),
    pickup: () => tone({ freq: 480, slideTo: 820, type: 'triangle', duration: 0.09, gain: 0.2 }),
    drop: () => {
      tone({ freq: 700, slideTo: 380, type: 'triangle', duration: 0.1, gain: 0.2 });
      tone({ freq: 140, type: 'sine', duration: 0.08, gain: 0.18, start: 0.05 });
    },
    correct: () => {
      tone({ freq: NOTE.C6, duration: 0.18, gain: 0.22 });
      tone({ freq: NOTE.E6, duration: 0.3, gain: 0.2, start: 0.09 });
      tone({ freq: NOTE.G6, duration: 0.18, gain: 0.06, start: 0.09 });
    },
    wrong: () => {
      tone({ freq: 196, slideTo: 150, type: 'square', duration: 0.22, gain: 0.12, filter: 650 });
    },
    combo: (level = 2) => {
      const step = Math.min(8, Math.max(2, level)) - 2;
      const base = 520 * 2 ** ((step * 2) / 12);
      tone({ freq: base, slideTo: base * 1.5, duration: 0.16, gain: 0.16, start: 0.18 });
    },
    tick: () => tone({ freq: 1250, type: 'sine', duration: 0.03, gain: 0.12 }),
    start: () => {
      [NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.09, duration: 0.14, gain: 0.2 }));
      tone({ freq: NOTE.C6, type: 'triangle', start: 0.27, duration: 0.3, gain: 0.18 });
    },
    victory: () => {
      [NOTE.G4, NOTE.C5, NOTE.E5].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.12, duration: 0.16, gain: 0.2 }));
      tone({ freq: NOTE.G5, type: 'triangle', start: 0.36, duration: 0.55, gain: 0.22 });
      tone({ freq: NOTE.C5, type: 'sine', start: 0.36, duration: 0.6, gain: 0.1 });
      tone({ freq: NOTE.E5, type: 'sine', start: 0.36, duration: 0.6, gain: 0.08 });
    },
    fail: () => {
      tone({ freq: NOTE.E4, type: 'triangle', duration: 0.22, gain: 0.16 });
      tone({ freq: NOTE.C4, type: 'triangle', start: 0.2, duration: 0.4, gain: 0.14 });
    },
    badge: () => {
      [2093, 2637, 3136, 2637, 3520].forEach((f, i) => tone({ freq: f, start: i * 0.06, duration: 0.12, gain: 0.08 }));
    },
  };

  return {
    /** Create (first time) and resume the audio context. Call from a user gesture. */
    unlock() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!ctx) {
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : volume;
        master.connect(ctx.destination);
        // iOS: a silent buffer played inside the gesture unlocks output.
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
      if (ctx.state === 'suspended' && !muted) ctx.resume().catch(() => {});
    },
    play(name, arg) {
      if (!ctx || muted || ctx.state !== 'running' || !SOUNDS[name]) return;
      const t = performance.now();
      if (name === 'click' && t - lastResultAt < 250) return;
      if (voices >= MAX_VOICES && !RESULT_SOUNDS.has(name)) return;
      if (RESULT_SOUNDS.has(name)) lastResultAt = t;
      // Any feedback sound (result, pick-up, drop…) replaces the click for the same tap.
      if (name !== 'click') resultOnTap = tapToken;
      try {
        SOUNDS[name](arg);
      } catch {
        // A failed sound must never break the game.
      }
    },
    /**
     * A tap's click sound. Called when the tap starts; the click is played just
     * after the game has handled the tap, and skipped if that produced a result
     * sound (correct, wrong…) — the result is the feedback that matters.
     */
    /** A tap begins (pointer down): sounds from here on belong to this tap. */
    beginTap() {
      tapToken += 1;
      tapOpen = true;
    },
    tapClick() {
      // Keyboard activation has no pointer-down, so it starts its own tap here.
      if (!tapOpen) tapToken += 1;
      tapOpen = false;
      const token = tapToken;
      window.setTimeout(() => {
        if (resultOnTap !== token) this.play('click');
      }, 0);
    },
    setVolume(value) {
      volume = value;
      if (master && ctx && !muted) master.gain.setTargetAtTime(value, ctx.currentTime, 0.02);
    },
    setMuted(value) {
      muted = value;
      if (!ctx) return;
      master.gain.setTargetAtTime(value ? 0 : volume, ctx.currentTime, 0.02);
      if (value) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
    },
    /** Silence immediately (tab hidden). */
    suspend() {
      ctx?.suspend().catch(() => {});
    },
    resume() {
      if (ctx && !muted && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    /** Stop everything and release the audio hardware (leaving the mission). */
    close() {
      if (!ctx) return;
      ctx.close().catch(() => {});
      ctx = null;
      master = null;
      voices = 0;
    },
  };
}
