import { Lesson, Mission, MissionAttempt, Section, User } from '../models/index.js';
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
 * Which sections the signed-in user may rank.
 *
 * The section is never taken on trust from the request. A student is always
 * ranked within their own section, whatever sectionId they send (a different
 * one is refused outright, so a crafted request cannot read another class). An
 * instructor may see only the sections assigned to them, either through their
 * assignedSectionIds or as the section's instructor.
 */
async function allowedSectionIds(user) {
  if (user.role === 'student') return user.sectionId ? [String(user.sectionId)] : [];
  const assigned = (user.assignedSectionIds ?? []).map(String);
  const owned = (await Section.find({ instructorId: user._id }).select('_id').lean()).map((s) => String(s._id));
  return [...new Set([...assigned, ...owned])];
}

/**
 * GET /api/leaderboard?sectionId=&period=overall|week|module&moduleId=&limit=
 *
 * Requires a signed-in user (see routes) and only ever ranks one section the
 * user belongs to or teaches. Ranks are computed here at request time and
 * never stored: XP is summed from missionAttempts and the position is the
 * place in that ordering, so it can never go stale against the attempts it
 * came from.
 *
 * Only display fields leave the server: name, avatar, badge count, XP and
 * rank. No emails, school IDs, sections or account details.
 */
export async function getLeaderboard(req, res) {
  const { sectionId, period = 'overall', moduleId } = req.query;
  if (!PERIODS.includes(period)) throw httpError(400, `period must be one of: ${PERIODS.join(', ')}`);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

  const allowed = await allowedSectionIds(req.user);
  let scope;
  if (sectionId) {
    const requested = String(toObjectId(sectionId, 'sectionId'));
    if (!allowed.includes(requested)) {
      throw httpError(403, req.user.role === 'student'
        ? 'You can only see the leaderboard of your own section.'
        : 'You are not assigned to this section.');
    }
    scope = requested;
  } else {
    // No filter: a student's own section, an instructor's first assigned one.
    scope = allowed[0] ?? null;
  }
  if (!scope) return res.json([]);

  res.json(await rankSection(scope, { period, moduleId, limit }));
}

/**
 * The ranking of one section: dense ranks by XP for the period, with each
 * student's all-time XP and last week's position for the movement arrows.
 *
 * XP is summed inside MongoDB with one aggregation rather than by downloading
 * every attempt of the section, and the student list is read in parallel.
 * Shared by GET /leaderboard and GET /dashboard.
 */
export async function rankSection(sectionId, { period = 'overall', moduleId, limit = 100 } = {}) {
  let missionIds = null;
  if (period === 'module') {
    if (!moduleId) throw httpError(400, 'moduleId is required when period is "module".');
    const lessons = await Lesson.find({ moduleId: toObjectId(moduleId, 'moduleId') }).select('_id').lean();
    missionIds = (await Mission.find({ lessonId: { $in: lessons.map((l) => l._id) } }).select('_id').lean()).map((m) => m._id);
  }

  const students = await User.find({ role: 'student', status: 'active', sectionId: toObjectId(sectionId, 'sectionId') })
    .select('firstName lastName avatarUrl earnedBadges')
    .lean();
  if (students.length === 0) return [];

  const now = Date.now();
  const weekAgo = new Date(now - WEEK_MS);
  const totals = await MissionAttempt.aggregate([
    { $match: { studentId: { $in: students.map((s) => s._id) } } },
    {
      $group: {
        _id: '$studentId',
        overall: { $sum: '$xpEarned' },
        week: { $sum: { $cond: [{ $gte: ['$attemptedAt', weekAgo] }, '$xpEarned', 0] } },
        beforeWeek: { $sum: { $cond: [{ $lt: ['$attemptedAt', weekAgo] }, '$xpEarned', 0] } },
        module: missionIds ? { $sum: { $cond: [{ $in: ['$missionId', missionIds] }, '$xpEarned', 0] } } : { $sum: 0 },
      },
    },
  ]);
  const byStudent = new Map(totals.map((t) => [String(t._id), t]));
  const total = (id, key) => byStudent.get(String(id))?.[key] ?? 0;

  const base = students.map((student) => ({
    _id: student._id,
    firstName: student.firstName,
    lastName: student.lastName,
    avatarUrl: student.avatarUrl ?? null,
    badgeCount: (student.earnedBadges ?? []).length,
    overallXP: total(student._id, 'overall'),
  }));

  // Ranking as it stood a week ago, for the movement arrows.
  const previousRanks = new Map(
    rank(base.map((row) => ({ ...row, totalXP: total(row._id, 'beforeWeek') })).sort(byXP)).map((row) => [String(row._id), row.rank]),
  );

  const periodKey = period === 'week' ? 'week' : period === 'module' ? 'module' : 'overall';
  return rank(base.map((row) => ({ ...row, totalXP: total(row._id, periodKey) })).sort(byXP))
    .slice(0, limit)
    .map((row) => ({ ...row, previousRank: previousRanks.get(String(row._id)) ?? null }));
}
