import { Lesson, Mission, Progress } from '../models/index.js';
import { findOr404, httpError, toObjectId } from '../utils/http.js';
import { sanitizeLessonHtml } from '../utils/lessonHtml.js';

/**
 * Lesson content as it may be stored: a string, run through the same
 * allow-list the editor and the viewer use. The editor has already sanitised
 * what it sends, so for a normal save this changes nothing; it is here for
 * requests that did not come from the editor.
 */
function cleanContentBody(contentBody) {
  if (typeof contentBody !== 'string') throw httpError(400, 'contentBody must be a string.');
  return sanitizeLessonHtml(contentBody);
}

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
    contentBody: cleanContentBody(contentBody),
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
  if (contentBody !== undefined) lesson.contentBody = cleanContentBody(contentBody);
  if (mediaAssets !== undefined) lesson.mediaAssets = mediaAssets;
  await lesson.save();
  res.json(lesson);
}

/**
 * PATCH /api/lessons/reorder  { moduleId, lessonIds: [...] }
 *
 * Assigns lessonNumber 1..n in the order given. The list must contain exactly
 * the module's lessons — a partial list would leave gaps or duplicates.
 *
 * Written in two passes because (moduleId, lessonNumber) is a unique index:
 * assigning final numbers directly collides the moment two lessons swap
 * places, so every row is parked on a temporary negative number first.
 */
export async function reorderLessons(req, res) {
  const { moduleId, lessonIds } = req.body ?? {};
  if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
    throw httpError(400, 'lessonIds must be a non-empty array.');
  }

  const module = toObjectId(moduleId, 'moduleId');
  const existing = await Lesson.find({ moduleId: module }, { _id: 1 });
  const existingIds = new Set(existing.map((lesson) => String(lesson._id)));
  const requested = lessonIds.map(String);

  if (new Set(requested).size !== requested.length) {
    throw httpError(400, 'lessonIds contains duplicates.');
  }
  if (requested.length !== existingIds.size || requested.some((id) => !existingIds.has(id))) {
    throw httpError(400, 'lessonIds must list exactly the lessons of this module.');
  }

  await Lesson.bulkWrite(
    requested.map((id, index) => ({
      updateOne: { filter: { _id: toObjectId(id, 'lesson id') }, update: { $set: { lessonNumber: -(index + 1) } } },
    })),
  );
  await Lesson.bulkWrite(
    requested.map((id, index) => ({
      updateOne: { filter: { _id: toObjectId(id, 'lesson id') }, update: { $set: { lessonNumber: index + 1 } } },
    })),
  );

  res.json(await Lesson.find({ moduleId: module }).sort({ lessonNumber: 1 }));
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
