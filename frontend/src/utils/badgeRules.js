/**
 * Badge rule evaluation. Given a student's state, returns the badge codes they
 * qualify for but have not yet earned.
 */
import { BADGES, BADGE_RULE_TYPES } from '../constants/badges.js';
import { calculateStreak } from './gamification.js';

/**
 * @param {object} input
 * @param {object[]} input.attempts        the student's attempts (including the newest)
 * @param {object[]} input.curriculum      result of buildStudentCurriculum for the student
 * @param {Map<string, object>} input.missionsById
 * @param {string[]} input.earnedCodes     codes the student already has
 * @param {number|null} input.sectionRank  current overall rank within the section
 * @param {Date} input.now
 * @returns {string[]} newly earned badge codes
 */
export function evaluateNewBadges({ attempts, curriculum, missionsById, earnedCodes, sectionRank, now }) {
  const earned = new Set(earnedCodes);
  const passed = attempts.filter((attempt) => attempt.isPassed);

  const qualifies = (rule) => {
    switch (rule.type) {
      case BADGE_RULE_TYPES.FIRST_PASS:
        return passed.length > 0;
      case BADGE_RULE_TYPES.MODULE_CLEARED:
        return curriculum.some((entry) => entry.module.moduleNumber === rule.moduleNumber && entry.isCleared);
      case BADGE_RULE_TYPES.PERFECT_SCORE:
        return attempts.some((attempt) => attempt.score === 100);
      case BADGE_RULE_TYPES.STREAK:
        return calculateStreak(attempts, now) >= rule.days;
      case BADGE_RULE_TYPES.QUICK_SCOUT:
        return passed.some((attempt) => {
          const limit = missionsById.get(attempt.missionId)?.scenarioData?.timeLimitSeconds;
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
