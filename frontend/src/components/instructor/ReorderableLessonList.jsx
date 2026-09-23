import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon.jsx';
import { summarizeHtml } from '../common/SafeHtml.jsx';

/** Hold this long before a press becomes a drag rather than a tap. */
const LONG_PRESS_MS = 350;
/** Moving further than this before the timer fires cancels the drag (it was a scroll). */
const CANCEL_SLOP_PX = 10;

/**
 * Lesson list an instructor can reorder by long-pressing and dragging a row.
 *
 * Built on Pointer Events rather than HTML5 drag-and-drop, which has no usable
 * touch support and cannot express "hold to start", and rather than a drag
 * library, which would be a new dependency for one list. The same approach as
 * the drag-and-drop mission game: listeners are attached when the drag starts,
 * not on mount, so a fast drag is never mistaken for a tap.
 *
 * Each row is a link to the lesson editor, so a press that becomes a drag has
 * to suppress the click that would otherwise navigate. The grip button gives
 * mouse users an obvious target and keyboard users ArrowUp/ArrowDown.
 */
export default function ReorderableLessonList({ module, lessons, onReorder, isSaving }) {
  const [order, setOrder] = useState(lessons);
  const [draggingId, setDraggingId] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const listRef = useRef(null);
  const pressRef = useRef(null);
  const suppressClickRef = useRef(false);
  /*
   * The pointer listeners are created once when a press starts, so they close
   * over that render's state. Reading the live drop target and ordering through
   * refs avoids dropping against a stale `overIndex`, which silently discarded
   * every reorder.
   */
  const overIndexRef = useRef(null);
  const orderRef = useRef(order);
  orderRef.current = order;

  // Follow the server's order whenever it changes underneath us.
  useEffect(() => setOrder(lessons), [lessons]);

  const indexOf = useCallback((id) => orderRef.current.findIndex((entry) => entry.lesson._id === id), []);

  const commit = useCallback(
    (next) => {
      setOrder(next);
      const ids = next.map((entry) => entry.lesson._id);
      const unchanged = ids.every((id, index) => id === lessons[index]?.lesson._id);
      if (!unchanged) onReorder(ids);
    },
    [lessons, onReorder],
  );

  /** Which row index the pointer is currently over. */
  const rowIndexAt = useCallback((clientY) => {
    const rows = [...(listRef.current?.querySelectorAll('[data-row]') ?? [])];
    for (let index = 0; index < rows.length; index += 1) {
      const rect = rows[index].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return index;
    }
    return rows.length - 1;
  }, []);

  const endDrag = useCallback(() => {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) return;
    clearTimeout(press.timer);
    window.removeEventListener('pointermove', press.onMove);
    window.removeEventListener('pointerup', press.onUp);
    window.removeEventListener('pointercancel', press.onUp);

    if (press.isDragging) {
      // A drag just finished: swallow the click this press would otherwise fire.
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    setDraggingId(null);
    setOverIndex(null);
    overIndexRef.current = null;
  }, []);

  const startPress = (event, lessonId) => {
    // Primary button / single touch only.
    if (event.button !== undefined && event.button !== 0) return;
    if (isSaving) return;

    const press = {
      lessonId,
      startY: event.clientY,
      isDragging: false,
      timer: null,
      onMove: null,
      onUp: null,
    };

    press.onMove = (moveEvent) => {
      if (!press.isDragging) {
        // Moved before the hold completed — treat it as a scroll, not a drag.
        if (Math.abs(moveEvent.clientY - press.startY) > CANCEL_SLOP_PX) endDrag();
        return;
      }
      moveEvent.preventDefault();
      const index = rowIndexAt(moveEvent.clientY);
      overIndexRef.current = index;
      setOverIndex(index);
    };

    press.onUp = () => {
      const press_ = pressRef.current;
      const target = overIndexRef.current;
      if (press_?.isDragging && target !== null) {
        const from = indexOf(press_.lessonId);
        if (from !== -1 && from !== target) {
          const next = [...orderRef.current];
          const [moved] = next.splice(from, 1);
          next.splice(target, 0, moved);
          commit(next);
        }
      }
      endDrag();
    };

    press.timer = setTimeout(() => {
      press.isDragging = true;
      const start = indexOf(lessonId);
      overIndexRef.current = start;
      setDraggingId(lessonId);
      setOverIndex(start);
    }, LONG_PRESS_MS);

    pressRef.current = press;
    window.addEventListener('pointermove', press.onMove, { passive: false });
    window.addEventListener('pointerup', press.onUp);
    window.addEventListener('pointercancel', press.onUp);
  };

  useEffect(() => endDrag, [endDrag]);

  /** Keyboard reordering, so this is not drag-only. */
  const onGripKeyDown = (event, lessonId) => {
    const direction = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!direction || isSaving) return;
    event.preventDefault();
    const from = indexOf(lessonId);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  return (
    <ul className={`lesson-rows lesson-rows--sortable ${draggingId ? 'is-dragging' : ''}`} ref={listRef}>
      {order.map(({ lesson, missions }, index) => (
        <li
          key={lesson._id}
          data-row
          className={`anim-fade-up ${draggingId === lesson._id ? 'is-grabbed' : ''} ${
            draggingId && overIndex === index && draggingId !== lesson._id ? 'is-drop-target' : ''
          }`}
          style={{ '--i': index }}
          onPointerDown={(event) => startPress(event, lesson._id)}
        >
          <span
            className="lesson-row__grip"
            role="button"
            tabIndex={0}
            aria-label={`Reorder ${lesson.title}. Use arrow up and arrow down.`}
            onKeyDown={(event) => onGripKeyDown(event, lesson._id)}
          >
            <Icon name="menu" size={16} />
          </span>
          <Link
            to={`/instructor/modules/${module._id}/lessons/${lesson._id}`}
            className="lesson-row"
            onClick={(event) => {
              if (suppressClickRef.current) event.preventDefault();
            }}
          >
            <span className="lesson-row__number">{module.moduleNumber}.{lesson.lessonNumber}</span>
            <span className="lesson-row__text">
              <strong>{lesson.title}</strong>
              <small>{summarizeHtml(lesson.contentBody, 120) || 'No content yet.'}</small>
              <span className="lesson-row__meta">
                <span><Icon name="target" size={13} /> {missions.length} mission{missions.length === 1 ? '' : 's'}</span>
                <span><Icon name="image" size={13} /> {lesson.mediaAssets.length} media</span>
              </span>
            </span>
            <span className="lesson-row__edit" aria-hidden="true"><Icon name="edit" size={17} /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
