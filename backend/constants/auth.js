/** Password handling shared by sign-up, change-password and password reset. */

export const SALT_ROUNDS = 10;

/** Kept in step with the frontend's MIN_PASSWORD_LENGTH. */
export const MIN_PASSWORD_LENGTH = 8;

/** Seeded accounts carry this instead of a usable hash until given a password. */
export const PLACEHOLDER_HASH = 'DEV_SEED_PLACEHOLDER_HASH_NOT_REAL';
