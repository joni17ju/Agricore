import { PROGRESS_STATUSES, Progress } from '../models/index.js';
import { httpError, toObjectId } from '../utils/http.js';

/** GET /api/progress?studentId=...&lessonId=... */
export async function listProgress(req, res) {
  const filter = {};
  if (req.query.studentId) filter.studentId = toObjectId(req.query.studentId, 'studentId');
  if (req.query.lessonId) filter.lessonId = toObjectId(req.query.lessonId, 'lessonId');
  res.json(await Progress.find(filter));
}

/**
 * PATCH /api/progress
 * Body: { studentId, lessonId, status }
 *
 * Upserts the one row per student per lesson. Callers may send any of the four
 * lifecycle values; the app writes in-progress and completed, while
 * locked/unlocked stay derived on the client for now.
 */
export async function upsertProgress(req, res) {
  const { studentId, lessonId, status } = req.body ?? {};
  if (!PROGRESS_STATUSES.includes(status)) {
    throw httpError(400, `status must be one of: ${PROGRESS_STATUSES.join(', ')}`);
  }
  const row = await Progress.findOneAndUpdate(
    { studentId: toObjectId(studentId, 'studentId'), lessonId: toObjectId(lessonId, 'lessonId') },
    { $set: { status } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json(row);
}
