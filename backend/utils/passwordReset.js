import crypto from 'node:crypto';

/**
 * Password reset codes: generation, hashing and the limits around them.
 *
 * The rules in one place so the controller reads as flow rather than policy.
 */

export const CODE_LENGTH = 6;

/** Long enough to fetch the mail from a phone, short enough to limit exposure. */
export const EXPIRY_MINUTES = 15;

/** Wrong guesses allowed before the outstanding code is burned. */
export const MAX_VERIFY_ATTEMPTS = 5;

/** Codes that may be sent to one account within RATE_LIMIT_WINDOW_MINUTES. */
export const MAX_REQUESTS_PER_WINDOW = 3;
export const RATE_LIMIT_WINDOW_MINUTES = 15;

/**
 * A six-digit code from crypto.randomInt, not Math.random.
 *
 * Math.random is not a cryptographic generator: its output is predictable from
 * previous values, which for a credential that grants a password change would
 * be an actual weakness rather than a theoretical one. Leading zeros are kept,
 * so every value from 000000 to 999999 is equally likely.
 */
export function generateCode() {
  return String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

/**
 * SHA-256 rather than bcrypt.
 *
 * bcrypt's slowness defends passwords, which are low-entropy, reused and
 * long-lived. This code is none of those: it is random, single-use and dead in
 * fifteen minutes, and brute force is already bounded by MAX_VERIFY_ATTEMPTS
 * rather than by hashing cost. SHA-256 keeps verification cheap so the code
 * path cannot itself be used to load the server.
 */
export const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

/** Constant-time comparison, so a wrong code cannot be narrowed by timing. */
export function codeMatches(code, storedHash) {
  if (!storedHash) return false;
  const candidate = Buffer.from(hashCode(code), 'utf8');
  const stored = Buffer.from(storedHash, 'utf8');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

export const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

export const isExpired = (date) => !date || date.getTime() <= Date.now();

/** Only digits, exactly CODE_LENGTH of them. */
const CODE_PATTERN = /^\d{6}$/;

export function isWellFormedCode(value) {
  const code = String(value ?? '').trim();
  return code.length === CODE_LENGTH && CODE_PATTERN.test(code);
}
