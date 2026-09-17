import { createElement, useMemo } from 'react';
import { ALLOWED_TAGS, sanitizeRichHtml } from '../../utils/richText.js';
import Callout from './Callout.jsx';
import VideoEmbed from './VideoEmbed.jsx';

/** Sanitise lesson HTML against the allow-list in utils/richText.js. */
export function sanitizeHtml(html) {
  return sanitizeRichHtml(html);
}

/** Plain-text summary: the first paragraph of the lesson content. */
export function summarizeHtml(html, maxLength = 150) {
  const match = /<p[^>]*>(.*?)<\/p>/s.exec(html ?? '');
  const text = (match ? match[1] : html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

const VOID_TAGS = new Set(['BR', 'HR', 'IMG']);

/**
 * Convert a sanitised DOM node into React elements.
 *
 * Rendering through React (rather than dangerouslySetInnerHTML) is what lets
 * video placeholders and callouts become real components while keeping the
 * stored markup free of iframes and scripts.
 */
function toReact(node, key) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName;
  const rules = ALLOWED_TAGS[tag];
  if (!rules) return null;

  const children = VOID_TAGS.has(tag)
    ? null
    : [...node.childNodes].map((child, index) => toReact(child, index)).filter((child) => child !== null);

  // Video placeholder → real player.
  if (tag === 'DIV' && node.hasAttribute('data-video')) {
    return (
      <VideoEmbed
        key={key}
        provider={node.getAttribute('data-video')}
        videoId={node.getAttribute('data-id')}
      />
    );
  }

  // Callout box → component, keeping its inner content.
  if (tag === 'DIV' && node.hasAttribute('data-callout')) {
    return (
      <Callout key={key} variant={node.getAttribute('data-callout')}>
        {children}
      </Callout>
    );
  }

  const props = { key };
  for (const attribute of [...node.attributes]) {
    if (attribute.name === 'href') {
      props.href = attribute.value;
      props.target = '_blank';
      props.rel = 'noopener noreferrer nofollow';
    } else if (attribute.name === 'src') props.src = attribute.value;
    else if (attribute.name === 'alt') props.alt = attribute.value;
    else props[attribute.name] = attribute.value;
  }
  if (tag === 'IMG') {
    props.loading = 'lazy';
    props.alt = props.alt ?? '';
    props.className = 'rich-text__image';
  }

  return createElement(tag.toLowerCase(), props, children);
}

/** Renders sanitised lesson content, swapping in components where needed. */
export default function SafeHtml({ html, className = '' }) {
  const content = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const template = document.createElement('template');
    template.innerHTML = sanitizeRichHtml(html);
    return [...template.content.childNodes].map((node, index) => toReact(node, index)).filter(Boolean);
  }, [html]);

  return <div className={`rich-text ${className}`}>{content}</div>;
}
