/**
 * Inspection game engine — plain Canvas 2D and vanilla JavaScript.
 *
 * A general engine: it knows nothing about leaves, diseases or any module.
 * Everything comes from the mission data (see docs/inspection-game.md):
 * several rounds, each with a photo, hidden findings to mark with a zoom
 * scope, and a question with answer cards.
 *
 *   const game = createInspectionGame(container, {
 *     data,                 // the mission's scenarioData
 *     reducedMotion,        // calmer: no sway, parallax or particles
 *     calibrate,            // ?calibrate=1 — click to read x/y percentages
 *     onSound(name),        // 'correct' | 'wrong' | 'tick' | 'pickup'
 *     scoreAnswers(answers),// local preview of the score (the server decides)
 *     onFinish(answers),    // { rounds: { [roundId]: { marks, features, choiceId, hintsUsed } } }
 *     light,                // weak device: the microscope keeps only vignette and blur
 *   });
 *
 * Two stages of zoom: the scope over the photo finds symptoms; a finding with a
 * "micrograph" can then be seen under the microscope (microscope.js), where the
 * player focuses, changes objectives, moves the slide and marks features.
 *   game.destroy();         // removes every listener, frame and element
 */

import { FOCUS_SHIFT, OBJECTIVES, VIEW_SCALE, drawEyepiece, paintPlaceholderMicrograph, tissueTexture } from './microscope.js';

