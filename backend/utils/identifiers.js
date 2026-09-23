/**
 * School ID format and sign-in identifier handling.
 *
 * Student IDs are YYYY-NNNN (e.g. 2023-0795). Staff accounts use other shapes
 * (FAC-2012-014, ADM-2019-001) and are not created through registration, so
 * only student IDs are format-checked.
 */

const STUDENT_ID_PATTERN = /^\d{4}-\d{4}$/;

/** Plausible enrolment years, so 0000-0000 is not accepted as a valid ID. */
const EARLIEST_YEAR = 1900;

export const SCHOOL_ID_FORMAT = 'YYYY-NNNN (for example 2023-0795)';

export function isValidStudentId(value) {
  const id = String(value ?? '').trim();
  if (!STUDENT_ID_PATTERN.test(id)) return false;
  const year = Number(id.slice(0, 4));
  // Allow next year's intake, but nothing beyond that.
  return year >= EARLIEST_YEAR && year <= new Date().getFullYear() + 1;
}

export const normalizeSchoolId = (value) => String(value ?? '').trim();

/**
 * Decide whether a sign-in identifier is an email or a school ID.
 *
 * Anything containing "@" is treated as an email; everything else is looked up
 * as a school ID. Matching on "@" rather than the student ID pattern means
 * staff IDs like FAC-2012-014 work too, and an email can never be mistaken
 * for an ID.
 */
export function buildIdentifierQuery(identifier) {
  const value = String(identifier ?? '').trim();
  if (!value) return null;
  return value.includes('@')
    ? { email: value.toLowerCase() }
    : { schoolId: value };
}
