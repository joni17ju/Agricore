import Icon from './Icon.jsx';

const VARIANTS = {
  info: { icon: 'info', label: 'Note' },
  warning: { icon: 'alert', label: 'Warning' },
  tip: { icon: 'sprout', label: 'Tip' },
};

/** Highlighted box inside lesson content (info / warning / tip). */
export default function Callout({ variant = 'info', children }) {
  const meta = VARIANTS[variant] ?? VARIANTS.info;
  return (
    <div className={`callout callout--${variant}`}>
      <span className="callout__icon" aria-hidden="true">
        <Icon name={meta.icon} size={17} />
      </span>
      <div className="callout__body">
        <span className="callout__label">{meta.label}</span>
        {children}
      </div>
    </div>
  );
}
