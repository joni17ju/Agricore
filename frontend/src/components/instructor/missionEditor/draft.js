/**
 * Immutable editing helpers for a mission's scenarioData draft.
 *
 * Every change copies only the objects on the path to the edited value and
 * spreads the rest, so keys keep their original order and untouched fields —
 * including ones no editor knows about — survive exactly. That is what lets an
 * unedited mission save back byte-for-byte.
 */

/** "scenarios.0.choices.2.points" → ['scenarios', 0, 'choices', 2, 'points'] */
export function toPath(path) {
  if (Array.isArray(path)) return path;
  return String(path)
    .split('.')
    .filter((part) => part !== '')
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

export function getIn(object, path) {
  return toPath(path).reduce((value, key) => (value == null ? undefined : value[key]), object);
}

/** A copy of `object` with the value at `path` replaced (or computed from the old one). */
export function setIn(object, path, valueOrUpdater) {
  const keys = toPath(path);
  if (keys.length === 0) {
    return typeof valueOrUpdater === 'function' ? valueOrUpdater(object) : valueOrUpdater;
  }
  const [head, ...rest] = keys;
  const current = object?.[head];
  const next = rest.length === 0
    ? (typeof valueOrUpdater === 'function' ? valueOrUpdater(current) : valueOrUpdater)
    : setIn(current ?? (typeof rest[0] === 'number' ? [] : {}), rest, valueOrUpdater);
  if (Array.isArray(object)) {
    const copy = [...object];
    copy[head] = next;
    return copy;
  }
  return { ...object, [head]: next };
}

/** Move the item at `from` to `to` in a list (clamped), returning a new list. */
export function moveItem(list, from, to) {
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (from === target) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(target, 0, item);
  return copy;
}

export const removeItem = (list, index) => list.filter((_, i) => i !== index);

/**
 * The next free id with a prefix, following the seeded convention
 * ("s1", "c3", "sp2"…): one past the highest number already used.
 */
export function nextId(prefix, ...lists) {
  const used = new Set(lists.flat().map((item) => (typeof item === 'string' ? item : item?.id)).filter(Boolean));
  let highest = 0;
  for (const id of used) {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(id);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  let n = highest + 1;
  while (used.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** A structural deep copy; scenarioData is plain JSON, so this is lossless. */
export const cloneData = (value) => JSON.parse(JSON.stringify(value));

/** Problems for one field, matched by exact path. */
export function issuesAt(issues, path) {
  const key = Array.isArray(path) ? path.join('.') : path;
  return {
    errors: issues.errors.filter((issue) => issue.path === key).map((issue) => issue.message),
    warnings: issues.warnings.filter((issue) => issue.path === key).map((issue) => issue.message),
  };
}
