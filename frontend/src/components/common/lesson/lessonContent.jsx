/**
 * Lesson content pipeline: sanitise → enhance → render.
 *
 * 1. The stored HTML goes through the allow-list sanitiser (utils/richText.js).
 * 2. The resulting DOM is enhanced for reading, without touching stored data:
 *    - a list the editor marked as learning objectives or key terms
 *      (<ul class="lesson-objectives"> / <ul class="lesson-key-terms">)
 *      becomes a labelled box;
 *    - lessons imported before those markers existed used plain headings
 *      ("Learning outcomes", "Key terms"); those sections become the same
 *      boxes so they keep looking right. New content never depends on
 *      heading text;
 *    - every image becomes a figure plate; a caption paragraph that follows
 *      an imported image ("Figure 4. …") moves into its figcaption;
 *    - sections get ids and numbers for the "On this page" list.
 * 3. The DOM is turned into React elements, swapping in components for
 *    callouts, videos, figure plates and boxes.
 *
 * Everything added in step 2 uses elements the sanitiser would never let
 * through from stored content (ASIDE, internal data attributes), so stored
 * HTML cannot impersonate them.
 */
import { createElement } from 'react';
import { colorStyleToObject } from '../../../utils/cssColor.js';
import { ALLOWED_TAGS, LESSON_LIST_STYLES, ownRule, sanitizeRichHtml } from '../../../utils/richText.js';
import Callout from '../Callout.jsx';
import VideoEmbed from '../VideoEmbed.jsx';

/** Box kinds and their labels. */
export const LESSON_BOXES = Object.freeze({
  objectives: 'Learning objectives',
  terms: 'Key terms',
});
const BOX_FOR_CLASS = { [LESSON_LIST_STYLES.OBJECTIVES]: 'objectives', [LESSON_LIST_STYLES.KEY_TERMS]: 'terms' };

/* Legacy, imported lessons only: section headings that were boxes in the source documents. */
const LEGACY_BOX_HEADINGS = [
  [/^learning (outcomes|objectives)$/i, 'objectives'],
  [/^key terms$/i, 'terms'],
];
const BACK_MATTER_HEADINGS = /^(references|references and reading list|sources|reading list)$/i;
const FIGURE_CAPTION = /^Figure\s+\d+[.:]\s*/;

const text = (node) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
const isList = (node) => node?.tagName === 'UL' || node?.tagName === 'OL';

function makeBox(root, kind, label) {
  const box = root.ownerDocument.createElement('aside');
  box.dataset.lessonBox = kind;
  box.dataset.label = label;
  return box;
}

/** <ul class="lesson-objectives"> and <ul class="lesson-key-terms"> → labelled boxes. */
function wrapMarkedLists(root) {
  for (const list of [...root.querySelectorAll('ul[class]')]) {
    const kind = BOX_FOR_CLASS[list.getAttribute('class')];
    if (!kind || list.parentElement?.closest?.('aside[data-lesson-box]')) continue;
    const box = makeBox(root, kind, LESSON_BOXES[kind]);
    list.replaceWith(box);
    box.append(list);
  }
}

/** Imported lessons: "Learning outcomes" / "Key terms" sections → the same boxes. */
function wrapLegacySections(root) {
  for (const heading of [...root.children].filter((node) => node.tagName === 'H2')) {
    const match = LEGACY_BOX_HEADINGS.find(([pattern]) => pattern.test(text(heading)));
    if (!match) continue;
    const members = [];
    let next = heading.nextElementSibling;
    while (next && (next.tagName === 'P' || isList(next))) {
      members.push(next);
      next = next.nextElementSibling;
    }
    if (!members.some(isList)) continue;
    const box = makeBox(root, match[1], text(heading));
    heading.replaceWith(box);
    box.append(...members);
  }
}

/** "References" is back matter: no section number, smaller list. */
function markBackMatter(root) {
  for (const heading of [...root.children].filter((node) => node.tagName === 'H2')) {
    if (!BACK_MATTER_HEADINGS.test(text(heading))) continue;
    heading.dataset.unnumbered = 'true';
    let next = heading.nextElementSibling;
    while (next && next.tagName !== 'H2') {
      if (isList(next)) next.classList.add('lesson-refs');
      next = next.nextElementSibling;
    }
  }
}

/**
 * Every image becomes a figure plate. Figures from the editor already are;
 * a bare image (top level, or alone in a paragraph) is wrapped, taking the
 * following "Figure N. …" paragraph as its caption when there is one.
 * Images inside running text are left inline.
 */
