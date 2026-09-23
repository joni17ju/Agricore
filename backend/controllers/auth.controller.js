import bcrypt from 'bcryptjs';
import { Section, User } from '../models/index.js';
import { issueToken } from '../middleware/auth.js';
import { httpError } from '../utils/http.js';

const SALT_ROUNDS = 10;

/** Kept in step with the frontend's MIN_PASSWORD_LENGTH. */
const MIN_PASSWORD_LENGTH = 8;

/** Seeded accounts carry this instead of a usable hash until they are given a password. */
const PLACEHOLDER_HASH = 'DEV_SEED_PLACEHOLDER_HASH_NOT_REAL';

const publicUser = (user) => {
  const { passwordHash, ...rest } = user.toObject ? user.toObject() : user;
  return rest;
};

/**
 * POST /api/auth/login  { email, password }
 *
 * The same message is returned whether the email is unknown or the password is
 * wrong, so the endpoint cannot be used to enumerate which accounts exist.
 */
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email?.trim() || !password) throw httpError(400, 'Email and password are required.');

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  const invalid = httpError(401, 'Incorrect email or password.');
  if (!user) throw invalid;

  if (user.passwordHash === PLACEHOLDER_HASH) {
    throw httpError(403, 'This account has no password yet. Run scripts/set-passwords.js to set one.');
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) throw invalid;
  if (user.status !== 'active') throw httpError(403, 'This account is not active yet.');

  res.json({ token: issueToken(user), user: publicUser(user) });
}

/**
 * POST /api/auth/register  { firstName, lastName, email, password, role?, schoolId?, sectionId? }
 *
 * Students join active; instructors register as pending so an administrator
 * approves them, mirroring the approval flow the prototype already had.
 * Admin accounts are never self-registered.
 */
export async function register(req, res) {
  const { firstName, lastName, email, password, role = 'student', schoolId = null, sectionId = null } = req.body ?? {};

  if (!firstName?.trim() || !lastName?.trim()) throw httpError(400, 'First and last name are required.');
  if (!email?.trim()) throw httpError(400, 'Email is required.');
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    throw httpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!['student', 'instructor'].includes(role)) throw httpError(403, 'You cannot register with that role.');

  const normalisedEmail = String(email).trim().toLowerCase();
  if (await User.findOne({ email: normalisedEmail })) throw httpError(409, 'That email address is already registered.');

  if (sectionId) {
    const section = await Section.findById(sectionId);
    if (!section) throw httpError(400, 'That section does not exist.');
  }

  const user = await User.create({
    role,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalisedEmail,
    passwordHash: await bcrypt.hash(String(password), SALT_ROUNDS),
    schoolId,
    sectionId: role === 'student' ? sectionId : null,
    assignedSectionIds: [],
    status: role === 'instructor' ? 'pending' : 'active',
    earnedBadges: [],
  });

  // A pending instructor gets no token — there is nothing to sign in to yet.
  const requiresApproval = user.status === 'pending';
  res.status(201).json({
    requiresApproval,
    token: requiresApproval ? null : issueToken(user),
    user: publicUser(user),
  });
}

/** GET /api/auth/me — the signed-in user, refreshed from the database. */
export async function me(req, res) {
  res.json({ user: req.user });
}

/**
 * PATCH /api/auth/change-password  { currentPassword, newPassword }
 *
 * The current password is always verified against the stored hash. An earlier
 * version skipped that check for accounts still carrying the seed placeholder
 * hash, which meant anyone holding such an account's token could set a new
 * password without knowing the old one. There is no bypass now: an account
 * whose hash cannot be matched simply cannot change its password here, and is
 * repaired with scripts/set-passwords.js instead.
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword) throw httpError(400, 'Enter your current password.');
  if (!newPassword || String(newPassword).length < MIN_PASSWORD_LENGTH) {
    throw httpError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (String(newPassword) === String(currentPassword)) {
    throw httpError(400, 'Choose a password different from your current one.');
  }

  const user = await User.findById(req.user._id);
  if (!user) throw httpError(404, 'Account not found.');
  if (!(await bcrypt.compare(String(currentPassword), user.passwordHash))) {
    throw httpError(401, 'Current password is incorrect.');
  }

  user.passwordHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
  await user.save();
  res.json({ updated: true });
}

/**
 * GET /api/auth/demo-accounts — public.
 *
 * The login page offers one account per role for quick prototype sign-in. Only
 * the display fields are returned, never the hash. Signing in as one of these
 * still goes through the normal /auth/login flow with a real password, so this
 * endpoint grants no access by itself.
 */
const DEMO_EMAILS = ['juan.delacruz@dorsu.edu.ph', 'c.reyes@dorsu.edu.ph', 'l.mercado@dorsu.edu.ph'];

export async function demoAccounts(req, res) {
  const users = await User.find({ email: { $in: DEMO_EMAILS } }).select('firstName lastName role email status');
  const order = new Map(DEMO_EMAILS.map((email, index) => [email, index]));
  users.sort((a, b) => order.get(a.email) - order.get(b.email));
  res.json(users);
}
