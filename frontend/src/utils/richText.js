/**
 * Rich lesson content: URL parsing and the sanitiser allow-list.
 *
 * Lesson content is stored as an HTML string (`lessons.contentBody`). It may
 * contain images, callouts and video placeholders, so it is sanitised against a
 * strict tag + attribute allow-list before it is ever rendered.
 *
 * Video is never stored as an <iframe>. The editor stores a neutral placeholder
 * — <div data-video="youtube" data-id="..."> — and the viewer swaps that node
 * for a React <VideoEmbed> that builds a sandboxed player from the validated
 * id, so stored content can never carry executable markup.
 */

export const VIDEO_PROVIDERS = Object.freeze({ YOUTUBE: 'youtube', VIMEO: 'vimeo' });

const YOUTUBE_ID = /^[\w-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

/**
 * Recognise a video URL.
 * @returns {{ provider: string, id: string }|null}
 */
export function parseVideoUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be' && YOUTUBE_ID.test(segments[0] ?? '')) {
    return { provider: VIDEO_PROVIDERS.YOUTUBE, id: segments[0] };
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const fromQuery = url.searchParams.get('v');
    if (fromQuery && YOUTUBE_ID.test(fromQuery)) return { provider: VIDEO_PROVIDERS.YOUTUBE, id: fromQuery };
    const index = segments.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live');
    const candidate = index >= 0 ? segments[index + 1] : null;
    if (candidate && YOUTUBE_ID.test(candidate)) return { provider: VIDEO_PROVIDERS.YOUTUBE, id: candidate };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const candidate = segments.find((part) => VIMEO_ID.test(part));
    if (candidate) return { provider: VIDEO_PROVIDERS.VIMEO, id: candidate };
  }
  return null;
}

/** True when the id is safe to interpolate into a player URL. */
export function isValidVideoId(provider, id) {
  if (provider === VIDEO_PROVIDERS.YOUTUBE) return YOUTUBE_ID.test(String(id ?? ''));
  if (provider === VIDEO_PROVIDERS.VIMEO) return VIMEO_ID.test(String(id ?? ''));
  return false;
}

/** Player URL built from validated parts only — never from stored markup. */
export function videoPlayerUrl(provider, id) {
  if (!isValidVideoId(provider, id)) return null;
  return provider === VIDEO_PROVIDERS.YOUTUBE
    ? `https://www.youtube-nocookie.com/embed/${id}?rel=0`
    : `https://player.vimeo.com/video/${id}`;
}

/** Links may only point at http(s) or mailto. */
export function isSafeLinkUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim(), window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/** Images may be http(s) or an inline data image (our mock uploads). */
export function isSafeImageSrc(value) {
  const raw = String(value ?? '').trim();
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(raw)) return true;
  try {
    const url = new URL(raw, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export const ALIGNMENTS = ['left', 'center', 'right'];
export const IMAGE_LAYOUTS = ['inline', 'center', 'full'];
export const CALLOUT_VARIANTS = ['info', 'warning', 'tip'];
export const HIGHLIGHT_COLORS = ['green', 'amber', 'blue', 'pink'];

const oneOf = (allowed) => (value) => (allowed.includes(value) ? value : null);

/**
 * Allow-list: tag → permitted attributes, each with a validator.
 * Anything not listed here is dropped.
 */
export const ALLOWED_TAGS = Object.freeze({
  P: { 'data-align': oneOf(ALIGNMENTS) },
  H2: { 'data-align': oneOf(ALIGNMENTS) },
  H3: { 'data-align': oneOf(ALIGNMENTS) },
  H4: { 'data-align': oneOf(ALIGNMENTS) },
  UL: {},
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
  MARK: { 'data-color': oneOf(HIGHLIGHT_COLORS) },
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
    'data-video': oneOf(Object.values(VIDEO_PROVIDERS)),
    'data-id': (value) => String(value ?? '').slice(0, 40),
  },
});

/** A <div> only survives when it is a callout or a video placeholder. */
function isAllowedDiv(element) {
  return element.hasAttribute('data-callout') || element.hasAttribute('data-video');
}

/**
 * Sanitise an HTML string against the allow-list.
 * Disallowed elements are unwrapped (their text is kept); all other
 * attributes are removed.
 */
export function sanitizeRichHtml(html) {
  if (typeof window === 'undefined') return '';
  const template = document.createElement('template');
  template.innerHTML = html ?? '';

  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }
      const rules = ALLOWED_TAGS[child.tagName];
      const allowed = rules && (child.tagName !== 'DIV' || isAllowedDiv(child));
      if (!allowed) {
        clean(child);
        child.replaceWith(...child.childNodes);
        return;
      }
      for (const attribute of [...child.attributes]) {
        const validate = rules[attribute.name];
        const value = validate ? validate(attribute.value) : null;
        if (value === null || value === undefined) child.removeAttribute(attribute.name);
        else child.setAttribute(attribute.name, value);
      }
      // A video placeholder must carry a valid id, or it is dropped entirely.
      if (child.tagName === 'DIV' && child.hasAttribute('data-video')) {
        if (!isValidVideoId(child.getAttribute('data-video'), child.getAttribute('data-id'))) {
          child.remove();
          return;
        }
        child.textContent = '';
        return;
      }
      if (child.tagName === 'IMG' && !child.getAttribute('src')) {
        child.remove();
        return;
      }
      clean(child);
    });
  };

  clean(template.content);
  return template.innerHTML;
}
