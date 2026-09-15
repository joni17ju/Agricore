/**
 * Missions (game levels and module quizzes) and mission attempts.
 */
import { BADGES_BY_CODE } from '../constants/badges.js';
import { MISSION_KINDS } from '../constants/gameTypes.js';
import { PROGRESS_STATUS, LESSON_STATE } from '../constants/rules.js';
import { evaluateNewBadges } from '../utils/badgeRules.js';
import {
  buildStudentCurriculum,
  canAccessMission,
  findNextStep,
  getLessonGameMissions,
  getModuleGameMissions,
  getModuleLessons,
  isQuiz,
} from '../utils/curriculum.js';
import { calculateLevel, calculateTotalXP, calculateXpAward, rankStudentsByXP } from '../utils/gamification.js';
import { scoreMission } from '../utils/scoring.js';
import { ROLES } from '../constants/roles.js';
import { db, request, ServiceError } from './mockDb.js';
import {
  getCourse,
  getMissionContext,
  getSectionStudents,
  getStudentActivity,
  renumberModuleLevels,
  requireUser,
} from './serviceContext.js';

function requireMission(missionId) {
  const mission = db.findById('missions', missionId);
  if (!mission) throw new ServiceError('Mission not found.', 404);
  return mission;
}

const MAX_TIME_SECONDS = 4 * 60 * 60;

// ───────── Reading ─────────

export function listLessonMissions(lessonId) {
  return request(() => getLessonGameMissions(db.all('missions'), lessonId));
}

export function getMission(missionId) {
  return request(() => {
    const mission = requireMission(missionId);
    return { mission, ...getMissionContext(mission) };
  });
}

/**
 * Everything a student's mission screen needs. Rejects locked missions.
 */
export function getMissionForStudent(studentId, missionId) {
  return request(() => {
    requireUser(studentId, ROLES.STUDENT);
    const course = getCourse();
    const mission = requireMission(missionId);
    const { lesson, module } = getMissionContext(mission, course);
    const { attempts, progress } = getStudentActivity(studentId);
    const curriculum = buildStudentCurriculum({ ...course, attempts, progress });

    if (!canAccessMission(curriculum, missionId)) {
      throw new ServiceError('This mission is locked. Complete the previous topic first.', 403);
    }

    const moduleLevels = getModuleGameMissions(course.missions, getModuleLessons(course.lessons, module._id));
    const missionAttempts = attempts
      .filter((a) => a.missionId === missionId)
      .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt));

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
  });
}

/** All missions of the student's curriculum with their state (Missions hub page). */
export function listStudentMissions(studentId) {
  return request(() => {
    requireUser(studentId, ROLES.STUDENT);
    const course = getCourse();
    const { attempts, progress } = getStudentActivity(studentId);
    return buildStudentCurriculum({ ...course, attempts, progress }).map((moduleEntry) => ({
      module: moduleEntry.module,
      state: moduleEntry.state,
      levels: moduleEntry.lessons.flatMap((lessonEntry) =>
        lessonEntry.levels.map((level) => ({ ...level, lesson: lessonEntry.lesson, state: lessonEntry.state })),
      ),
      quiz: moduleEntry.quiz,
    }));
  });
}

// ───────── Submitting an attempt ─────────

function sectionRankOf(student) {
  if (!student.sectionId) return null;
  const ranking = rankStudentsByXP(getSectionStudents(student.sectionId), db.all('missionAttempts'));
  return ranking.find((row) => row.student._id === student._id)?.rank ?? null;
}

function lessonEntryFor(curriculum, lessonId) {
  for (const moduleEntry of curriculum) {
    const entry = moduleEntry.lessons.find((item) => item.lesson._id === lessonId);
    if (entry) return { moduleEntry, lessonEntry: entry };
  }
  return {};
}

function saveLessonProgress(studentId, lessonId, status) {
  const existing = db.findOne('progress', (p) => p.studentId === studentId && p.lessonId === lessonId);
  if (!existing) return db.insert('progress', { studentId, lessonId, status });
  if (existing.status !== PROGRESS_STATUS.COMPLETED && existing.status !== status) {
    return db.update('progress', existing._id, { status });
  }
  return existing;
}

/**
 * Score and record a mission attempt, then update progress, XP and badges.
 *
 * @param {{ studentId: string, missionId: string, answers: object, timeSpentSeconds: number }} input
 * @returns result used by the mission result screen
 */
