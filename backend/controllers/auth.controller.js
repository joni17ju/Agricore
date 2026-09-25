import bcrypt from 'bcryptjs';
import { Section, User } from '../models/index.js';
import { issueToken } from '../middleware/auth.js';
import { httpError, toObjectId } from '../utils/http.js';
import { SCHOOL_ID_FORMAT, buildIdentifierQuery, isValidStudentId, normalizeSchoolId } from '../utils/identifiers.js';
import { MIN_PASSWORD_LENGTH, PLACEHOLDER_HASH, SALT_ROUNDS } from '../constants/auth.js';

const isBlankValue = (value) => value === undefined || value === null || String(value).trim() === '';

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
  const { identifier, email, password } = req.body ?? {};
  // `email` is still accepted so older callers keep working.
  const signIn = identifier ?? email;
  if (!String(signIn ?? '').trim() || !password) {
    throw httpError(400, 'Email or school ID and password are required.');
  }

  const query = buildIdentifierQuery(signIn);
  const user = query ? await User.findOne(query) : null;
  // One message for an unknown identifier and a wrong password alike, so this
  // cannot be used to discover which emails or IDs exist.
  const invalid = httpError(401, 'Incorrect email/school ID or password.');
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

  /*
   * Students must supply a school ID in the YYYY-NNNN format, and it must be
   * unique. Instructors register without one — their IDs are issued by the
   * institution, not chosen at sign-up.
   */
  let normalisedSchoolId = null;
  if (role === 'student') {
    normalisedSchoolId = normalizeSchoolId(schoolId);
    if (!normalisedSchoolId) throw httpError(400, 'School ID number is required.');
    if (!isValidStudentId(normalisedSchoolId)) {
      throw httpError(400, `School ID number must be in the format ${SCHOOL_ID_FORMAT}.`);
    }
    if (await User.findOne({ schoolId: normalisedSchoolId })) {
      throw httpError(409, 'That school ID number is already registered.');
    }
  } else if (!isBlankValue(schoolId)) {
    normalisedSchoolId = normalizeSchoolId(schoolId);
  }

  /*
   * The section is chosen from a dropdown of real sections, so it is a
   * controlled value and treated as one: required for students, and resolved
   * against the collection rather than trusted as a string. toObjectId is what
   * turns a junk value into a 400 — Section.findById would raise a CastError
   * and surface as a 500 instead.
   */
  let resolvedSectionId = null;
  if (role === 'student') {
    if (isBlankValue(sectionId)) throw httpError(400, 'Select your section.');
    const section = await Section.findById(toObjectId(sectionId, 'section id'));
    if (!section) throw httpError(400, 'That section does not exist.');
    resolvedSectionId = section._id;
  } else if (!isBlankValue(sectionId)) {
    // Instructors are attached to sections by an administrator, not at sign-up.
    throw httpError(400, 'Instructor accounts are assigned to sections by an administrator.');
  }

  const user = await User.create({
    role,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalisedEmail,
    passwordHash: await bcrypt.hash(String(password), SALT_ROUNDS),
    schoolId: normalisedSchoolId,
    sectionId: resolvedSectionId,
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
