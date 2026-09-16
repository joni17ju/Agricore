import { useId } from 'react';
import Icon from './Icon.jsx';

export function Field({ label, hint, error, children, htmlFor, required }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="field__required" aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function TextInput({ label, hint, error, required, className = '', ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} required={required}>
      <input id={id} className={`input ${className}`} aria-invalid={Boolean(error)} required={required} {...props} />
    </Field>
  );
}

export function TextArea({ label, hint, error, required, className = '', ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} required={required}>
      <textarea id={id} className={`input input--textarea ${className}`} aria-invalid={Boolean(error)} required={required} {...props} />
    </Field>
  );
}

/** @param {{ value: string, label: string }[]} options */
export function SelectInput({ label, hint, error, options, placeholder, required, className = '', ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} required={required}>
      <div className="select">
        <select id={id} className={`input select__control ${className}`} aria-invalid={Boolean(error)} required={required} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={16} className="select__chevron" />
      </div>
    </Field>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  return (
    <label className="search-input">
      <Icon name="search" size={18} />
      <span className="visually-hidden">{label}</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
