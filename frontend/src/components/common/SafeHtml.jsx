import { useMemo } from 'react';

const ALLOWED_TAGS = new Set(['H2', 'H3', 'P', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'BLOCKQUOTE', 'BR']);

/** Keep only allowed tags and drop every attribute. */
export function sanitizeHtml(html) {
  if (typeof window === 'undefined') return '';
  const template = document.createElement('template');
  template.innerHTML = html ?? '';

  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!ALLOWED_TAGS.has(child.tagName)) {
          clean(child);
          child.replaceWith(...child.childNodes);
          return;
        }
        [...child.attributes].forEach((attribute) => child.removeAttribute(attribute.name));
        clean(child);
      } else if (child.nodeType !== Node.TEXT_NODE) {
        child.remove();
      }
    });
  };
  clean(template.content);
  return template.innerHTML;
}

/** Plain-text summary: the first paragraph of the lesson content. */
export function summarizeHtml(html, maxLength = 150) {
  const match = /<p>(.*?)<\/p>/s.exec(html ?? '');
  const text = (match ? match[1] : html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

export default function SafeHtml({ html, className = '' }) {
  const clean = useMemo(() => sanitizeHtml(html), [html]);
  // eslint-disable-next-line react/no-danger -- content is sanitized to a small tag allow-list
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
