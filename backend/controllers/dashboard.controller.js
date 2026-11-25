import { Mission, MissionAttempt, Module, Progress, Section } from '../models/index.js';
import { httpError } from '../utils/http.js';
import { rankSection } from './leaderboard.controller.js';
import { listLessonOutlines } from './lesson.controller.js';

/** How many of the top ranks the dashboard's leaderboard card shows. */
const PREVIEW_ROWS = 5;

/**
 * GET /api/dashboard — everything the student dashboard needs, in one request.
 *
 * The dashboard used to make about fifteen requests in five rounds, one after
 * another (the account, then the course, then attempts and progress — twice —
 * then the section and the ranking). Each round trip to the database costs
 * ~200 ms, so the page took 2–3 seconds even with a warm server. Here every
 * query runs at the same time and the browser waits for one response.
 *
 * Signed-in students only, and only their own data: their account, their
 * section's name, the course outline (lessons without their full text), their
 * attempts and progress, and the top of their own section's leaderboard with
 * their own row. The separate endpoints still work as before.
 */
export async function getDashboard(req, res) {
  const user = req.user;
  if (user.role !== 'student') throw httpError(403, 'The dashboard summary is for student accounts.');

  const [modules, lessons, missions, attempts, progress, section, ranking] = await Promise.all([
    Module.find().sort({ moduleNumber: 1 }).lean(),
    listLessonOutlines(),
    Mission.find().sort({ lessonId: 1, levelNumber: 1 }).lean(),
    MissionAttempt.find({ studentId: user._id }).sort({ attemptedAt: -1 }).lean(),
    Progress.find({ studentId: user._id }).lean(),
    user.sectionId ? Section.findById(user.sectionId).select('sectionName').lean() : null,
    user.sectionId ? rankSection(user.sectionId, { period: 'overall', limit: 500 }) : [],
  ]);

  const ownRow = ranking.find((row) => String(row._id) === String(user._id)) ?? null;
  const top = ranking.slice(0, PREVIEW_ROWS);
  /*
   * Without profile pictures: they are stored as images inside the account
   * and were most of this response's size. The page fills them in from the
   * full leaderboard request it makes once the dashboard is on screen.
   */
  const rows = (ownRow && !top.includes(ownRow) ? [...top, ownRow] : top).map((row) => ({
    ...row,
    avatarUrl: null,
    hasAvatar: Boolean(row.avatarUrl),
  }));

  // Never the reset-code bookkeeping, even hashed.
  const { passwordReset, passwordHash, ...account } = user.toObject();

  res.json({
    user: account,
    section: section ? { _id: section._id, sectionName: section.sectionName } : null,
    course: { modules, lessons, missions },
    attempts,
    progress,
    leaderboard: { period: 'overall', totalStudents: ranking.length, rows },
    generatedAt: new Date().toISOString(),
  });
}
