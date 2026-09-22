import { PROGRESS_STATUS } from '../constants/rules.js';
import { Lesson, Mission, MissionAttempt, Module, Progress, User } from '../models/index.js';
import { calculateXpAward } from '../utils/gamification.js';
import { scoreMission } from '../utils/scoring.js';
import { httpError, toObjectId } from '../utils/http.js';

/** Attempts longer than this are treated as an idle tab, not real play time. */
const MAX_TIME_SECONDS = 60 * 60;

/** GET /api/missionAttempts?studentId=...&missionId=... */
export async function listMissionAttempts(req, res) {
  const filter = {};
  if (req.query.studentId) filter.studentId = toObjectId(req.query.studentId, 'studentId');
  if (req.query.missionId) filter.missionId = toObjectId(req.query.missionId, 'missionId');
  res.json(await MissionAttempt.find(filter).sort({ attemptedAt: -1 }));
}

/**
 * POST /api/missionAttempts
 * Body: { studentId, missionId, answers, timeSpentSeconds }
 *
 * The client sends only what the student did — never the score. The server
 * re-scores those answers against the mission's own scenarioData using the
 * same rules the UI previews with, so a tampered request cannot award XP that
 * wasn't earned. score, xpEarned and isPassed in the request body are ignored.
 */
export async function createMissionAttempt(req, res) {
  const { studentId, missionId, answers, timeSpentSeconds = 0 } = req.body ?? {};
  if (!answers || typeof answers !== 'object') throw httpError(400, 'answers is required.');

  const student = await User.findById(toObjectId(studentId, 'studentId'));
  if (!student) throw httpError(404, 'Student not found.');
  if (student.role !== 'student') throw httpError(403, 'Only students can submit mission attempts.');

  const mission = await Mission.findById(toObjectId(missionId, 'missionId'));
  if (!mission) throw httpError(404, 'Mission not found.');
  const lesson = await Lesson.findById(mission.lessonId);
  const module = await Module.findById(lesson.moduleId);

  // Authoritative scoring, from the stored scenario rather than the request.
  const { score, isPassed, breakdown } = scoreMission({
    gameType: module.gameType,
    scenarioData: mission.scenarioData,
    answers,
  });

  // Replays only add the difference, so repeating a mission can't farm XP.
  const previousAttempts = await MissionAttempt.find({ studentId: student._id, missionId: mission._id });
  const xpEarned = calculateXpAward({
    maxXP: mission.maxXP,
    score,
    isPassed,
    previousAttempts: previousAttempts.map((a) => ({ score: a.score, xpEarned: a.xpEarned })),
  });

  const attempt = await MissionAttempt.create({
    studentId: student._id,
    missionId: mission._id,
    score,
    xpEarned,
    timeSpentSeconds: Math.max(0, Math.min(MAX_TIME_SECONDS, Math.round(Number(timeSpentSeconds) || 0))),
    isPassed,
    attemptedAt: new Date(),
  });

  /*
   * Lesson progress: completed once every level in the lesson has a passing
   * attempt, otherwise in-progress. Lock state is not written here — it stays
   * derived from prior-lesson completion on the client.
   */
  const levels = await Mission.find({ lessonId: lesson._id }, { _id: 1 });
  const passed = await MissionAttempt.distinct('missionId', {
    studentId: student._id,
    missionId: { $in: levels.map((l) => l._id) },
    isPassed: true,
  });
  const status = passed.length >= levels.length ? PROGRESS_STATUS.COMPLETED : PROGRESS_STATUS.IN_PROGRESS;
  await Progress.findOneAndUpdate(
    { studentId: student._id, lessonId: lesson._id },
    { $set: { status } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({
    attempt,
    score,
    isPassed,
    xpEarned,
    breakdown,
    lessonStatus: status,
    lessonId: lesson._id,
    moduleId: module._id,
  });
}
