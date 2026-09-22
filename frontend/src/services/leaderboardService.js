/**
 * Section leaderboards (Proposal Fig 23). Rankings are always limited to one
 * section — students only see classmates in their own section (NFR: Data Privacy).
 *
 * The ranking itself is computed by the server. The mock version read every
 * user and every attempt in the section, which the API refuses to a student;
 * GET /leaderboard returns the same ordering with only display fields, so a
 * student can see where they stand without being able to read classmates'
 * records. The row shape returned here is unchanged.
 */
import { ROLES } from '../constants/roles.js';
import { calculateLevel } from '../utils/gamification.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';
import { requireInstructorSection, requireSection, requireUser } from './serviceContext.js';

export const LEADERBOARD_PERIODS = Object.freeze({
  OVERALL: 'overall',
  WEEK: 'week',
  MODULE: 'module',
});

async function buildLeaderboard(sectionId, { period = LEADERBOARD_PERIODS.OVERALL, moduleId } = {}) {
  if (period === LEADERBOARD_PERIODS.MODULE && !moduleId) throw new ServiceError('Choose a module.');
  const [section, rows] = await Promise.all([
    requireSection(sectionId),
    api.get('/leaderboard', { sectionId, period, moduleId }),
  ]);

  return {
    section,
    period,
    moduleId: moduleId ?? null,
    totalStudents: rows.length,
    rows: rows.map((row) => ({
      rank: row.rank,
      xp: row.totalXP,
      // Arrows only make sense against an all-time ranking.
      rankChange: period === LEADERBOARD_PERIODS.OVERALL && row.previousRank ? row.previousRank - row.rank : 0,
      student: {
        _id: row._id,
        firstName: row.firstName,
        lastName: row.lastName,
        avatarUrl: row.avatarUrl ?? null,
        badgeCount: row.badgeCount ?? 0,
      },
      // Level always reflects lifetime XP, even on a weekly or per-module board.
      level: calculateLevel(row.overallXP ?? row.totalXP).level,
    })),
  };
}

/** Leaderboard of the student's own section. */
export async function getStudentLeaderboard(studentId, options) {
  const student = await requireUser(studentId, ROLES.STUDENT);
  if (!student.sectionId) throw new ServiceError('You are not enrolled in a section yet.', 409);
  const board = await buildLeaderboard(student.sectionId, options);
  return {
    ...board,
    currentStudentRow: board.rows.find((row) => String(row.student._id) === String(studentId)) ?? null,
  };
}

/** Leaderboard of one of the instructor's sections. */
export async function getSectionLeaderboard(instructorId, sectionId, options) {
  await requireInstructorSection(instructorId, sectionId);
  return buildLeaderboard(sectionId, options);
}
