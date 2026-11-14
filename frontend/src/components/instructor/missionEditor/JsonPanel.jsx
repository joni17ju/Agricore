import { useId } from 'react';
import Icon from '../../common/Icon.jsx';

/** The raw scenarioData, for power users. */
export default function JsonPanel({ text, onTextChange, parseError, note }) {
  const id = useId();
  return (
    <section className="me-panel me-json" aria-labelledby={`${id}-title`}>
      <header className="me-panel__head">
        <h3 id={`${id}-title`} className="me-panel__title"><Icon name="code" size={16} /> Advanced (JSON)</h3>
        <span className="text-xs text-muted">Edits here and in the visual editor stay in sync.</span>
      </header>
      {note && <p className="me-note me-note--warning"><Icon name="alert" size={14} /> {note}</p>}
      <label className="visually-hidden" htmlFor={`${id}-text`}>Mission content as JSON</label>
      <textarea
        id={`${id}-text`}
        className={`input input--textarea code-input me-json__text ${parseError ? 'is-invalid' : ''}`}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        spellCheck={false}
        rows={22}
        aria-invalid={Boolean(parseError)}
        aria-describedby={parseError ? `${id}-error` : undefined}
      />
      {parseError && (
        <p id={`${id}-error`} className="me-issues__item is-error" role="alert">
          <Icon name="alert" size={13} /> {parseError}
        </p>
      )}
    </section>
  );
}
