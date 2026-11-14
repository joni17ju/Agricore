import { useId } from 'react';
import { IconButton } from '../../common/Button.jsx';
import Icon from '../../common/Icon.jsx';
import { humanize } from './editorUtils.js';

/** Plain-language problems for one field: errors block saving, warnings don't. */
export function FieldIssues({ errors = [], warnings = [] }) {
  if (errors.length === 0 && warnings.length === 0) return null;
  return (
    <ul className="me-issues">
      {errors.map((message) => (
        <li key={`e-${message}`} className="me-issues__item is-error">
          <Icon name="alert" size={13} /> {message}
        </li>
      ))}
      {warnings.map((message) => (
        <li key={`w-${message}`} className="me-issues__item is-warning">
          <Icon name="info" size={13} /> {message}
        </li>
      ))}
    </ul>
  );
}

/**
 * A labelled range slider with its value, a coloured fill, and full keyboard
 * support from the native input (arrows, Page Up/Down, Home/End).
 */
export function SliderField({ label, value, onChange, min = 0, max = 100, step = 1, tone = 'green', suffix = '', hint, describe }) {
  const id = useId();
  const safe = Number.isFinite(value) ? value : min;
  const percent = ((safe - min) / (max - min)) * 100;
  return (
    <div className={`me-slider me-slider--${tone}`}>
      <div className="me-slider__head">
        <label htmlFor={id} className="field__label">{label}</label>
        <output htmlFor={id} className="me-slider__value">{safe}{suffix}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={safe}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--fill': `${percent}%` }}
        aria-valuetext={describe ? describe(safe) : `${safe}${suffix}`}
      />
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

/** Reorder, duplicate and delete controls for one card in a list. */
export function ItemControls({ label, index, count, onMove, onDuplicate, onDelete, canDelete = true }) {
  return (
    <div className="me-item-controls" role="group" aria-label={`${label} actions`}>
      <IconButton icon="chevron-up" label={`Move ${label} up`} size="sm" disabled={index === 0} onClick={() => onMove(index - 1)} />
      <IconButton icon="chevron-down" label={`Move ${label} down`} size="sm" disabled={index === count - 1} onClick={() => onMove(index + 1)} />
      {onDuplicate && <IconButton icon="copy" label={`Duplicate ${label}`} size="sm" onClick={onDuplicate} />}
      {onDelete && (
        <IconButton icon="trash" label={`Delete ${label}`} size="sm" variant="danger" disabled={!canDelete} onClick={onDelete} />
      )}
    </div>
  );
}

/**
 * Pick one of the app's built-in illustrations by key.
 *
 * The games draw specimens, scenes and pests from these keys, so a picker of
 * what exists is the only choice that renders. A key the app does not know
 * (from older data) is still shown and kept, so nothing is lost on save.
 */
export function IllustrationPicker({ label, value, keys, render, onChange, size = 64, hint }) {
  const labelId = useId();
  const options = keys.includes(value) || !value ? keys : [value, ...keys];
  return (
    <div className="me-picker">
      <span className="field__label" id={labelId}>{label}</span>
      <div className="me-picker__strip" role="radiogroup" aria-labelledby={labelId}>
        {options.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={key === value}
            className={`me-picker__option ${key === value ? 'is-selected' : ''}`}
            onClick={() => onChange(key)}
            title={humanize(key)}
            style={{ '--thumb': `${size}px` }}
          >
            <span className="me-picker__thumb" aria-hidden="true">{render(key)}</span>
            <span className="me-picker__name">{humanize(key)}</span>
          </button>
        ))}
      </div>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

