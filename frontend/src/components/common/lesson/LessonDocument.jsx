import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon.jsx';
import MediaAsset from '../../illustrations/MediaAsset.jsx';
import FigureDialog from './FigureDialog.jsx';
import { LessonTocDropdown, LessonTocRail, useActiveSection } from './LessonToc.jsx';
import { prepareLessonContent, renderLessonContent } from './lessonContent.jsx';

/**
 * The lesson reading layout, shared by the student lesson page and the
 * instructor's "Student view".
 *
 * A container query (not the viewport) picks the grid, because the app
 * sidebar and the mission panel both change the width available:
 *   wide    — "On this page" rail | article | side panel
 *   medium  — article | side panel, with "On this page" as a dropdown
 *   narrow  — one column; the side panel follows the article
 *
 * @param {string} kicker            small letter-spaced label, e.g. "Module 4 · Topic 3"
 * @param {string} [context]         muted text after the kicker, e.g. the module title
 * @param {React.ReactNode} [aside]  the side panel (student mission panel)
 * @param {boolean} [asideClosed]    the side panel is collapsed to its tab
 * @param {React.ReactNode} [afterContent] shown at the end of the article
 * @param {React.ReactNode} [footer] shown under the article
 */
export default function LessonDocument({
  kicker,
  context,
  title,
  titleAs: Title = 'h1',
  html,
  mediaAssets = [],
  aside = null,
  asideClosed = false,
  afterContent = null,
  footer = null,
}) {
  const [zoomed, setZoomed] = useState(null);
  const closeZoom = useCallback(() => setZoomed(null), []);
  const { root, outline } = useMemo(() => prepareLessonContent(html), [html]);
  const content = useMemo(() => renderLessonContent(root, { onZoom: setZoomed }), [root]);
  const active = useActiveSection(outline.map((item) => item.id));
  const hasToc = outline.length > 1;

  return (
    <div className="lesson-doc">
      <div className={['lesson-doc__grid', hasToc ? 'has-toc' : '', aside ? 'has-aside' : '', asideClosed ? 'is-aside-closed' : ''].filter(Boolean).join(' ')}>
        {hasToc && (
          <div className="lesson-doc__toc">
            <LessonTocRail outline={outline} active={active} />
          </div>
        )}

        <div className="lesson-doc__main">
          <article className="lesson-sheet" aria-labelledby="lesson-title">
            <div className="lesson-sheet__inner">
              <header className="lesson-head">
                <p className="lesson-head__kicker">
                  <span>{kicker}</span>
                  {context && <span className="lesson-head__context">{context}</span>}
                </p>
                <Title id="lesson-title" className="lesson-head__title">{title}</Title>
              </header>

              {hasToc && <LessonTocDropdown outline={outline} active={active} />}

              <div className="rich-text lesson-prose">{content}</div>

              {mediaAssets.length > 0 && (
                <section className="lesson-plates" aria-label="Illustrations">
                  <p className="lesson-plates__label">Illustrations</p>
                  <div className="lesson-plates__grid">
                    {mediaAssets.map((asset) => <MediaAsset key={asset.assetId} asset={asset} />)}
                  </div>
                </section>
              )}

              {afterContent}
            </div>
          </article>
          {footer}
        </div>

        {aside && <div className="lesson-doc__aside">{aside}</div>}
      </div>

      <FigureDialog figure={zoomed} onClose={closeZoom} />
    </div>
  );
}

/**
 * Footer under a lesson: previous and next topic with their titles, and the
 * page's main action between them.
 *
 * @param {{ to: string, title: string } | null} previous
 * @param {{ to: string, title: string } | null} next
 */
export function LessonFooter({ previous, next, action = null, note = null, previousLabel = 'Previous topic', nextLabel = 'Next topic' }) {
  return (
    <nav className="lesson-foot" aria-label="Topic navigation">
      <div className="lesson-foot__side">
        {previous && (
          <Link to={previous.to} className="lesson-foot__link">
            <span className="lesson-foot__dir"><Icon name="arrow-left" size={14} /> {previousLabel}</span>
            <span className="lesson-foot__title">{previous.title}</span>
          </Link>
        )}
      </div>
      <div className="lesson-foot__action">{action}</div>
      {note && <p className="lesson-foot__note">{note}</p>}
      <div className="lesson-foot__side lesson-foot__side--next">
        {next && (
          <Link to={next.to} className="lesson-foot__link">
            <span className="lesson-foot__dir">{nextLabel} <Icon name="arrow-right" size={14} /></span>
            <span className="lesson-foot__title">{next.title}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