function wrapFigures(root) {
  const doc = root.ownerDocument;
  for (const img of [...root.querySelectorAll('img')]) {
    if (img.closest('figure')) continue;
    const parent = img.parentElement;
    const isTopLevel = img.parentNode === root;
    const isAlone = parent?.tagName === 'P' && parent.parentNode === root && text(parent) === '' && parent.querySelectorAll('img').length === 1;
    if (!isTopLevel && !isAlone) continue;
    const block = isTopLevel ? img : parent;
    const figure = doc.createElement('figure');
    figure.dataset.layout = img.getAttribute('data-layout') ?? 'center';
    block.replaceWith(figure);
    figure.append(img);

    const next = figure.nextElementSibling;
    if (next?.tagName === 'P' && FIGURE_CAPTION.test(text(next)) && !next.querySelector('img')) {
      const caption = doc.createElement('figcaption');
      // A caption wrapped wholly in <em> loses the wrapper: captions have their own style.
      const only = next.children.length === 1 && text(next.children[0]) === text(next) ? next.children[0] : null;
      caption.append(...(only && (only.tagName === 'EM' || only.tagName === 'I') ? only.childNodes : next.childNodes));
      caption.dataset.manual = 'true';
      figure.append(caption);
      next.remove();
    }
  }
}

/**
 * Number figures the way the editor does (CSS counters there): every figure
 * with a caption of its own gets the next number. A caption that already
 * says "Figure N." (imported lessons) keeps its own number.
 */
function numberFigures(root) {
  let count = 0;
  for (const figure of root.querySelectorAll('figure')) {
    const caption = figure.querySelector('figcaption');
    if (!caption || text(caption) === '') {
      caption?.remove();
      continue;
    }
    if (caption.dataset.manual) {
      const match = text(caption).match(FIGURE_CAPTION);
      if (match) caption.dataset.number = match[0].trim().replace(/[.:]$/, '').replace(/^Figure\s+/, '');
      continue;
    }
    count += 1;
    caption.dataset.number = String(count);
  }
}

/** Section ids and numbers, matching the CSS counters (1, 1.1). */
function outlineHeadings(root) {
  const outline = [];
  let section = 0;
  let subsection = 0;
  let unnumbered = 0;
  for (const heading of [...root.children].filter((node) => node.tagName === 'H2' || node.tagName === 'H3')) {
    if (heading.tagName === 'H2') {
      if (heading.dataset.unnumbered) {
        unnumbered += 1;
        heading.id = `section-extra-${unnumbered}`;
        outline.push({ id: heading.id, number: '', title: text(heading) });
        continue;
      }
      section += 1;
      subsection = 0;
      heading.id = `section-${section}`;
      outline.push({ id: heading.id, number: String(section), title: text(heading) });
    } else {
      subsection += 1;
      heading.id = `section-${section}-${subsection}`;
    }
  }
  return outline;
}

/**
 * Sanitise and enhance lesson HTML.
 * @returns {{ root: DocumentFragment | null, outline: { id: string, number: string, title: string }[] }}
 */
export function prepareLessonContent(html) {
  if (typeof window === 'undefined') return { root: null, outline: [] };
  const template = document.createElement('template');
  template.innerHTML = sanitizeRichHtml(html);
  const root = template.content;
  wrapMarkedLists(root);
  wrapLegacySections(root);
  markBackMatter(root);
  wrapFigures(root);
  numberFigures(root);
  return { root, outline: outlineHeadings(root) };
}

const VOID_TAGS = new Set(['BR', 'HR', 'IMG']);

function childrenOf(node, context) {
  return [...node.childNodes].map((child, index) => toReact(child, index, context)).filter((child) => child !== null);
}

