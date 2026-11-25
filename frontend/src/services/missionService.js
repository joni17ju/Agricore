/**
 * Mission levels and mission attempts.
 *
 * Scoring is no longer done here. submitAttempt() posts the student's raw
 * answers and the server re-scores them against the mission's stored
 * scenarioData, so a tampered client cannot award itself XP. Everything the
 * result screen shows beyond the score — level, rank movement, unlocked
 * lessons, badges — is still derived here from the refreshed activity, exactly
 * as before, so the screen's props are unchanged.
 */
import { BADGES_BY_CODE } from '../constants/badges.js';
import { LESSON_STATE } from '../constants/rules.js';
import {
  buildStudentCurriculum,
  canAccessMission,
  findNextStep,
  getLessonGameMissions,
  getModuleGameMissions,
  getModuleLessons,
  lessonNextStep,
} from '../utils/curriculum.js';
import { calculateLevel, calculateTotalXP } from '../utils/gamification.js';
import { ROLES } from '../constants/roles.js';
import { api } from './apiClient.js';
import { invalidateLeaderboards } from './leaderboardService.js';
import { ServiceError } from './serviceError.js';
import { getCourse, getMissionContext, getStudentActivity, invalidateActivity, invalidateCourse, invalidateUser, requireUser } from './serviceContext.js';

async function requireMission(missionId) {
  const { missionsById } = await getCourse();
  const mission = missionsById.get(String(missionId));
  if (!mission) throw new ServiceError('Mission not found.', 404);
  return mission;
}

// ───────── Reading ─────────

export async function listLessonMissions(lessonId) {
  const { missions } = await getCourse();
  return getLessonGameMissions(missions, lessonId);
}

export async function getMission(missionId) {
  const course = await getCourse();
  const mission = await requireMission(missionId);
  return { mission, ...getMissionContext(mission, course) };
}

/** Everything a student's mission screen needs. Rejects locked missions. */
export async function getMissionForStudent(studentId, missionId) {
  await requireUser(studentId, ROLES.STUDENT);
  const [course, { attempts, progress }] = await Promise.all([getCourse(), getStudentActivity(studentId)]);
  const mission = await requireMission(missionId);
  const { lesson, module } = getMissionContext(mission, course);
  const curriculum = buildStudentCurriculum({ ...course, attempts, progress });

  if (!canAccessMission(curriculum, missionId)) {
    throw new ServiceError('This mission is locked. Complete the previous topic first.', 403);
  }

  const moduleLevels = getModuleGameMissions(course.missions, getModuleLessons(course.lessons, module._id));
  const missionAttempts = attempts
    .filter((a) => String(a.missionId) === String(missionId))
    .sort((a, b) => String(b.attemptedAt).localeCompare(String(a.attemptedAt)));

  return {
    mission,
    lesson,
    module,
    totalLevels: moduleLevels.length,
    totalXP: calculateTotalXP(attempts),
    attempts: missionAttempts,
    bestScore: missionAttempts.length ? Math.max(...missionAttempts.map((a) => a.score)) : null,
    isPassed: missionAttempts.some((a) => a.isPassed),
  };
}

/** All missions of the student's curriculum with their state (Missions hub page). */
export async function listStudentMissions(studentId) {
  await requireUser(studentId, ROLES.STUDENT);
  const [course, { attempts, progress }] = await Promise.all([getCourse(), getStudentActivity(studentId)]);
  return buildStudentCurriculum({ ...course, attempts, progress }).map((moduleEntry) => ({
    module: moduleEntry.module,
    state: moduleEntry.state,
    levels: moduleEntry.lessons.flatMap((lessonEntry) =>
      lessonEntry.levels.map((level) => ({ ...level, lesson: lessonEntry.lesson, state: lessonEntry.state })),
    ),
  }));
}

// ───────── Submitting an attempt ─────────

/**
 * The student's position in their section.
 *
 * The mock read every user and every attempt in the section, which the API
 * refuses to a student. The server-side leaderboard aggregation returns the
 * same ranking with only display fields, and any signed-in user may read it.
 */
async function sectionRankOf(studentId) {
  try {
    // The server ranks the signed-in student's own section; no section id needed.
    const rows = await api.get('/leaderboard');
    return rows.find((row) => String(row._id) === String(studentId))?.rank ?? null;
  } catch {
    // Rank movement is decoration on the result screen; never fail a submit for it.
    return null;
  }
}

function lessonEntryFor(curriculum, lessonId) {
  for (const moduleEntry of curriculum) {
    const entry = moduleEntry.lessons.find((item) => String(item.lesson._id) === String(lessonId));
    if (entry) return { moduleEntry, lessonEntry: entry };
  }
  return {};
}

/**
 * Start a play of a mission level on the server.
 *
 * Returns the server-generated attempt id the submission must carry. Starting
 * again — in this tab or any other — replaces the earlier attempt, so only the
 * most recent start can be submitted.
 *
 * @returns {Promise<{ attemptId: string, startedAt: string, minSeconds: number }>}
 */
export async function startMissionAttempt(missionId) {
  return api.post('/missionAttempts/start', { missionId });
}

/** Error codes from the server that mean "this attempt can no longer be submitted". */
export const ATTEMPT_ENDED_CODES = Object.freeze([
  'attempt_replaced',
  'attempt_already_submitted',
  'attempt_expired',
  'attempt_failed',
  'attempt_invalid',
  'attempt_required',
]);

/**
 * Submit an attempt and report what changed.
 *
 * @param {{ studentId: string, missionId: string, attemptId: string, answers: object, timeSpentSeconds: number }} input
 * @returns result used by the mission result screen
 */
