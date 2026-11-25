/**
 * Student progress: the locked/unlocked course map, lesson viewing and the
 * personalized dashboard overview (Proposal Fig 16–17).
 */
import { ROLES } from '../constants/roles.js';
import { LESSON_STATE, PROGRESS_STATUS } from '../constants/rules.js';
import { buildStudentCurriculum, canAccessLesson, countCompletedLessons, findNextStep, lessonFooterLinks } from '../utils/curriculum.js';
import {
  calculateLevel,
  calculateStreak,
  calculateTotalXP,
  calculateWeeklyActivity,
} from '../utils/gamification.js';
import { isWithinLastDays, toDayKey } from '../utils/dates.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';
import { badgesFor, getStudentBadges } from './badgeService.js';
import { LEADERBOARD_PERIODS, getStudentLeaderboard, toBoardRows } from './leaderboardService.js';
import {
  getCourse,
  getLessonContent,
  getStudentActivity,
  getStudentCurriculum,
  invalidateActivity,
  onSessionClear,
  requireUser,
  seedActivity,
  seedCourse,
  seedUser,
  releasePendingBootstrap,
  setPendingBootstrap,
} from './serviceContext.js';

const WEEKLY_PASS_GOAL = 3;

/** Lightweight XP/level/streak summary for the top bar. */
export async function getStudentXpSummary(studentId) {
  // If the dashboard is loading, its response brings the attempts: wait for it rather than ask twice.
  if (dashboardInFlight && String(dashboardInFlight.studentId) === String(studentId)) {
    await dashboardInFlight.promise.catch(() => {});
  }
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
  // The lesson's full text is downloaded alongside the outline, not after it.
  const fullLesson = getLessonContent(lessonId);
  fullLesson.catch(() => {});
  const [, curriculum] = await Promise.all([requireUser(studentId, ROLES.STUDENT), getStudentCurriculum(studentId)]);
  {
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
      // The outline holds a summary; the opened lesson shows its full text and media.
      lesson: { ...entry.lesson, ...(await fullLesson) },
      module: entry.module,
      state: entry.state,
      levels: entry.levels,
      previousLesson: allLessons[index - 1]?.lesson ?? null,
      nextLesson: next && next.state !== LESSON_STATE.LOCKED ? next.lesson : null,
      // Footer links: previous / next topic, next module or dashboard at the ends.
      footer: lessonFooterLinks(curriculum, lessonId),
    };
  }
}

/** Record that the student opened a lesson (Learn step). */
export async function markLessonViewed(studentId, lessonId) {
  const curriculum = await getStudentCurriculum(studentId);
  if (!canAccessLesson(curriculum, lessonId)) throw new ServiceError('This topic is locked.', 403);

  // Only the first view records anything; a completed lesson is never demoted.
  // The student's progress rows are already loaded with the curriculum.
  const { progress } = await getStudentActivity(studentId);
  const existing = progress.find((row) => String(row.lessonId) === String(lessonId));
  if (existing) return existing;
  const row = await api.patch('/progress', { studentId, lessonId, status: PROGRESS_STATUS.IN_PROGRESS });
  invalidateActivity(studentId);
  return row;
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

/** Dashboard overview for a student (Proposal Fig 16), from data already loaded. */
function buildDashboard({ student, section, course, attempts, progress }) {
  const now = new Date();
  const curriculum = buildStudentCurriculum({ ...course, attempts, progress });
  const totalXP = calculateTotalXP(attempts);
  const streak = calculateStreak(attempts, now);
  const totalLessons = curriculum.reduce((sum, entry) => sum + entry.totalLessons, 0);
  const currentModule =
    curriculum.find((entry) => entry.state !== LESSON_STATE.LOCKED && !entry.isCleared) ?? curriculum.at(-1);

  return {
    student,
    section,
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

/** Dashboard overview for a student (Proposal Fig 16). */
export async function getStudentDashboard(studentId) {
  const [student, course, { attempts, progress }] = await Promise.all([
    requireUser(studentId, ROLES.STUDENT),
    getCourse(),
    getStudentActivity(studentId),
  ]);
  const section = student.sectionId ? await api.get(`/sections/${student.sectionId}`).catch(() => null) : null;
  return buildDashboard({ student, section, course, attempts, progress });
}

/*
 * The whole dashboard — overview, badges and leaderboard preview — from one
 * request (GET /dashboard), kept in memory so returning to the dashboard shows
 * it at once while a fresh copy loads in the background (stale-while-
 * revalidate). The data it brings (account, course outline, attempts and
 * progress) also fills the shared caches, so the Modules and lesson pages
 * opened next need no extra round trips.
 */
let dashboardCache = null;
let dashboardInFlight = null;
onSessionClear(() => {
  dashboardCache = null;
  dashboardInFlight = null;
});

/** The last dashboard loaded for this student in this session, or null. */
export function getCachedDashboard(studentId) {
  return dashboardCache && String(dashboardCache.studentId) === String(studentId) ? dashboardCache.view : null;
}

async function fetchDashboardView(studentId) {
  let raw;
  try {
    raw = await api.get('/dashboard');
  } catch (error) {
    releasePendingBootstrap();
    // An API without the combined endpoint: assemble it the old way.
    if (error.status !== 404) throw error;
    const [dashboard, badges, board] = await Promise.all([
      getStudentDashboard(studentId),
      getStudentBadges(studentId),
      getStudentLeaderboard(studentId, { period: LEADERBOARD_PERIODS.OVERALL }).catch(() => null),
    ]);
    return { dashboard, badges, board };
  }

  seedUser(raw.user);
  seedCourse(raw.course);
  seedActivity(studentId, raw);
  releasePendingBootstrap();
  const course = await getCourse();
  const dashboard = buildDashboard({ student: raw.user, section: raw.section, course, attempts: raw.attempts, progress: raw.progress });
  const rows = toBoardRows(raw.leaderboard?.rows ?? [], LEADERBOARD_PERIODS.OVERALL);
  const board = raw.section
    ? {
        section: raw.section,
        period: LEADERBOARD_PERIODS.OVERALL,
        moduleId: null,
        totalStudents: raw.leaderboard?.totalStudents ?? rows.length,
        rows,
        currentStudentRow: rows.find((row) => String(row.student._id) === String(studentId)) ?? null,
      }
    : null;
  return { dashboard, badges: badgesFor(raw.user), board };
}

/** Load (or reuse an in-flight load of) the dashboard, and remember it. */
export function loadDashboard(studentId) {
  if (dashboardInFlight && String(dashboardInFlight.studentId) === String(studentId)) return dashboardInFlight.promise;
  const promise = fetchDashboardView(studentId)
    .then((view) => {
      dashboardCache = { studentId, view, at: Date.now() };
      return view;
    })
    .finally(() => {
      if (dashboardInFlight?.promise === promise) dashboardInFlight = null;
    });
  dashboardInFlight = { studentId, promise };
  setPendingBootstrap(promise);
  return promise;
}

/** Start loading the dashboard early (right after sign-in or on app start). */
export function prefetchDashboard(studentId) {
  if (!studentId) return;
  loadDashboard(studentId).catch(() => {});
}
