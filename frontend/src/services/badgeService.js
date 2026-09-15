/**
 * Badges. Earning happens in missionService.submitAttempt; this service reads them.
 */
import { BADGES } from '../constants/badges.js';
import { ROLES } from '../constants/roles.js';
import { request } from './mockDb.js';
import { requireUser } from './serviceContext.js';

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
