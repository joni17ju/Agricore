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
