import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button, { IconButton } from './Button.jsx';

const CLOSE_ANIMATION_MS = 180;

/**
 * Accessible modal with fade/scale transitions.
 * Stays mounted briefly after `isOpen` turns false so the exit animation can play.
 */
/**
 * `bare` drops the header, footer and body padding and hands the whole surface
 * to `children`. Used by layouts that supply their own chrome — the split auth
 * panel puts its close button inside its own right-hand column — while still
 * getting this component's focus handling, Escape key, scroll lock and
 * open/close animation.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
  bare = false,
  label,
}) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      return undefined;
    }
    const timeout = setTimeout(() => setIsRendered(false), CLOSE_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && dismissible) onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [isOpen, dismissible]);

  if (!isRendered) return null;

  return createPortal(
    <div
      className={`modal-backdrop ${isOpen ? 'is-open' : 'is-closing'}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal modal--${size} ${bare ? 'modal--bare' : ''}`}
        role="dialog"
        aria-modal="true"
        // Without a rendered title there is nothing to point aria-labelledby at.
        {...(bare ? { 'aria-label': label ?? 'Dialog' } : { 'aria-labelledby': 'modal-title' })}
        tabIndex={-1}
      >
        {!bare && (
          <header className="modal__header">
            <div>
              <h2 id="modal-title" className="modal__title">{title}</h2>
              {description && <p className="modal__description">{description}</p>}
            </div>
            {dismissible && <IconButton icon="x" label="Close" onClick={onClose} />}
          </header>
        )}
        {bare ? children : <div className="modal__body">{children}</div>}
        {!bare && footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  isLoading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-muted">{message}</p>
    </Modal>
  );
}
