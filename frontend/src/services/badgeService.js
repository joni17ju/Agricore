/**
 * Badges. Earning happens in missionService.submitAttempt; this service reads them.
 *
 * Section rank comes from the server-side leaderboard rather than by ranking a
 * locally-read list of classmates, which the API refuses to a student. Every
 * personal record is still calculated from the student's own attempts.
 */
import { BADGES } from '../constants/badges.js';
import { ROLES } from '../constants/roles.js';
import {
  calculateLongestStreak,
  calculateTotalXP,
  countPerfectMissions,
  findBestXpDay,
} from '../utils/gamification.js';
import { api } from './apiClient.js';
import { getStudentActivity, requireUser } from './serviceContext.js';

export async function getBadgeCatalog() {
  return BADGES;
}

/** Every badge with the student's earned state, earned badges first (newest first). */
export async function getStudentBadges(studentId) {
  const student = await requireUser(studentId, ROLES.STUDENT);
  const earnedAtByCode = new Map((student.earnedBadges ?? []).map((badge) => [badge.code, badge.earnedAt]));
  return BADGES.map((badge) => ({
    ...badge,
    isEarned: earnedAtByCode.has(badge.code),
    earnedAt: earnedAtByCode.get(badge.code) ?? null,
  })).sort(
    (a, b) =>
      Number(b.isEarned) - Number(a.isEarned) ||
      String(b.earnedAt ?? '').localeCompare(String(a.earnedAt ?? '')),
  );
}

/**
 * Achievements page data: personal records plus the full badge catalog.
 * Every record is calculated from the student's attempts — nothing is stored.
 */
export async function getStudentAchievements(studentId) {
  const student = await requireUser(studentId, ROLES.STUDENT);
  const { attempts } = await getStudentActivity(studentId);
  const earnedAtByCode = new Map((student.earnedBadges ?? []).map((badge) => [badge.code, badge.earnedAt]));

  let rank = null;
  let sectionSize = 0;
  let section = null;
  if (student.sectionId) {
    const [board, sectionRecord] = await Promise.all([
      api.get('/leaderboard', { sectionId: student.sectionId }).catch(() => []),
      api.get(`/sections/${student.sectionId}`).catch(() => null),
    ]);
    sectionSize = board.length;
    rank = board.find((row) => String(row._id) === String(studentId))?.rank ?? null;
    section = sectionRecord;
  }

  return {
    student,
    section,
    records: {
      longestStreak: calculateLongestStreak(attempts),
      perfectMissions: countPerfectMissions(attempts),
      bestXpDay: findBestXpDay(attempts),
      rank,
      sectionSize,
    },
    totalXP: calculateTotalXP(attempts),
    badges: BADGES.map((badge) => ({
      ...badge,
      isEarned: earnedAtByCode.has(badge.code),
      earnedAt: earnedAtByCode.get(badge.code) ?? null,
    })),
  };
}
