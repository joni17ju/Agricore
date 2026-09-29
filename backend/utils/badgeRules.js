import { BADGES, BADGE_RULE_TYPES } from '../constants/badges.js';
import { calculateStreak } from './gamification.js';

/**
 * Badge rule evaluation, server side.
 *
 * Ported from frontend/src/utils/badgeRules.js so the award decision happens
 * where it can be trusted. The frontend used to evaluate these and write the
 * result through PATCH /api/users/:id, which meant a crafted request could
 * grant itself any badge. Badges are now awarded inside the mission-attempt
 * controller from data the server already holds, and `earnedBadges` is no
 * longer an editable field.
 *
 * The rules themselves are unchanged, so a student qualifies for exactly the
 * same badges as before.
 */

/**
 * @param {object} input
 * @param {object[]} input.attempts       every attempt by this student, newest included
 * @param {Map<string, object>} input.missionsById  missionId -> mission
 * @param {number[]} input.clearedModuleNumbers     modules where every mission is passed
 * @param {string[]} input.earnedCodes    codes the student already holds
 * @param {number|null} input.sectionRank current overall rank inside their section
 * @param {Date} input.now
 * @returns {string[]} newly earned badge codes
 */
export function evaluateNewBadges({
  attempts,
  missionsById,
  clearedModuleNumbers,
  earnedCodes,
  sectionRank,
  now = new Date(),
}) {
  const earned = new Set(earnedCodes);
  const cleared = new Set(clearedModuleNumbers);
  const passed = attempts.filter((attempt) => attempt.isPassed);

  const qualifies = (rule) => {
    switch (rule.type) {
      case BADGE_RULE_TYPES.FIRST_PASS:
        return passed.length > 0;
      case BADGE_RULE_TYPES.MODULE_CLEARED:
        return cleared.has(rule.moduleNumber);
      case BADGE_RULE_TYPES.PERFECT_SCORE:
        return attempts.some((attempt) => attempt.score === 100);
      case BADGE_RULE_TYPES.STREAK:
        return calculateStreak(attempts, now) >= rule.days;
      case BADGE_RULE_TYPES.QUICK_SCOUT:
        return passed.some((attempt) => {
          const limit = missionsById.get(String(attempt.missionId))?.scenarioData?.timeLimitSeconds;
          return limit && limit - attempt.timeSpentSeconds >= limit * rule.remainingRatio;
        });
      case BADGE_RULE_TYPES.SECTION_TOP:
        return sectionRank !== null && sectionRank <= rule.rank && passed.length > 0;
      default:
        return false;
    }
  };

  return BADGES.filter((badge) => !earned.has(badge.code) && qualifies(badge.rule)).map((badge) => badge.code);
}
