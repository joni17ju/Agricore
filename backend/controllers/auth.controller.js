import bcrypt from 'bcryptjs';
import { Section, User } from '../models/index.js';
import { issueToken } from '../middleware/auth.js';
import { httpError, toObjectId } from '../utils/http.js';
import { SCHOOL_ID_FORMAT, buildIdentifierQuery, isValidStudentId, normalizeSchoolId } from '../utils/identifiers.js';
import { MIN_PASSWORD_LENGTH, PLACEHOLDER_HASH, SALT_ROUNDS } from '../constants/auth.js';
import { notifyAccountRequest } from '../utils/notify.js';

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
  /*
   * Correct credentials but not usable yet. Pending and deactivated are
   * different situations and get different wording — "waiting for approval"
   * is actionable, "contact your instructor" is not the same message.
   */
  if (user.status === 'pending') {
    throw httpError(403, 'Your account is waiting for approval by your instructor.');
  }
  if (user.status !== 'active') {
    throw httpError(403, 'This account has been deactivated. Please contact your instructor.');
  }

  res.json({ token: issueToken(user), user: publicUser(user) });
}

/**
 * POST /api/auth/register  { firstName, lastName, email, password, schoolId, sectionId }
 *
 * Students only. Instructor accounts are created from the seed or directly in
 * the database, never through this route, so an attempt to register as one is
 * refused rather than quietly downgraded to a student.
 *
 * A new student lands as `pending` and cannot sign in until an instructor
 * approves them, so no token is issued here.
 */
export async function register(req, res) {
  const { firstName, lastName, email, password, role = 'student', schoolId = null, sectionId = null } = req.body ?? {};

  if (!firstName?.trim() || !lastName?.trim()) throw httpError(400, 'First and last name are required.');
  if (!email?.trim()) throw httpError(400, 'Email is required.');
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    throw httpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  /*
   * Only students self-register. The role is still read from the body so a
   * request asking for anything else gets a clear refusal instead of silently
   * being granted a student account it did not ask for.
   */
  if (role !== 'student') {
    throw httpError(403, 'Only student accounts can be created here. Instructor accounts are set up by the school.');
  }

  const normalisedEmail = String(email).trim().toLowerCase();
  if (await User.findOne({ email: normalisedEmail })) throw httpError(409, 'That email address is already registered.');

  // Students are identified by a school ID in the YYYY-NNNN format, and it
  // must be unique.
  const normalisedSchoolId = normalizeSchoolId(schoolId);
  if (!normalisedSchoolId) throw httpError(400, 'School ID number is required.');
  if (!isValidStudentId(normalisedSchoolId)) {
    throw httpError(400, `School ID number must be in the format ${SCHOOL_ID_FORMAT}.`);
  }
  if (await User.findOne({ schoolId: normalisedSchoolId })) {
    throw httpError(409, 'That school ID number is already registered.');
  }

  /*
   * The section comes from a dropdown of real sections, so it is a controlled
   * value and treated as one: resolved against the collection rather than
   * trusted as a string. toObjectId is what turns a junk value into a 400 —
   * Section.findById would raise a CastError and surface as a 500 instead.
   */
  if (isBlankValue(sectionId)) throw httpError(400, 'Select your section.');
  const section = await Section.findById(toObjectId(sectionId, 'section id'));
  if (!section) throw httpError(400, 'That section does not exist.');

  const user = await User.create({
    role: 'student',
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalisedEmail,
    passwordHash: await bcrypt.hash(String(password), SALT_ROUNDS),
    schoolId: normalisedSchoolId,
    sectionId: section._id,
    assignedSectionIds: [],
    // Waits for an instructor. Seeded students are untouched and stay active.
    status: 'pending',
    earnedBadges: [],
  });

  // Best-effort inside notify.js, so a notification failure cannot fail the
  // registration itself.
  await notifyAccountRequest(user, section);

  // No token: the account cannot be used until an instructor approves it.
  res.status(201).json({
    requiresApproval: true,
    token: null,
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
