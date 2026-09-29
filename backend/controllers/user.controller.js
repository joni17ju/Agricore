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

/** PATCH /api/users/:id — admin and instructor management screens, and avatar upload. */
export async function updateUser(req, res) {
  const user = await findOr404(User, req.params.id, 'User');
  const updates = Object.fromEntries(Object.entries(req.body ?? {}).filter(([key]) => EDITABLE.includes(key)));
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

/** DELETE /api/users/:id */
export async function deleteUser(req, res) {
  const user = await findOr404(User, req.params.id, 'User');
  await user.deleteOne();
  res.json({ deleted: true });
}

/**
 * POST /api/users — administrator creates an account directly.
 *
 * Accounts made this way get the shared prototype password so the person can
 * sign in; a real deployment would email an invite or force a reset instead.
 */
export async function createUser(req, res) {
  const { role, firstName, lastName, email, schoolId = null, sectionId = null, status = 'active' } = req.body ?? {};
  if (!['student', 'instructor', 'admin'].includes(role)) throw httpError(400, 'Choose a valid role.');
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
