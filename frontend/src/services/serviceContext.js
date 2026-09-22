/**
 * Shared lookups used by several services, backed by the real API.
 *
 * These run inside `request()` callbacks, which await their handler, so every
 * lookup here is async and callers await it.
 *
 * Role scoping matters here. The mock version read whole collections out of a
 * local database; the API scopes by role, so:
 *   - getStudentActivity() only works for your own id unless you are staff
 *   - getSectionStudents() is STAFF ONLY — it calls GET /users, which returns
 *     403 to a student. Student-facing code that needs section ranking must use
 *     leaderboardService (the server-side aggregation), not this helper.
 */
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { buildStudentCurriculum } from '../utils/curriculum.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';

/*
 * Course content — modules, lessons and missions — is the same for everyone and
 * changes only when an instructor edits it, so it is fetched once and reused.
 * Services that write to it call invalidateCourse().
 */
let coursePromise = null;

export function invalidateCourse() {
  coursePromise = null;
}

export function getCourse() {
  if (!coursePromise) {
    coursePromise = Promise.all([api.get('/modules'), api.get('/lessons'), api.get('/missions')])
      .then(([modules, lessons, missions]) => ({
        modules,
        lessons,
        missions,
        modulesById: new Map(modules.map((m) => [m._id, m])),
        lessonsById: new Map(lessons.map((l) => [l._id, l])),
        missionsById: new Map(missions.map((m) => [m._id, m])),
      }))
      .catch((error) => {
        // Never cache a failure, or the app stays broken until a reload.
        coursePromise = null;
        throw error;
      });
  }
  return coursePromise;
}

export async function requireUser(userId, role) {
  let user;
  try {
    user = await api.get(`/users/${userId}`);
  } catch (error) {
    if (error.status === 404) throw new ServiceError('User not found.', 404);
    throw error;
  }
  if (role && user.role !== role) throw new ServiceError('This action is not allowed for this account.', 403);
  return user;
}

export async function requireSection(sectionId) {
  try {
    return await api.get(`/sections/${sectionId}`);
  } catch (error) {
    if (error.status === 404) throw new ServiceError('Section not found.', 404);
    throw error;
  }
}

/** Instructors may only access sections assigned to them. */
export async function requireInstructorSection(instructorId, sectionId) {
  const [instructor, section] = await Promise.all([
    requireUser(instructorId, ROLES.INSTRUCTOR),
    requireSection(sectionId),
  ]);
  if (!(instructor.assignedSectionIds ?? []).some((id) => String(id) === String(sectionId))) {
    throw new ServiceError('You are not assigned to this section.', 403);
  }
  return section;
}

export async function getStudentActivity(studentId) {
  const [attempts, progress] = await Promise.all([
    api.get('/missionAttempts', { studentId }),
    api.get('/progress', { studentId }),
  ]);
  return { attempts, progress };
}

export async function getStudentCurriculum(studentId, course) {
  const [resolvedCourse, { attempts, progress }] = await Promise.all([
    course ? Promise.resolve(course) : getCourse(),
    getStudentActivity(studentId),
  ]);
  return buildStudentCurriculum({ ...resolvedCourse, attempts, progress });
}

/**
 * STAFF ONLY — GET /users returns 403 to students.
 * Student-facing ranking goes through leaderboardService instead.
 */
export async function getSectionStudents(sectionId, { includeInactive = false } = {}) {
  const students = await api.get('/users', { role: ROLES.STUDENT, sectionId });
  return includeInactive ? students : students.filter((u) => u.status === USER_STATUS.ACTIVE);
}

/** Module and lesson a mission belongs to. */
export function getMissionContext(mission, course) {
  const lesson = course.lessonsById.get(String(mission.lessonId));
  const module = lesson ? course.modulesById.get(String(lesson.moduleId)) : null;
  return { lesson, module };
}

export const fullName = (user) => `${user.firstName} ${user.lastName}`;
