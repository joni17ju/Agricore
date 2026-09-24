import { Module, GAME_TYPES } from '../models/index.js';
import { findOr404, httpError } from '../utils/http.js';

/** GET /api/modules */
export async function listModules(req, res) {
  res.json(await Module.find().sort({ moduleNumber: 1 }));
}

/** GET /api/modules/:id */
export async function getModule(req, res) {
  res.json(await findOr404(Module, req.params.id, 'Module'));
}

/** POST /api/modules — instructor CMS. */
export async function createModule(req, res) {
  const { moduleNumber, title, gameType } = req.body ?? {};
  if (!title?.trim()) throw httpError(400, 'title is required.');
  if (!GAME_TYPES.includes(gameType)) throw httpError(400, `gameType must be one of: ${GAME_TYPES.join(', ')}`);
  res.status(201).json(await Module.create({ moduleNumber, title: title.trim(), gameType }));
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
