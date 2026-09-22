/**
 * Student progress: the locked/unlocked course map, lesson viewing and the
 * personalized dashboard overview (Proposal Fig 16–17).
 */
import { ROLES } from '../constants/roles.js';
import { LESSON_STATE, PROGRESS_STATUS } from '../constants/rules.js';
import { canAccessLesson, countCompletedLessons, findNextStep } from '../utils/curriculum.js';
import {
  calculateLevel,
  calculateStreak,
  calculateTotalXP,
  calculateWeeklyActivity,
} from '../utils/gamification.js';
import { isWithinLastDays, toDayKey } from '../utils/dates.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';
import { getCourse, getStudentActivity, getStudentCurriculum, requireUser } from './serviceContext.js';

const WEEKLY_PASS_GOAL = 3;

/** Lightweight XP/level/streak summary for the top bar. */
export async function getStudentXpSummary(studentId) {
  const { attempts } = await getStudentActivity(studentId);
  const totalXP = calculateTotalXP(attempts);
  return { totalXP, level: calculateLevel(totalXP), streak: calculateStreak(attempts, new Date()) };
}

export async function getStudentCurriculumMap(studentId) {
  await requireUser(studentId, ROLES.STUDENT);
  return getStudentCurriculum(studentId);
}

/** One module with its topics and states (Course Modules page). */
export async function getStudentModule(studentId, moduleId) {
  await requireUser(studentId, ROLES.STUDENT);
  const curriculum = await getStudentCurriculum(studentId);
  const entry = curriculum.find((item) => String(item.module._id) === String(moduleId));
  if (!entry) throw new ServiceError('Module not found.', 404);
  return entry;
}

/**
 * Lesson content for a student, with its state, mission levels and neighbours.
 * Rejects locked lessons.
 */
export async function getLessonForStudent(studentId, lessonId) {
  await requireUser(studentId, ROLES.STUDENT);
  {
    const curriculum = await getStudentCurriculum(studentId);
    if (!canAccessLesson(curriculum, lessonId)) {
      throw new ServiceError('This topic is locked. Complete the previous topic first.', 403);
    }
    const allLessons = curriculum.flatMap((moduleEntry) =>
      moduleEntry.lessons.map((lessonEntry) => ({ ...lessonEntry, module: moduleEntry.module })),
    );
    const index = allLessons.findIndex((entry) => String(entry.lesson._id) === String(lessonId));
    const entry = allLessons[index];
    const next = allLessons[index + 1];

    return {
      lesson: entry.lesson,
      module: entry.module,
      state: entry.state,
      levels: entry.levels,
      previousLesson: allLessons[index - 1]?.lesson ?? null,
      nextLesson: next && next.state !== LESSON_STATE.LOCKED ? next.lesson : null,
    };
  }
}

/** Record that the student opened a lesson (Learn step). */
export async function markLessonViewed(studentId, lessonId) {
  const curriculum = await getStudentCurriculum(studentId);
  if (!canAccessLesson(curriculum, lessonId)) throw new ServiceError('This topic is locked.', 403);

  // Only the first view records anything; a completed lesson is never demoted.
  const rows = await api.get('/progress', { studentId, lessonId });
  if (rows.length > 0) return rows[0];
  return api.patch('/progress', { studentId, lessonId, status: PROGRESS_STATUS.IN_PROGRESS });
}

function buildObjectives({ curriculum, attempts, streak, now }) {
  const objectives = [];
  const nextStep = findNextStep(curriculum);

  if (nextStep?.type === 'mission') {
    objectives.push({
      id: 'next-mission',
      label: `Complete Mission ${nextStep.module.moduleNumber}.${nextStep.mission.levelNumber}: ${nextStep.mission.scenarioData.title}`,
      xpReward: nextStep.mission.maxXP,
      missionId: nextStep.mission._id,
      isDone: false,
    });
  } else if (nextStep?.type === 'lesson') {
    objectives.push({
      id: 'next-lesson',
      label: `Study ${nextStep.lesson.title}`,
      xpReward: null,
      lessonId: nextStep.lesson._id,
      isDone: false,
    });
  }

  const passedThisWeek = attempts.filter((a) => a.isPassed && isWithinLastDays(a.attemptedAt, 7, now)).length;
  objectives.push({
    id: 'weekly-passes',
    label: `Pass ${WEEKLY_PASS_GOAL} missions this week`,
    xpReward: null,
    progress: { current: Math.min(passedThisWeek, WEEKLY_PASS_GOAL), total: WEEKLY_PASS_GOAL },
    isDone: passedThisWeek >= WEEKLY_PASS_GOAL,
  });

  const playedToday = attempts.some((a) => toDayKey(a.attemptedAt) === toDayKey(now));
  if (streak > 0) {
    objectives.push({
      id: 'streak',
      label: playedToday ? `${streak}-day streak secured for today` : `Play today to keep your ${streak}-day streak`,
      xpReward: null,
      isDone: playedToday,
    });
  }

  return objectives;
}

/** Dashboard overview for a student (Proposal Fig 16). */
export async function getStudentDashboard(studentId) {
  {
    const student = await requireUser(studentId, ROLES.STUDENT);
    const now = new Date();
    const course = await getCourse();
    const { attempts } = await getStudentActivity(studentId);
    const curriculum = await getStudentCurriculum(studentId, course);
    const totalXP = calculateTotalXP(attempts);
    const streak = calculateStreak(attempts, now);
    const totalLessons = curriculum.reduce((sum, entry) => sum + entry.totalLessons, 0);
    const currentModule =
      curriculum.find((entry) => entry.state !== LESSON_STATE.LOCKED && !entry.isCleared) ?? curriculum.at(-1);

    return {
      student,
      section: student.sectionId ? await api.get(`/sections/${student.sectionId}`).catch(() => null) : null,
      totalXP,
      level: calculateLevel(totalXP),
      streak,
      completedLessons: countCompletedLessons(curriculum),
      totalLessons,
      modulesCleared: curriculum.filter((entry) => entry.isCleared).length,
      currentModule,
      nextStep: findNextStep(curriculum),
      weeklyActivity: calculateWeeklyActivity(attempts, now),
      objectives: buildObjectives({ curriculum, attempts, streak, now }),
      recentAttempts: [...attempts]
        .sort((a, b) => String(b.attemptedAt).localeCompare(String(a.attemptedAt)))
        .slice(0, 5)
        .map((attempt) => ({ attempt, mission: course.missionsById.get(String(attempt.missionId)) ?? null })),
    };
  }
}
