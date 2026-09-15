/**
 * User accounts, roles and enrollment.
 * Used by Administrators (all users) and Instructors (their section rosters).
 */
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { isBlank, isValidEmail, normalizeEmail } from '../utils/validation.js';
import { db, request, ServiceError } from './mockDb.js';
import { requireInstructorSection, requireSection, requireUser } from './serviceContext.js';

const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'schoolId'];

function matchesSearch(user, search) {
  if (isBlank(search)) return true;
  const term = search.trim().toLowerCase();
  return [user.firstName, user.lastName, `${user.firstName} ${user.lastName}`, user.email, user.schoolId]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(term));
}

const byName = (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);

function assertEmailAvailable(email, ignoreId) {
  if (!isValidEmail(email)) throw new ServiceError('Enter a valid email address.');
  const normalized = normalizeEmail(email);
  if (db.findOne('users', (u) => u._id !== ignoreId && u.email === normalized)) {
    throw new ServiceError('An account with this email already exists.', 409);
  }
  return normalized;
}

function unassignInstructorSections(user) {
  for (const sectionId of user.assignedSectionIds) {
    const section = db.findById('sections', sectionId);
    if (section?.instructorId === user._id) db.update('sections', sectionId, { instructorId: null });
  }
}

/**
 * @param {{ role?: string, status?: string, sectionId?: string, search?: string }} filters
 */
export function listUsers(filters = {}) {
  return request(() =>
    db
      .find(
        'users',
        (u) =>
          (!filters.role || u.role === filters.role) &&
          (!filters.status || u.status === filters.status) &&
          (!filters.sectionId || u.sectionId === filters.sectionId || u.assignedSectionIds.includes(filters.sectionId)) &&
          matchesSearch(u, filters.search),
      )
      .sort(byName),
  );
}

export function getUser(userId) {
  return request(() => requireUser(userId));
}

/** Administrator: create a student, instructor or administrator account. */
export function createUser({ role, firstName, lastName, email, schoolId, sectionId, status = USER_STATUS.ACTIVE }) {
  return request(() => {
    if (!Object.values(ROLES).includes(role)) throw new ServiceError('Choose a valid role.');
    if (isBlank(firstName) || isBlank(lastName)) throw new ServiceError('First and last name are required.');
    if (!Object.values(USER_STATUS).includes(status)) throw new ServiceError('Choose a valid status.');
    if (role === ROLES.STUDENT) requireSection(sectionId);

    return db.insert('users', {
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: assertEmailAvailable(email),
      schoolId: isBlank(schoolId) ? null : schoolId.trim(),
      sectionId: role === ROLES.STUDENT ? sectionId : null,
      assignedSectionIds: [],
      status,
      earnedBadges: [],
    });
  });
}

/** Update profile fields (name, email, school ID). */
export function updateUser(userId, changes) {
  return request(() => {
    const user = requireUser(userId);
    const updates = Object.fromEntries(Object.entries(changes).filter(([key]) => EDITABLE_FIELDS.includes(key)));
    if ('firstName' in updates && isBlank(updates.firstName)) throw new ServiceError('First name is required.');
    if ('lastName' in updates && isBlank(updates.lastName)) throw new ServiceError('Last name is required.');
    if ('email' in updates) updates.email = assertEmailAvailable(updates.email, user._id);
    if ('schoolId' in updates) updates.schoolId = isBlank(updates.schoolId) ? null : updates.schoolId.trim();
    return db.update('users', userId, updates);
  });
}

export function setUserStatus(userId, status) {
  return request(() => {
    if (!Object.values(USER_STATUS).includes(status)) throw new ServiceError('Choose a valid status.');
    const user = requireUser(userId);
    if (status !== USER_STATUS.ACTIVE && user.role === ROLES.INSTRUCTOR) unassignInstructorSections(user);
    return db.update('users', userId, {
      status,
      assignedSectionIds: status === USER_STATUS.ACTIVE ? user.assignedSectionIds : [],
    });
  });
}

