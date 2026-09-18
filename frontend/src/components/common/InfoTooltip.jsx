import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/** Keep the bubble this far from the viewport edge. */
const EDGE_GAP = 10;

/**
 * Small "i" info icon that explains the panel it sits next to.
 *
 * Reusable: the copy is passed in, so any panel heading can take one.
 *   <Card title={<>Panel name <InfoTooltip text="What this shows…" /></>}>
 *
 * Hover and keyboard focus are handled purely in CSS, gated behind
 * `(hover: hover)` so they never fire on touch. This component only owns the
 * pinned state that a tap toggles. Keeping the two apart matters: when both
 * drove one flag, the mouseenter that Chrome synthesises after a tap made the
 * first tap open-then-immediately-close the bubble.
 */
export default function InfoTooltip({ text, label = 'What this shows', align = 'center' }) {
  const [isPinned, setIsPinned] = useState(false);
  const [shift, setShift] = useState(0);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const bubbleRef = useRef(null);
  const bubbleId = useId();

  // Blur as well: focus alone keeps the bubble up via :focus-visible, so an
  // Escape or an outside tap would otherwise unpin it and leave it on screen.
  const close = useCallback(() => {
    setIsPinned(false);
    buttonRef.current?.blur();
  }, []);

  useEffect(() => {
    if (!isPinned) return undefined;
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isPinned, close]);

  /*
   * Nudge the bubble back inside the viewport when the icon sits near an edge.
   * Computed from the button's centre rather than the bubble's current
   * position, so the result does not depend on the shift already applied — and
   * because hover is CSS-driven, this has to be right before the bubble is
   * ever shown. The bubble stays laid out while hidden, so it measures fine.
   */
  const reposition = useCallback(() => {
    const bubble = bubbleRef.current;
    const button = buttonRef.current;
    if (!bubble || !button) return;
    const width = bubble.offsetWidth;
    const centre = button.getBoundingClientRect().left + button.offsetWidth / 2;
    const idealLeft = align === 'start' ? button.getBoundingClientRect().left : centre - width / 2;
    const maxLeft = window.innerWidth - EDGE_GAP - width;
    setShift(Math.round(Math.min(Math.max(idealLeft, EDGE_GAP), Math.max(maxLeft, EDGE_GAP)) - idealLeft));
  }, [align]);

  useLayoutEffect(() => {
    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [reposition, isPinned, text]);

  return (
    <span className="info-tip" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`info-tip__btn ${isPinned ? 'is-open' : ''}`}
        aria-label={label}
        aria-expanded={isPinned}
        aria-describedby={bubbleId}
        onClick={() => setIsPinned((pinned) => !pinned)}
      >
        <Icon name="info" size={15} />
      </button>

      <span
        id={bubbleId}
        ref={bubbleRef}
        role="tooltip"
        className={`info-tip__bubble info-tip__bubble--${align} ${isPinned ? 'is-open' : ''}`}
        style={{ '--shift': `${shift}px` }}
      >
        {text}
      </span>
    </span>
  );
}
