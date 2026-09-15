/**
 * Badge catalog.
 *
 * Users store only `earnedBadges: [{ code, earnedAt }]`. The name, icon and
 * unlock rule for each code are defined here. Rules are evaluated by
 * `utils/badgeRules.js`.
 *
 * `icon` is a key for the frontend icon set.
 */
export const BADGE_RULE_TYPES = Object.freeze({
  FIRST_PASS: 'first-pass',
  MODULE_CLEARED: 'module-cleared',
  PERFECT_SCORE: 'perfect-score',
  STREAK: 'streak',
  QUICK_SCOUT: 'quick-scout',
  SECTION_TOP: 'section-top',
});

export const BADGES = Object.freeze([
  {
    code: 'FIRST_HARVEST',
    name: 'First Harvest',
    description: 'Pass your first mission.',
    icon: 'sprout',
    rule: { type: BADGE_RULE_TYPES.FIRST_PASS },
  },
  {
    code: 'CROP_GUARDIAN',
    name: 'Crop Guardian',
    description: 'Clear Module 1: Introduction to Crop Protection.',
    icon: 'shield',
    rule: { type: BADGE_RULE_TYPES.MODULE_CLEARED, moduleNumber: 1 },
  },
  {
    code: 'DIAGNOSTICIAN',
    name: 'Diagnostician',
    description: 'Clear Module 2: Plant Pathology.',
    icon: 'microscope',
    rule: { type: BADGE_RULE_TYPES.MODULE_CLEARED, moduleNumber: 2 },
  },
  {
    code: 'PEST_TRACKER',
    name: 'Pest Tracker',
    description: 'Clear Module 3: Agricultural Entomology.',
    icon: 'bug',
    rule: { type: BADGE_RULE_TYPES.MODULE_CLEARED, moduleNumber: 3 },
  },
  {
    code: 'WEED_SPECIALIST',
    name: 'Weed Specialist',
    description: 'Clear Module 4: Weed Science.',
    icon: 'leaf',
    rule: { type: BADGE_RULE_TYPES.MODULE_CLEARED, moduleNumber: 4 },
  },
  {
    code: 'IPM_STRATEGIST',
    name: 'IPM Strategist',
    description: 'Clear Module 5: Integrated Pest Management.',
    icon: 'target',
    rule: { type: BADGE_RULE_TYPES.MODULE_CLEARED, moduleNumber: 5 },
  },
  {
    code: 'SHARP_EYE',
    name: 'Sharp Eye',
    description: 'Score 100% on any mission.',
    icon: 'eye',
    rule: { type: BADGE_RULE_TYPES.PERFECT_SCORE },
  },
  {
    code: 'STEADY_GROWER',
    name: 'Steady Grower',
    description: 'Keep a 5-day learning streak.',
    icon: 'flame',
    rule: { type: BADGE_RULE_TYPES.STREAK, days: 5 },
  },
  {
    code: 'QUICK_SCOUT',
    name: 'Quick Scout',
    description: 'Pass a timed mission with at least half the time left.',
    icon: 'timer',
    rule: { type: BADGE_RULE_TYPES.QUICK_SCOUT, remainingRatio: 0.5 },
  },
  {
    code: 'TOP_GROWER',
    name: 'Top Grower',
    description: 'Reach the top 3 of your section leaderboard.',
    icon: 'trophy',
    rule: { type: BADGE_RULE_TYPES.SECTION_TOP, rank: 3 },
  },
]);

export const BADGES_BY_CODE = Object.freeze(
  Object.fromEntries(BADGES.map((badge) => [badge.code, badge])),
);
