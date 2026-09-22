import { MissionAttempt, User } from '../models/index.js';
import { toObjectId } from '../utils/http.js';

/**
 * GET /api/leaderboard?sectionId=...&limit=...
 *
 * Ranks are computed here at request time and never stored: total XP is summed
 * from missionAttempts, students are ordered by it, and the rank is the
 * position in that ordering. Nothing about this is persisted, so it can never
 * go stale against the attempts it came from.
 *
 * Students with no attempts still appear, on 0 XP — a $lookup from users keeps
 * them in, which a $group over attempts alone would drop.
 */
export async function getLeaderboard(req, res) {
  const match = { role: 'student', status: 'active' };
  if (req.query.sectionId) match.sectionId = toObjectId(req.query.sectionId, 'sectionId');
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

  const rows = await User.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'missionAttempts',
        localField: '_id',
        foreignField: 'studentId',
        as: 'attempts',
      },
    },
    {
      $addFields: {
        totalXP: { $sum: '$attempts.xpEarned' },
        attemptCount: { $size: '$attempts' },
        lastActiveAt: { $max: '$attempts.attemptedAt' },
        badgeCount: { $size: { $ifNull: ['$earnedBadges', []] } },
      },
    },
    { $sort: { totalXP: -1, lastName: 1, firstName: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        sectionId: 1,
        avatarUrl: 1,
        totalXP: 1,
        attemptCount: 1,
        lastActiveAt: 1,
        badgeCount: 1,
      },
    },
  ]);

  // Dense-rank so equal XP shares a position, matching how the UI reads ties.
  let rank = 0;
  let previousXP = null;
  const ranked = rows.map((row, index) => {
    if (row.totalXP !== previousXP) {
      rank = index + 1;
      previousXP = row.totalXP;
    }
    return { ...row, rank };
  });

  res.json(ranked);
}
