/**
 * Builds a fully-completed course history for one student.
 *
 * Used by seed.js so a fresh seed reproduces it, and by cleanup-mock-data.js so
 * an existing database can be brought to the same state. Both go through here
 * rather than writing attempts by hand, so the two can never drift.
 *
 * Nothing derived is invented: XP comes from the same `xpForScore` the mission
 * controller uses, and badges are decided by the same `findNewBadges` the
 * server runs on a real submission. Hand-written badge or XP data would be a
 * lie the moment the rules changed.
 */
import { MissionAttempt, Progress, User } from '../../models/index.js';
import { findNewBadges, findClearedModuleNumbers } from '../../utils/awards.js';
import { xpForScore } from '../../utils/gamification.js';

/** Scores land in this band: clearly passing, not suspiciously perfect. */
const MIN_SCORE = 80;
const MAX_SCORE = 100;

/**
 * Days the history is spread across, ending yesterday.
 *
 * Every day in the window gets at least one attempt, so the computed streak is
 * the full window rather than an accidental 1. Ending yesterday rather than
 * today matches `calculateStreak`, which treats a streak as unbroken until the
 * student has had a chance to play today.
 */
const WINDOW_DAYS = 20;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Deterministic pseudo-random in [0, 1) from a string.
 *
 * Seeded rather than Math.random so re-running the seed produces the same
 * history, and a diff of two seeded databases is empty rather than noise.
 */
function hashUnit(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

/**
 * One passing attempt per mission, plus a completed progress row per lesson.
 *
 * @param {object} input
 * @param {any} input.studentId
 * @param {{ _id: any, lessonId: any, maxXP: number, scenarioData?: object }[]} input.missions
 * @param {{ _id: any }[]} input.lessons
 * @param {Date} [input.now]
 * @returns {{ attempts: object[], progress: object[] }}
 */
export function buildCompletedActivity({ studentId, missions, lessons, now = new Date() }) {
  const yesterday = startOfDay(new Date(now.getTime() - 86400000));

  /*
   * One attempt is forced to a perfect 100. The scores below are otherwise
   * spread across the band and would only land exactly on 100 by chance, which
   * meant the "perfect score" badge was unreachable for a student who has in
   * fact finished everything. Picked deterministically so re-seeding is stable.
   */
  const perfectIndex = missions.length
    ? Math.floor(hashUnit(missions.map((m) => String(m._id)).join('|')) * missions.length)
    : -1;

  const attempts = missions.map((mission, index) => {
    const key = String(mission._id);
    const score = index === perfectIndex
      ? MAX_SCORE
      : MIN_SCORE + Math.round(hashUnit(`${key}:score`) * (MAX_SCORE - MIN_SCORE - 1));

    /*
     * Walk backwards a day at a time and wrap, so every day in the window is
     * used before any day gets a second attempt. That keeps the streak equal
     * to the window instead of leaving gaps.
     */
    const dayOffset = index % WINDOW_DAYS;
    const attemptedAt = new Date(yesterday.getTime() - dayOffset * 86400000);
    // A believable time of day rather than everything at midnight.
    attemptedAt.setHours(9 + Math.floor(hashUnit(`${key}:hour`) * 10), Math.floor(hashUnit(`${key}:min`) * 60), 0, 0);

    const limit = mission.scenarioData?.timeLimitSeconds;
    const timeSpentSeconds = limit
      // Finished inside the limit, with a little left over.
      ? Math.max(30, Math.round(limit * (0.45 + hashUnit(`${key}:time`) * 0.35)))
      : 60 + Math.round(hashUnit(`${key}:time`) * 240);

    return {
      studentId,
      missionId: mission._id,
      score,
      // The same figure the server would award for a first pass at this score.
      xpEarned: xpForScore(mission.maxXP, score),
      timeSpentSeconds,
      isPassed: true,
      attemptedAt,
    };
  });

  const progress = lessons.map((lesson) => ({
    studentId,
    lessonId: lesson._id,
    status: 'completed',
  }));

  return { attempts, progress };
}

/**
 * Re-evaluates badges through the server's own rules and stores the result.
 *
 * Call after the attempts exist. Returns the badge codes the student now holds.
 */
export async function awardBadgesFromRules(studentId, modules) {
  const student = await User.findById(studentId);
  if (!student) throw new Error(`no such student: ${studentId}`);

  // Start from nothing so a re-run cannot accumulate duplicates.
  student.earnedBadges = [];
  await student.save();

  const attempts = await MissionAttempt.find({ studentId });
  const clearedModuleNumbers = await findClearedModuleNumbers(studentId, modules);
  const badges = await findNewBadges({ student, attempts, clearedModuleNumbers });

  const earnedAt = new Date();
  student.earnedBadges = badges.map((badge) => ({ code: badge.code, earnedAt }));
  await student.save();
  return badges.map((badge) => badge.code);
}

/**
 * Replaces a student's attempts and progress with a full, passing history and
 * re-awards their badges. Idempotent: running it twice leaves the same rows.
 */
export async function completeCourseFor(studentId, { missions, lessons, modules, now = new Date() } = {}) {
  await MissionAttempt.deleteMany({ studentId });
  await Progress.deleteMany({ studentId });

  const { attempts, progress } = buildCompletedActivity({ studentId, missions, lessons, now });
  if (attempts.length) await MissionAttempt.insertMany(attempts);
  if (progress.length) await Progress.insertMany(progress);

  const codes = await awardBadgesFromRules(studentId, modules);
  return { attempts: attempts.length, progress: progress.length, badges: codes };
}