export function submitAttempt({ studentId, missionId, answers, timeSpentSeconds }) {
  return request(() => {
    const student = requireUser(studentId, ROLES.STUDENT);
    const course = getCourse();
    const mission = requireMission(missionId);
    const { lesson, module } = getMissionContext(mission, course);

    const before = getStudentActivity(studentId);
    const curriculumBefore = buildStudentCurriculum({ ...course, ...before });
    if (!canAccessMission(curriculumBefore, missionId)) {
      throw new ServiceError('This mission is locked. Complete the previous topic first.', 403);
    }

    const { score, isPassed, breakdown } = scoreMission({
      gameType: module.gameType,
      scenarioData: mission.scenarioData,
      answers,
    });
    const xpEarned = calculateXpAward({
      maxXP: mission.maxXP,
      score,
      isPassed,
      previousAttempts: before.attempts.filter((a) => a.missionId === missionId),
    });
    const totalXPBefore = calculateTotalXP(before.attempts);
    const rankBefore = sectionRankOf(student);

    const attempt = db.insert('missionAttempts', {
      studentId,
      missionId,
      score,
      xpEarned,
      timeSpentSeconds: Math.max(0, Math.min(MAX_TIME_SECONDS, Math.round(timeSpentSeconds || 0))),
      isPassed,
      attemptedAt: new Date().toISOString(),
    });

    // Progress: the lesson is in progress, or completed once every level is passed.
    if (!isQuiz(mission)) {
      const afterAttempt = buildStudentCurriculum({ ...course, ...getStudentActivity(studentId) });
      const { lessonEntry } = lessonEntryFor(afterAttempt, lesson._id);
      const allPassed = lessonEntry.levels.every((level) => level.isPassed);
      saveLessonProgress(studentId, lesson._id, allPassed ? PROGRESS_STATUS.COMPLETED : PROGRESS_STATUS.IN_PROGRESS);
    }

    const after = getStudentActivity(studentId);
    const curriculumAfter = buildStudentCurriculum({ ...course, ...after });
    const rankAfter = sectionRankOf(student);

    // Badges
    const newCodes = evaluateNewBadges({
      attempts: after.attempts,
      curriculum: curriculumAfter,
      missionsById: course.missionsById,
      earnedCodes: student.earnedBadges.map((b) => b.code),
      sectionRank: rankAfter,
      now: new Date(),
    });
    if (newCodes.length) {
      db.update('users', studentId, {
        earnedBadges: [...student.earnedBadges, ...newCodes.map((code) => ({ code, earnedAt: attempt.attemptedAt }))],
      });
    }

    // What changed in the curriculum
    const moduleBefore = curriculumBefore.find((entry) => entry.module._id === module._id);
    const moduleAfter = curriculumAfter.find((entry) => entry.module._id === module._id);
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
      moduleCleared: !moduleBefore.isCleared && moduleAfter.isCleared,
      quizUnlocked: moduleBefore.quiz?.state === LESSON_STATE.LOCKED && moduleAfter.quiz?.state === LESSON_STATE.AVAILABLE,
      unlockedLessons,
      unlockedModule:
        nextModuleAfter && moduleAfter.isCleared && !moduleBefore.isCleared ? nextModuleAfter.module : null,
      nextStep: findNextStep(curriculumAfter),
    };
  });
}

// ───────── Instructor management ─────────

function validateMissionInput({ maxXP, scenarioData }) {
  if (maxXP !== undefined && (!Number.isFinite(Number(maxXP)) || Number(maxXP) <= 0)) {
    throw new ServiceError('Max XP must be a positive number.');
  }
  if (scenarioData !== undefined) {
    if (!scenarioData || typeof scenarioData !== 'object') throw new ServiceError('Mission content is missing.');
    if (!Object.values(MISSION_KINDS).includes(scenarioData.kind)) throw new ServiceError('Unknown mission kind.');
    if (!scenarioData.title?.trim()) throw new ServiceError('Mission title is required.');
  }
}

/** Add a mission level to a lesson. Levels across the module are re-numbered. */
export function createMission({ lessonId, maxXP, scenarioData }) {
  return request(() => {
    const lesson = db.findById('lessons', lessonId);
    if (!lesson) throw new ServiceError('Lesson not found.', 404);
    validateMissionInput({ maxXP, scenarioData });
    if (scenarioData.kind === MISSION_KINDS.QUIZ) {
      throw new ServiceError('Each module already has one quiz. Edit the existing quiz instead.', 409);
    }
    const mission = db.insert('missions', {
      lessonId,
      levelNumber: Number.MAX_SAFE_INTEGER,
      maxXP: Number(maxXP),
      scenarioData,
    });
    renumberModuleLevels(lesson.moduleId);
    return db.findById('missions', mission._id);
  });
}

export function updateMission(missionId, { maxXP, scenarioData }) {
  return request(() => {
    const mission = requireMission(missionId);
    validateMissionInput({ maxXP, scenarioData });
    if (scenarioData && scenarioData.kind !== mission.scenarioData.kind) {
      throw new ServiceError('A mission cannot be changed between game and quiz.');
    }
    return db.update('missions', missionId, {
      ...(maxXP !== undefined && { maxXP: Number(maxXP) }),
      ...(scenarioData !== undefined && { scenarioData }),
    });
  });
}

/** Delete a mission level and its attempts. Module quizzes cannot be deleted. */
export function deleteMission(missionId) {
  return request(() => {
    const mission = requireMission(missionId);
    if (isQuiz(mission)) throw new ServiceError('Module quizzes cannot be deleted.', 409);
    const lesson = db.findById('lessons', mission.lessonId);
    const removedAttempts = db.removeWhere('missionAttempts', (a) => a.missionId === missionId);
    db.remove('missions', missionId);
    renumberModuleLevels(lesson.moduleId);
    return { deleted: true, removedAttempts };
  });
}
