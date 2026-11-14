/**
 * Colour menus for the lesson editor: preset palettes, HSV maths for the
 * colour wheel, the readability check, and the per-browser recent colours.
 *
 * The strict rules for what may be *stored* live in cssColor.js; everything
 * here produces values that already satisfy them (lowercase #rrggbb).
 */
import { LEGACY_HIGHLIGHTS, normalizeCssColor } from './cssColor.js';

/**
 * Highlights: soft tones dark text stays readable on. The first four are the
 * original palette, at the exact hex their legacy CSS paints, so picking
 * "Yellow" today matches a yellow highlight saved last year.
 */
export const HIGHLIGHT_PRESETS = Object.freeze([
  { name: 'Yellow', hex: LEGACY_HIGHLIGHTS.amber },
  { name: 'Green', hex: LEGACY_HIGHLIGHTS.green },
  { name: 'Blue', hex: LEGACY_HIGHLIGHTS.blue },
  { name: 'Pink', hex: LEGACY_HIGHLIGHTS.pink },
  { name: 'Orange', hex: '#fdd8b5' },
  { name: 'Red', hex: '#f9c6c6' },
  { name: 'Purple', hex: '#e3d3f7' },
  { name: 'Teal', hex: '#bfe9e2' },
  { name: 'Gray', hex: '#e2e5e9' },
  { name: 'Light lime', hex: '#e6f7b8' },
  { name: 'Light cyan', hex: '#cdf3f8' },
  { name: 'Light peach', hex: '#fde3d3' },
]);

/** Text colours, including the app's own brand green (--green-700). */
export const TEXT_PRESETS = Object.freeze([
  { name: 'Black', hex: '#000000' },
  { name: 'Dark gray', hex: '#444b55' },
  { name: 'Gray', hex: '#7a828c' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#c62828' },
  { name: 'Orange', hex: '#e8710a' },
  { name: 'Dark yellow', hex: '#b38600' },
  { name: 'Green', hex: '#2e7d32' },
  { name: 'Blue', hex: '#1a73e8' },
  { name: 'Dark blue', hex: '#1e3a8a' },
  { name: 'Purple', hex: '#7b3fb3' },
  { name: 'Pink', hex: '#d6336c' },
  { name: 'Brown', hex: '#7b4a2a' },
  { name: 'AgriCore green', hex: '#0f7a3a' },
]);

/** What the main half of each button applies before anything has been used. */
export const DEFAULT_COLOR = Object.freeze({ highlight: LEGACY_HIGHLIGHTS.amber, text: '#c62828' });

/** A preset's name for a hex, if it is one. */
export function presetName(kind, hex) {
  const presets = kind === 'highlight' ? HIGHLIGHT_PRESETS : TEXT_PRESETS;
  return presets.find((preset) => preset.hex === hex)?.name ?? null;
}

// ── HSV, for the wheel ──
// h in [0, 360), s and v in [0, 1].

export function hexToHsv(hex) {
  const clean = normalizeCssColor(hex) ?? '#000000';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToHex({ h, s, v }) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

// ── Readability ──

function luminance(hex) {
  const clean = normalizeCssColor(hex) ?? '#000000';
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1–21. */
export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** The lesson page text sits on. */
export const PAPER_COLOR = '#ffffff';

/**
 * Below 3:1 even large text is hard to read (WCAG's large-text threshold).
 * The picker warns, but never blocks: a pale colour can be deliberate.
 */
export const isLowContrastOnPaper = (hex) => contrastRatio(hex, PAPER_COLOR) < 3;

// ── Recent colours, per browser ──

export const RECENT_LIMIT = 6;
const recentKey = (kind) => `agricore.recentColors.${kind}`;

/**
 * Most recently used first. Storage may be unavailable (private mode, quota,
 * blocked cookies), so every access is guarded and falls back to nothing.
 */
export function readRecentColors(kind) {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentKey(kind)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    // Anything stored is treated as untrusted input: re-validated on read.
    return [...new Set(parsed.map(normalizeCssColor).filter(Boolean))].slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function rememberRecentColor(kind, hex) {
  const color = normalizeCssColor(hex);
  if (!color) return readRecentColors(kind);
  const next = [color, ...readRecentColors(kind).filter((item) => item !== color)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(recentKey(kind), JSON.stringify(next));
  } catch {
    // Not persisted this time; the menu still shows it for this session.
  }
  return next;
}
