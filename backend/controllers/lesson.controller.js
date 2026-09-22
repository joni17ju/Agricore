import { Lesson, Mission, Progress } from '../models/index.js';
import { findOr404, httpError, toObjectId } from '../utils/http.js';

/** GET /api/lessons?moduleId=... */
export async function listLessons(req, res) {
  const filter = {};
  if (req.query.moduleId) filter.moduleId = toObjectId(req.query.moduleId, 'moduleId');
  res.json(await Lesson.find(filter).sort({ moduleId: 1, lessonNumber: 1 }));
}

/** GET /api/lessons/:id */
export async function getLesson(req, res) {
  res.json(await findOr404(Lesson, req.params.id, 'Lesson'));
}

/** POST /api/lessons — instructor CMS. Numbering continues from the module's last lesson. */
export async function createLesson(req, res) {
  const { moduleId, title, contentBody = '', mediaAssets = [] } = req.body ?? {};
  if (!title?.trim()) throw httpError(400, 'title is required.');
  const module = toObjectId(moduleId, 'moduleId');
  const last = await Lesson.findOne({ moduleId: module }).sort({ lessonNumber: -1 });
  const lesson = await Lesson.create({
    moduleId: module,
    lessonNumber: (last?.lessonNumber ?? 0) + 1,
    title: title.trim(),
    contentBody,
    mediaAssets,
  });
  res.status(201).json(lesson);
}

/** PATCH /api/lessons/:id */
export async function updateLesson(req, res) {
  const lesson = await findOr404(Lesson, req.params.id, 'Lesson');
  const { title, contentBody, mediaAssets } = req.body ?? {};
  if (title !== undefined) {
    if (!String(title).trim()) throw httpError(400, 'title cannot be empty.');
    lesson.title = String(title).trim();
  }
  if (contentBody !== undefined) lesson.contentBody = contentBody;
  if (mediaAssets !== undefined) lesson.mediaAssets = mediaAssets;
  await lesson.save();
  res.json(lesson);
}

/**
 * DELETE /api/lessons/:id
 * Removes the lesson with its missions and progress rows, then renumbers the
 * module's remaining lessons so numbering stays contiguous.
 */
export async function deleteLesson(req, res) {
  const lesson = await findOr404(Lesson, req.params.id, 'Lesson');
  const missions = await Mission.find({ lessonId: lesson._id }, { _id: 1 });
  await Mission.deleteMany({ lessonId: lesson._id });
  await Progress.deleteMany({ lessonId: lesson._id });
  await lesson.deleteOne();

  const remaining = await Lesson.find({ moduleId: lesson.moduleId }).sort({ lessonNumber: 1 });
  await Promise.all(
    remaining.map((item, index) =>
      item.lessonNumber === index + 1 ? null : Lesson.updateOne({ _id: item._id }, { lessonNumber: index + 1 }),
    ),
  );

  res.json({ deleted: true, removedMissions: missions.length, renumbered: remaining.length });
}
