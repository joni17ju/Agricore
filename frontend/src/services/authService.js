/**
 * Mock authentication. Passwords are accepted but not checked — real
 * authentication arrives with the backend. The session (user id only) is kept in
 * localStorage so a refresh keeps the user signed in.
 */
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { isBlank, isValidEmail, MIN_PASSWORD_LENGTH, normalizeEmail } from '../utils/validation.js';
import { db, request, ServiceError } from './mockDb.js';

const SESSION_KEY = 'agricore.session';

/** Accounts offered on the login page for quick demo sign-in. */
const DEMO_ACCOUNT_IDS = ['usr_stu_001', 'usr_ins_reyes', 'usr_adm_mercado'];

function readSession() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function writeSession(user) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user._id }));
  } catch {
    // Session only lasts for this page load when storage is unavailable.
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}

function assertCanSignIn(user) {
  if (user.status === USER_STATUS.PENDING) {
    throw new ServiceError('Your account is waiting for administrator approval.', 403);
  }
  if (user.status === USER_STATUS.INACTIVE) {
    throw new ServiceError('This account has been deactivated. Please contact the administrator.', 403);
  }
}

/**
 * @param {{ email: string, password: string, role?: 'student' | 'instructor' | 'admin' }} credentials
 */
export function login({ email, password, role }) {
  return request(() => {
    if (!isValidEmail(email)) throw new ServiceError('Enter a valid email address.');
    if (isBlank(password)) throw new ServiceError('Enter your password.');

    const user = db.findOne('users', (u) => u.email === normalizeEmail(email));
    if (!user || (role && user.role !== role)) {
      const roleText = role ? ` ${role}` : '';
      throw new ServiceError(`No${roleText} account found with that email.`, 401);
    }
    assertCanSignIn(user);
    writeSession(user);
    return user;
  });
}

export function loginAsDemo(userId) {
  return request(() => {
    const user = db.findById('users', userId);
    if (!user) throw new ServiceError('Demo account not found. Try resetting the demo data.', 404);
    assertCanSignIn(user);
    writeSession(user);
    return user;
  });
}

export function getDemoAccounts() {
  return request(() => DEMO_ACCOUNT_IDS.map((id) => db.findById('users', id)).filter(Boolean), { latency: 0 });
}

/**
 * Register a student or instructor (Proposal Figs 12–13).
 * Students are active immediately and signed in. Instructors wait for admin approval.
 */
export function register({ role, firstName, lastName, email, password, confirmPassword, sectionId, schoolId }) {
  return request(() => {
    if (![ROLES.STUDENT, ROLES.INSTRUCTOR].includes(role)) throw new ServiceError('Choose Student or Instructor.');
    if (isBlank(firstName) || isBlank(lastName)) throw new ServiceError('Enter your first and last name.');
    if (!isValidEmail(email)) throw new ServiceError('Enter a valid email address.');
    if (String(password ?? '').length < MIN_PASSWORD_LENGTH) {
      throw new ServiceError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (password !== confirmPassword) throw new ServiceError('Passwords do not match.');

    const normalizedEmail = normalizeEmail(email);
    if (db.findOne('users', (u) => u.email === normalizedEmail)) {
      throw new ServiceError('An account with this email already exists.', 409);
    }
    if (role === ROLES.STUDENT && !db.findById('sections', sectionId)) {
      throw new ServiceError('Select your section.');
    }

    const user = db.insert('users', {
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      schoolId: isBlank(schoolId) ? null : schoolId.trim(),
      sectionId: role === ROLES.STUDENT ? sectionId : null,
      assignedSectionIds: [],
      status: role === ROLES.STUDENT ? USER_STATUS.ACTIVE : USER_STATUS.PENDING,
      earnedBadges: [],
    });

    const requiresApproval = user.status === USER_STATUS.PENDING;
    if (!requiresApproval) writeSession(user);
    return { user, requiresApproval };
  });
}

/** Resolves with the signed-in user, or null. Clears sessions for removed/deactivated accounts. */
export function getCurrentUser() {
  return request(
    () => {
      const session = readSession();
      if (!session?.userId) return null;
      const user = db.findById('users', session.userId);
      if (!user || user.status !== USER_STATUS.ACTIVE) {
        clearSession();
        return null;
      }
      return user;
    },
    { latency: 0 },
  );
}

export function logout() {
  return request(() => {
    clearSession();
    return true;
  }, { latency: 0 });
}

/** Mock only — no email is sent. */
export function requestPasswordReset(email) {
  return request(() => {
    if (!isValidEmail(email)) throw new ServiceError('Enter a valid email address.');
    return {
      message: 'Password reset is not available in the prototype. Please contact your administrator.',
    };
  });
}
