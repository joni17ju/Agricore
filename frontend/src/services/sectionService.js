/**
 * Academic sections and instructor assignment (Administrator).
 * The section ↔ instructor link is stored on both sides
 * (`sections.instructorId` and `users.assignedSectionIds`) and kept in sync here.
 */
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { isBlank } from '../utils/validation.js';
import { db, request, ServiceError } from './mockDb.js';
import { requireSection, requireUser } from './serviceContext.js';

function setSectionInstructor(section, instructorId) {
  if (section.instructorId) {
    const previous = db.findById('users', section.instructorId);
    if (previous) {
      db.update('users', previous._id, {
        assignedSectionIds: previous.assignedSectionIds.filter((id) => id !== section._id),
      });
    }
  }
  if (instructorId) {
    const instructor = requireUser(instructorId, ROLES.INSTRUCTOR);
    if (instructor.status !== USER_STATUS.ACTIVE) {
      throw new ServiceError('Only active instructors can be assigned to a section.');
    }
    if (!instructor.assignedSectionIds.includes(section._id)) {
      db.update('users', instructor._id, {
        assignedSectionIds: [...instructor.assignedSectionIds, section._id],
      });
    }
  }
  return db.update('sections', section._id, { instructorId: instructorId || null });
}

function assertUniqueName(sectionName, ignoreId) {
  const name = sectionName.trim().toLowerCase();
  if (db.findOne('sections', (s) => s._id !== ignoreId && s.sectionName.toLowerCase() === name)) {
    throw new ServiceError('A section with this name already exists.', 409);
  }
}

export function listSections() {
  return request(() => [...db.all('sections')].sort((a, b) => a.sectionName.localeCompare(b.sectionName)));
}

/** Sections with their instructor and enrolled student counts. */
export function listSectionsWithDetails() {
  return request(() =>
    [...db.all('sections')]
      .sort((a, b) => a.sectionName.localeCompare(b.sectionName))
      .map((section) => {
        const students = db.find('users', (u) => u.role === ROLES.STUDENT && u.sectionId === section._id);
        return {
          section,
          instructor: section.instructorId ? db.findById('users', section.instructorId) : null,
          studentCount: students.length,
          activeStudentCount: students.filter((u) => u.status === USER_STATUS.ACTIVE).length,
        };
      }),
  );
}

export function getSection(sectionId) {
  return request(() => requireSection(sectionId));
}

export function createSection({ sectionName, instructorId }) {
  return request(() => {
    if (isBlank(sectionName)) throw new ServiceError('Section name is required.');
    assertUniqueName(sectionName);
    const section = db.insert('sections', { sectionName: sectionName.trim(), instructorId: null });
    return instructorId ? setSectionInstructor(section, instructorId) : section;
  });
}

export function updateSection(sectionId, { sectionName }) {
  return request(() => {
    requireSection(sectionId);
    if (isBlank(sectionName)) throw new ServiceError('Section name is required.');
    assertUniqueName(sectionName, sectionId);
    return db.update('sections', sectionId, { sectionName: sectionName.trim() });
  });
}

/** Assign an instructor to a section, or pass null to unassign. */
export function assignInstructor(sectionId, instructorId) {
  return request(() => setSectionInstructor(requireSection(sectionId), instructorId));
}

export function deleteSection(sectionId) {
  return request(() => {
    const section = requireSection(sectionId);
    const enrolled = db.find('users', (u) => u.role === ROLES.STUDENT && u.sectionId === sectionId).length;
    if (enrolled > 0) {
      throw new ServiceError(`Move the ${enrolled} enrolled student(s) to another section first.`, 409);
    }
    setSectionInstructor(section, null);
    db.remove('sections', sectionId);
    return { deleted: true };
  });
}
