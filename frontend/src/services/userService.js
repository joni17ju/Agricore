/**
 * User accounts, roles and enrollment.
 * Used by instructors: the full account list, and their own section rosters.
 *
 * GET /users is open to instructors only, which is exactly who uses
 * these screens. Avatar upload is the one function a student calls, and it
 * touches only their own record through PATCH /users/:id.
 */
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { MAX_MOCK_UPLOAD_BYTES } from '../constants/rules.js';
import { isBlank, isValidEmail, normalizeEmail } from '../utils/validation.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';
import { requireInstructorSection, requireUser } from './serviceContext.js';

const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'schoolId'];

const byName = (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);

function matchesSearch(user, search) {
  if (isBlank(search)) return true;
  const term = search.trim().toLowerCase();
  return [user.firstName, user.lastName, `${user.firstName} ${user.lastName}`, user.email, user.schoolId]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
}

function validateEmail(email) {
  if (!isValidEmail(email)) throw new ServiceError('Enter a valid email address.');
  return normalizeEmail(email);
}

export async function listUsers(filters = {}) {
  const users = await api.get('/users', {
    role: filters.role,
    status: filters.status,
    sectionId: filters.sectionId,
    search: filters.search,
  });
  return [...users].sort(byName);
}

export function getUser(userId) {
  return requireUser(userId);
}

/**
 * An instructor adds a student directly.
 *
 * Students only — instructor accounts come from the seed or the database, and
 * the server refuses anything else here. An account made this way is active
 * straight away: an instructor creating it is the approval.
 */
export async function createStudent({ firstName, lastName, email, schoolId, sectionId }) {
  if (isBlank(firstName) || isBlank(lastName)) throw new ServiceError('First and last name are required.');
  if (isBlank(sectionId)) throw new ServiceError('Choose a section.');
  return api.post('/users', {
    role: ROLES.STUDENT,
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: validateEmail(email),
    schoolId: isBlank(schoolId) ? null : String(schoolId).trim(),
    sectionId,
    status: USER_STATUS.ACTIVE,
  });
}

export async function updateUser(userId, changes) {
  const updates = Object.fromEntries(Object.entries(changes).filter(([key]) => EDITABLE_FIELDS.includes(key)));
  if ('firstName' in updates && isBlank(updates.firstName)) throw new ServiceError('First name is required.');
  if ('lastName' in updates && isBlank(updates.lastName)) throw new ServiceError('Last name is required.');
  if ('email' in updates) updates.email = validateEmail(updates.email);
  if ('schoolId' in updates) updates.schoolId = isBlank(updates.schoolId) ? null : String(updates.schoolId).trim();
  return api.patch(`/users/${userId}`, updates);
}

/**
 * Mock profile picture upload: the image is stored on the user as a data URL.
 * A real backend would store the file and persist its URL instead.
 */
export async function uploadAvatar(userId, file) {
  if (!file) throw new ServiceError('Choose an image to upload.');
  if (!file.type.startsWith('image/')) throw new ServiceError('Choose an image file (PNG, JPG or WebP).');
  if (file.size > MAX_MOCK_UPLOAD_BYTES) {
    const limitMb = (MAX_MOCK_UPLOAD_BYTES / 1024 / 1024).toFixed(1);
    throw new ServiceError(`Images must be ${limitMb} MB or smaller.`, 413);
  }
  const avatarUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ServiceError('The file could not be read.'));
    reader.readAsDataURL(file);
  });
  return api.patch(`/users/${userId}`, { avatarUrl });
}

export function removeAvatar(userId) {
  return api.patch(`/users/${userId}`, { avatarUrl: null });
}

export async function setUserStatus(userId, status) {
  if (!Object.values(USER_STATUS).includes(status)) throw new ServiceError('Choose a valid status.');
  return api.patch(`/users/${userId}`, { status });
}

export async function enrollStudent(studentId, sectionId) {
  await requireUser(studentId, ROLES.STUDENT);
  return api.patch(`/users/${studentId}`, { sectionId });
}

