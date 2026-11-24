import { useMemo } from 'react';
import { sanitizeRichHtml } from '../../utils/richText.js';
import { prepareLessonContent, renderLessonContent } from './lesson/lessonContent.jsx';

/** Sanitise lesson HTML against the allow-list in utils/richText.js. */
export function sanitizeHtml(html) {
  return sanitizeRichHtml(html);
}

/**
 * Plain-text summary for topic cards: the first real paragraph of the lesson.
 * Lead-in lines that end with a colon ("By the end of this lesson, you should
 * be able to:") introduce a list rather than summarise the lesson, so they
 * are skipped.
 */
export function summarizeHtml(html, maxLength = 150) {
  const paragraphs = [...String(html ?? '').matchAll(/<p[^>]*>(.*?)<\/p>/gs)]
    .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const text = paragraphs.find((p) => !p.endsWith(':')) ?? paragraphs[0] ?? String(html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

/**
 * Renders lesson content in the shared lesson reading style (see
 * components/common/lesson/). Lesson pages that also need the outline or
 * enlargeable figures use LessonDocument, which runs the same pipeline.
 */
export default function SafeHtml({ html, className = '', onZoom }) {
  const content = useMemo(() => renderLessonContent(prepareLessonContent(html).root, { onZoom }), [html, onZoom]);
  return <div className={`rich-text lesson-prose ${className}`}>{content}</div>;
}
