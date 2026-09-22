/**
 * Academic sections and instructor assignment (Administrator).
 * The section ↔ instructor link is stored on both sides
 * (`sections.instructorId` and `users.assignedSectionIds`) and kept in sync here.
 *
 * Admin-only screens, so reading the full user list is permitted — GET /users
 * is open to instructors and admins.
 */
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { isBlank } from '../utils/validation.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';
import { requireSection, requireUser } from './serviceContext.js';

/**
 * Point a section at an instructor, keeping users.assignedSectionIds in step.
 * Both sides are written here because the API stores the link on both.
 */
async function setSectionInstructor(section, instructorId) {
  if (section.instructorId) {
    const previous = await api.get(`/users/${section.instructorId}`).catch(() => null);
    if (previous) {
      await api.patch(`/users/${previous._id}`, {
        assignedSectionIds: (previous.assignedSectionIds ?? []).filter((id) => String(id) !== String(section._id)),
      });
    }
  }
  if (instructorId) {
    const instructor = await requireUser(instructorId, ROLES.INSTRUCTOR);
    if (instructor.status !== USER_STATUS.ACTIVE) {
      throw new ServiceError('Only active instructors can be assigned to a section.');
    }
    const assigned = (instructor.assignedSectionIds ?? []).map(String);
    if (!assigned.includes(String(section._id))) {
      await api.patch(`/users/${instructor._id}`, { assignedSectionIds: [...assigned, section._id] });
    }
  }
  return api.patch(`/sections/${section._id}`, { instructorId: instructorId || null });
}

async function assertUniqueName(sectionName, ignoreId) {
  const name = sectionName.trim().toLowerCase();
  const sections = await api.get('/sections');
  if (sections.some((s) => String(s._id) !== String(ignoreId) && s.sectionName.toLowerCase() === name)) {
    throw new ServiceError('A section with this name already exists.', 409);
  }
}

export async function listSections() {
  const sections = await api.get('/sections');
  return [...sections].sort((a, b) => a.sectionName.localeCompare(b.sectionName));
}

/** Sections with their instructor and enrolled student counts. */
export async function listSectionsWithDetails() {
  const [sections, students, instructors] = await Promise.all([
    api.get('/sections'),
    api.get('/users', { role: ROLES.STUDENT }),
    api.get('/users', { role: ROLES.INSTRUCTOR }),
  ]);
  const instructorsById = new Map(instructors.map((u) => [String(u._id), u]));

  return [...sections]
    .sort((a, b) => a.sectionName.localeCompare(b.sectionName))
    .map((section) => {
      const enrolled = students.filter((u) => String(u.sectionId) === String(section._id));
      return {
        section,
        instructor: section.instructorId ? instructorsById.get(String(section.instructorId)) ?? null : null,
        studentCount: enrolled.length,
        activeStudentCount: enrolled.filter((u) => u.status === USER_STATUS.ACTIVE).length,
      };
    });
}

export function getSection(sectionId) {
  return requireSection(sectionId);
}

export async function createSection({ sectionName, instructorId }) {
  if (isBlank(sectionName)) throw new ServiceError('Section name is required.');
  await assertUniqueName(sectionName);
  const section = await api.post('/sections', { sectionName: sectionName.trim() });
  return instructorId ? setSectionInstructor(section, instructorId) : section;
}

export async function updateSection(sectionId, { sectionName }) {
  if (isBlank(sectionName)) throw new ServiceError('Section name is required.');
  await requireSection(sectionId);
  await assertUniqueName(sectionName, sectionId);
  return api.patch(`/sections/${sectionId}`, { sectionName: sectionName.trim() });
}

/** Assign an instructor to a section, or pass null to unassign. */
export async function assignInstructor(sectionId, instructorId) {
  const section = await requireSection(sectionId);
  return setSectionInstructor(section, instructorId);
}

export async function deleteSection(sectionId) {
  const section = await requireSection(sectionId);
  // Unlink the instructor first; the server refuses to delete a section that
  // still has students enrolled.
  await setSectionInstructor(section, null);
  return api.del(`/sections/${sectionId}`);
}