export async function submitAttempt({ studentId, missionId, attemptId, answers, timeSpentSeconds }) {
  // Everything "before" is read at once rather than one request after another.
  const [, course, mission, before, rankBefore] = await Promise.all([
    requireUser(studentId, ROLES.STUDENT),
    getCourse(),
    requireMission(missionId),
    getStudentActivity(studentId),
    sectionRankOf(studentId),
  ]);
  const { lesson, module } = getMissionContext(mission, course);

  const curriculumBefore = buildStudentCurriculum({ ...course, ...before });
  if (!canAccessMission(curriculumBefore, missionId)) {
    throw new ServiceError('This mission is locked. Complete the previous topic first.', 403);
  }

  const totalXPBefore = calculateTotalXP(before.attempts);

  // The server scores the answers and writes both the attempt and the
  // lesson's progress row; nothing about the score is decided here.
  const submitted = await api.post('/missionAttempts', {
    attemptId,
    studentId,
    missionId,
    answers,
    timeSpentSeconds,
  });
  const { attempt, score, isPassed, xpEarned, breakdown } = submitted;
  // XP, progress and possibly badges changed: nothing cached about them is current.
  invalidateLeaderboards();
  invalidateActivity(studentId);
  invalidateUser(studentId);

  const [after, rankAfter] = await Promise.all([getStudentActivity(studentId), sectionRankOf(studentId)]);
  const curriculumAfter = buildStudentCurriculum({ ...course, ...after });

  /*
   * Badges come from the server now. They used to be evaluated here and written
   * back through PATCH /users/:id, which meant a crafted request could grant
   * itself any badge; that route no longer accepts earnedBadges at all. The
   * mission-attempt response carries the codes the server awarded, and this
   * only turns them into the definitions the unlock animation needs.
   */
  const newCodes = submitted.newBadges ?? [];

  const moduleBefore = curriculumBefore.find((entry) => String(entry.module._id) === String(module._id));
  const moduleAfter = curriculumAfter.find((entry) => String(entry.module._id) === String(module._id));
  const nextModuleAfter = curriculumAfter.find((entry) => entry.module.moduleNumber === module.moduleNumber + 1);
  const lessonBefore = lessonEntryFor(curriculumBefore, lesson._id).lessonEntry;
  const lessonAfter = lessonEntryFor(curriculumAfter, lesson._id).lessonEntry;

  const unlockedLessons = curriculumAfter
    .flatMap((entry) => entry.lessons)
    .filter((entry) => {
      const previous = lessonEntryFor(curriculumBefore, entry.lesson._id).lessonEntry;
      return previous?.state === LESSON_STATE.LOCKED && entry.state !== LESSON_STATE.LOCKED;
    })
    .map((entry) => entry.lesson);

  const totalXP = calculateTotalXP(after.attempts);
  const levelBefore = calculateLevel(totalXPBefore).level;
  const levelAfter = calculateLevel(totalXP);

  return {
    attempt,
    score,
    isPassed,
    breakdown,
    xpEarned,
    totalXP,
    level: levelAfter,
    leveledUp: levelAfter.level > levelBefore,
    rankBefore,
    rankAfter,
    newBadges: newCodes.map((code) => BADGES_BY_CODE[code]),
    lessonCompleted: lessonBefore?.state !== LESSON_STATE.COMPLETED && lessonAfter?.state === LESSON_STATE.COMPLETED,
    moduleCleared: Boolean(moduleBefore && moduleAfter && !moduleBefore.isCleared && moduleAfter.isCleared),
    unlockedLessons,
    unlockedModule:
      nextModuleAfter && moduleAfter?.isCleared && !moduleBefore?.isCleared ? nextModuleAfter.module : null,
    nextStep: findNextStep(curriculumAfter),
    // Where this mission's lesson leads now: its next level, topic or module.
    lessonNext: lessonNextStep(curriculumAfter, lesson._id),
  };
}

// ───────── Instructor management ─────────

function validateMissionInput({ maxXP, scenarioData }) {
  if (maxXP !== undefined && (!Number.isFinite(Number(maxXP)) || Number(maxXP) <= 0)) {
    throw new ServiceError('Max XP must be a positive number.');
  }
  if (scenarioData !== undefined) {
    if (!scenarioData || typeof scenarioData !== 'object') throw new ServiceError('Mission content is missing.');
    if (!scenarioData.title?.trim()) throw new ServiceError('Mission title is required.');
  }
}

/** Add a mission level to a lesson. The server assigns its level number. */
export async function createMission({ lessonId, maxXP, scenarioData, gameType = null }) {
  validateMissionInput({ maxXP, scenarioData });
  const { lessonsById } = await getCourse();
  if (!lessonsById.get(String(lessonId))) throw new ServiceError('Lesson not found.', 404);
  const mission = await api.post('/missions', { lessonId, maxXP: Number(maxXP), scenarioData, ...(gameType && { gameType }) });
  invalidateCourse();
  return mission;
}

export async function updateMission(missionId, { maxXP, scenarioData }) {
  validateMissionInput({ maxXP, scenarioData });
  await requireMission(missionId);
  const mission = await api.patch(`/missions/${missionId}`, {
    ...(maxXP !== undefined && { maxXP: Number(maxXP) }),
    ...(scenarioData !== undefined && { scenarioData }),
  });
  invalidateCourse();
  return mission;
}

/**
 * How many attempts students have made on a mission. Instructors only: the
 * attempts route lets staff list across students and scopes students to
 * their own records.
 */
export async function countMissionAttempts(missionId) {
  const attempts = await api.get('/missionAttempts', { missionId });
  return Array.isArray(attempts) ? attempts.length : 0;
}

/** Delete a mission level. The server renumbers the remaining levels. */
export async function deleteMission(missionId) {
  const result = await api.del(`/missions/${missionId}`);
  invalidateCourse();
  return result;
}
