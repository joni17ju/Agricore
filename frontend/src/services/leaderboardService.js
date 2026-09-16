/**
 * Section leaderboards (Proposal Fig 23). Rankings are always limited to one
 * section — students only see classmates in their own section (NFR: Data Privacy).
 */
import { ROLES } from '../constants/roles.js';
import { getModuleLessons } from '../utils/curriculum.js';
import { calculateLevel, rankStudentsByXP } from '../utils/gamification.js';
import { isWithinLastDays } from '../utils/dates.js';
import { db, request, ServiceError } from './mockDb.js';
import { getCourse, getSectionStudents, requireInstructorSection, requireSection, requireUser } from './serviceContext.js';

export const LEADERBOARD_PERIODS = Object.freeze({
  OVERALL: 'overall',
  WEEK: 'week',
  MODULE: 'module',
});

function filterAttempts(attempts, { period, moduleId }, now) {
  if (period === LEADERBOARD_PERIODS.WEEK) {
    return attempts.filter((a) => isWithinLastDays(a.attemptedAt, 7, now));
  }
  if (period === LEADERBOARD_PERIODS.MODULE) {
    if (!moduleId) throw new ServiceError('Choose a module.');
    const { lessons, missions } = getCourse();
    const lessonIds = new Set(getModuleLessons(lessons, moduleId).map((l) => l._id));
    const missionIds = new Set(missions.filter((m) => lessonIds.has(m.lessonId)).map((m) => m._id));
    return attempts.filter((a) => missionIds.has(a.missionId));
  }
  return attempts;
}

function buildLeaderboard(sectionId, { period = LEADERBOARD_PERIODS.OVERALL, moduleId } = {}) {
  const section = requireSection(sectionId);
  const now = new Date();
  const students = getSectionStudents(sectionId);
  const studentIds = new Set(students.map((s) => s._id));
  const sectionAttempts = db.find('missionAttempts', (a) => studentIds.has(a.studentId));
  const ranking = rankStudentsByXP(students, filterAttempts(sectionAttempts, { period, moduleId }, now));

  // Rank a week ago (overall XP only) to show movement arrows.
  const lastWeekRanks = new Map(
    rankStudentsByXP(students, sectionAttempts.filter((a) => !isWithinLastDays(a.attemptedAt, 7, now))).map(
      (row) => [row.student._id, row.rank],
    ),
  );
  const totalXPByStudent = new Map(
    rankStudentsByXP(students, sectionAttempts).map((row) => [row.student._id, row.xp]),
  );

  return {
    section,
    period,
    moduleId: moduleId ?? null,
    totalStudents: students.length,
    rows: ranking.map((row) => ({
      rank: row.rank,
      xp: row.xp,
      rankChange:
        period === LEADERBOARD_PERIODS.OVERALL ? lastWeekRanks.get(row.student._id) - row.rank : 0,
      student: {
        _id: row.student._id,
        firstName: row.student.firstName,
        lastName: row.student.lastName,
        badgeCount: row.student.earnedBadges.length,
      },
      level: calculateLevel(totalXPByStudent.get(row.student._id)).level,
    })),
  };
}

/** Leaderboard of the student's own section. */
export function getStudentLeaderboard(studentId, options) {
  return request(() => {
    const student = requireUser(studentId, ROLES.STUDENT);
    if (!student.sectionId) throw new ServiceError('You are not enrolled in a section yet.', 409);
    const board = buildLeaderboard(student.sectionId, options);
    return { ...board, currentStudentRow: board.rows.find((row) => row.student._id === studentId) ?? null };
  });
}

/** Leaderboard of one of the instructor's sections. */
export function getSectionLeaderboard(instructorId, sectionId, options) {
  return request(() => {
    requireInstructorSection(instructorId, sectionId);
    return buildLeaderboard(sectionId, options);
  });
}
