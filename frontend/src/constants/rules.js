/**
 * Gamification and analytics rules.
 *
 * The proposal does not define these numbers, so they live here in one place and
 * can be tuned (or moved to the backend) without touching any calculation code.
 */

/** Minimum score (0–100) for a mission or quiz attempt to count as passed. */
export const PASSING_SCORE = 70;

/** XP needed per level. Level 1 starts at 0 XP. */
export const XP_PER_LEVEL = 500;

/** Environmental score needed for an "A+" grade in the Module 5 strategy game. */
export const ENVIRONMENTAL_GRADES = Object.freeze([
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 60, grade: 'C' },
  { min: 0, grade: 'D' },
]);

/** Student performance status rules used by instructor analytics. */
export const PERFORMANCE_RULES = Object.freeze({
  /** No attempt in this many days → at risk. */
  inactiveDays: 7,
  /** Average best score below this → at risk. */
  atRiskAverageScore: 60,
  /** Completed-lesson ratio below this fraction of the section average → at risk. */
  atRiskProgressRatio: 0.5,
  /** Recent attempts compared against earlier attempts to detect a sudden drop. */
  suddenDropWindow: 3,
  /** Points the recent average must fall below the earlier average to flag a sudden drop. */
  suddenDropPoints: 20,
});

export const PERFORMANCE_STATUS = Object.freeze({
  ON_TRACK: 'on-track',
  IN_PROGRESS: 'in-progress',
  SUDDEN_DROP: 'sudden-drop',
  AT_RISK: 'at-risk',
});

export const PERFORMANCE_STATUS_LABELS = Object.freeze({
  [PERFORMANCE_STATUS.ON_TRACK]: 'On Track',
  [PERFORMANCE_STATUS.IN_PROGRESS]: 'In Progress',
  [PERFORMANCE_STATUS.SUDDEN_DROP]: 'Sudden Drop',
  [PERFORMANCE_STATUS.AT_RISK]: 'At Risk',
});

/** Lesson mastery bands for the instructor topic mastery heatmap. */
export const MASTERY_BANDS = Object.freeze([
  { min: 85, key: 'mastered', label: 'Mastered' },
  { min: 70, key: 'proficient', label: 'Proficient' },
  { min: 55, key: 'developing', label: 'Developing' },
  { min: 0, key: 'struggling', label: 'Struggling' },
]);

/** Lesson progress statuses stored in the `progress` collection. */
export const PROGRESS_STATUS = Object.freeze({
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
});

/** Computed (never stored) lesson availability states. */
export const LESSON_STATE = Object.freeze({
  LOCKED: 'locked',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
});

/**
 * Mock data only: the last day covered by the seeded activity data. When the mock
 * database is first created, all seeded dates are shifted so this day becomes
 * "yesterday", keeping streaks and weekly charts meaningful on any demo date.
 */
export const MOCK_SEED_ANCHOR_DAY = '2026-09-14';

/** Simulated network latency for mock services (ms). */
export const MOCK_LATENCY_MS = 180;

/** Largest image accepted by the mock media upload (bytes). */
export const MAX_MOCK_UPLOAD_BYTES = 1.5 * 1024 * 1024;
