const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value ?? '').trim());
}

export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

export function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

/** Returns a { field: message } object; empty when valid. */
export function validateRequired(values, fields) {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([field]) => isBlank(values[field]))
      .map(([field, label]) => [field, `${label} is required.`]),
  );
}

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Student school ID: YYYY-NNNN, e.g. 2023-0795.
 * Mirrors backend/utils/identifiers.js — change both together.
 */
const STUDENT_ID_PATTERN = /^\d{4}-\d{4}$/;
export const SCHOOL_ID_FORMAT = 'YYYY-NNNN (for example 2023-0795)';

export function isValidStudentId(value) {
  const id = String(value ?? '').trim();
  if (!STUDENT_ID_PATTERN.test(id)) return false;
  const year = Number(id.slice(0, 4));
  return year >= 1900 && year <= new Date().getFullYear() + 1;
}
