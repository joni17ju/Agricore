import { PROGRESS_STATUS } from '../constants/rules.js';
import { Lesson, Mission, MissionAttempt, Module, Progress, User } from '../models/index.js';
import { calculateXpAward } from '../utils/gamification.js';
import { detectAtRiskTransition, findClearedModuleNumbers, findNewBadges } from '../utils/awards.js';
import {
  notifyBadgesEarned,
  notifyMissionPassed,
  notifyModuleCleared,
  notifyStudentAtRisk,
} from '../utils/notify.js';
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

  /*
   * Awards and notifications.
   *
   * Badges are decided here, from stored attempts, rather than by the client.
   * They used to be evaluated in the browser and written back through
   * PATCH /api/users/:id, which meant a crafted request could grant itself any
   * badge; `earnedBadges` is no longer editable through that route.
   *
   * All of this runs after the attempt and progress are saved, and every step
   * is best-effort: the attempt has already been scored and recorded, so a
   * failure to award or notify must not turn a successful submission into an
   * error. Anything that goes wrong is logged and the response still carries
   * the score.
   */
  let newBadges = [];
  try {
    const attempts = await MissionAttempt.find({ studentId: student._id });
    const modules = await Module.find().select('_id moduleNumber title');
    const clearedModuleNumbers = await findClearedModuleNumbers(student._id, modules);

    // First pass of this mission: replays should not notify again.
    if (isPassed && !previousAttempts.some((a) => a.isPassed)) {
      await notifyMissionPassed(student, { mission, module, score, xpEarned });
    }

    // Module cleared, only on the attempt that completed it.
    const clearedBefore = new Set(
      await findClearedModuleNumbersBefore(student._id, modules, attempt._id),
    );
    for (const moduleNumber of clearedModuleNumbers) {
      if (clearedBefore.has(moduleNumber)) continue;
      const cleared = modules.find((m) => m.moduleNumber === moduleNumber);
      if (cleared) await notifyModuleCleared(student, cleared);
    }

    newBadges = await findNewBadges({ student, attempts, clearedModuleNumbers });
    if (newBadges.length > 0) {
      const earnedAt = new Date();
      await User.updateOne(
        { _id: student._id },
        { $push: { earnedBadges: { $each: newBadges.map((b) => ({ code: b.code, earnedAt })) } } },
      );
      await notifyBadgesEarned(student, newBadges);
    }

    // Instructors hear about a student crossing into at-risk, once.
    const atRisk = detectAtRiskTransition({ attempts, previousAttempts });
    if (atRisk) await notifyStudentAtRisk(student, atRisk);
  } catch (error) {
    console.error('[missionAttempt] awards/notifications failed', error.message);
  }

  res.status(201).json({
    attempt,
    score,
    isPassed,
    xpEarned,
    breakdown,
    lessonStatus: status,
    lessonId: lesson._id,
    moduleId: module._id,
    // The client shows an unlock animation for these; it no longer decides them.
    newBadges: newBadges.map((badge) => badge.code),
  });
}

/**
 * Which modules were already cleared before the given attempt existed.
 *
 * Used to tell "you have just cleared this module" from "you replayed a
 * mission in a module you cleared last week".
 */
async function findClearedModuleNumbersBefore(studentId, modules, excludeAttemptId) {
  const passedIds = new Set(
    (
      await MissionAttempt.distinct('missionId', {
        studentId,
        isPassed: true,
        _id: { $ne: excludeAttemptId },
      })
    ).map(String),
  );
  if (passedIds.size === 0) return [];

  const cleared = [];
  for (const module of modules) {
    const lessons = await Lesson.find({ moduleId: module._id }, { _id: 1 });
    if (lessons.length === 0) continue;
    const missions = await Mission.find({ lessonId: { $in: lessons.map((l) => l._id) } }, { _id: 1 });
    if (missions.length === 0) continue;
    if (missions.every((m) => passedIds.has(String(m._id)))) cleared.push(module.moduleNumber);
  }
  return cleared;
}
