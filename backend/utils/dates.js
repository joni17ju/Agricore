/* Ported verbatim from frontend/src/utils/dates.js — the scoring rules must stay
   identical on both sides, so edit them together. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' for the given date in local time. */
export function toDayKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function calendarDaysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function isWithinLastDays(value, days, now = new Date()) {
  const diff = calendarDaysBetween(value, now);
  return diff >= 0 && diff < days;
}