const ZOOM_MIN = 1;
const MICRO_ANIM_MS = 520;
/** How far from sharp the focus may be for a feature to be marked. */
const FOCUS_TOLERANCE = 14;
const ZOOM_MAX = 20;
/** The slider is logarithmic, so 1×–5× is not squeezed into one corner of it. */
const zoomToSlider = (z) => Math.round((100 * Math.log(z)) / Math.log(ZOOM_MAX));
const sliderToZoom = (v) => ZOOM_MAX ** (v / 100);
const formatZoom = (z) => `${z < 10 ? z.toFixed(1).replace(/\.0$/, '') : Math.round(z)}×`;
/** The magnification a finding needs before it can be seen and marked (the server uses the same default). */
const minZoomOf = (finding) => Number(finding.minZoom ?? 2);
/** Round numbers for a suggested minZoom in calibration mode. */
const NICE_ZOOMS = [1, 2, 3, 5, 10, 20];
const PLACEHOLDER_SIZE = [1600, 1200];
const ICONS = {
  fungus: '<path d="M4 13c0-4.4 3.6-8 8-8s8 3.6 8 8H4Z"/><path d="M10 13v6h4v-6"/>',
  bacterium: '<rect x="4" y="8" width="16" height="8" rx="4"/><path d="M2 10l2 1M2 14l2-1M22 10l-2 1M22 14l-2-1"/>',
  virus: '<circle cx="12" cy="12" r="5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  abiotic: '<path d="M12 3v10"/><path d="M8 17a4 4 0 1 0 8 0c0-2-4-6-4-6s-4 4-4 6Z"/><path d="M3 21h18"/>',
  insect: '<ellipse cx="12" cy="13" rx="4" ry="6"/><path d="M12 7V4M8 10l-4-2M16 10l4-2M8 14H4M16 14h4M8 18l-3 2M16 18l3 2"/>',
  weed: '<path d="M12 21V9"/><path d="M12 13c-4 0-6-3-6-6 3 0 6 2 6 6ZM12 11c4 0 6-3 6-6-3 0-6 2-6 6Z"/>',
  oomycete: '<path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9Z"/><path d="M5 20c2-1.5 3-1.5 5 0M14 20c2-1.5 3-1.5 5 0"/>',
  default: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
};
const icon = (key) => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key] ?? ICONS.default}</svg>`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const el = (tag, className, html) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
};
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ─────────── Placeholder photos (used until real photos are added) ─────────── */

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Draws a clearly marked placeholder subject with natural-looking symptoms at the findings. */
function paintPlaceholder(round) {
  const [w, h] = PLACEHOLDER_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  const rand = seeded(round.id.split('').reduce((a, c) => a + c.charCodeAt(0), 7));
  const spec = round.placeholder ?? {};
  const color = spec.color ?? '#5f9a3c';
  g.fillStyle = '#efe7d3';
  g.fillRect(0, 0, w, h);
  // Subject outline.
  g.save();
  g.beginPath();
  if (spec.shape === 'broad-leaf') {
    g.ellipse(w / 2, h / 2, w * 0.42, h * 0.33, -0.1, 0, Math.PI * 2);
  } else {
    g.moveTo(w * 0.03, h * 0.5);
    g.quadraticCurveTo(w * 0.5, h * 0.3, w * 0.97, h * 0.47);
    g.quadraticCurveTo(w * 0.5, h * 0.7, w * 0.03, h * 0.5);
  }
  g.closePath();
  const grad = g.createLinearGradient(0, h * 0.3, 0, h * 0.7);
  grad.addColorStop(0, color);
  grad.addColorStop(1, '#3f7a2c');
  g.fillStyle = grad;
  g.fill();
  g.clip();
  // Veins.
  g.strokeStyle = 'rgba(40, 80, 30, 0.45)';
  g.lineWidth = 3;
  for (let i = 0; i < 14; i += 1) {
    const x = w * (0.08 + i * 0.065);
    g.beginPath();
    g.moveTo(x, h * 0.5);
    g.lineTo(x + w * 0.04, spec.shape === 'broad-leaf' ? h * 0.2 : h * 0.38);
    g.moveTo(x, h * 0.5);
    g.lineTo(x + w * 0.04, spec.shape === 'broad-leaf' ? h * 0.8 : h * 0.62);
    g.stroke();
  }
  g.strokeStyle = 'rgba(40, 80, 30, 0.7)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(0, h * 0.5);
  g.lineTo(w, h * 0.49);
  g.stroke();
  // At 1× the leaf looks almost healthy: only a very faint, soft change of colour where
  // something is wrong, enough to make the player want to zoom in. The symptoms
  // themselves are drawn in the scope, at their magnification.
  for (const f of (round.findings ?? []).filter((x) => !x.decoy)) {
    const cx = (f.x / 100) * w;
    const cy = (f.y / 100) * h;
    const r = (f.radius / 100) * w * 1.6;
    const tint = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    tint.addColorStop(0, `rgba(190, 185, 80, ${0.1 + rand() * 0.03})`);
    tint.addColorStop(1, 'rgba(190, 185, 80, 0)');
    g.fillStyle = tint;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // Unmistakable placeholder label.
  g.fillStyle = 'rgba(31, 81, 54, 0.85)';
  g.font = 'bold 40px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('PLACEHOLDER — add your photo', w / 2, h - 50);
  return canvas;
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* ─────────── Detail effects, drawn only inside the zoomed scope ─────────── */

function drawDetail(g, finding, cx, cy, r, t) {
  const type = finding.detail ?? 'lesion';
  g.save();
  if (type === 'spores') {
    for (let i = 0; i < 40; i += 1) {
      const a = i * 2.39996;
      const d = r * Math.sqrt((i + 1) / 40) * 0.9;
      g.fillStyle = i % 3 ? 'rgba(235, 232, 220, 0.95)' : 'rgba(90, 70, 50, 0.9)';
      g.beginPath();
      g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(1.5, r * 0.05), 0, Math.PI * 2);
      g.fill();
    }
  } else if (type === 'halo') {
    const grad = g.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
    grad.addColorStop(0, 'rgba(120, 70, 30, 0.95)');
    grad.addColorStop(0.35, 'rgba(230, 210, 60, 0.85)');
    grad.addColorStop(1, 'rgba(230, 210, 60, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  } else if (type === 'ooze') {
    for (let i = 0; i < 7; i += 1) {
      const a = i * 0.9 + 0.4;
      const d = r * (0.2 + (i % 3) * 0.22);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const grad = g.createRadialGradient(x - r * 0.04, y - r * 0.04, 1, x, y, r * 0.16);
      grad.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
      grad.addColorStop(1, 'rgba(220, 200, 140, 0.75)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r * (0.1 + (i % 2) * 0.05), 0, Math.PI * 2);
      g.fill();
    }
  } else if (type === 'water-soaked') {
    g.fillStyle = 'rgba(60, 85, 70, 0.55)';
    g.beginPath();
    g.ellipse(cx, cy, r, r * 0.6, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(220, 210, 120, 0.9)';
    g.lineWidth = Math.max(2, r * 0.06);
    g.setLineDash([r * 0.15, r * 0.1]);
    g.stroke();
  } else if (type === 'mosaic') {
    for (let i = 0; i < 12; i += 1) {
      g.fillStyle = i % 2 ? 'rgba(215, 230, 120, 0.8)' : 'rgba(35, 85, 30, 0.75)';
      g.beginPath();
      g.ellipse(cx + Math.cos(i * 1.7) * r * 0.55, cy + Math.sin(i * 2.3) * r * 0.5, r * 0.28, r * 0.18, i, 0, Math.PI * 2);
      g.fill();
    }
  } else if (type === 'dust') {
    for (let i = 0; i < 70; i += 1) {
      const a = i * 2.39996;
      const d = r * Math.sqrt((i + 1) / 70);
      g.fillStyle = 'rgba(125, 80, 35, 0.9)';
      g.beginPath();
      g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, Math.max(1, r * 0.035), 0, Math.PI * 2);
      g.fill();
    }
  } else {
    // 'lesion': dark centre, defined edge.
    const grad = g.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 0.85);
    grad.addColorStop(0, 'rgba(70, 40, 25, 0.95)');
    grad.addColorStop(0.7, 'rgba(140, 95, 55, 0.9)');
    grad.addColorStop(1, 'rgba(140, 95, 55, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, cy, r * 0.85, r * 0.6, 0.3, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(60, 30, 20, 0.85)';
    g.lineWidth = Math.max(1.5, r * 0.04);
    g.stroke();
  }
  // A faint shimmer so the detail reads as "something is here".
  g.globalAlpha = 0.25 + 0.15 * Math.sin(t / 300);
  g.strokeStyle = '#fff';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

/* ─────────── The game ─────────── */

export function createInspectionGame(container, options) {
  const { data, reducedMotion = false, calibrate = false, light = false, onSound = () => {}, scoreAnswers = null, onFinish = () => {} } = options;
  const rounds = data.rounds ?? [];
  const triesPerRound = Number(data.triesPerRound ?? 5);
  const answers = { rounds: {} };
  for (const r of rounds) answers.rounds[r.id] = { marks: [], features: [], choiceId: null, hintsUsed: 0 };

  const state = {
    roundIndex: 0,
    phase: 'inspect', // inspect | identify | answered | done
    zoom: 1,
    foundZoom: {}, // findingId → the magnification it was marked at
    scope: { x: 0.5, y: 0.5 }, // in photo fractions
    scopeTarget: { x: 0.5, y: 0.5 },
    pointerInside: false,
    tilt: { x: 0, y: 0 },
    found: new Set(),
    featuresFound: new Set(), // "findingId:featureId"
    micro: null, // the microscope view, when open
    microImages: {}, // "roundId:findingId" → { image, isPlaceholder }
    triesLeft: triesPerRound,
    streak: 0,
    shakeUntil: 0,
    hint: null, // { finding, until }
    popups: [], // { text, x, y, born }
    particles: [],
    wrongMarks: [], // { x, y, born }
    timeLeft: Number(data.timeLimitSeconds) || null,
    images: {}, // roundId → { base, hi, isPlaceholder }
    destroyed: false,
  };

  /* DOM */
  const root = el('div', `insp${calibrate ? ' is-calibrate' : ''}`);
  const hud = el('div', 'insp__hud');
  const stage = el('div', 'insp__stage');
  const canvas = el('canvas', 'insp__canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'Photo to inspect. Arrow keys move the scope, plus and minus zoom, Enter marks a finding.');
  const credit = el('p', 'insp__credit');
  const toast = el('div', 'insp__toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  // Objective and focus controls sit on the microscope itself (never scrolled away on a phone).
  const microBar = el('div', 'insp__microbar');
  microBar.hidden = true;
  const microBack = el('button', 'insp__microback', '<span aria-hidden="true">←</span>');
  microBack.type = 'button';
  microBack.hidden = true;
  microBack.setAttribute('aria-label', 'Back to leaf');
  microBack.dataset.microBack = '';
  stage.append(canvas, credit, toast, microBar, microBack);
  const side = el('aside', 'insp__side');
  root.append(hud, el('div', 'insp__main'));
  root.lastChild.append(stage, side);
  container.append(root);
  const g = canvas.getContext('2d');

  /* Layout */
  let width = 0;
  let height = 0;
  let dpr = 1;
  let photo = { x: 0, y: 0, w: 0, h: 0 };
  const resize = () => {
    const rect = stage.getBoundingClientRect();
    // Weak devices draw at a lower resolution.
    dpr = Math.min(light ? 1.5 : 2, window.devicePixelRatio || 1);
    width = Math.max(200, rect.width);
    height = Math.max(200, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    layoutPhoto();
    requestDraw();
  };
  const layoutPhoto = () => {
    const img = state.images[rounds[state.roundIndex]?.id]?.base;
    const aspect = img ? (img.naturalWidth || img.width) / (img.naturalHeight || img.height) : 4 / 3;
    const margin = Math.min(width, height) * 0.06;
    let w = width - margin * 2;
    let h = w / aspect;
    if (h > height - margin * 2) {
      h = height - margin * 2;
      w = h * aspect;
    }
    photo = { x: (width - w) / 2, y: (height - h) / 2, w, h };
    // Exposed for calibration notes and automated checks (canvas pixels).
    canvas.dataset.photo = [photo.x, photo.y, photo.w, photo.h].map((v) => v.toFixed(1)).join(',');
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(stage);

  /* Helpers */
  const round = () => rounds[state.roundIndex];
  const lensRadius = () => Math.min(width, height) * (width < 520 ? 0.2 : 0.15);
  const photoPoint = (fx, fy) => ({ x: photo.x + fx * photo.w + state.tilt.x, y: photo.y + fy * photo.h + state.tilt.y });
  const toFraction = (px, py) => ({ x: clamp((px - photo.x - state.tilt.x) / photo.w, 0, 1), y: clamp((py - photo.y - state.tilt.y) / photo.h, 0, 1) });
  const say = (text, tone = 'info') => {
    toast.textContent = text;
    toast.className = `insp__toast is-${tone} is-visible`;
    clearTimeout(say.timer);
    say.timer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  };
  const preview = () => (scoreAnswers ? scoreAnswers(answers) : null);
  let layerCanvas = null;
  let maskCanvas = null;
  /**
   * How much of the original photo shows around a finding: nothing below its minZoom,
   * a soft 35% at it, fully a little above (at once at the top of the range, or with reduced motion).
   */
  const layerReveal = (z, need) => {
    if (z < need - 0.01) return 0;
    const span = Math.min(need * 0.25, ZOOM_MAX - need);
    if (reducedMotion || span < 0.05) return 1;
    return clamp(0.35 + (0.65 * (z - need)) / span, 0, 1);
  };
  const micrographOf = (f) => (f?.micrograph?.features?.length ? f.micrograph : null);
  const featureKey = (finding, feature) => `${finding.id}:${feature.id}`;
  const requiredFeatures = (r) =>
    r.findings.flatMap((f) => (micrographOf(f) ? f.micrograph.features.filter((x) => x.required !== false).map((feature) => ({ finding: f, feature })) : []));
  const inMicro = () => Boolean(state.micro) && state.micro.anim?.dir !== 'out';
  /** The finding with a micrograph under the scope, if any. */
  const findingUnderScope = () =>
    round()?.findings.find((f) => micrographOf(f) && Math.hypot(state.scopeTarget.x * 100 - f.x, state.scopeTarget.y * 100 - f.y) <= f.radius * 1.3) ?? null;
  const focusTarget = (m) => Number(m.finding.micrograph.focus ?? 55) + FOCUS_SHIFT[m.objective];
  const isSharp = (m) => Math.abs(m.focus - focusTarget(m)) <= FOCUS_TOLERANCE;

  /* HUD */
  let lastTick = null;
  const renderHud = () => {
    const r = round();
    const p = preview();
    hud.innerHTML = `
      <span class="insp__chip"><strong>Sample ${Math.min(state.roundIndex + 1, rounds.length)}</strong> of ${rounds.length}</span>
      ${state.timeLeft !== null && !calibrate ? `<span class="insp__chip ${state.timeLeft <= 10 ? 'is-danger' : ''}" role="timer" aria-label="${state.timeLeft} seconds left">⏱ ${Math.floor(state.timeLeft / 60)}:${String(state.timeLeft % 60).padStart(2, '0')}</span>` : ''}
      <span class="insp__chip ${state.streak >= 2 ? 'is-hot' : ''}">🔥 ${state.streak > 1 ? `${state.streak}× streak` : `Streak ${state.streak}`}</span>
      <span class="insp__chip" aria-label="${state.triesLeft} tries left">Tries ${'●'.repeat(state.triesLeft)}${'○'.repeat(Math.max(0, triesPerRound - state.triesLeft))}</span>
      ${p ? `<span class="insp__chip">Score ${p.score}%</span>` : ''}
      ${calibrate ? '<span class="insp__chip is-hot">Calibration mode</span>' : ''}`;
    const microCredit = inMicro() ? state.micro.finding.micrograph.credit : null;
    credit.textContent = inMicro() ? (microCredit ? `Micrograph: ${microCredit}` : '') : r?.credit ? `Photo: ${r.credit}` : '';
  };

  /* Side panel: notebook, scope controls, question */
  const renderSide = () => {
    const r = round();
    if (!r) return;
    const required = r.findings.filter((f) => f.required !== false);
    const reqFeatures = requiredFeatures(r);
    const foundCount = [...state.found].filter((id) => required.some((f) => f.id === id)).length + reqFeatures.filter(({ finding, feature }) => state.featuresFound.has(featureKey(finding, feature))).length;
    const totalCount = required.length + reqFeatures.length;
    const notebook = r.findings
      .filter((f) => !f.decoy)
      .map((f, i) => {
        const done = state.found.has(f.id);
        const micro = micrographOf(f);
        const features = micro
          ? `<ul class="insp__features">${micro.features
              .map((ft) => {
                const seen = state.featuresFound.has(featureKey(f, ft));
                return `<li class="${seen ? 'is-done' : ''}"><span aria-hidden="true">${seen ? '✓' : '🔬'}</span> ${seen ? `<strong>${escapeHtml(ft.name)}</strong>${ft.description ? `<small>${escapeHtml(ft.description)}</small>` : ''}` : `${ft.required === false ? 'Optional microscope feature' : 'Microscope feature'} — not yet marked`}</li>`;
              })
              .join('')}</ul>${done && state.phase === 'inspect' && !inMicro() ? `<button type="button" class="insp__look" data-micro="${escapeHtml(f.id)}">🔬 Look closer</button>` : ''}`
          : '';
        const zoomTag = done
          ? `<em class="insp__zoomtag">Found at ${formatZoom(state.foundZoom[f.id] ?? minZoomOf(f))}</em>`
          : f.deep || calibrate
            ? `<em class="insp__zoomtag is-challenge">Needs ${formatZoom(minZoomOf(f))}</em>`
            : '';
        return `<li class="${done ? 'is-done' : ''}"><span class="insp__dot">${done ? '✓' : i + 1}</span><span>${done ? `<strong>${escapeHtml(f.name)}</strong>${zoomTag}<small>${escapeHtml(f.description ?? '')}</small>` : `${f.required === false ? 'Optional finding' : 'Finding'} — not yet marked ${zoomTag}`}${features}</span></li>`;
      })
      .join('');
    let question = '';
    if (state.phase !== 'inspect') {
      const chosen = answers.rounds[r.id].choiceId;
      question = `
        <div class="insp__question">
          <h3>${escapeHtml(r.question)}</h3>
          <div class="insp__cards">${r.choices
            .map((c) => {
              const tone = state.phase === 'answered' ? (c.id === r.correctChoiceId ? 'is-right' : c.id === chosen ? 'is-wrong' : 'is-faded') : '';
              return `<button type="button" class="insp__card ${tone}" data-choice="${escapeHtml(c.id)}" ${state.phase === 'answered' ? 'disabled' : ''}>${icon(c.icon)}<strong>${escapeHtml(c.label)}</strong>${c.description ? `<small>${escapeHtml(c.description)}</small>` : ''}</button>`;
            })
            .join('')}</div>
          ${state.phase === 'answered' ? `<p class="insp__why"><strong>${chosen === r.correctChoiceId ? 'Correct.' : 'Not quite.'}</strong> ${escapeHtml(r.explanation ?? '')}</p><button type="button" class="insp__next" data-next>${state.roundIndex === rounds.length - 1 ? 'Finish mission' : 'Next sample →'}</button>` : ''}
        </div>`;
    }
    root.classList.toggle('is-inspecting', state.phase === 'inspect');
    root.classList.toggle('is-micro', inMicro());
    renderMicroBar();
    side.innerHTML = `
      <p class="insp__subject">${r.level ? `<span class="insp__level">${escapeHtml(r.level)}</span>` : ''}${escapeHtml(r.subject)}</p>
      <h3 class="insp__h">Field notebook <small>${foundCount}/${totalCount} required</small></h3>
      <ul class="insp__notebook">${notebook}</ul>
      ${inMicro() ? microControls() : ''}
      ${state.phase === 'inspect' && !inMicro() ? `
        <label class="insp__zoom"><span>Magnification <strong>${formatZoom(state.zoom)}</strong></span><input type="range" min="0" max="100" step="1" value="${zoomToSlider(state.zoom)}" aria-label="Magnification, 1× to 20×" aria-valuetext="${formatZoom(state.zoom)}" data-zoom></label>
        ${calibrate ? `<div class="insp__preview" role="group" aria-label="Preview at zoom">Preview: ${[1, 5, 10, 20].map((z) => `<button type="button" class="insp__btn" data-preview="${z}">${z}×</button>`).join('')}</div>` : ''}
        ${calibrate && r.baseImage && r.revealImage ? `<button type="button" class="insp__btn insp__btn--micro" data-blink aria-pressed="${Boolean(state.blink)}">Blink compare: showing ${state.blink ? 'reveal (original)' : 'base (healthy)'}</button>` : ''}
        <div class="insp__buttons">
          <button type="button" class="insp__btn insp__btn--primary" data-mark>Mark at crosshair</button>
          <button type="button" class="insp__btn" data-hint>Hint (−XP)</button>
        </div>
        ${r.findings.some(micrographOf) ? `<button type="button" class="insp__btn insp__btn--micro" data-micro-open ${findingUnderScope() ? '' : 'disabled'}>🔬 Microscope</button>` : ''}
        ${state.zoom < 2 ? '<p class="insp__tip">At 1× the leaf looks healthy. Zoom in: some symptoms only show at high magnification.</p>' : ''}` : ''}
      ${question}`;
  };

  const microControls = () => {
    const m = state.micro;
    return `
      <div class="insp__micro">
        <p class="insp__micro-title">🔬 Microscope · ${escapeHtml(m.finding.name)}</p>
        ${state.phase === 'inspect' ? `<div class="insp__buttons">
          <button type="button" class="insp__btn insp__btn--primary" data-micro-mark>Mark at pointer</button>
          <button type="button" class="insp__btn" data-hint>Hint (−XP)</button>
        </div>` : ''}
        <button type="button" class="insp__btn insp__back" data-micro-back>← Back to leaf</button>
        <p class="insp__tip insp__tip--plain">Choose an objective and turn the fine focus (on the microscope). Drag to move the slide; pinch or scroll to change the objective.</p>
      </div>`;
  };
  const renderMicroBar = () => {
    const open = inMicro();
    microBar.hidden = !open;
    microBack.hidden = !open;
    if (!open) {
      microBar.innerHTML = '';
      return;
    }
    const m = state.micro;
    if (microBar.firstElementChild) {
      microBar.querySelectorAll('[data-objective]').forEach((b) => {
        const on = Number(b.dataset.objective) === m.objective;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', String(on));
      });
      const slider = microBar.querySelector('[data-focus]');
      if (Number(slider.value) !== m.focus) slider.value = String(m.focus);
      microBar.querySelector('.insp__focus-state').textContent = isSharp(m) ? 'Sharp ✓' : 'Blurry';
      return;
    }
    microBar.innerHTML = `
      <div class="insp__objectives" role="radiogroup" aria-label="Objective lens">${OBJECTIVES.map((o) => `<button type="button" role="radio" aria-checked="${o === m.objective}" class="insp__obj ${o === m.objective ? 'is-active' : ''}" data-objective="${o}">${o}×</button>`).join('')}</div>
      <label class="insp__focus"><span>Focus <em class="insp__focus-state">${isSharp(m) ? 'Sharp ✓' : 'Blurry'}</em></span><input type="range" min="0" max="100" step="1" value="${m.focus}" aria-label="Fine focus" data-focus></label>`;
  };
  const updateMicroButton = () => {
    const button = side.querySelector('[data-micro-open]');
    if (button) button.disabled = !findingUnderScope();
  };

  /* Microscope */
  const microKey = (f) => `${round().id}:${f.id}`;
  const loadMicro = async (f) => {
    const key = microKey(f);
    if (state.microImages[key]) return;
    const mg = f.micrograph;
    const image = (await loadImage(mg.imageHiRes)) ?? (await loadImage(mg.image));
    if (state.destroyed) return;
    state.microImages[key] = image ? { image, isPlaceholder: false } : { image: paintPlaceholderMicrograph(mg, key), isPlaceholder: true };
    requestDraw();
  };
  const enterMicro = (f) => {
    if (!micrographOf(f) || inMicro()) return;
    pinchStart = null;
    state.micro = {
      finding: f,
      objective: OBJECTIVES[0],
      focus: 0,
      pan: { x: 0.5, y: 0.5 },
      anim: reducedMotion ? null : { start: performance.now(), dir: 'in', from: photoPoint(f.x / 100, f.y / 100) },
      flashStart: -1,
      hint: null,
      wrong: [],
    };
    // It starts a little out of focus, as a real microscope does.
    state.micro.focus = clamp(focusTarget(state.micro) - 20, 0, 100);
    loadMicro(f);
    onSound('lens');
    canvas.setAttribute('aria-label', 'Microscope view. Arrow keys move the slide, 1 to 4 choose the objective, [ and ] focus, Enter marks at the pointer, Escape goes back to the leaf.');
    say(`Microscope: ${f.name}. Focus the slide, then mark what you see.`, 'info');
    renderHud();
    renderSide();
    requestDraw();
  };
  const exitMicro = () => {
    if (!inMicro()) return;
    const f = state.micro.finding;
    if (reducedMotion) state.micro = null;
    else state.micro.anim = { start: performance.now(), dir: 'out', from: photoPoint(f.x / 100, f.y / 100) };
    canvas.setAttribute('aria-label', 'Photo to inspect. Arrow keys move the scope, plus and minus zoom, Enter marks a finding.');
    onSound('lens');
    renderHud();
    renderSide();
    requestDraw();
  };
  const setObjective = (o) => {
    const m = state.micro;
    if (!m || !OBJECTIVES.includes(o) || o === m.objective) return;
    m.objective = o;
    m.flashStart = reducedMotion ? -1 : performance.now();
    onSound('lens');
    renderSide();
    requestDraw();
  };
  const stepObjective = (dir) => {
    const m = state.micro;
    if (!m) return;
    const i = OBJECTIVES.indexOf(m.objective) + dir;
    if (i < 0) exitMicro();
    else if (i < OBJECTIVES.length) setObjective(OBJECTIVES[i]);
  };
  const setFocus = (value) => {
    const m = state.micro;
    if (!m) return;
    m.focus = clamp(Math.round(value), 0, 100);
    const slider = microBar.querySelector('[data-focus]');
    if (slider && Number(slider.value) !== m.focus) slider.value = String(m.focus);
    const label = microBar.querySelector('.insp__focus-state');
    if (label) label.textContent = isSharp(m) ? 'Sharp ✓' : 'Blurry';
    requestDraw();
  };
  const panMicro = (dx, dy) => {
    const m = state.micro;
    if (!m?.map) return;
    m.pan = { x: clamp(m.pan.x - dx / m.map.Wd, 0, 1), y: clamp(m.pan.y - dy / m.map.Hd, 0, 1) };
    requestDraw();
  };
  /** Marks a feature at a point of the eyepiece (canvas coordinates). */
  const markMicro = (px, py) => {
    const m = state.micro;
    if (!inMicro() || m.anim || !m.map) return;
    if (Math.hypot(px - m.cx, py - m.cy) > m.R) return;
    const fx = (px - m.map.left) / m.map.Wd;
    const fy = (py - m.map.top) / m.map.Hd;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
    const x = fx * 100;
    const y = fy * 100;
    if (calibrate) {
      const text = `"x": ${x.toFixed(1)}, "y": ${y.toFixed(1)}`;
      navigator.clipboard?.writeText(text).catch(() => {});
      say(`Micrograph ${text} — copied`, 'info');
      return;
    }
    if (state.phase !== 'inspect') return;
    if (!isSharp(m)) {
      say('The slide is out of focus. Turn the fine focus until it is sharp.', 'warn');
      return;
    }
    const near = m.finding.micrograph.features.find((ft) => Math.hypot(x - ft.x, y - ft.y) <= ft.radius);
    if (near && near.minObjective && m.objective < near.minObjective) {
      say(`Too small to see clearly at ${m.objective}×. Switch to the ${near.minObjective}× objective.`, 'warn');
      return;
    }
    if (near && state.featuresFound.has(featureKey(m.finding, near))) {
      say('Already marked.', 'info');
      return;
    }
    const ans = answers.rounds[round().id];
    ans.features.push({ findingId: m.finding.id, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    if (near) {
      state.featuresFound.add(featureKey(m.finding, near));
      state.streak += 1;
      if (m.hint?.feature.id === near.id) m.hint = null;
      const now = performance.now();
      const showing = state.popups.filter((q) => now - q.born < 1500).length;
      state.popups.push({ text: near.name, x: px, y: py - showing * 34, born: now });
      burst(px, py);
      onSound('correct');
      say(`Seen: ${near.name}`, 'ok');
      checkPhaseAdvance();
    } else {
      state.triesLeft = Math.max(0, state.triesLeft - 1);
      state.streak = 0;
      m.wrong.push({ x: fx, y: fy, born: performance.now() });
      state.shakeUntil = performance.now() + 300;
      onSound('wrong');
      say(state.triesLeft > 0 ? `Nothing to mark there. ${state.triesLeft} ${state.triesLeft === 1 ? 'try' : 'tries'} left.` : 'Out of tries.', 'error');
      checkPhaseAdvance();
    }
    renderHud();
    renderSide();
    requestDraw();
  };

  /** Draws the microscope; k (0–1) is the opening transition, an iris from the scope. */
  const drawMicro = (t, k) => {
    const m = state.micro;
    const img = state.microImages[microKey(m.finding)];
    // The control bar sits under the eyepiece, or beside it on short landscape screens.
    const beside = !microBar.hidden && microBar.offsetHeight > microBar.offsetWidth;
    const barX = microBar.hidden || !beside ? 0 : microBar.offsetWidth + 10;
    const barY = microBar.hidden || beside ? 0 : microBar.offsetHeight + 10;
    const cx = (width - barX) / 2;
    const cy = (height - barY) / 2;
    const R = Math.min(width - barX, height - barY) * 0.46;
    m.R = R;
    m.cx = cx;
    m.cy = cy;
    // Exposed for calibration notes and automated checks.
    canvas.dataset.eyepiece = `${Math.round(cx)},${Math.round(cy)},${Math.round(R)},${m.pan.x.toFixed(4)},${m.pan.y.toFixed(4)}`;
    g.save();
    if (k < 1) {
      const from = m.anim.from;
      const e = 1 - (1 - k) ** 3;
      g.beginPath();
      g.arc(from.x + (cx - from.x) * e, from.y + (cy - from.y) * e, lensRadius() + (Math.hypot(width, height) - lensRadius()) * e, 0, Math.PI * 2);
      g.clip();
    }
    g.fillStyle = '#050505';
    g.fillRect(0, 0, width, height);
    if (!img) {
      g.fillStyle = '#d9e6ef';
      g.font = '15px system-ui';
      g.textAlign = 'center';
      g.fillText('Preparing the slide…', cx, cy);
      g.restore();
      return;
    }
    let flash = 0;
    if (m.flashStart > 0) {
      const a = (t - m.flashStart) / 320;
      if (a < 1) {
        flash = Math.sin(a * Math.PI) * 0.55;
        animating = true;
      } else m.flashStart = -1;
    }
    const shake = t < state.shakeUntil ? Math.sin(t / 18) * 5 : 0;
    if (shake) animating = true;
    const blurPx = Math.min(16, Math.abs(m.focus - focusTarget(m)) * 0.32) + flash * 10;
    m.map = drawEyepiece(g, { cx: cx + shake, cy, R, image: img.image, objective: m.objective, scale: VIEW_SCALE[m.objective], pan: m.pan, blurPx, light, fieldWidthUm: m.finding.micrograph.fieldWidthUm, flash });
    // Marks, hint and calibration circles, inside the eyepiece.
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.clip();
    const features = m.finding.micrograph.features;
    for (const ft of features) {
      const p = m.map.toScreen(ft.x / 100, ft.y / 100);
      const rr = (ft.radius / 100) * m.map.Wd;
      if (state.featuresFound.has(featureKey(m.finding, ft))) {
        g.strokeStyle = 'rgba(90, 230, 130, 0.95)';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(p.x, p.y, rr, 0, Math.PI * 2);
        g.stroke();
      }
      if (calibrate) {
        g.strokeStyle = '#7fb6ff';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(p.x, p.y, rr, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = '#cfe3ff';
        g.font = 'bold 13px system-ui';
        g.textAlign = 'left';
        g.fillText(`${ft.id} (${ft.x}, ${ft.y})${ft.minObjective ? ` ≥${ft.minObjective}×` : ''}`, p.x + 6, p.y - 6);
      }
    }
    m.wrong = m.wrong.filter((w) => t - w.born < 900);
    for (const w of m.wrong) {
      const p = m.map.toScreen(w.x, w.y);
      g.globalAlpha = 1 - (t - w.born) / 900;
      g.strokeStyle = '#ff6b6b';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(p.x - 8, p.y - 8);
      g.lineTo(p.x + 8, p.y + 8);
      g.moveTo(p.x + 8, p.y - 8);
      g.lineTo(p.x - 8, p.y + 8);
      g.stroke();
      g.globalAlpha = 1;
      animating = true;
    }
    if (m.hint && t < m.hint.until) {
      const ft = m.hint.feature;
      const p = m.map.toScreen(ft.x / 100 + 0.03, ft.y / 100 - 0.03);
      const pulse = reducedMotion ? 1 : 1 + 0.15 * Math.sin(t / 160);
      g.strokeStyle = 'rgba(242, 194, 48, 0.95)';
      g.lineWidth = 3;
      g.setLineDash([8, 6]);
      g.beginPath();
      g.arc(p.x, p.y, Math.max(24, (ft.radius / 100) * m.map.Wd * 1.8) * pulse, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      animating = true;
    }
    g.restore();
  };

  /* Images */
  // The @4× photo is only tried when the normal photo exists (no requests for placeholders).
  const base0 = (src) => (src ? loadImage(src) : Promise.resolve(null));
  const prepareRound = async () => {
    const r = round();
    if (!r || state.images[r.id]) return;
    if (r.baseImage && r.revealImage) {
      // Two layers of the same size: the healthy-looking base is what the player sees;
      // the original photo is blended in around each finding inside the scope.
      const [base, baseHi, revealHi] = await Promise.all([loadImage(r.baseImage), base0(r.baseImageHiRes), base0(r.revealImageHiRes)]);
      const reveal = revealHi ?? (await loadImage(r.revealImage));
      if (state.destroyed) return;
      if (base && reveal) {
        state.images[r.id] = { base, hi: baseHi ?? base, ultra: null, reveal, twoLayer: true, isPlaceholder: false };
        layoutPhoto();
        requestDraw();
        return;
      }
    }
    // An extra-large @4× photo, when there is one, keeps 10×–20× sharp.
    const ultraSrc = r.imageUltra ?? (r.imageHiRes?.includes('@2x') ? r.imageHiRes.replace('@2x', '@4x') : null);
    const [base, hi] = await Promise.all([loadImage(r.image), loadImage(r.imageHiRes)]);
    const ultra = base ? await base0(ultraSrc) : null;
    if (state.destroyed) return;
    if (base) state.images[r.id] = { base, hi: hi ?? base, ultra: ultra ?? null, isPlaceholder: false };
    else {
      const placeholder = paintPlaceholder(r);
      state.images[r.id] = { base: placeholder, hi: placeholder, isPlaceholder: true };
    }
    layoutPhoto();
    requestDraw();
  };

  /* Drawing */
  let frame = 0;
  let animating = false;
  const requestDraw = () => {
    if (!frame && !state.destroyed) frame = requestAnimationFrame(draw);
  };
  const draw = (t) => {
    frame = 0;
    if (state.destroyed) return;
    const r = round();
    const imgs = r ? state.images[r.id] : null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    animating = false;

    // Smooth scope movement and gentle sway.
    const ease = reducedMotion ? 1 : 0.25;
    state.scope.x += (state.scopeTarget.x - state.scope.x) * ease;
    state.scope.y += (state.scopeTarget.y - state.scope.y) * ease;
    if (Math.abs(state.scopeTarget.x - state.scope.x) + Math.abs(state.scopeTarget.y - state.scope.y) > 0.0005) animating = true;
    const shake = t < state.shakeUntil ? Math.sin(t / 18) * 6 : 0;
    if (shake) animating = true;
    const micro = state.micro;
    let k = 1;
    if (micro?.anim) {
      const a = reducedMotion ? 1 : clamp((t - micro.anim.start) / MICRO_ANIM_MS, 0, 1);
      k = micro.anim.dir === 'in' ? a : 1 - a;
      micro.animDone = a >= 1;
      if (a < 1) animating = true;
    }
    const scopeVisible = !micro && state.phase === 'inspect' && (state.pointerInside || document.activeElement === canvas || width < 520);
    const sway = reducedMotion ? 0 : Math.sin(t / 1800) * 0.004;
    // Idle sway only while the player is inspecting, so a resting screen costs nothing.
    if (!reducedMotion && scopeVisible) animating = true;

    if (micro && k >= 1) {
      // The microscope fills the stage; the leaf is not drawn underneath.
    } else if (imgs) {
      // Photo with soft shadow, slight tilt toward the pointer.
      g.save();
      g.translate(photo.x + photo.w / 2 + state.tilt.x + shake, photo.y + photo.h / 2 + state.tilt.y);
      g.rotate(sway);
      g.shadowColor = 'rgba(40, 30, 10, 0.35)';
      g.shadowBlur = 24;
      g.shadowOffsetY = 10;
      g.fillStyle = '#fffdf6';
      g.fillRect(-photo.w / 2 - 8, -photo.h / 2 - 8, photo.w + 16, photo.h + 16);
      g.shadowColor = 'transparent';
      g.drawImage(state.blink && imgs.reveal ? imgs.reveal : imgs.base, -photo.w / 2, -photo.h / 2, photo.w, photo.h);
      g.restore();

      // Found findings: glowing rings.
      for (const f of r.findings) {
        if (!state.found.has(f.id)) continue;
        const p = photoPoint(f.x / 100, f.y / 100);
        const rr = (f.radius / 100) * photo.w;
        g.save();
        g.strokeStyle = 'rgba(70, 200, 110, 0.95)';
        g.shadowColor = 'rgba(70, 200, 110, 0.9)';
        g.shadowBlur = 12;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(p.x, p.y, rr, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
      // Wrong marks fade out.
      state.wrongMarks = state.wrongMarks.filter((m) => t - m.born < 900);
      for (const m of state.wrongMarks) {
        const p = photoPoint(m.x, m.y);
        g.save();
        g.globalAlpha = 1 - (t - m.born) / 900;
        g.strokeStyle = '#d64545';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(p.x - 8, p.y - 8);
        g.lineTo(p.x + 8, p.y + 8);
        g.moveTo(p.x + 8, p.y - 8);
        g.lineTo(p.x - 8, p.y + 8);
        g.stroke();
        g.restore();
        animating = true;
      }
      // Hint: a soft pulse near (not exactly on) an unfound finding.
      if (state.hint && t < state.hint.until) {
        const f = state.hint.finding;
        const p = photoPoint(f.x / 100 + 0.02, f.y / 100 - 0.02);
        const pulse = reducedMotion ? 1 : 1 + 0.15 * Math.sin(t / 160);
        g.save();
        g.strokeStyle = 'rgba(242, 194, 48, 0.9)';
        g.lineWidth = 3;
        g.setLineDash([8, 6]);
        g.beginPath();
        g.arc(p.x, p.y, (f.radius / 100) * photo.w * 2.2 * pulse, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        animating = true;
      }
      // Calibration: show every finding.
      if (calibrate) {
        for (const f of r.findings) {
          const p = photoPoint(f.x / 100, f.y / 100);
          g.save();
          g.strokeStyle = '#2b6cb0';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(p.x, p.y, (f.radius / 100) * photo.w, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = '#2b6cb0';
          g.font = 'bold 13px system-ui';
          g.fillText(`${f.id}${f.decoy ? ' decoy' : ''} (${f.x}, ${f.y}) ≥${formatZoom(minZoomOf(f))}`, p.x + 6, p.y - 6);
          g.restore();
        }
      }

      // The zoom scope.
      if (scopeVisible) {
        const center = photoPoint(state.scope.x, state.scope.y);
        const R = lensRadius();
        const z = state.zoom;
        // The sharpest photo available (@4×, @2×, then the normal one).
        const hi = state.blink && imgs.reveal ? imgs.reveal : imgs.ultra ?? imgs.hi;
        const hw = hi.naturalWidth || hi.width;
        const hh = hi.naturalHeight || hi.height;
        // Past the photo's own resolution the picture would only get blurrier:
        // a leaf-cell texture (or the spot's micrograph) fades in instead.
        const sourcePerPixel = hw / (photo.w * z * dpr);
        const beyond = clamp((0.8 - sourcePerPixel) / 0.5, 0, 1);
        // Source region of the high-resolution photo under the lens.
        const sw = ((2 * R) / z / photo.w) * hw;
        const sh = ((2 * R) / z / photo.h) * hh;
        const sx = state.scope.x * hw - sw / 2;
        const sy = state.scope.y * hh - sh / 2;
        g.save();
        g.beginPath();
        g.arc(center.x, center.y, R, 0, Math.PI * 2);
        g.clip();
        g.fillStyle = '#efe7d3';
        g.fillRect(center.x - R, center.y - R, R * 2, R * 2);
        g.imageSmoothingQuality = 'high';
        g.drawImage(hi, sx, sy, sw, sh, center.x - R, center.y - R, R * 2, R * 2);
        if (beyond > 0 && !light) {
          const pattern = g.createPattern(tissueTexture(), 'repeat');
          const scale = (z * photo.w) / 1800;
          pattern.setTransform?.(new DOMMatrix([scale, 0, 0, scale, center.x - state.scope.x * photo.w * z, center.y - state.scope.y * photo.h * z]));
          g.globalAlpha = beyond * 0.55;
          g.fillStyle = pattern;
          g.fillRect(center.x - R, center.y - R, R * 2, R * 2);
          g.globalAlpha = 1;
        }
        // Two-layer rounds: around each finding the original photo is blended over the
        // healthy base with a soft circular mask, from the finding's minZoom upwards.
        if (imgs.twoLayer && !state.blink) {
          const box = Math.ceil(R * 2);
          const px = Math.ceil(box * dpr);
          layerCanvas = layerCanvas ?? document.createElement('canvas');
          maskCanvas = maskCanvas ?? document.createElement('canvas');
          for (const c of [layerCanvas, maskCanvas]) {
            if (c.width !== px) c.width = px;
            if (c.height !== px) c.height = px;
          }
          const mg = maskCanvas.getContext('2d');
          mg.setTransform(dpr, 0, 0, dpr, 0, 0);
          mg.clearRect(0, 0, box, box);
          let any = false;
          for (const f of r.findings) {
            const a = layerReveal(z, minZoomOf(f));
            if (a <= 0) continue;
            const mx = (f.x / 100 - state.scope.x) * photo.w * z + R;
            const my = (f.y / 100 - state.scope.y) * photo.h * z + R;
            const fr = (f.radius / 100) * photo.w * z;
            if (Math.hypot(mx - R, my - R) >= R + fr * 1.2) continue;
            const grad = mg.createRadialGradient(mx, my, fr * 0.55, mx, my, fr * 1.15);
            grad.addColorStop(0, `rgba(0,0,0,${a})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            mg.fillStyle = grad;
            mg.beginPath();
            mg.arc(mx, my, fr * 1.15, 0, Math.PI * 2);
            mg.fill();
            any = true;
          }
          if (any) {
            const rv = imgs.reveal;
            const rw = rv.naturalWidth || rv.width;
            const rh = rv.naturalHeight || rv.height;
            const lg = layerCanvas.getContext('2d');
            lg.setTransform(dpr, 0, 0, dpr, 0, 0);
            lg.globalCompositeOperation = 'source-over';
            lg.clearRect(0, 0, box, box);
            lg.imageSmoothingQuality = 'high';
            const rsw = ((2 * R) / z / photo.w) * rw;
            const rsh = ((2 * R) / z / photo.h) * rh;
            lg.drawImage(rv, state.scope.x * rw - rsw / 2, state.scope.y * rh - rsh / 2, rsw, rsh, 0, 0, box, box);
            lg.globalCompositeOperation = 'destination-in';
            lg.setTransform(1, 0, 0, 1, 0, 0);
            lg.drawImage(maskCanvas, 0, 0);
            lg.globalCompositeOperation = 'source-over';
            g.drawImage(layerCanvas, center.x - R, center.y - R, box, box);
          }
        }
        // Each finding shows only at its magnification, fading in as the player zooms
        // (at once with reduced motion). Below it, it looks like healthy leaf.
        let placeholderDetail = false;
        const revealed = [];
        for (const f of r.findings) {
          const need = minZoomOf(f);
          const reveal = imgs.twoLayer ? layerReveal(z, need) : reducedMotion ? (z >= need - 0.01 ? 1 : 0) : clamp((z - need * 0.82) / (need * 0.18), 0, 1);
          if (reveal <= 0) continue;
          const dx = (f.x / 100 - state.scope.x) * photo.w * z;
          const dy = (f.y / 100 - state.scope.y) * photo.h * z;
          const fr = (f.radius / 100) * photo.w * z * 0.9;
          if (Math.hypot(dx, dy) >= R + fr) continue;
          // At high magnification a finding is far bigger than the lens: draw its detail
          // at lens size, so the sign itself is what fills the view.
          const dr = Math.min(fr, R * 0.9);
          if (reveal >= 1) revealed.push(f.id);
          const micro = micrographOf(f) ? state.microImages[microKey(f)] : null;
          if (micrographOf(f) && !micro && beyond > 0) loadMicro(f);
          g.save();
          g.globalAlpha = reveal * (micro ? 1 - beyond * 0.5 : 1);
          // With real photos the lesion itself is in the reveal layer: no drawn detail.
          if (!imgs.twoLayer) drawDetail(g, f, center.x + dx, center.y + dy, dr, t);
          if (micro && beyond > 0) {
            // Past the photo's resolution, the spot turns into its micrograph.
            // Centred on the micrograph's first feature (e.g. the ooze), so it sits right on the spot.
            const anchor = f.micrograph.features[0];
            // A close crop around that feature, so the sign itself fills the lens.
            const size = dr * 5;
            g.globalAlpha = reveal * beyond * 0.9;
            g.beginPath();
            g.arc(center.x + dx, center.y + dy, dr, 0, Math.PI * 2);
            g.clip();
            g.drawImage(micro.image, center.x + dx - (anchor.x / 100) * size, center.y + dy - (anchor.y / 100) * size, size, size);
          }
          g.restore();
          if (imgs.isPlaceholder || micro?.isPlaceholder || (!micro && !imgs.twoLayer)) placeholderDetail = true;
          if (!reducedMotion) animating = true;
        }
        // Which findings show under the lens right now (for calibration notes and automated checks).
        canvas.dataset.revealed = revealed.join(',');
        if (placeholderDetail && (imgs.isPlaceholder || imgs.twoLayer)) {
          g.fillStyle = 'rgba(31, 81, 54, 0.75)';
          g.font = `600 ${Math.max(10, Math.round(R * 0.07))}px system-ui`;
          g.textAlign = 'center';
          g.fillText('placeholder detail', center.x, center.y + R * 0.86);
        }
        // Glare.
        const glare = g.createLinearGradient(center.x - R, center.y - R, center.x, center.y);
        glare.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        glare.addColorStop(1, 'rgba(255, 255, 255, 0)');
        g.fillStyle = glare;
        g.beginPath();
        g.ellipse(center.x - R * 0.35, center.y - R * 0.4, R * 0.55, R * 0.3, -0.6, 0, Math.PI * 2);
        g.fill();
        g.restore();
        // Ring and crosshair.
        g.save();
        g.lineWidth = Math.max(4, R * 0.06);
        g.strokeStyle = '#1f5136';
        g.beginPath();
        g.arc(center.x, center.y, R, 0, Math.PI * 2);
        g.stroke();
        g.lineWidth = 1.5;
        g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        g.beginPath();
        g.moveTo(center.x - R * 0.25, center.y);
        g.lineTo(center.x - R * 0.06, center.y);
        g.moveTo(center.x + R * 0.06, center.y);
        g.lineTo(center.x + R * 0.25, center.y);
        g.moveTo(center.x, center.y - R * 0.25);
        g.lineTo(center.x, center.y - R * 0.06);
        g.moveTo(center.x, center.y + R * 0.06);
        g.lineTo(center.x, center.y + R * 0.25);
        g.stroke();
        g.fillStyle = '#1f5136';
        g.font = `bold ${Math.round(R * 0.16)}px system-ui`;
        g.textAlign = 'center';
        g.fillText(formatZoom(z), center.x, center.y + R + R * 0.22);
        // Scale bar: how big the view under the lens really is.
        const pxPerMm = (photo.w * z) / Number(r.photoWidthMm ?? 50);
        const mm = [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20].find((v) => v * pxPerMm >= R * 0.35) ?? 20;
        const len = mm * pxPerMm;
        const by = center.y + R + R * 0.36;
        g.fillRect(center.x - len / 2, by, len, 3);
        g.font = `600 ${Math.max(10, Math.round(R * 0.1))}px system-ui`;
        g.fillText(mm < 1 ? `${Math.round(mm * 1000)} µm` : `${mm} mm`, center.x, by + R * 0.14);
        g.restore();
      }
    } else {
      g.fillStyle = '#56655a';
      g.font = '16px system-ui';
      g.textAlign = 'center';
      g.fillText('Loading the sample…', width / 2, height / 2);
    }

    if (micro) drawMicro(t, k);
    if (micro?.anim && micro.animDone) {
      // The transition has finished.
      if (micro.anim.dir === 'out') state.micro = null;
      else micro.anim = null;
      renderHud();
      renderSide();
      requestDraw();
    }

    // Particles and pop-ups.
    state.particles = state.particles.filter((p) => t - p.born < 900);
    for (const p of state.particles) {
      const age = (t - p.born) / 900;
      g.save();
      g.globalAlpha = 1 - age;
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x + p.vx * age * 60, p.y + p.vy * age * 60 + age * age * 40, 3, 0, Math.PI * 2);
      g.fill();
      g.restore();
      animating = true;
    }
    state.popups = state.popups.filter((p) => t - p.born < 1500);
    for (const p of state.popups) {
      const age = (t - p.born) / 1500;
      g.save();
      g.globalAlpha = age < 0.8 ? 1 : (1 - age) / 0.2;
      g.font = 'bold 15px system-ui, sans-serif';
      const w = g.measureText(p.text).width + 20;
      const y = p.y - 30 - age * 20;
      g.fillStyle = 'rgba(31, 81, 54, 0.95)';
      g.beginPath();
      g.roundRect?.(p.x - w / 2, y - 18, w, 28, 14);
      g.fill();
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.fillText(p.text, p.x, y + 1);
      g.restore();
      animating = true;
    }
    if (animating) requestDraw();
  };
  // Keep animating loops alive without spinning when idle (weak phones).
  const kick = () => requestDraw();

  /* Actions */
  const burst = (x, y) => {
    if (reducedMotion) return;
    const now = performance.now();
    for (let i = 0; i < 18; i += 1) {
      const a = (i / 18) * Math.PI * 2;
      state.particles.push({ x, y, vx: Math.cos(a) * (0.6 + Math.random()), vy: Math.sin(a) * (0.6 + Math.random()) - 0.5, color: i % 2 ? '#f2c230' : '#6fd08c', born: now });
    }
  };

  const checkPhaseAdvance = () => {
    const r = round();
    const required = r.findings.filter((f) => f.required !== false);
    const leafDone = required.every((f) => state.found.has(f.id));
    const featuresDone = requiredFeatures(r).every(({ finding, feature }) => state.featuresFound.has(featureKey(finding, feature)));
    if ((leafDone && featuresDone) || state.triesLeft <= 0) {
      state.phase = 'identify';
      if (!(leafDone && featuresDone)) say('No tries left for this sample — answer the question.', 'warn');
      else say('All required findings marked. Now identify the cause.', 'ok');
      return true;
    }
    return false;
  };

  const markAt = (fx, fy) => {
    if (state.phase !== 'inspect') return;
    const r = round();
    if (calibrate) {
      const suggested = [...NICE_ZOOMS].reverse().find((z) => z <= state.zoom + 0.01) ?? 1;
      const text = `"x": ${(fx * 100).toFixed(1)}, "y": ${(fy * 100).toFixed(1)}, "minZoom": ${suggested}`;
      navigator.clipboard?.writeText(text).catch(() => {});
      say(`${text} — copied`, 'info');
      requestDraw();
      return;
    }
    const x = fx * 100;
    const y = fy * 100;
    const ans = answers.rounds[r.id];
    const zoom = Math.round(state.zoom * 100) / 100;
    ans.marks.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, zoom });
    // Below its magnification a finding looks like healthy leaf, so a mark there finds nothing.
    const visible = (f) => Math.hypot(x - f.x, y - f.y) <= f.radius && zoom >= minZoomOf(f) - 0.01;
    const hit = r.findings.find((f) => !f.decoy && !state.found.has(f.id) && visible(f));
    const already = r.findings.find((f) => !f.decoy && state.found.has(f.id) && visible(f));
    const decoy = r.findings.find((f) => f.decoy && Math.hypot(x - f.x, y - f.y) <= f.radius);
    const p = photoPoint(fx, fy);
    if (hit) {
      state.found.add(hit.id);
      state.foundZoom[hit.id] = zoom;
      state.streak += 1;
      if (state.hint?.finding.id === hit.id) state.hint = null;
      // Stack pop-ups that are still showing, so names never overlap.
      const now = performance.now();
      const showing = state.popups.filter((q) => now - q.born < 1500).length;
      state.popups.push({ text: hit.name, x: p.x, y: p.y - showing * 34, born: now });
      burst(p.x, p.y);
      onSound('correct');
      say(`Found: ${hit.name}`, 'ok');
      if (!checkPhaseAdvance()) {
        const leafDone = r.findings.filter((f) => f.required !== false).every((f) => state.found.has(f.id));
        if (micrographOf(hit)) say(`Found: ${hit.name}. Tap “Look closer” to see it under the microscope.`, 'ok');
        else if (leafDone) say('All leaf symptoms marked. Now look closer under the microscope.', 'ok');
      }
    } else if (already) {
      ans.marks.pop();
      say('Already marked.', 'info');
    } else {
      state.triesLeft = Math.max(0, state.triesLeft - 1);
      state.streak = 0;
      state.wrongMarks.push({ x: fx, y: fy, born: performance.now() });
      state.shakeUntil = performance.now() + 300;
      onSound('wrong');
      const left = state.triesLeft > 0 ? `${state.triesLeft} ${state.triesLeft === 1 ? 'try' : 'tries'} left.` : 'Out of tries.';
      say(decoy ? `${decoy.decoyMessage ?? 'That is not a symptom of this disease.'} ${left}` : state.triesLeft > 0 ? `Nothing there. ${left}` : left, 'error');
      checkPhaseAdvance();
    }
    renderHud();
    renderSide();
    if (state.phase === 'identify' && document.activeElement === canvas) side.querySelector('[data-choice]')?.focus({ preventScroll: true });
    requestDraw();
  };

  const takeHint = () => {
    if (state.phase !== 'inspect') return;
    const r = round();
    if (inMicro()) {
      const m = state.micro;
      const ft = m.finding.micrograph.features.find((x) => x.required !== false && !state.featuresFound.has(featureKey(m.finding, x)));
      if (ft) {
        answers.rounds[r.id].hintsUsed += 1;
        m.hint = { feature: ft, until: performance.now() + 2600 };
        say(`Look around the pulsing circle.${ft.minObjective && m.objective < ft.minObjective ? ` Use the ${ft.minObjective}× objective.` : ''}`, 'info');
        renderHud();
        requestDraw();
        return;
      }
    }
    const unfound = r.findings.filter((f) => f.required !== false && !state.found.has(f.id));
    const pending = requiredFeatures(r).find(({ finding, feature }) => !state.featuresFound.has(featureKey(finding, feature)));
    if (!unfound.length && !pending) return;
    if (inMicro()) exitMicro();
    answers.rounds[r.id].hintsUsed += 1;
    const target = unfound[0] ?? pending.finding;
    state.hint = { finding: target, until: performance.now() + 3200 };
    if (unfound.length) {
      const need = minZoomOf(target);
      const advice = state.zoom < need - 0.01 ? `Try a higher magnification here — about ${formatZoom(need)}. ` : 'Look around the pulsing circle. ';
      say(`${advice}${target.clue ?? ''}`.trim(), 'info');
    } else say(`Look closer at “${pending.finding.name}” under the microscope.`, 'info');
    renderHud();
    requestDraw();
  };

  const choose = (choiceId) => {
    if (state.phase !== 'identify') return;
    const r = round();
    answers.rounds[r.id].choiceId = choiceId;
    state.phase = 'answered';
    if (choiceId === r.correctChoiceId) {
      state.streak += 1;
      onSound('correct');
      burst(width / 2, height / 3);
    } else {
      state.streak = 0;
      onSound('wrong');
    }
    renderHud();
    renderSide();
    side.querySelector('[data-next]')?.focus({ preventScroll: true });
    requestDraw();
  };

  const finish = () => {
    if (state.phase === 'done') return;
    state.phase = 'done';
    clearInterval(timer);
    onFinish(JSON.parse(JSON.stringify(answers)));
  };

  const nextRound = async () => {
    if (state.roundIndex >= rounds.length - 1) {
      finish();
      return;
    }
    state.roundIndex += 1;
    state.phase = 'inspect';
    state.found = new Set();
    state.foundZoom = {};
    state.zoom = 1;
    state.featuresFound = new Set();
    state.micro = null;
    state.triesLeft = triesPerRound;
    state.hint = null;
    state.scopeTarget = { x: 0.5, y: 0.5 };
    root.classList.remove('is-entering');
    void root.offsetWidth;
    root.classList.add('is-entering');
    renderHud();
    renderSide();
    await prepareRound();
    prepareNext();
    canvas.focus({ preventScroll: true });
  };
  const prepareNext = () => {
    const next = rounds[state.roundIndex + 1];
    if (next && !state.images[next.id]) {
      // Warm the next photo in the background.
      loadImage(next.image);
      loadImage(next.imageHiRes);
    }
  };

  /* Input */
  const pointers = new Map();
  let pinchStart = null;
  let downAt = null;
  const local = (e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const setScopeFromPointer = (px, py, touch) => {
    // On touch the lens sits above the finger so the finger does not hide it.
    const lift = touch ? lensRadius() * 1.15 : 0;
    const f = toFraction(px, py - lift);
    state.scopeTarget = f;
    if (reducedMotion) state.scope = { ...f };
    if (!reducedMotion && !touch) {
      state.tilt = { x: ((px - width / 2) / width) * -8, y: ((py - height / 2) / height) * -6 };
    }
    updateMicroButton();
    requestDraw();
  };
  const onPointerDown = (e) => {
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {
      // Not an active pointer (synthetic events); capture is only a convenience.
    }
    // A new first finger (or the mouse) means any pointer still listed lost its "up" event:
    // forget it, so a plain tap is never mistaken for a pinch.
    if (e.isPrimary) pointers.clear();
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: state.zoom };
      downAt = null;
    } else {
      downAt = { ...local(e), time: e.timeStamp, type: e.pointerType };
      downAt.last = { x: downAt.x, y: downAt.y };
      state.pointerInside = true;
      // Touch: wait to see whether this is a tap (mark here) or a drag (lens above the finger).
      if (e.pointerType !== 'touch' && !state.micro) setScopeFromPointer(downAt.x, downAt.y, false);
    }
  };
  const onPointerMove = (e) => {
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinchStart && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (state.micro) {
        // Pinching the slide steps through the objectives.
        if (d / pinchStart.d > 1.35) {
          stepObjective(1);
          pinchStart = { ...pinchStart, d };
        } else if (d / pinchStart.d < 0.74) {
          stepObjective(-1);
          pinchStart = state.micro ? { ...pinchStart, d } : null;
        }
      } else setZoom(pinchStart.zoom * (d / pinchStart.d) ** 1.6);
      return;
    }
    if (state.micro) {
      // Drag moves the slide.
      if (downAt && pointers.has(e.pointerId)) {
        panMicro(p.x - downAt.last.x, p.y - downAt.last.y);
        downAt.last = p;
      }
      return;
    }
    if (e.pointerType === 'touch' && downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) < 10) return;
    state.pointerInside = true;
    setScopeFromPointer(p.x, p.y, e.pointerType === 'touch');
  };
  const onPointerUp = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (!downAt) return;
    const p = local(e);
    const moved = Math.hypot(p.x - downAt.x, p.y - downAt.y);
    // A touch that did not move is a tap, however long a busy phone took to report it.
    if (state.micro) {
      if (moved < 10) markMicro(downAt.x, downAt.y);
      downAt = null;
      return;
    }
    // Mouse: a click marks under the crosshair. Touch: a quick tap marks where the finger
    // touched; after a drag, the "Mark at crosshair" button marks under the lifted lens.
    if (moved < 10 && downAt.type === 'touch') {
      setScopeFromPointer(downAt.x, downAt.y, false);
      state.scope = { ...state.scopeTarget };
      markAt(state.scopeTarget.x, state.scopeTarget.y);
    } else if (moved < 10 && downAt.type !== 'touch') markAt(state.scopeTarget.x, state.scopeTarget.y);
    downAt = null;
  };
  const onPointerLeave = () => {
    if (pointers.size) return;
    state.pointerInside = false;
    state.tilt = { x: 0, y: 0 };
    requestDraw();
  };
  const setZoom = (z) => {
    // Zooming in past the scope's limit over a spot with a micrograph opens the microscope.
    if (z > ZOOM_MAX && state.zoom >= ZOOM_MAX && state.phase === 'inspect' && !state.micro) {
      const f = findingUnderScope();
      if (f) {
        enterMicro(f);
        return;
      }
    }
    if (state.micro) return;
    state.zoom = clamp(Math.round(z * 100) / 100, ZOOM_MIN, ZOOM_MAX);
    const slider = side.querySelector('[data-zoom]');
    if (slider && Number(slider.value) !== zoomToSlider(state.zoom)) slider.value = String(zoomToSlider(state.zoom));
    slider?.setAttribute('aria-valuetext', formatZoom(state.zoom));
    const label = side.querySelector('.insp__zoom strong');
    if (label) label.textContent = formatZoom(state.zoom);
    const tip = side.querySelector('.insp__tip');
    if (tip && state.zoom >= 2) tip.remove();
    requestDraw();
  };
  const onWheel = (e) => {
    e.preventDefault();
    if (state.micro) {
      if (!state.micro.anim) stepObjective(e.deltaY < 0 ? 1 : -1);
      return;
    }
    setZoom(state.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  };
  const onKey = (e) => {
    if (state.micro) {
      const px = e.shiftKey ? 60 : 20;
      const pans = { ArrowLeft: [px, 0], ArrowRight: [-px, 0], ArrowUp: [0, px], ArrowDown: [0, -px] };
      if (pans[e.key]) {
        e.preventDefault();
        panMicro(pans[e.key][0], pans[e.key][1]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        markMicro(state.micro.cx, state.micro.cy);
      } else if (['1', '2', '3', '4'].includes(e.key)) setObjective(OBJECTIVES[Number(e.key) - 1]);
      else if (e.key === '+' || e.key === '=') stepObjective(1);
      else if (e.key === '-') stepObjective(-1);
      else if (e.key === '[') setFocus(state.micro.focus - 3);
      else if (e.key === ']') setFocus(state.micro.focus + 3);
      else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        exitMicro();
      } else if (e.key.toLowerCase() === 'h') takeHint();
      return;
    }
    if (e.key.toLowerCase() === 'm') {
      const f = findingUnderScope();
      if (f) enterMicro(f);
      return;
    }
    const step = e.shiftKey ? 0.08 : 0.025;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key] && state.phase === 'inspect') {
      e.preventDefault();
      state.pointerInside = true;
      state.scopeTarget = { x: clamp(state.scopeTarget.x + moves[e.key][0], 0, 1), y: clamp(state.scopeTarget.y + moves[e.key][1], 0, 1) };
      if (reducedMotion) state.scope = { ...state.scopeTarget };
      updateMicroButton();
      requestDraw();
    } else if ((e.key === 'Enter' || e.key === ' ') && state.phase === 'inspect') {
      e.preventDefault();
      markAt(state.scopeTarget.x, state.scopeTarget.y);
    } else if (e.key === '+' || e.key === '=') setZoom(state.zoom * 1.25);
    else if (e.key === '-') setZoom(state.zoom / 1.25);
    else if (e.key.toLowerCase() === 'h') takeHint();
  };
  const onSideClick = (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    if (target.dataset.choice) choose(target.dataset.choice);
    else if (target.hasAttribute('data-next')) nextRound();
    else if (target.hasAttribute('data-mark')) markAt(state.scopeTarget.x, state.scopeTarget.y);
    else if (target.hasAttribute('data-hint')) takeHint();
    else if (target.hasAttribute('data-blink')) {
      // Calibration: flip between the healthy base and the original photo to check the alignment.
      state.blink = !state.blink;
      renderSide();
      requestDraw();
    } else if (target.dataset.preview) {
      // Calibration: see the leaf as a player would at this magnification.
      state.pointerInside = true;
      setZoom(Number(target.dataset.preview));
    }
    else if (target.dataset.micro) enterMicro(round().findings.find((f) => f.id === target.dataset.micro));
    else if (target.hasAttribute('data-micro-open')) {
      const f = findingUnderScope();
      if (f) enterMicro(f);
    } else if (target.dataset.objective) setObjective(Number(target.dataset.objective));
    else if (target.hasAttribute('data-micro-mark') && state.micro) markMicro(state.micro.cx, state.micro.cy);
    else if (target.hasAttribute('data-micro-back')) exitMicro();
  };
  const onSideInput = (e) => {
    if (e.target.matches('[data-zoom]')) {
      // The slider snaps to round magnifications (1×, 2×, 3×, 5×, 10×, 20×) when it is close.
      const z = sliderToZoom(Number(e.target.value));
      setZoom(NICE_ZOOMS.find((n) => Math.abs(n - z) / n < 0.03) ?? z);
    }
    else if (e.target.matches('[data-focus]')) setFocus(Number(e.target.value));
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('keydown', onKey);
  canvas.addEventListener('focus', kick);
  canvas.addEventListener('blur', kick);
  side.addEventListener('click', onSideClick);
  side.addEventListener('input', onSideInput);
  microBar.addEventListener('click', onSideClick);
  microBar.addEventListener('input', onSideInput);
  microBack.addEventListener('click', onSideClick);

  /* Timer */
  const timer = state.timeLeft !== null && !calibrate
    ? setInterval(() => {
        if (state.phase === 'done') return;
        state.timeLeft = Math.max(0, state.timeLeft - 1);
        if (state.timeLeft > 0 && state.timeLeft <= 10 && state.timeLeft !== lastTick) {
          lastTick = state.timeLeft;
          onSound('tick');
        }
        renderHud();
        if (state.timeLeft === 0) {
          say("Time's up!", 'warn');
          finish();
        }
      }, 1000)
    : null;

  /* Start */
  root.classList.add('is-entering');
  resize();
  renderHud();
  renderSide();
  prepareRound().then(prepareNext);

  return {
    destroy() {
      state.destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      clearInterval(timer);
      clearTimeout(say.timer);
      observer?.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('focus', kick);
      canvas.removeEventListener('blur', kick);
      side.removeEventListener('click', onSideClick);
      side.removeEventListener('input', onSideInput);
      microBar.removeEventListener('click', onSideClick);
      microBar.removeEventListener('input', onSideInput);
      microBack.removeEventListener('click', onSideClick);
      root.remove();
      // Let the browser free the photos, micrographs and canvas memory at once.
      state.images = {};
      state.microImages = {};
      canvas.width = 0;
      canvas.height = 0;
    },
    /** For tests and debugging. */
    getAnswers: () => JSON.parse(JSON.stringify(answers)),
  };
}
