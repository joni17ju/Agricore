/**
 * Authentication against the real API.
 *
 * Same exported functions and return shapes as the mock version, so pages and
 * components are untouched: login/loginAsDemo resolve with the user record,
 * register resolves with { user, requiresApproval }, getCurrentUser resolves
 * with the user or null.
 *
 * The session is now a JWT held by apiClient rather than a user id in
 * localStorage; the old `agricore.session` key is cleared on sign-out so a
 * stale prototype session cannot linger.
 */
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { isBlank, isValidEmail, isValidStudentId, MIN_PASSWORD_LENGTH, normalizeEmail, SCHOOL_ID_FORMAT } from '../utils/validation.js';
import { api, setToken, getToken } from './apiClient.js';
import { ServiceError } from './serviceError.js';

const LEGACY_SESSION_KEY = 'agricore.session';

/**
 * Shared password for the seeded demo accounts, set by
 * backend/scripts/set-passwords.js. The login page's one-click demo sign-in
 * performs a real /auth/login with it rather than bypassing authentication.
 */
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? 'agricore123';

function clearLegacySession() {
  try {
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

/** Keeps the prototype's per-status messages, which are friendlier than the API's. */
function assertCanSignIn(user) {
  if (user.status === USER_STATUS.PENDING) {
    throw new ServiceError('Your account is waiting for administrator approval.', 403);
  }
  if (user.status === USER_STATUS.INACTIVE) {
    throw new ServiceError('This account has been deactivated. Please contact the administrator.', 403);
  }
}

async function signIn(identifier, password, role) {
  let result;
  try {
    // The server decides whether this is an email or a school ID.
    result = await api.post('/auth/login', { identifier: String(identifier).trim(), password });
  } catch (error) {
    // The API answers 401 identically for unknown email and wrong password;
    // keep the prototype's wording, including the role hint when one was given.
    if (error.status === 401) {
      const roleText = role ? ` ${role}` : '';
      throw new ServiceError(`No${roleText} account found with that email or school ID, or the password is incorrect.`, 401);
    }
    throw error;
  }

  if (role && result.user.role !== role) {
    setToken(null);
    throw new ServiceError(`No ${role} account found with that email or school ID.`, 401);
  }
  assertCanSignIn(result.user);
  setToken(result.token);
  clearLegacySession();
  return result.user;
}

/**
 * Sign in with either an email address or a school ID number.
 *
 * `identifier` is the field name; `email` is still accepted so any older caller
 * keeps working. Anything containing "@" is validated as an email, everything
 * else is passed through as an ID for the server to look up.
 *
 * @param {{ identifier?: string, email?: string, password: string, role?: 'student' | 'instructor' | 'admin' }} credentials
 */
export async function login({ identifier, email, password, role }) {
  const signInAs = String(identifier ?? email ?? '').trim();
  if (isBlank(signInAs)) throw new ServiceError('Enter your email address or school ID number.');
  if (signInAs.includes('@') && !isValidEmail(signInAs)) {
    throw new ServiceError('Enter a valid email address.');
  }
  if (isBlank(password)) throw new ServiceError('Enter your password.');
  return signIn(signInAs, password, role);
}

/** One-click demo sign-in: a real login using the shared demo password. */
export async function loginAsDemo(userId) {
  const accounts = await api.get('/auth/demo-accounts');
  const account = accounts.find((item) => item._id === userId);
  if (!account) throw new ServiceError('Demo account not found.', 404);
  return signIn(account.email, DEMO_PASSWORD);
}

export function getDemoAccounts() {
  return api.get('/auth/demo-accounts');
}

/**
 * Register a student or instructor (Proposal Figs 12–13).
 * Students are active immediately and signed in; instructors wait for approval.
 */
export async function register({ role, firstName, lastName, email, password, confirmPassword, sectionId, schoolId }) {
  if (![ROLES.STUDENT, ROLES.INSTRUCTOR].includes(role)) throw new ServiceError('Choose Student or Instructor.');
  if (isBlank(firstName) || isBlank(lastName)) throw new ServiceError('Enter your first and last name.');
  if (!isValidEmail(email)) throw new ServiceError('Enter a valid email address.');
  if (String(password ?? '').length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password !== confirmPassword) throw new ServiceError('Passwords do not match.');
  if (role === ROLES.STUDENT && isBlank(sectionId)) throw new ServiceError('Select your section.');
  if (role === ROLES.STUDENT) {
    if (isBlank(schoolId)) throw new ServiceError('Enter your school ID number.');
    if (!isValidStudentId(schoolId)) {
      throw new ServiceError(`School ID number must be in the format ${SCHOOL_ID_FORMAT}.`);
    }
  }

  const result = await api.post('/auth/register', {
    role,
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: normalizeEmail(email),
    password,
    schoolId: isBlank(schoolId) ? null : String(schoolId).trim(),
    sectionId: role === ROLES.STUDENT ? sectionId : null,
  });

  if (result.token) {
    setToken(result.token);
    clearLegacySession();
  }
  return { user: result.user, requiresApproval: result.requiresApproval };
}

/** Resolves with the signed-in user, or null when there is no valid session. */
export async function getCurrentUser() {
  if (!getToken()) return null;
  try {
    const { user } = await api.get('/auth/me');
    return user;
  } catch (error) {
    // apiClient already discards the token on 401.
    if (error.status === 401 || error.status === 403) return null;
    throw error;
  }
}

export async function logout() {
  setToken(null);
  clearLegacySession();
  return true;
}

/**
 * Change the signed-in user's password.
 *
 * The server always verifies `currentPassword` against the stored bcrypt hash,
 * so a wrong current password is rejected there, not merely here.
 */
export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  if (isBlank(currentPassword)) throw new ServiceError('Enter your current password.');
  if (String(newPassword ?? '').length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (newPassword !== confirmPassword) throw new ServiceError('New passwords do not match.');
  if (newPassword === currentPassword) throw new ServiceError('Choose a password different from your current one.');

  await api.patch('/auth/change-password', { currentPassword, newPassword });
  return { updated: true };
}

/** No reset email in the prototype; the message is unchanged. */
export async function requestPasswordReset(email) {
  if (!isValidEmail(email)) throw new ServiceError('Enter a valid email address.');
  return {
    message: 'Password reset is not available in the prototype. Please contact your administrator.',
  };
}