/**
 * Permanently removes an account.
 *
 * The server enforces who may do this: instructors only, students only, and
 * never their own account.
 */
export async function deleteUser(userId) {
  // The server removes the account; its attempts and progress go with it.
  return api.del(`/users/${userId}`);
}

// ───────── Account requests ─────────

/**
 * Students waiting to be approved.
 *
 * Every pending student, not only those in the instructor's own sections: a
 * section with no assigned instructor would otherwise leave its requests
 * invisible and the accounts stuck pending forever.
 */
export function listPendingStudents() {
  return api.get('/users', { role: ROLES.STUDENT, status: USER_STATUS.PENDING });
}

/** Approve a pending student. The server notifies them. */
export async function approveStudent(studentId) {
  await requireUser(studentId, ROLES.STUDENT);
  return api.patch(`/users/${studentId}`, { status: USER_STATUS.ACTIVE });
}

/**
 * Reject a request by deleting the pending record.
 *
 * Deliberately a delete rather than a "rejected" status: the account was never
 * usable, nothing references it, and removing it frees the email and school ID
 * so the person can register again after fixing whatever was wrong. A rejected
 * row would sit in the table forever blocking both.
 */
export async function rejectStudent(studentId) {
  const student = await requireUser(studentId, ROLES.STUDENT);
  if (student.status !== USER_STATUS.PENDING) {
    throw new ServiceError('Only a pending request can be rejected.', 409);
  }
  return api.del(`/users/${studentId}`);
}

// ───────── Instructor roster (Proposal Fig 26) ─────────

/**
 * Students in the instructor's sections.
 * @param {string} instructorId
 * @param {{ sectionId?: string, search?: string, status?: string }} filters
 */
export async function listRoster(instructorId, filters = {}) {
  const instructor = await requireUser(instructorId, ROLES.INSTRUCTOR);
  if (filters.sectionId) await requireInstructorSection(instructorId, filters.sectionId);
  const sectionIds = (filters.sectionId ? [filters.sectionId] : instructor.assignedSectionIds ?? []).map(String);
  if (sectionIds.length === 0) return [];

  // One request per section keeps the filtering server-side.
  const perSection = await Promise.all(
    sectionIds.map((sectionId) => api.get('/users', { role: ROLES.STUDENT, sectionId, status: filters.status })),
  );
  return perSection
    .flat()
    .filter((student) => matchesSearch(student, filters.search))
    .sort(byName);
}

/** Instructor edits a student in one of their sections. */
export async function updateRosterStudent(instructorId, studentId, changes) {
  const student = await requireUser(studentId, ROLES.STUDENT);
  await requireInstructorSection(instructorId, student.sectionId);

  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in changes) updates[field] = changes[field];
  }
  if ('firstName' in updates && isBlank(updates.firstName)) throw new ServiceError('First name is required.');
  if ('lastName' in updates && isBlank(updates.lastName)) throw new ServiceError('Last name is required.');
  if ('email' in updates) updates.email = validateEmail(updates.email);
  if ('schoolId' in updates) updates.schoolId = isBlank(updates.schoolId) ? null : String(updates.schoolId).trim();
  if (changes.sectionId && String(changes.sectionId) !== String(student.sectionId)) {
    await requireInstructorSection(instructorId, changes.sectionId);
    updates.sectionId = changes.sectionId;
  }
  if (changes.status) {
    if (!Object.values(USER_STATUS).includes(changes.status)) throw new ServiceError('Choose a valid status.');
    updates.status = changes.status;
  }
  return api.patch(`/users/${studentId}`, updates);
}

/** Instructor removes a student from the course (the account is deactivated, not deleted). */
export async function removeRosterStudent(instructorId, studentId) {
  const student = await requireUser(studentId, ROLES.STUDENT);
  await requireInstructorSection(instructorId, student.sectionId);
  return api.patch(`/users/${studentId}`, { status: USER_STATUS.INACTIVE });
}
