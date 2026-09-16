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
import { db, request, ServiceError } from './mockDb.js';
import { getCourse, getStudentActivity, getStudentCurriculum, requireUser } from './serviceContext.js';

const WEEKLY_PASS_GOAL = 3;

/** Lightweight XP/level/streak summary for the top bar. */
export function getStudentXpSummary(studentId) {
  return request(
    () => {
      requireUser(studentId, ROLES.STUDENT);
      const { attempts } = getStudentActivity(studentId);
      const totalXP = calculateTotalXP(attempts);
      return { totalXP, level: calculateLevel(totalXP), streak: calculateStreak(attempts, new Date()) };
    },
    { latency: 0 },
  );
}

export function getStudentCurriculumMap(studentId) {
  return request(() => {
    requireUser(studentId, ROLES.STUDENT);
    return getStudentCurriculum(studentId);
  });
}

/** One module with its topics and states (Course Modules page). */
export function getStudentModule(studentId, moduleId) {
  return request(() => {
    requireUser(studentId, ROLES.STUDENT);
    const entry = getStudentCurriculum(studentId).find((item) => item.module._id === moduleId);
    if (!entry) throw new ServiceError('Module not found.', 404);
    return entry;
  });
}

/**
 * Lesson content for a student, with its state, mission levels and neighbours.
 * Rejects locked lessons.
 */
export function getLessonForStudent(studentId, lessonId) {
  return request(() => {
    requireUser(studentId, ROLES.STUDENT);
    const curriculum = getStudentCurriculum(studentId);
    if (!canAccessLesson(curriculum, lessonId)) {
      throw new ServiceError('This topic is locked. Complete the previous topic first.', 403);
    }
    const allLessons = curriculum.flatMap((moduleEntry) =>
      moduleEntry.lessons.map((lessonEntry) => ({ ...lessonEntry, module: moduleEntry.module })),
    );
    const index = allLessons.findIndex((entry) => entry.lesson._id === lessonId);
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
  });
}

/** Record that the student opened a lesson (Learn step). */
export function markLessonViewed(studentId, lessonId) {
  return request(() => {
    requireUser(studentId, ROLES.STUDENT);
    if (!canAccessLesson(getStudentCurriculum(studentId), lessonId)) {
      throw new ServiceError('This topic is locked.', 403);
    }
    const existing = db.findOne('progress', (p) => p.studentId === studentId && p.lessonId === lessonId);
    return existing ?? db.insert('progress', { studentId, lessonId, status: PROGRESS_STATUS.IN_PROGRESS });
  }, { latency: 0 });
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
export function getStudentDashboard(studentId) {
  return request(() => {
    const student = requireUser(studentId, ROLES.STUDENT);
    const now = new Date();
    const course = getCourse();
    const { attempts } = getStudentActivity(studentId);
    const curriculum = getStudentCurriculum(studentId, course);
    const totalXP = calculateTotalXP(attempts);
    const streak = calculateStreak(attempts, now);
    const totalLessons = curriculum.reduce((sum, entry) => sum + entry.totalLessons, 0);
    const currentModule =
      curriculum.find((entry) => entry.state !== LESSON_STATE.LOCKED && !entry.isCleared) ?? curriculum.at(-1);

    return {
      student,
      section: student.sectionId ? db.findById('sections', student.sectionId) : null,
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
        .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
        .slice(0, 5)
        .map((attempt) => ({ attempt, mission: course.missionsById.get(attempt.missionId) ?? null })),
    };
  });
}