/** A key-terms list as a definition list: the bold lead is the term, the rest its meaning. */
function renderTerms(list, context) {
  return (
    <dl className="lesson-terms">
      {[...list.children].map((item, index) => {
        const holder = item.children.length === 1 && item.children[0].tagName === 'P' ? item.children[0] : item;
        const lead = holder.firstElementChild;
        const startsWithTerm = lead && (lead.tagName === 'STRONG' || lead.tagName === 'B') && holder.firstChild === lead;
        if (!startsWithTerm) {
          return <div key={index} className="lesson-terms__row"><dd>{childrenOf(holder, context)}</dd></div>;
        }
        // The meaning, without the ": " that joined it to the term.
        const meaning = [...holder.childNodes].slice(1).map((child, i) =>
          i === 0 && child.nodeType === Node.TEXT_NODE
            ? child.nodeValue.replace(/^\s*[:–—-]\s*/, '')
            : toReact(child, i, context),
        );
        return (
          <div key={index} className="lesson-terms__row">
            <dt>{childrenOf(lead, context)}</dt>
            <dd>{meaning.filter((child) => child !== null && child !== '')}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function renderBox(node, key, context) {
  const kind = node.dataset.lessonBox;
  const label = node.dataset.label;
  return (
    <aside key={key} className={`lesson-box lesson-box--${kind}`} aria-label={label}>
      <p className="lesson-box__label">{label}</p>
      {[...node.childNodes].map((child, index) => {
        if (kind === 'terms' && isList(child)) return <div key={index}>{renderTerms(child, context)}</div>;
        return toReact(child, index, context);
      })}
    </aside>
  );
}

function renderFigure(node, key, context) {
  const img = node.querySelector('img');
  const caption = node.querySelector('figcaption');
  const number = caption?.dataset.number;
  const captionText = caption ? text(caption).replace(FIGURE_CAPTION, '') : '';
  const alt = img?.getAttribute('alt') ?? '';
  const label = number ? `Figure ${number}` : 'figure';

  let captionNode = null;
  if (caption) {
    const parts = childrenOf(caption, context);
    // Manual captions already start with "Figure N."; style that prefix rather than repeat it.
    if (caption.dataset.manual && typeof parts[0] === 'string') {
      const match = parts[0].match(FIGURE_CAPTION);
      if (match) parts[0] = parts[0].slice(match[0].length);
    }
    captionNode = (
      <figcaption>
        {number && <span className="lesson-figure__num">Figure {number}. </span>}
        {parts}
      </figcaption>
    );
  }

  const image = img ? toReact(img, 'img', context) : null;
  return (
    <figure key={key} className="lesson-figure" data-layout={node.dataset.layout ?? 'center'}>
      {image && context.onZoom ? (
        <button
          type="button"
          className="lesson-figure__zoom"
          aria-label={`Enlarge ${label}${captionText || alt ? `: ${captionText || alt}` : ''}`}
          onClick={(event) => context.onZoom({ src: img.getAttribute('src'), alt, number, caption: captionText, opener: event.currentTarget })}
        >
          {image}
        </button>
      ) : image}
      {captionNode}
    </figure>
  );
}

/** Convert one sanitised (and enhanced) DOM node into React elements. */
function toReact(node, key, context) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName;
  if (tag === 'ASIDE' && node.dataset.lessonBox) return renderBox(node, key, context);
  if (tag === 'FIGURE') return renderFigure(node, key, context);

  const rules = ownRule(ALLOWED_TAGS, tag);
  if (!rules) return null;

  if (tag === 'DIV' && node.hasAttribute('data-video')) {
    return <VideoEmbed key={key} provider={node.getAttribute('data-video')} videoId={node.getAttribute('data-id')} />;
  }
  if (tag === 'DIV' && node.hasAttribute('data-callout')) {
    return <Callout key={key} variant={node.getAttribute('data-callout')}>{childrenOf(node, context)}</Callout>;
  }

  const children = VOID_TAGS.has(tag) ? null : childrenOf(node, context);
  const props = { key };
  for (const attribute of [...node.attributes]) {
    const { name, value } = attribute;
    if (name === 'href') {
      props.href = value;
      props.target = '_blank';
      props.rel = 'noopener noreferrer nofollow';
    } else if (name === 'class') props.className = value;
    else if (name === 'style') {
      // Text and highlight colour: re-parsed from the validated hex, never passed through.
      const style = colorStyleToObject(tag, value);
      if (style) props.style = style;
    } else props[name] = value;
  }
  if (tag === 'IMG') {
    props.loading = 'lazy';
    props.decoding = 'async';
    props.alt = props.alt ?? '';
  }
  if ((tag === 'H2' || tag === 'H3') && props.id) props.tabIndex = -1;
  // Lesson lists drop the browser bullets; role="list" keeps them announced as lists (Safari/VoiceOver).
  if (tag === 'UL' || tag === 'OL') props.role = 'list';

  return createElement(tag.toLowerCase(), props, children);
}

/** React elements for prepared lesson content. */
export function renderLessonContent(root, { onZoom } = {}) {
  if (!root) return null;
  return childrenOf(root, { onZoom });
}
