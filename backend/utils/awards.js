import { BADGES_BY_CODE } from '../constants/badges.js';
import { PERFORMANCE_RULES } from '../constants/rules.js';
import { Lesson, Mission, MissionAttempt, User } from '../models/index.js';
import { getBestAttemptsByMission, rankStudentsByXP } from './gamification.js';
import { evaluateNewBadges } from './badgeRules.js';

/**
 * What a mission attempt earned, worked out from stored data.
 *
 * Kept out of the controller so the controller stays a readable sequence of
 * steps, and so this can be tested on its own. Everything here reads from the
 * database rather than the request — the point of moving badge evaluation to
 * the server is that nothing the client sends is trusted.
 */

/** Modules where every mission in every lesson has a passing attempt. */
export async function findClearedModuleNumbers(studentId, modules) {
  const passedIds = new Set(
    (await MissionAttempt.distinct('missionId', { studentId, isPassed: true })).map(String),
  );
  if (passedIds.size === 0) return [];

  const cleared = [];
  for (const module of modules) {
    const lessons = await Lesson.find({ moduleId: module._id }, { _id: 1 });
    if (lessons.length === 0) continue;
    const missions = await Mission.find({ lessonId: { $in: lessons.map((l) => l._id) } }, { _id: 1 });
    // A module with no missions is not "cleared" — there was nothing to clear.
    if (missions.length === 0) continue;
    if (missions.every((mission) => passedIds.has(String(mission._id)))) {
      cleared.push(module.moduleNumber);
    }
  }
  return cleared;
}

/** The student's current rank within their own section, or null. */
export async function findSectionRank(student) {
  if (!student.sectionId) return null;

  const classmates = await User.find({ role: 'student', sectionId: student.sectionId }).select('_id firstName lastName');
  if (classmates.length === 0) return null;

  const attempts = await MissionAttempt.find({ studentId: { $in: classmates.map((c) => c._id) } })
    .select('studentId xpEarned');

  // rankStudentsByXP matches ids with Map lookups, so both sides are strings.
  const ranked = rankStudentsByXP(
    classmates.map((c) => ({ ...c.toObject(), _id: String(c._id) })),
    attempts.map((a) => ({ studentId: String(a.studentId), xpEarned: a.xpEarned })),
  );
  return ranked.find((row) => row.student._id === String(student._id))?.rank ?? null;
}

/**
 * Badges the student now qualifies for and does not already hold.
 * Returns the full badge definitions so callers can build a message.
 */
export async function findNewBadges({ student, attempts, clearedModuleNumbers }) {
  const missionIds = [...new Set(attempts.map((a) => String(a.missionId)))];
  const missions = await Mission.find({ _id: { $in: missionIds } }).select('scenarioData');
  const missionsById = new Map(missions.map((m) => [String(m._id), m]));

  const codes = evaluateNewBadges({
    attempts: attempts.map((a) => ({
      missionId: String(a.missionId),
      score: a.score,
      isPassed: a.isPassed,
      timeSpentSeconds: a.timeSpentSeconds,
      attemptedAt: a.attemptedAt,
    })),
    missionsById,
    clearedModuleNumbers,
    earnedCodes: (student.earnedBadges ?? []).map((b) => b.code),
    sectionRank: await findSectionRank(student),
    now: new Date(),
  });

  return codes.map((code) => BADGES_BY_CODE[code]).filter(Boolean);
}

/**
 * Has this student just crossed into "at risk" on score?
 *
 * Only the average-best-score rule is checked here. The other rule the
 * analytics screens use is inactivity, which by definition cannot become true
 * at the moment a student submits an attempt.
 *
 * `previousAttempts` is the set before this one, so the comparison is a real
 * transition: the notification fires on the way in, not on every later attempt
 * while they stay below the line.
 */
export function detectAtRiskTransition({ attempts, previousAttempts }) {
  const averageOfBest = (rows) => {
    const best = [...getBestAttemptsByMission(rows.map((a) => ({ ...a, missionId: String(a.missionId) }))).values()];
    if (best.length === 0) return null;
    return Math.round(best.reduce((sum, a) => sum + a.score, 0) / best.length);
  };

  const now = averageOfBest(attempts);
  const before = averageOfBest(previousAttempts);
  const threshold = PERFORMANCE_RULES.atRiskAverageScore;

  /*
   * Needs a few missions behind it. Flagging someone as at risk off one or two
   * attempts would mostly flag people who have only just started.
   */
  const MIN_MISSIONS = 3;
  const attemptedMissions = new Set(attempts.map((a) => String(a.missionId))).size;
  if (attemptedMissions < MIN_MISSIONS || now === null) return null;

  const wasAtRisk = before !== null && before < threshold;
  const isAtRisk = now < threshold;
  if (!isAtRisk || wasAtRisk) return null;

  return {
    averageScore: now,
    reason: `Their average best score has fallen to ${now}%, below the ${threshold}% mark.`,
  };
}
