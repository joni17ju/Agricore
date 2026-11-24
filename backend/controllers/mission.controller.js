import { Lesson, Mission, MissionAttempt, Module } from '../models/index.js';
import { GAME_TYPES, missionGameType } from '../constants/gameTypes.js';
import { findOr404, httpError, toObjectId } from '../utils/http.js';
import { validateMaxXP, validateScenario } from '../utils/missionValidation.js';

/** GET /api/missions?lessonId=... */
export async function listMissions(req, res) {
  const filter = {};
  if (req.query.lessonId) filter.lessonId = toObjectId(req.query.lessonId, 'lessonId');
  res.json(await Mission.find(filter).sort({ lessonId: 1, levelNumber: 1 }));
}

/** GET /api/missions/:id */
export async function getMission(req, res) {
  res.json(await findOr404(Mission, req.params.id, 'Mission'));
}

/**
 * The game type a mission is played as: its own when it names one (see
 * missionGameType), otherwise its module's.
 */
async function gameTypeFor(lessonId, mission = null) {
  const lesson = await findOr404(Lesson, lessonId, 'Lesson');
  const module = await findOr404(Module, lesson.moduleId, 'Module');
  return { lesson, gameType: missionGameType(module, mission) };
}

/** An optional per-mission game type must be one of the five, or null for the module's. */
function readGameType(value) {
  if (value === undefined || value === null || value === '') return null;
  if (!Object.values(GAME_TYPES).includes(value)) {
    throw httpError(400, `gameType must be one of: ${Object.values(GAME_TYPES).join(', ')}`);
  }
  return value;
}

/**
 * Refuse content the game or the scorer could not handle, in the same plain
 * words the mission editor shows. The full list goes back as `problems` so a
 * client can show every one; the first is the message.
 */
function assertValid({ gameType, maxXP, scenarioData }) {
  if (maxXP !== undefined) {
    const problem = validateMaxXP(maxXP);
    if (problem) throw httpError(400, problem);
  }
  if (scenarioData !== undefined) {
    const { errors } = validateScenario(gameType, scenarioData);
    if (errors.length > 0) {
      const error = httpError(400, errors[0].message);
      error.problems = errors;
      throw error;
    }
  }
}

/** POST /api/missions — instructor CMS. Level numbers continue within the lesson. */
export async function createMission(req, res) {
  const { lessonId, maxXP = 100, scenarioData } = req.body ?? {};
  const ownGameType = readGameType(req.body?.gameType);
  const { lesson, gameType } = await gameTypeFor(lessonId, { gameType: ownGameType });
  if (!scenarioData || typeof scenarioData !== 'object') throw httpError(400, 'scenarioData is required.');
  assertValid({ gameType, maxXP, scenarioData });
  const last = await Mission.findOne({ lessonId: lesson._id }).sort({ levelNumber: -1 });
  const mission = await Mission.create({
    lessonId: lesson._id,
    levelNumber: (last?.levelNumber ?? 0) + 1,
    maxXP,
    scenarioData,
    gameType: ownGameType,
  });
  res.status(201).json(mission);
}

/** PATCH /api/missions/:id */
export async function updateMission(req, res) {
  const mission = await findOr404(Mission, req.params.id, 'Mission');
  const { maxXP, scenarioData } = req.body ?? {};
  const { gameType } = await gameTypeFor(mission.lessonId, mission);
  assertValid({ gameType, maxXP, scenarioData });
  if (maxXP !== undefined) mission.maxXP = maxXP;
  if (scenarioData !== undefined) mission.scenarioData = scenarioData;
  await mission.save();
  res.json(mission);
}

/**
 * DELETE /api/missions/:id — renumbers the lesson's remaining levels.
 *
 * Attempts on the mission go with it, as the instructor is told when they
 * confirm. Left behind, they would keep counting toward the student's XP and
 * rank for a level that no longer exists.
 */
export async function deleteMission(req, res) {
  const mission = await findOr404(Mission, req.params.id, 'Mission');
  const { deletedCount: removedAttempts } = await MissionAttempt.deleteMany({ missionId: mission._id });
  await mission.deleteOne();
  const remaining = await Mission.find({ lessonId: mission.lessonId }).sort({ levelNumber: 1 });
  await Promise.all(
    remaining.map((item, index) =>
      item.levelNumber === index + 1 ? null : Mission.updateOne({ _id: item._id }, { levelNumber: index + 1 }),
    ),
  );
  res.json({ deleted: true, removedAttempts, renumbered: remaining.length });
}
