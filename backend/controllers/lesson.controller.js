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

/**
 * A lesson without its full text, for lists: the course map only shows the
 * first real paragraph, so that paragraph is sent as the whole body. The full
 * lesson (all text, media) comes from GET /lessons/:id when it is opened.
 */
const SUMMARY_PARAGRAPH = /<p[^>]*>(.*?)<\/p>/gs;
export function summarizeLesson(lesson) {
  const html = String(lesson.contentBody ?? '');
  const paragraphs = [...html.matchAll(SUMMARY_PARAGRAPH)]
    .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const text = paragraphs.find((p) => !p.endsWith(':')) ?? paragraphs[0] ?? html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const { contentBody, mediaAssets, mediaCount, ...rest } = lesson;
  return {
    ...rest,
    contentBody: text ? `<p>${text.slice(0, 300)}</p>` : '',
    mediaAssets: [],
    mediaCount: mediaCount ?? (mediaAssets ?? []).length,
    isSummary: true,
  };
}

/** Enough of the start of a lesson to find its first paragraph. */
const OUTLINE_CHARS = 6000;

/**
 * Lesson outlines straight from the database: only the start of each lesson's
 * text leaves MongoDB, not the whole of it — about half the data and half the
 * time of reading every lesson in full. Used by the course lists and /dashboard.
 */
export async function listLessonOutlines(filter = {}) {
  const lessons = await Lesson.aggregate([
    { $match: filter },
    { $sort: { moduleId: 1, lessonNumber: 1 } },
    {
      $project: {
        moduleId: 1,
        lessonNumber: 1,
        title: 1,
        isSeedData: 1,
        createdAt: 1,
        updatedAt: 1,
        mediaCount: { $size: { $ifNull: ['$mediaAssets', []] } },
        contentBody: { $substrCP: [{ $ifNull: ['$contentBody', ''] }, 0, OUTLINE_CHARS] },
      },
    },
  ]);
  return lessons.map(summarizeLesson);
}

/**
 * GET /api/lessons?moduleId=...&fields=summary
 *
 * `fields=summary` returns every lesson without its full text (see
 * summarizeLesson) — a fraction of the size, for the student course lists.
 * Without it the full lessons are returned, as before.
 */
export async function listLessons(req, res) {
  const filter = {};
  if (req.query.moduleId) filter.moduleId = toObjectId(req.query.moduleId, 'moduleId');
  if (req.query.fields === 'summary') return res.json(await listLessonOutlines(filter));
  return res.json(await Lesson.find(filter).sort({ moduleId: 1, lessonNumber: 1 }).lean());
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
