/**
 * Pointer and keyboard helpers for placing things on a specimen stage, in the
 * games' own coordinate system: x as a percentage of the stage's width and y
 * as a percentage of its height (see IdentificationGame and DragDropGame).
 */

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** A pointer position as whole-number stage percentages, clamped to the stage. */
export function stagePercent(stage, event) {
  const rect = stage.getBoundingClientRect();
  return {
    x: clamp(Math.round(((event.clientX - rect.left) / rect.width) * 100), 0, 100),
    y: clamp(Math.round(((event.clientY - rect.top) / rect.height) * 100), 0, 100),
    // Unrounded, for sizing by distance.
    exactX: ((event.clientX - rect.left) / rect.width) * 100,
  };
}

/** Arrow keys nudge a marker by 1 (Shift: 5). Returns the new point, or null. */
export function nudge(event, point) {
  const step = event.shiftKey ? 5 : 1;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const move = moves[event.key];
  if (!move) return null;
  return { x: clamp(point.x + move[0], 0, 100), y: clamp(point.y + move[1], 0, 100) };
}
