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
import { evaluateNewBadges } from '../utils/badgeRules.js';
import {
  buildStudentCurriculum,
  canAccessMission,
  findNextStep,
  getLessonGameMissions,
  getModuleGameMissions,
  getModuleLessons,
} from '../utils/curriculum.js';
import { calculateLevel, calculateTotalXP } from '../utils/gamification.js';
import { ROLES } from '../constants/roles.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';
import { getCourse, getMissionContext, getStudentActivity, invalidateCourse, requireUser } from './serviceContext.js';

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
async function sectionRankOf(student) {
  if (!student.sectionId) return null;
  try {
    const rows = await api.get('/leaderboard', { sectionId: student.sectionId });
    return rows.find((row) => String(row._id) === String(student._id))?.rank ?? null;
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
 * Submit an attempt and report what changed.
 *
 * @param {{ studentId: string, missionId: string, answers: object, timeSpentSeconds: number }} input
 * @returns result used by the mission result screen
 */
export async function submitAttempt({ studentId, missionId, answers, timeSpentSeconds }) {
  const student = await requireUser(studentId, ROLES.STUDENT);
  const course = await getCourse();
  const mission = await requireMission(missionId);
  const { lesson, module } = getMissionContext(mission, course);

  const before = await getStudentActivity(studentId);
  const curriculumBefore = buildStudentCurriculum({ ...course, ...before });
  if (!canAccessMission(curriculumBefore, missionId)) {
    throw new ServiceError('This mission is locked. Complete the previous topic first.', 403);
  }

  const totalXPBefore = calculateTotalXP(before.attempts);
  const rankBefore = await sectionRankOf(student);

  // The server scores the answers and writes both the attempt and the
  // lesson's progress row; nothing about the score is decided here.
  const submitted = await api.post('/missionAttempts', {
    studentId,
    missionId,
    answers,
    timeSpentSeconds,
  });
  const { attempt, score, isPassed, xpEarned, breakdown } = submitted;

  const after = await getStudentActivity(studentId);
  const curriculumAfter = buildStudentCurriculum({ ...course, ...after });
  const rankAfter = await sectionRankOf(student);

  /*
   * TODO(security): badges are not authoritative yet.
   *
   * Scoring was moved server-side so a tampered client cannot award itself XP,
   * but badge evaluation still runs here and is persisted through
   * PATCH /users/:id, which accepts earnedBadges. A crafted request could grant
   * itself any badge. Fix the same way as scoring: evaluate inside the
   * mission-attempt controller and drop earnedBadges from the editable fields.
   * Tracked in backend/README.md under "Known follow-ups".
   */
  const newCodes = evaluateNewBadges({
    attempts: after.attempts,
    curriculum: curriculumAfter,
    missionsById: course.missionsById,
    earnedCodes: (student.earnedBadges ?? []).map((b) => b.code),
    sectionRank: rankAfter,
    now: new Date(),
  });
  if (newCodes.length) {
    await api.patch(`/users/${studentId}`, {
      earnedBadges: [
        ...(student.earnedBadges ?? []),
        ...newCodes.map((code) => ({ code, earnedAt: attempt.attemptedAt })),
      ],
    });
  }

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
export async function createMission({ lessonId, maxXP, scenarioData }) {
  validateMissionInput({ maxXP, scenarioData });
  const { lessonsById } = await getCourse();
  if (!lessonsById.get(String(lessonId))) throw new ServiceError('Lesson not found.', 404);
  const mission = await api.post('/missions', { lessonId, maxXP: Number(maxXP), scenarioData });
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

/** Delete a mission level. The server renumbers the remaining levels. */
export async function deleteMission(missionId) {
  const result = await api.del(`/missions/${missionId}`);
  invalidateCourse();
  return result;
}
