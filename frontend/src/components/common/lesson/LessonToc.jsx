import { useEffect, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Pixels hidden under the sticky top bar, read from the CSS token. */
function topbarOffset() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--topbar-height');
  return (Number.parseFloat(value) || 64) + 32;
}

/**
 * The section currently being read: the last heading whose top has passed the
 * top bar. Scroll handling is throttled to one check per frame.
 */
export function useActiveSection(ids) {
  const key = ids.join('|');
  const [active, setActive] = useState(ids[0] ?? null);

  useEffect(() => {
    const list = key ? key.split('|') : [];
    if (list.length === 0) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const offset = topbarOffset();
      let current = list[0];
      for (const id of list) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top - offset <= 0) current = id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  return active;
}

/** Scroll to a section and move focus to its heading (smooth unless reduced motion is preferred). */
function jumpTo(event, id, after) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
  after?.();
}

function TocList({ outline, active, onNavigate }) {
  return (
    <ol className="lesson-toc__list">
      {outline.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={`lesson-toc__link ${active === item.id ? 'is-current' : ''}`}
            aria-current={active === item.id ? 'location' : undefined}
            onClick={(event) => jumpTo(event, item.id, onNavigate)}
          >
            {item.number && <span className="lesson-toc__num">{item.number}</span>}
            <span>{item.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/** "On this page" as a sticky side list (wide screens). */
export function LessonTocRail({ outline, active }) {
  return (
    <nav className="lesson-toc lesson-toc--rail" aria-label="On this page">
      <p className="lesson-toc__label">On this page</p>
      <TocList outline={outline} active={active} />
    </nav>
  );
}

/** "On this page" as a collapsible list above the article (laptop and phone widths). */
export function LessonTocDropdown({ outline, active }) {
  const [open, setOpen] = useState(false);
  const current = outline.find((item) => item.id === active);
  return (
    <nav className="lesson-toc lesson-toc--drop" aria-label="On this page">
      <button
        type="button"
        className="lesson-toc__summary"
        aria-expanded={open}
        aria-controls="lesson-toc-drop-list"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="lesson-toc__label">On this page</span>
        <span className="lesson-toc__current">
          {current ? `${current.number ? `${current.number}  ` : ''}${current.title}` : `${outline.length} sections`}
        </span>
        <svg className="lesson-toc__chevron" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div id="lesson-toc-drop-list" className="lesson-toc__panel" hidden={!open}>
        <TocList outline={outline} active={active} onNavigate={() => setOpen(false)} />
      </div>
    </nav>
  );
}
