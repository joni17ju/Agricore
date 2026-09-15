/**
 * Shared lookups used by several mock services. These run inside `request()`
 * callbacks and read the mock database synchronously.
 *
 * When the backend exists, this logic moves server-side and this file is deleted.
 */
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { buildStudentCurriculum } from '../utils/curriculum.js';
import { db, ServiceError } from './mockDb.js';

export function getCourse() {
  const modules = db.all('modules');
  const lessons = db.all('lessons');
  const missions = db.all('missions');
  return {
    modules,
    lessons,
    missions,
    modulesById: new Map(modules.map((m) => [m._id, m])),
    lessonsById: new Map(lessons.map((l) => [l._id, l])),
    missionsById: new Map(missions.map((m) => [m._id, m])),
  };
}

export function requireUser(userId, role) {
  const user = db.findById('users', userId);
  if (!user) throw new ServiceError('User not found.', 404);
  if (role && user.role !== role) throw new ServiceError('This action is not allowed for this account.', 403);
  return user;
}

export function requireSection(sectionId) {
  const section = db.findById('sections', sectionId);
  if (!section) throw new ServiceError('Section not found.', 404);
  return section;
}

/** Instructors may only access sections assigned to them. */
export function requireInstructorSection(instructorId, sectionId) {
  const instructor = requireUser(instructorId, ROLES.INSTRUCTOR);
  const section = requireSection(sectionId);
  if (!instructor.assignedSectionIds.includes(sectionId)) {
    throw new ServiceError('You are not assigned to this section.', 403);
  }
  return section;
}

export function getStudentActivity(studentId) {
  return {
    attempts: db.find('missionAttempts', (a) => a.studentId === studentId),
    progress: db.find('progress', (p) => p.studentId === studentId),
  };
}

export function getStudentCurriculum(studentId, course = getCourse()) {
  const { attempts, progress } = getStudentActivity(studentId);
  return buildStudentCurriculum({ ...course, attempts, progress });
}

export function getSectionStudents(sectionId, { includeInactive = false } = {}) {
  return db.find(
    'users',
    (u) =>
      u.role === ROLES.STUDENT &&
      u.sectionId === sectionId &&
      (includeInactive || u.status === USER_STATUS.ACTIVE),
  );
}

/** Module and lesson a mission belongs to. */
export function getMissionContext(mission, course = getCourse()) {
  const lesson = course.lessonsById.get(mission.lessonId);
  const module = lesson ? course.modulesById.get(lesson.moduleId) : null;
  return { lesson, module };
}

export const fullName = (user) => `${user.firstName} ${user.lastName}`;

/** Re-number lessons 1..n inside a module, keeping their current order. */
export function renumberLessons(moduleId) {
  db.find('lessons', (l) => l.moduleId === moduleId)
    .sort((a, b) => a.lessonNumber - b.lessonNumber)
    .forEach((lesson, index) => {
      if (lesson.lessonNumber !== index + 1) db.update('lessons', lesson._id, { lessonNumber: index + 1 });
    });
}

/**
 * Mission levels are numbered across the whole module (Level 1 of 8, …).
 * Re-number them in lesson order after levels are added or removed.
 */
export function renumberModuleLevels(moduleId) {
  const lessons = db.find('lessons', (l) => l.moduleId === moduleId).sort((a, b) => a.lessonNumber - b.lessonNumber);
  let level = 0;
  for (const lesson of lessons) {
    db.find('missions', (m) => m.lessonId === lesson._id && m.levelNumber !== null)
      .sort((a, b) => a.levelNumber - b.levelNumber)
      .forEach((mission) => {
        level += 1;
        if (mission.levelNumber !== level) db.update('missions', mission._id, { levelNumber: level });
      });
  }
}
