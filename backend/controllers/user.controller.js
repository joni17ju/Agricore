import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { findOr404, httpError, toObjectId } from '../utils/http.js';
import { notifyAccountApproved } from '../utils/notify.js';

/** Never send the password hash to a client. */
const PUBLIC_FIELDS = '-passwordHash';

/** Starting password given to accounts an administrator creates directly. */
const DEFAULT_NEW_USER_PASSWORD = 'agricore123';

/** GET /api/users?role=&sectionId=&status=&search= */
export async function listUsers(req, res) {
  const { role, sectionId, status, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (sectionId) filter.sectionId = toObjectId(sectionId, 'sectionId');
  if (search?.trim()) {
    const term = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: term }, { lastName: term }, { email: term }, { schoolId: term }];
  }
  res.json(await User.find(filter).select(PUBLIC_FIELDS).sort({ lastName: 1, firstName: 1 }));
}

/** GET /api/users/:id */
export async function getUser(req, res) {
  const user = await User.findById(toObjectId(req.params.id, 'user id')).select(PUBLIC_FIELDS);
  if (!user) throw httpError(404, 'User not found.');
  res.json(user);
}

/**
 * Fields a client may change; role and status have their own guarded paths.
 *
 * `earnedBadges` is deliberately absent. Badges used to be evaluated in the
 * browser and written back through this route, which meant a crafted request
 * could award itself any badge. They are now decided server side inside the
 * mission-attempt controller, from stored attempts, and this route will not
 * write them at all.
 */
const EDITABLE = ['firstName', 'lastName', 'email', 'schoolId', 'sectionId', 'assignedSectionIds', 'avatarUrl', 'status', 'role'];

/**
 * Who may change whose account.
 *
 * Anyone may edit their own record — that is how avatar upload and profile
 * edits work. Changing someone *else* is a management action, and since the
 * administrator role was removed those belong to instructors, with three
 * limits that stop the role being used against itself:
 *
 *   - an instructor cannot change another instructor's account,
 *   - an instructor cannot deactivate or delete their own account,
 *   - students may only ever change their own.
 *
 * Returned as a message rather than a boolean so the refusal says which rule
 * was hit instead of a flat "forbidden".
 */
function managementRefusal(actor, target, { isDestructive = false } = {}) {
  const isSelf = String(actor._id) === String(target._id);

  if (isSelf) {
    if (isDestructive) return 'You cannot delete or deactivate your own account.';
    return null;
  }

  if (actor.role !== 'instructor') return 'You can only change your own account.';
  if (target.role !== 'student') return 'Instructors can only manage student accounts.';
  return null;
}

/** Fields that deactivate an account, which is destructive for the actor. */
function isDeactivating(updates, target) {
  return 'status' in updates && updates.status !== 'active' && target.status === 'active';
}

/** PATCH /api/users/:id — the instructor management screens, and avatar upload. */
export async function updateUser(req, res) {
  const user = await findOr404(User, req.params.id, 'User');
  const updates = Object.fromEntries(Object.entries(req.body ?? {}).filter(([key]) => EDITABLE.includes(key)));

  const refusal = managementRefusal(req.user, user, { isDestructive: isDeactivating(updates, user) });
  if (refusal) throw httpError(403, refusal);

  /*
   * Role is in EDITABLE for the instructor screens, but nobody may mint an
   * instructor through this route — instructor accounts come from the seed or
   * the database. Promoting a student here would hand out every management
   * permission in the app.
   */
  if ('role' in updates && updates.role !== user.role) {
    throw httpError(403, 'Account roles cannot be changed here.');
  }
  if ('email' in updates) {
    const email = String(updates.email).trim().toLowerCase();
    const clash = await User.findOne({ email, _id: { $ne: user._id } });
    if (clash) throw httpError(409, 'That email address is already in use.');
    updates.email = email;
  }
  // Captured before the write so "has just been approved" is a real transition.
  const wasPending = user.status === 'pending';

  Object.assign(user, updates);
  await user.save();

  if (wasPending && user.status === 'active') await notifyAccountApproved(user);

  res.json(await User.findById(user._id).select(PUBLIC_FIELDS));
}

/** DELETE /api/users/:id — instructors removing a student account. */
export async function deleteUser(req, res) {
  const user = await findOr404(User, req.params.id, 'User');

  const refusal = managementRefusal(req.user, user, { isDestructive: true });
  if (refusal) throw httpError(403, refusal);

  await user.deleteOne();
  res.json({ deleted: true });
}

/**
 * POST /api/users — an instructor adds a student directly.
 *
 * Students added this way skip the approval queue, because an instructor
 * creating the account *is* the approval. They get the shared starting
 * password so they can sign in; a real deployment would email an invite or
 * force a reset instead.
 *
 * Only students can be created here. Instructor accounts come from the seed or
 * the database, so this route cannot be used to grant management permissions.
 */
export async function createUser(req, res) {
  const { role = 'student', firstName, lastName, email, schoolId = null, sectionId = null, status = 'active' } = req.body ?? {};
  if (role !== 'student') throw httpError(403, 'Only student accounts can be created here.');
  if (!firstName?.trim() || !lastName?.trim()) throw httpError(400, 'First and last name are required.');
  if (!email?.trim()) throw httpError(400, 'Email is required.');

  const normalised = String(email).trim().toLowerCase();
  if (await User.findOne({ email: normalised })) throw httpError(409, 'That email address is already in use.');

  const user = await User.create({
    role,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalised,
    passwordHash: await bcrypt.hash(DEFAULT_NEW_USER_PASSWORD, 10),
    schoolId,
    sectionId: role === 'student' ? sectionId : null,
    assignedSectionIds: [],
    status,
    earnedBadges: [],
  });
  res.status(201).json(await User.findById(user._id).select(PUBLIC_FIELDS));
}
