import { Link } from 'react-router-dom';
import { Logo } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { LAST_UPDATED, PRIVACY, TERMS } from './legalText.js';

const DOCUMENTS = { terms: TERMS, privacy: PRIVACY };

/**
 * /terms and /privacy — public, readable without an account.
 *
 * The register form links here in a new tab, so a half-filled form is never
 * lost by reading the documents.
 */
export default function LegalPage({ doc = 'terms' }) {
  const document = DOCUMENTS[doc] ?? TERMS;
  const other = doc === 'terms' ? { to: '/privacy', label: PRIVACY.title } : { to: '/terms', label: TERMS.title };
  useDocumentTitle(document.title);

  return (
    <div className="legal-page">
      <header className="legal-page__bar">
        <Link to="/" className="legal-page__brand" aria-label="AgriCore home"><Logo /></Link>
        <Link to={other.to} className="legal-page__switch">{other.label} <Icon name="arrow-right" size={14} /></Link>
      </header>

      <article className="legal-doc">
        <p className="legal-doc__kicker">AgriCore · Davao Oriental State University</p>
        <h1 className="legal-doc__title">{document.title}</h1>
        <p className="legal-doc__updated">Last updated {LAST_UPDATED}</p>
        <p className="legal-doc__intro">{document.intro}</p>

        {document.sections.map((section) => (
          <section key={section.heading} className="legal-doc__section">
            <h2>{section.heading}</h2>
            {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}

        <footer className="legal-doc__foot">
          <p>
            This document is not legal advice. It describes how AgriCore handles your account and information for
            the course and the capstone study.
          </p>
          <div className="legal-doc__links">
            <Link to="/register">Create an account</Link>
            <Link to="/">Back to AgriCore</Link>
          </div>
        </footer>
      </article>
    </div>
  );
}