/** Administrator: change a user's role. Section links that no longer apply are cleared. */
export function changeUserRole(userId, role, { sectionId } = {}) {
  return request(() => {
    if (!Object.values(ROLES).includes(role)) throw new ServiceError('Choose a valid role.');
    const user = requireUser(userId);
    if (user.role === role) return user;
    if (user.role === ROLES.ADMIN && db.find('users', (u) => u.role === ROLES.ADMIN).length === 1) {
      throw new ServiceError('The system needs at least one administrator.', 409);
    }
    if (role === ROLES.STUDENT) requireSection(sectionId);
    if (user.role === ROLES.INSTRUCTOR) unassignInstructorSections(user);

    return db.update('users', userId, {
      role,
      sectionId: role === ROLES.STUDENT ? sectionId : null,
      assignedSectionIds: [],
    });
  });
}

/** Move a student to another section (enrollment). */
export function enrollStudent(studentId, sectionId) {
  return request(() => {
    requireUser(studentId, ROLES.STUDENT);
    requireSection(sectionId);
    return db.update('users', studentId, { sectionId });
  });
}

/** Delete an account. A student's attempts and progress are deleted with it. */
export function deleteUser(userId) {
  return request(() => {
    const user = requireUser(userId);
    if (user.role === ROLES.ADMIN && db.find('users', (u) => u.role === ROLES.ADMIN).length === 1) {
      throw new ServiceError('The system needs at least one administrator.', 409);
    }
    if (user.role === ROLES.INSTRUCTOR) unassignInstructorSections(user);
    if (user.role === ROLES.STUDENT) {
      db.removeWhere('missionAttempts', (a) => a.studentId === userId);
      db.removeWhere('progress', (p) => p.studentId === userId);
    }
    db.remove('users', userId);
    return { deleted: true };
  });
}

// ───────── Instructor roster (Proposal Fig 26) ─────────

/**
 * Students in the instructor's sections.
 * @param {string} instructorId
 * @param {{ sectionId?: string, search?: string, status?: string }} filters
 */
export function listRoster(instructorId, filters = {}) {
  return request(() => {
    const instructor = requireUser(instructorId, ROLES.INSTRUCTOR);
    if (filters.sectionId) requireInstructorSection(instructorId, filters.sectionId);
    const sectionIds = filters.sectionId ? [filters.sectionId] : instructor.assignedSectionIds;
    return db
      .find(
        'users',
        (u) =>
          u.role === ROLES.STUDENT &&
          sectionIds.includes(u.sectionId) &&
          (!filters.status || u.status === filters.status) &&
          matchesSearch(u, filters.search),
      )
      .sort(byName);
  });
}

/** Instructor edits a student in one of their sections. */
export function updateRosterStudent(instructorId, studentId, changes) {
  return request(() => {
    const student = requireUser(studentId, ROLES.STUDENT);
    requireInstructorSection(instructorId, student.sectionId);
    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in changes) updates[field] = changes[field];
    }
    if ('firstName' in updates && isBlank(updates.firstName)) throw new ServiceError('First name is required.');
    if ('lastName' in updates && isBlank(updates.lastName)) throw new ServiceError('Last name is required.');
    if ('email' in updates) updates.email = assertEmailAvailable(updates.email, studentId);
    if ('schoolId' in updates) updates.schoolId = isBlank(updates.schoolId) ? null : updates.schoolId.trim();
    if (changes.sectionId && changes.sectionId !== student.sectionId) {
      requireInstructorSection(instructorId, changes.sectionId);
      updates.sectionId = changes.sectionId;
    }
    if (changes.status) {
      if (!Object.values(USER_STATUS).includes(changes.status)) throw new ServiceError('Choose a valid status.');
      updates.status = changes.status;
    }
    return db.update('users', studentId, updates);
  });
}

/** Instructor removes a student from the course (the account is deactivated, not deleted). */
export function removeRosterStudent(instructorId, studentId) {
  return request(() => {
    const student = requireUser(studentId, ROLES.STUDENT);
    requireInstructorSection(instructorId, student.sectionId);
    return db.update('users', studentId, { status: USER_STATUS.INACTIVE });
  });
}
