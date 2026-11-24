/**
 * The three note types lesson content can carry, named the way a field guide
 * would. The stored variant names (tip / info / warning) are unchanged, so
 * every saved lesson keeps working; only the labels changed.
 */
export const CALLOUT_LABELS = Object.freeze({
  tip: 'Key idea',
  info: 'Field note',
  warning: 'Caution',
});

/**
 * Marginal-note box inside lesson content: a left rule and a small-caps label.
 * Used by the lesson reader and by the editor's callout node view, so authors
 * see exactly what students see.
 */
export default function Callout({ variant = 'info', children }) {
  const label = CALLOUT_LABELS[variant] ?? CALLOUT_LABELS.info;
  return (
    <div className={`callout callout--${variant}`} role="note">
      <span className="callout__label">{label}</span>
      <div className="callout__body">{children}</div>
    </div>
  );
}
