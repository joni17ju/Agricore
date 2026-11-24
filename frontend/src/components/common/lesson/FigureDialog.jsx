import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon.jsx';

/**
 * An enlarged figure. Focus stays inside the dialog (its only control is the
 * close button), Esc or a click anywhere closes it, and focus returns to the
 * figure that opened it.
 *
 * @param {{ src: string, alt: string, number?: string, caption?: string, opener?: HTMLElement } | null} figure
 */
export default function FigureDialog({ figure, onClose }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!figure) return undefined;
    const opener = figure.opener ?? document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
      } else if (event.key === 'Tab') {
        // The close button is the only focusable element: keep focus on it.
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [figure]);

  if (!figure) return null;
  const label = figure.number ? `Figure ${figure.number}` : 'Enlarged figure';

  return createPortal(
    <div className="figure-dialog" role="dialog" aria-modal="true" aria-label={label} onClick={() => onCloseRef.current?.()}>
      <figure className="figure-dialog__plate">
        <img src={figure.src} alt={figure.alt} />
        {(figure.number || figure.caption) && (
          <figcaption>
            {figure.number && <span className="lesson-figure__num">Figure {figure.number}. </span>}
            {figure.caption}
          </figcaption>
        )}
      </figure>
      <button ref={closeRef} type="button" className="figure-dialog__close" aria-label="Close enlarged figure" onClick={() => onCloseRef.current?.()}>
        <Icon name="x" size={20} />
      </button>
    </div>,
    document.body,
  );
}
