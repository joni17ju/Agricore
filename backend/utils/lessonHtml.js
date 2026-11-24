/**
 * Server-side sanitising of lesson content (lessons.contentBody).
 *
 * Ported from sanitizeRichHtml and its allow-list in
 * frontend/src/utils/richText.js, which the editor runs before saving and the
 * viewer runs again before rendering. Running the same allow-list here means a
 * request crafted to skip the editor — curl, a modified client — still cannot
 * store markup the app would never produce: event handlers, iframes, scripts,
 * or styles beyond the two strictly-shaped colour declarations. Keep the two
 * allow-lists in step.
 *
 * There is no DOM in Node, and a sanitiser built from regular expressions over
 * HTML is exactly the kind that gets bypassed, so the markup is parsed with
 * htmlparser2 — a spec-tolerant parser, and the one sanitize-html is built on —
 * and serialised back with dom-serializer in UTF-8 mode, which produces the
 * same bytes as the browser's own serialisation. Content that already went
 * through the editor's sanitiser therefore comes back unchanged.
 */
import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import { isTag, isText } from 'domhandler';
import { LEGACY_HIGHLIGHTS, sanitizeColorStyle } from './cssColor.js';

const VIDEO_PROVIDERS = ['youtube', 'vimeo'];
const YOUTUBE_ID = /^[\w-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;
const ALIGNMENTS = ['left', 'center', 'right'];
const IMAGE_LAYOUTS = ['inline', 'center', 'full'];
const CALLOUT_VARIANTS = ['info', 'warning', 'tip'];
// Lists the editor marks as the learning-objectives box or the key-terms list.
const LESSON_LIST_CLASSES = ['lesson-objectives', 'lesson-key-terms'];
const HIGHLIGHT_COLORS = Object.keys(LEGACY_HIGHLIGHTS);

// Relative links are resolved against a placeholder origin, as the browser
// resolves them against the page's — only the protocol is being judged.
const BASE = 'https://agricore.invalid';

function isValidVideoId(provider, id) {
  if (provider === 'youtube') return YOUTUBE_ID.test(String(id ?? ''));
  if (provider === 'vimeo') return VIMEO_ID.test(String(id ?? ''));
  return false;
}

function isSafeLinkUrl(value) {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(String(value ?? '').trim(), BASE).protocol);
  } catch {
    return false;
  }
}

function isSafeImageSrc(value) {
  const raw = String(value ?? '').trim();
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(raw)) return true;
  try {
    return ['http:', 'https:'].includes(new URL(raw, BASE).protocol);
  } catch {
    return false;
  }
}

const oneOf = (allowed) => (value) => (allowed.includes(value) ? value : null);

/** Tag → permitted attributes, each with a validator. Mirrors ALLOWED_TAGS. */
const ALLOWED_TAGS = Object.freeze({
  P: { 'data-align': oneOf(ALIGNMENTS) },
  H2: { 'data-align': oneOf(ALIGNMENTS) },
  H3: { 'data-align': oneOf(ALIGNMENTS) },
  H4: { 'data-align': oneOf(ALIGNMENTS) },
  UL: { class: oneOf(LESSON_LIST_CLASSES) },
  OL: {},
  LI: {},
  STRONG: {},
  B: {},
  EM: {},
  I: {},
  U: {},
  S: {},
  BR: {},
  HR: {},
  BLOCKQUOTE: {},
  MARK: { 'data-color': oneOf(HIGHLIGHT_COLORS), style: (value) => sanitizeColorStyle('MARK', value) },
  SPAN: { style: (value) => sanitizeColorStyle('SPAN', value) },
  A: { href: (value) => (isSafeLinkUrl(value) ? value : null) },
  IMG: {
    src: (value) => (isSafeImageSrc(value) ? value : null),
    alt: (value) => String(value ?? '').slice(0, 300),
    'data-layout': oneOf(IMAGE_LAYOUTS),
  },
  FIGURE: { 'data-layout': oneOf(IMAGE_LAYOUTS) },
  FIGCAPTION: {},
  DIV: {
    'data-callout': oneOf(CALLOUT_VARIANTS),
    'data-video': oneOf(VIDEO_PROVIDERS),
    'data-id': (value) => String(value ?? '').slice(0, 40),
  },
});

/**
 * Elements removed together with their contents. Everywhere else a disallowed
 * element is unwrapped and its text kept, as the editor's sanitiser does; the
 * body of a script or a stylesheet is never lesson text, so it goes entirely.
 */
const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE']);

/** Own properties only: a lookup must never land on Object.prototype. */
const own = (object, key) => (Object.hasOwn(object, key) ? object[key] : undefined);

function cleanNodes(nodes) {
  const out = [];
  for (const node of nodes) {
    if (isText(node)) {
      out.push(node);
      continue;
    }
    // Comments, doctypes, CDATA and processing instructions are dropped.
    if (!isTag(node)) continue;

    const tag = node.name.toUpperCase();
    if (DROP_WITH_CONTENT.has(tag)) continue;

    const rules = own(ALLOWED_TAGS, tag);
    const isAllowedDiv = tag !== 'DIV' || own(node.attribs, 'data-callout') !== undefined || own(node.attribs, 'data-video') !== undefined;
    if (!rules || !isAllowedDiv) {
      out.push(...cleanNodes(node.children));
      continue;
    }

    for (const name of Object.keys(node.attribs)) {
      const validate = own(rules, name);
      const value = validate ? validate(node.attribs[name]) : null;
      if (value === null || value === undefined) delete node.attribs[name];
      else node.attribs[name] = value;
    }

    if (tag === 'DIV' && own(node.attribs, 'data-video') !== undefined) {
      // A video placeholder must carry a valid id, and holds nothing else.
      if (!isValidVideoId(node.attribs['data-video'], node.attribs['data-id'])) continue;
      node.children = [];
      out.push(node);
      continue;
    }
    if (tag === 'IMG' && !node.attribs.src) continue;

    node.children = cleanNodes(node.children);
    out.push(node);
  }
  return out;
}

/**
 * Sanitise lesson HTML against the allow-list.
 * Non-string input becomes an empty string rather than being stored as-is.
 */
export function sanitizeLessonHtml(html) {
  if (typeof html !== 'string' || html.length === 0) return '';
  const document = parseDocument(html, { decodeEntities: true });
  return render(cleanNodes(document.children), { encodeEntities: 'utf8' });
}
