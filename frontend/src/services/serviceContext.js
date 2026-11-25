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
 *
 * Caching (for speed). Every page used to fetch the signed-in user, the whole
 * course and the student's attempts and progress again, often more than once
 * per page. Now:
 *   - the course is fetched once per session (as before); for students the
 *     lesson list comes without full lesson text, which is fetched per lesson
 *     when it is opened (getLessonContent) — a fraction of the download;
 *   - the user record and the student's activity are reused for a few
 *     seconds, and dropped as soon as anything that changes them is written
 *     (invalidateActivity / invalidateUser), so nothing shown is out of date;
 *   - clearSessionCaches() drops everything on sign-in and sign-out.
 */
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { buildStudentCurriculum } from '../utils/curriculum.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';

const USER_TTL_MS = 30 * 1000;
const ACTIVITY_TTL_MS = 20 * 1000;

/*
 * Course content — modules, lessons and missions — is the same for everyone and
 * changes only when an instructor edits it, so it is fetched once and reused.
 * Services that write to it call invalidateCourse().
 */
let coursePromise = null;
let courseAudience = 'full';
const lessonContent = new Map();
const userCache = new Map();
const activityCache = new Map();
const sessionClearers = new Set();

/*
 * A prefetch already on its way (GET /dashboard, started at app start or
 * sign-in) brings the course outline, the account and the attempts. Lookups
 * made meanwhile wait for it instead of asking for the same data in parallel.
 */
let pendingBootstrap = null;
export function setPendingBootstrap(promise) {
  pendingBootstrap = promise;
  promise.finally(() => {
    if (pendingBootstrap === promise) pendingBootstrap = null;
  }).catch(() => {});
}
/** Called by the prefetch itself before it uses these lookups, so it never waits on itself. */
export function releasePendingBootstrap() {
  pendingBootstrap = null;
}
const afterBootstrap = () => (pendingBootstrap ? pendingBootstrap.catch(() => {}) : null);

function buildCourse({ modules, lessons, missions }) {
  return {
    modules,
    lessons,
    missions,
    modulesById: new Map(modules.map((m) => [m._id, m])),
    lessonsById: new Map(lessons.map((l) => [l._id, l])),
    missionsById: new Map(missions.map((m) => [m._id, m])),
  };
}

/**
 * Students read the course as an outline (each lesson's first paragraph
 * instead of its full text); instructors, who edit lessons, get it whole.
 */
export function setCourseAudience(role) {
  const next = role === ROLES.STUDENT ? 'summary' : 'full';
  if (next !== courseAudience) {
    courseAudience = next;
    coursePromise = null;
  }
}

export function invalidateCourse() {
  coursePromise = null;
  lessonContent.clear();
}

export async function getCourse() {
  if (!coursePromise && pendingBootstrap) await afterBootstrap();
  if (!coursePromise) {
    const lessonsPath = courseAudience === 'summary' ? '/lessons?fields=summary' : '/lessons';
    coursePromise = Promise.all([api.get('/modules'), api.get(lessonsPath), api.get('/missions')])
      .then(([modules, lessons, missions]) => buildCourse({ modules, lessons, missions }))
      .catch((error) => {
        // Never cache a failure, or the app stays broken until a reload.
        coursePromise = null;
        throw error;
      });
  }
  return coursePromise;
}

/** Use a course outline that arrived with another response (GET /dashboard). */
export function seedCourse(course) {
  if (courseAudience !== 'summary' || !course) return;
  coursePromise = Promise.resolve(buildCourse(course));
}

/**
 * One lesson in full (text and media). Outlines carry only a summary, so a
 * lesson page asks for its own lesson; repeated or prefetched requests share
 * one download.
 */
export function getLessonContent(lessonId) {
  const key = String(lessonId);
  if (!lessonContent.has(key)) {
    const promise = api.get(`/lessons/${key}`).catch((error) => {
      lessonContent.delete(key);
      throw error;
    });
    lessonContent.set(key, promise);
  }
  return lessonContent.get(key);
}

/** Start downloading a lesson the student is likely to open next. Errors are ignored. */
export function prefetchLesson(lessonId) {
  if (!lessonId) return;
  getLessonContent(lessonId).catch(() => {});
}

const fresh = (entry, ttl) => entry && Date.now() - entry.at < ttl;

export function invalidateUser(userId) {
  if (userId) userCache.delete(String(userId));
  else userCache.clear();
}

export function seedUser(user) {
  if (user?._id) userCache.set(String(user._id), { at: Date.now(), promise: Promise.resolve(user) });
}

export async function requireUser(userId, role) {
  const key = String(userId);
  if (!userCache.has(key) && pendingBootstrap) await afterBootstrap();
  let entry = userCache.get(key);
  if (!fresh(entry, USER_TTL_MS)) {
    entry = { at: Date.now(), promise: api.get(`/users/${key}`) };
    userCache.set(key, entry);
    entry.promise.catch(() => userCache.delete(key));
  }
  let user;
  try {
    user = await entry.promise;
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

/** Drop a student's cached attempts and progress (after a submit or a lesson view). */
export function invalidateActivity(studentId) {
  if (studentId) activityCache.delete(String(studentId));
  else activityCache.clear();
}

export function seedActivity(studentId, { attempts, progress }) {
  activityCache.set(String(studentId), { at: Date.now(), promise: Promise.resolve({ attempts, progress }) });
}

export async function getStudentActivity(studentId) {
  const key = String(studentId);
  if (!activityCache.has(key) && pendingBootstrap) await afterBootstrap();
  const entry = activityCache.get(key);
  if (fresh(entry, ACTIVITY_TTL_MS)) return entry.promise;
  const promise = Promise.all([api.get('/missionAttempts', { studentId }), api.get('/progress', { studentId })]).then(
    ([attempts, progress]) => ({ attempts, progress }),
  );
  activityCache.set(key, { at: Date.now(), promise });
  promise.catch(() => activityCache.delete(key));
  return promise;
}

export async function getStudentCurriculum(studentId, course) {
  const [resolvedCourse, { attempts, progress }] = await Promise.all([
    course ? Promise.resolve(course) : getCourse(),
    getStudentActivity(studentId),
  ]);
  return buildStudentCurriculum({ ...resolvedCourse, attempts, progress });
}

/** Other services' caches register here so sign-in and sign-out clear them too. */
export function onSessionClear(clear) {
  sessionClearers.add(clear);
}


/** Forget everything fetched under the current session. */
export function clearSessionCaches() {
  pendingBootstrap = null;
  invalidateCourse();
  userCache.clear();
  activityCache.clear();
  for (const clear of sessionClearers) clear();
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
