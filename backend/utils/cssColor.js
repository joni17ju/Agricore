/* Ported verbatim from frontend/src/utils/cssColor.js — the lesson save endpoint
   runs the same colour rules the editor and the viewer do, so edit them together. */
/**
 * Strict colour validation for stored lesson HTML.
 *
 * Ported verbatim to backend/utils/cssColor.js, which runs the same rules in
 * the lesson save endpoint — edit the two together.
 *
 * Text colour and highlight colour are the only inline styles lesson content
 * may carry, and each is allowed in exactly one shape:
 *
 *   <span style="color: #rrggbb">            text colour
 *   <mark style="background-color: #rrggbb">  highlight colour
 *
 * A style attribute survives only when it holds a single declaration of the
 * one property its tag allows, with a value that is a strict hex colour
 * (#rgb, #rrggbb) or an rgb()/rgba() of plain numbers. Anything else — url(),
 * expression(), var(), named colours, !important, comments, escapes, extra
 * chained declarations — removes the whole attribute rather than being
 * trimmed down to a "safe part". Accepted values are rewritten into one
 * canonical form, lowercase #rrggbb, so nothing the author typed is ever
 * echoed back verbatim.
 *
 * No DOM, no window: this has to run unchanged in Node.
 */

/** Longest style attribute considered at all; legitimate ones are ~30 chars. */
export const MAX_STYLE_LENGTH = 80;

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const CHANNEL = '\\s*(\\d{1,3})\\s*';
// rgb()/rgba() with three 0–255 integers and an optional 0–1 alpha. Alpha is
// accepted for compatibility and dropped: the stored form is opaque hex.
const RGB = new RegExp(`^rgba?\\(${CHANNEL},${CHANNEL},${CHANNEL}(?:,\\s*(0|1|0?\\.\\d{1,4}|1\\.0{1,4})\\s*)?\\)$`, 'i');

const toHexPair = (value) => value.toString(16).padStart(2, '0');

/**
 * A colour value in canonical lowercase #rrggbb form, or null if it is not a
 * strict hex or numeric rgb()/rgba() colour.
 */
export function normalizeCssColor(value) {
  const raw = String(value ?? '').trim();
  if (raw.length === 0 || raw.length > 40) return null;

  const hex = HEX.exec(raw);
  if (hex) {
    const digits = hex[1].toLowerCase();
    return digits.length === 3 ? `#${[...digits].map((d) => d + d).join('')}` : `#${digits}`;
  }

  const rgb = RGB.exec(raw);
  if (rgb) {
    const channels = rgb.slice(1, 4).map(Number);
    if (channels.some((channel) => channel > 255)) return null;
    return `#${channels.map(toHexPair).join('')}`;
  }
  return null;
}

/** Which style property each tag may carry. Nothing else carries a style. */
export const STYLE_PROPERTY_BY_TAG = Object.freeze({
  SPAN: 'color',
  MARK: 'background-color',
});

/**
 * The canonical style string for one tag, or null to drop the attribute.
 *
 * @param {string} tagName uppercase tag name, as the DOM reports it
 * @param {string} style the raw style attribute
 */
export function sanitizeColorStyle(tagName, style) {
  const property = STYLE_PROPERTY_BY_TAG[String(tagName).toUpperCase()];
  if (!property) return null;

  const raw = String(style ?? '');
  if (raw.length > MAX_STYLE_LENGTH) return null;

  // Exactly one declaration; a trailing semicolon is fine, a second one is not.
  const declarations = raw.split(';').map((part) => part.trim()).filter(Boolean);
  if (declarations.length !== 1) return null;

  const match = /^([a-z-]+)\s*:\s*([^:]+)$/i.exec(declarations[0]);
  if (!match || match[1].toLowerCase() !== property) return null;

  const color = normalizeCssColor(match[2]);
  return color ? `${property}: ${color}` : null;
}

/**
 * A sanitised style string as a React style object, built from the parsed
 * value rather than handed through, so stored markup can never inject CSS.
 */
export function colorStyleToObject(tagName, style) {
  const clean = sanitizeColorStyle(tagName, style);
  if (!clean) return null;
  const color = clean.slice(clean.indexOf(':') + 1).trim();
  return STYLE_PROPERTY_BY_TAG[String(tagName).toUpperCase()] === 'color'
    ? { color }
    : { backgroundColor: color };
}

/**
 * The four highlight colours lessons were written with before free colour
 * existed. Stored as data-color names; kept valid so that content renders
 * exactly as it always did.
 */
export const LEGACY_HIGHLIGHTS = Object.freeze({
  green: '#c8f0cf',
  amber: '#fde9b0',
  blue: '#c9dcfb',
  pink: '#fbc9dd',
});
