import { Lesson, Module, GAME_TYPES } from '../models/index.js';
import { findOr404, httpError } from '../utils/http.js';

/** GET /api/modules */
export async function listModules(req, res) {
  res.json(await Module.find().sort({ moduleNumber: 1 }));
}

/** GET /api/modules/:id */
export async function getModule(req, res) {
  res.json(await findOr404(Module, req.params.id, 'Module'));
}

/**
 * POST /api/modules — instructor CMS.
 *
 * `moduleNumber` is optional: left out, the module is appended after the
 * highest existing number, which is what the "add module" tile wants and the
 * only ordering the unlock chain can make sense of. Passed explicitly, it is
 * checked for a clash here so the caller gets a 409 instead of a raw duplicate
 * key error from the unique index.
 */
export async function createModule(req, res) {
  const { moduleNumber, title, gameType, coverImage = null } = req.body ?? {};
  if (!title?.trim()) throw httpError(400, 'title is required.');
  if (!GAME_TYPES.includes(gameType)) throw httpError(400, `gameType must be one of: ${GAME_TYPES.join(', ')}`);

  let number = moduleNumber;
  if (number === undefined || number === null || number === '') {
    const last = await Module.findOne().sort({ moduleNumber: -1 }).select('moduleNumber');
    number = (last?.moduleNumber ?? 0) + 1;
  } else {
    number = Number(number);
    if (!Number.isInteger(number) || number < 1) throw httpError(400, 'moduleNumber must be a whole number of 1 or more.');
    if (await Module.exists({ moduleNumber: number })) {
      throw httpError(409, `Module ${number} already exists.`);
    }
  }

  const created = await Module.create({ moduleNumber: number, title: title.trim(), gameType, coverImage });
  res.status(201).json(created);
}

/**
 * DELETE /api/modules/:id — instructor CMS.
 *
 * Only an empty module may go. A module with lessons owns missions, student
 * attempts and progress rows underneath it, and deleting that cascade would
 * silently rewrite students' records and break the unlock chain; the
 * instructor is told to remove the lessons first instead.
 */
export async function deleteModule(req, res) {
  const module = await findOr404(Module, req.params.id, 'Module');
  const lessonCount = await Lesson.countDocuments({ moduleId: module._id });
  if (lessonCount > 0) {
    throw httpError(
      409,
      `This module still has ${lessonCount} lesson${lessonCount === 1 ? '' : 's'}. Delete its lessons first.`,
    );
  }

  await module.deleteOne();

  /*
   * Renumber what is left so the sequence stays 1..n with no hole. The unlock
   * chain walks modules in number order, and a gap would leave every later
   * module permanently locked behind a module that no longer exists.
   */
  const remaining = await Module.find().sort({ moduleNumber: 1 });
  await Promise.all(
    remaining.map((item, index) =>
      item.moduleNumber === index + 1 ? null : Module.updateOne({ _id: item._id }, { moduleNumber: index + 1 }),
    ),
  );

  res.json({ deleted: true, renumbered: remaining.length });
}

/** PATCH /api/modules/:id — title edits from the instructor CMS. */
export async function updateModule(req, res) {
  const module = await findOr404(Module, req.params.id, 'Module');
  const { title, gameType, coverImage } = req.body ?? {};
  if (title !== undefined) {
    if (!String(title).trim()) throw httpError(400, 'title cannot be empty.');
    module.title = String(title).trim();
  }
  if (gameType !== undefined) {
    if (!GAME_TYPES.includes(gameType)) throw httpError(400, `gameType must be one of: ${GAME_TYPES.join(', ')}`);
    module.gameType = gameType;
  }
  // null clears the cover and returns the module to its static/gradient image.
  if (coverImage !== undefined) module.coverImage = coverImage;
  await module.save();
  res.json(module);
}
