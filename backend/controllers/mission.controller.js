import { Lesson, Mission } from '../models/index.js';
import { findOr404, httpError, toObjectId } from '../utils/http.js';

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

/** POST /api/missions — instructor CMS. Level numbers continue within the lesson. */
export async function createMission(req, res) {
  const { lessonId, maxXP = 100, scenarioData } = req.body ?? {};
  const lesson = await findOr404(Lesson, lessonId, 'Lesson');
  if (!scenarioData || typeof scenarioData !== 'object') throw httpError(400, 'scenarioData is required.');
  const last = await Mission.findOne({ lessonId: lesson._id }).sort({ levelNumber: -1 });
  const mission = await Mission.create({
    lessonId: lesson._id,
    levelNumber: (last?.levelNumber ?? 0) + 1,
    maxXP,
    scenarioData,
  });
  res.status(201).json(mission);
}

/** PATCH /api/missions/:id */
export async function updateMission(req, res) {
  const mission = await findOr404(Mission, req.params.id, 'Mission');
  const { maxXP, scenarioData } = req.body ?? {};
  if (maxXP !== undefined) mission.maxXP = maxXP;
  if (scenarioData !== undefined) mission.scenarioData = scenarioData;
  await mission.save();
  res.json(mission);
}

/** DELETE /api/missions/:id — renumbers the lesson's remaining levels. */
export async function deleteMission(req, res) {
  const mission = await findOr404(Mission, req.params.id, 'Mission');
  await mission.deleteOne();
  const remaining = await Mission.find({ lessonId: mission.lessonId }).sort({ levelNumber: 1 });
  await Promise.all(
    remaining.map((item, index) =>
      item.levelNumber === index + 1 ? null : Mission.updateOne({ _id: item._id }, { levelNumber: index + 1 }),
    ),
  );
  res.json({ deleted: true, renumbered: remaining.length });
}
