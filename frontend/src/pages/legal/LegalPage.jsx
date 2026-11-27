import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { CONTACT_ADDRESS, CONTACT_EMAIL, LAST_UPDATED, LEGAL_DOCUMENTS } from './legalText.js';
import './legal.css';

/**
 * /terms and /privacy — public, readable without an account.
 *
 * Both documents share this layout; their wording lives in legalText.js. The
 * register form links here in a new tab, so a half-filled form is never lost.
 *
 * Layout: brand bar, title with "Last updated" and a summary, a table of
 * contents (sticky on the left on desktop, a dropdown on phones) that follows
 * the section being read, numbered sections at a comfortable line length,
 * and a footer with the other document and "Back to top".
 */

/** The section being read: the last one whose heading has passed the top third of the screen. */
function useCurrentSection(ids) {
  const [current, setCurrent] = useState(ids[0]);
  const key = ids.join(',');
  useEffect(() => {
    const list = key.split(',');
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setCurrent(list.at(-1));
        return;
      }
      const line = window.innerHeight * 0.3;
      let found = list[0];
      for (const id of list) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= line) found = id;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key]);
  return current;
}

function Block({ block }) {
  if (typeof block === 'string') return <p>{block}</p>;
  if (block.list) {
    return (
      <ul>
        {block.list.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }
  if (block.contact) {
    return (
      <address className="legal__contact">
        <span><Icon name="mail" size={16} /> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></span>
        <span><Icon name="home" size={16} /> {CONTACT_ADDRESS}</span>
      </address>
    );
  }
  return null;
}

function TableOfContents({ sections, current, onPick }) {
  return (
    <ol className="legal__toc-list">
      {sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className={current === section.id ? 'is-current' : undefined}
            aria-current={current === section.id ? 'location' : undefined}
            onClick={onPick}
          >
            <span className="legal__toc-num">{index + 1}.</span> {section.heading}
          </a>
        </li>
      ))}
    </ol>
  );
}

export default function LegalPage({ doc = 'terms' }) {
  const document = LEGAL_DOCUMENTS[doc] ?? LEGAL_DOCUMENTS.terms;
  const other = doc === 'terms' ? LEGAL_DOCUMENTS.privacy : LEGAL_DOCUMENTS.terms;
  const navigate = useNavigate();
  const ids = document.sections.map((section) => section.id);
  const current = useCurrentSection(ids);
  const currentIndex = Math.max(0, ids.indexOf(current));
  const dropdown = useRef(null);
  useDocumentTitle(document.title);

  // Opened from another AgriCore page in this tab: "Back" returns there. Opened in a new tab: home.
  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  // A fresh document starts at its top (or at the section in the address, e.g. /privacy#your-rights).
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) window.document.getElementById(hash)?.scrollIntoView();
    else window.scrollTo({ top: 0 });
  }, [doc]);

  const closeDropdown = () => {
    if (dropdown.current) dropdown.current.open = false;
  };

  return (
    <div className="legal">
      <a className="legal__skip" href="#legal-content">Skip to content</a>

      <header className="legal__bar">
        <div className="legal__bar-inner">
          {canGoBack ? (
            <button type="button" className="legal__back" onClick={() => navigate(-1)}>
              <Icon name="arrow-left" size={16} /> Back
            </button>
          ) : (
            <Link to="/" className="legal__back"><Icon name="arrow-left" size={16} /> Home</Link>
          )}
          <Link to="/" className="legal__brand" aria-label="AgriCore home"><Logo /></Link>
          <Link to={`/${other.slug}`} className="legal__switch">{other.title}</Link>
        </div>
      </header>

      <div className="legal__hero">
        <p className="legal__kicker">AgriCore · Legal</p>
        <h1 className="legal__title">{document.title}</h1>
        <p className="legal__updated"><Icon name="clock" size={15} /> Last updated {LAST_UPDATED}</p>
        <p className="legal__summary">{document.summary}</p>
      </div>

      <div className="legal__layout">
        <aside className="legal__toc" aria-label="On this page">
          <details className="legal__toc-drop" ref={dropdown}>
            <summary>
              <span className="legal__toc-label">On this page</span>
              <span className="legal__toc-current">{currentIndex + 1}. {document.sections[currentIndex].heading}</span>
              <Icon name="chevron-down" size={18} className="legal__toc-chevron" />
            </summary>
            <TableOfContents sections={document.sections} current={current} onPick={closeDropdown} />
          </details>
          <div className="legal__toc-rail">
            <p className="legal__toc-label">On this page</p>
            <TableOfContents sections={document.sections} current={current} />
          </div>
        </aside>

        <main id="legal-content" className="legal__doc" tabIndex={-1}>
          {document.sections.map((section, index) => (
            <section key={section.id} id={section.id} className="legal__section" aria-labelledby={`${section.id}-heading`}>
              <h2 id={`${section.id}-heading`}>
                <span className="legal__num">{index + 1}.</span> {section.heading}
              </h2>
              {section.blocks.map((block, i) => <Block key={i} block={block} />)}
            </section>
          ))}
        </main>
      </div>

      <footer className="legal__foot">
        <div className="legal__foot-inner">
          <Link to={`/${other.slug}`} className="legal__other">
            <span className="legal__other-label">Also read</span>
            <span className="legal__other-title">{other.title} <Icon name="arrow-right" size={16} /></span>
          </Link>
          <button type="button" className="legal__top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Icon name="arrow-up" size={16} /> Back to top
          </button>
        </div>
        <p className="legal__copy">© {new Date().getFullYear()} AgriCore · Davao Oriental State University</p>
      </footer>
    </div>
  );
}
