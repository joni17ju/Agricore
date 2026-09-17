/**
 * Badges. Earning happens in missionService.submitAttempt; this service reads them.
 */
import { BADGES } from '../constants/badges.js';
import { ROLES } from '../constants/roles.js';
import {
  calculateLongestStreak,
  calculateTotalXP,
  countPerfectMissions,
  findBestXpDay,
  rankStudentsByXP,
} from '../utils/gamification.js';
import { db, request } from './mockDb.js';
import { getSectionStudents, getStudentActivity, requireUser } from './serviceContext.js';

export function getBadgeCatalog() {
  return request(() => BADGES, { latency: 0 });
}

/** Every badge with the student's earned state, earned badges first (newest first). */
export function getStudentBadges(studentId) {
  return request(() => {
    const student = requireUser(studentId, ROLES.STUDENT);
    const earnedAtByCode = new Map(student.earnedBadges.map((badge) => [badge.code, badge.earnedAt]));
    return BADGES.map((badge) => ({
      ...badge,
      isEarned: earnedAtByCode.has(badge.code),
      earnedAt: earnedAtByCode.get(badge.code) ?? null,
    })).sort(
      (a, b) =>
        Number(b.isEarned) - Number(a.isEarned) || (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''),
    );
  });
}

/**
 * Achievements page data: personal records plus the full badge catalog.
 * Every record is calculated from the student's attempts — nothing is stored.
 */
export function getStudentAchievements(studentId) {
  return request(() => {
    const student = requireUser(studentId, ROLES.STUDENT);
    const { attempts } = getStudentActivity(studentId);
    const earnedAtByCode = new Map(student.earnedBadges.map((badge) => [badge.code, badge.earnedAt]));

    const longestStreak = calculateLongestStreak(attempts);
    const bestXpDay = findBestXpDay(attempts);

    let rank = null;
    let sectionSize = 0;
    if (student.sectionId) {
      const peers = getSectionStudents(student.sectionId);
      sectionSize = peers.length;
      const ranking = rankStudentsByXP(peers, db.all('missionAttempts'));
      rank = ranking.find((row) => row.student._id === studentId)?.rank ?? null;
    }

    return {
      student,
      section: student.sectionId ? db.findById('sections', student.sectionId) : null,
      records: {
        longestStreak,
        perfectMissions: countPerfectMissions(attempts),
        bestXpDay,
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
  });
}
