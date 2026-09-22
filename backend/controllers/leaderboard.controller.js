import { Lesson, Mission, MissionAttempt, User } from '../models/index.js';
import { httpError, toObjectId } from '../utils/http.js';

const PERIODS = ['overall', 'week', 'module'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Dense ranking: equal XP shares a position, matching how the UI reads ties. */
function rank(rows) {
  let position = 0;
  let previousXP = null;
  return rows.map((row, index) => {
    if (row.totalXP !== previousXP) {
      position = index + 1;
      previousXP = row.totalXP;
    }
    return { ...row, rank: position };
  });
}

const byXP = (a, b) =>
  b.totalXP - a.totalXP || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);

/**
 * GET /api/leaderboard?sectionId=&period=overall|week|module&moduleId=&limit=
 *
 * Ranks are computed here at request time and never stored: XP is summed from
 * missionAttempts and the position is the place in that ordering, so it can
 * never go stale against the attempts it came from.
 *
 * This is also how a student sees their section's ranking at all — reading the
 * users and attempts of classmates directly is refused to them, so only the
 * display fields below leave the server: no emails, no password hashes.
 */
export async function getLeaderboard(req, res) {
  const { sectionId, period = 'overall', moduleId } = req.query;
  if (!PERIODS.includes(period)) throw httpError(400, `period must be one of: ${PERIODS.join(', ')}`);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

  const userFilter = { role: 'student', status: 'active' };
  if (sectionId) userFilter.sectionId = toObjectId(sectionId, 'sectionId');
  const students = await User.find(userFilter).select('firstName lastName sectionId avatarUrl earnedBadges');
  if (students.length === 0) return res.json([]);

  const studentIds = students.map((s) => s._id);
  const attempts = await MissionAttempt.find({ studentId: { $in: studentIds } })
    .select('studentId missionId xpEarned attemptedAt');

  // "module" scopes XP to the missions belonging to that module's lessons.
  let missionFilter = null;
  if (period === 'module') {
    if (!moduleId) throw httpError(400, 'moduleId is required when period is "module".');
    const lessons = await Lesson.find({ moduleId: toObjectId(moduleId, 'moduleId') }).select('_id');
    const missions = await Mission.find({ lessonId: { $in: lessons.map((l) => l._id) } }).select('_id');
    missionFilter = new Set(missions.map((m) => String(m._id)));
  }

  const now = Date.now();
  const inPeriod = (attempt) => {
    if (period === 'week') return now - new Date(attempt.attemptedAt).getTime() <= WEEK_MS;
    if (period === 'module') return missionFilter.has(String(attempt.missionId));
    return true;
  };

  const sumBy = (predicate) => {
    const totals = new Map(studentIds.map((id) => [String(id), 0]));
    for (const attempt of attempts) {
      if (!predicate(attempt)) continue;
      const key = String(attempt.studentId);
      totals.set(key, (totals.get(key) ?? 0) + attempt.xpEarned);
    }
    return totals;
  };

  const periodTotals = sumBy(inPeriod);
  const overallTotals = sumBy(() => true);
  // Ranking as it stood a week ago, for the movement arrows.
  const lastWeekTotals = sumBy((a) => now - new Date(a.attemptedAt).getTime() > WEEK_MS);

  const base = students.map((student) => ({
    _id: student._id,
    firstName: student.firstName,
    lastName: student.lastName,
    sectionId: student.sectionId,
    avatarUrl: student.avatarUrl ?? null,
    badgeCount: (student.earnedBadges ?? []).length,
    overallXP: overallTotals.get(String(student._id)) ?? 0,
  }));

  const previousRanks = new Map(
    rank(
      base
        .map((row) => ({ ...row, totalXP: lastWeekTotals.get(String(row._id)) ?? 0 }))
        .sort(byXP),
    ).map((row) => [String(row._id), row.rank]),
  );

  const ranked = rank(
    base.map((row) => ({ ...row, totalXP: periodTotals.get(String(row._id)) ?? 0 })).sort(byXP),
  )
    .slice(0, limit)
    .map((row) => ({ ...row, previousRank: previousRanks.get(String(row._id)) ?? null }));

  res.json(ranked);
}
