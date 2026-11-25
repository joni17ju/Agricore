import mongoose from 'mongoose';
import { missionGameType } from '../constants/gameTypes.js';
import { PROGRESS_STATUS } from '../constants/rules.js';
import { Lesson, Mission, MissionAttempt, MissionSession, Module, Progress, SESSION_STATUS, User } from '../models/index.js';
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

/** Fewer seconds than this between starting and submitting is not a real play. */
export const MIN_PLAY_SECONDS = 3;

/** A started mission can be submitted for this long; after that, start again. */
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** A submission stuck in "submitting" this long (a crash mid-request) no longer blocks a new start. */
const STUCK_SUBMIT_MS = 2 * 60 * 1000;

/*
 * Submissions without an attempt id come from the app as it was before
 * mission sessions existed. They are still accepted for a short while after
 * this change ships, so a student with the old page open is not cut off
 * mid-mission, and refused afterwards (they are the path the duplicate-tab
 * exploit used). LEGACY_ATTEMPTS_UNTIL can move the date without a code change.
 */
const LEGACY_ATTEMPTS_UNTIL = Date.parse(process.env.LEGACY_ATTEMPTS_UNTIL ?? '2026-11-29T00:00:00+08:00');

function sessionError(status, code, message) {
  const error = httpError(status, message);
  error.code = code;
  return error;
}

const isDuplicateKey = (error) => error?.code === 11000;

/** GET /api/missionAttempts?studentId=...&missionId=... */
export async function listMissionAttempts(req, res) {
  const filter = {};
  if (req.query.studentId) filter.studentId = toObjectId(req.query.studentId, 'studentId');
  if (req.query.missionId) filter.missionId = toObjectId(req.query.missionId, 'missionId');
  res.json(await MissionAttempt.find(filter).sort({ attemptedAt: -1 }).lean());
}

/**
 * POST /api/missionAttempts/start  { missionId }
 *
 * Opens a play of one mission level and returns its server-generated
 * attemptId. A student holds at most one active play per level: starting
 * again (another tab, another browser, "Play again") replaces the earlier one,
 * so only the latest can be submitted.
 */
export async function startMissionAttempt(req, res) {
  if (req.user.role !== 'student') throw httpError(403, 'Only students can start missions.');
  const missionId = toObjectId(req.body?.missionId, 'missionId');
  if (!(await Mission.exists({ _id: missionId }))) throw httpError(404, 'Mission not found.');

  const studentId = req.user._id;
  const sessionId = new mongoose.Types.ObjectId();

  /*
   * Two starts racing can both clear the old session and then collide on the
   * one-active-session index. The loser clears the winner and tries again, so
   * whichever start lands last ends up as the active one.
   */
  for (let tries = 0; tries < 4; tries += 1) {
    const now = new Date();
    await MissionSession.updateMany(
      {
        studentId,
        missionId,
        isActive: true,
        $or: [
          { status: SESSION_STATUS.IN_PROGRESS },
          { status: SESSION_STATUS.SUBMITTING, submittingAt: { $lt: new Date(now.getTime() - STUCK_SUBMIT_MS) } },
        ],
      },
      { $set: { status: SESSION_STATUS.REPLACED, isActive: false, endedAt: now, replacedBy: sessionId } },
    );
    try {
      const session = await MissionSession.create({ _id: sessionId, studentId, missionId, startedAt: now });
      return res.status(201).json({
        attemptId: session._id,
        missionId,
        startedAt: session.startedAt,
        minSeconds: MIN_PLAY_SECONDS,
      });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      const submitting = await MissionSession.exists({
        studentId,
        missionId,
        isActive: true,
        status: SESSION_STATUS.SUBMITTING,
      });
      if (submitting) {
        throw sessionError(409, 'attempt_submitting', 'Your last try of this mission is still being scored. Please wait a moment and start again.');
      }
    }
  }
  throw sessionError(409, 'attempt_conflict', 'This mission is being started somewhere else. Please try again.');
}

/**
 * Claims a started session for submission, atomically.
 *
 * The single findOneAndUpdate on status is what makes a double click, a
 * resubmission or two tabs racing safe: only one request can move the session
 * from in_progress to submitting, and every other one is answered with an
 * error having recorded nothing. When the claim fails, the session is read
 * again only to say why.
 */
async function claimSession({ attemptId, studentId, missionId }) {
  if (!mongoose.isValidObjectId(attemptId)) throw sessionError(400, 'attempt_invalid', 'Invalid attempt id.');
  const now = Date.now();
  const claimed = await MissionSession.findOneAndUpdate(
    {
      _id: attemptId,
      studentId,
      missionId,
      status: SESSION_STATUS.IN_PROGRESS,
      startedAt: { $lte: new Date(now - MIN_PLAY_SECONDS * 1000), $gte: new Date(now - SESSION_MAX_AGE_MS) },
    },
    { $set: { status: SESSION_STATUS.SUBMITTING, submittingAt: new Date(now) } },
    { returnDocument: 'after' },
  );
  if (claimed) return claimed;

  const session = await MissionSession.findById(attemptId);
  if (!session) throw sessionError(404, 'attempt_invalid', 'This mission attempt was not found. Please start the mission again.');
  if (String(session.studentId) !== String(studentId)) {
    throw sessionError(403, 'attempt_forbidden', 'This mission attempt belongs to another account.');
  }
  if (String(session.missionId) !== String(missionId)) {
    throw sessionError(400, 'attempt_invalid', 'This attempt was started for a different mission.');
  }
  if (session.status === SESSION_STATUS.REPLACED) {
    throw sessionError(409, 'attempt_replaced', 'This mission was opened in another tab. Please continue there or restart.');
  }
  if (session.status === SESSION_STATUS.SUBMITTED || session.status === SESSION_STATUS.SUBMITTING) {
    throw sessionError(409, 'attempt_already_submitted', 'This attempt has already been submitted.');
  }
  if (session.status === SESSION_STATUS.FAILED) {
    throw sessionError(409, 'attempt_failed', 'This attempt could not be recorded. Please restart the mission.');
  }
  if (now - session.startedAt.getTime() > SESSION_MAX_AGE_MS) {
    throw sessionError(409, 'attempt_expired', 'This mission was started too long ago. Please restart it.');
  }
  throw sessionError(422, 'attempt_too_fast', 'That was too quick to be a real attempt. Take your time and submit again.');
}

/**
 * POST /api/missionAttempts
 * Body: { attemptId, studentId, missionId, answers, timeSpentSeconds }
 *
 * attemptId comes from POST /missionAttempts/start. With it, the session is
 * claimed atomically (see claimSession), the time spent is the server's own
 * measurement from the start, and the recorded attempt links back to the
 * session. Without it, the request is the pre-session app's and is accepted
 * only until LEGACY_ATTEMPTS_UNTIL.
 *
 * The client sends only what the student did — never the score. The server
 * re-scores those answers against the mission's own scenarioData using the
 * same rules the UI previews with, so a tampered request cannot award XP that
 * wasn't earned. score, xpEarned and isPassed in the request body are ignored.
 */
export async function createMissionAttempt(req, res) {
  const { attemptId, studentId, missionId, answers, timeSpentSeconds = 0 } = req.body ?? {};
  if (!answers || typeof answers !== 'object') throw httpError(400, 'answers is required.');

  const student = await User.findById(toObjectId(studentId, 'studentId'));
  if (!student) throw httpError(404, 'Student not found.');
  if (student.role !== 'student') throw httpError(403, 'Only students can submit mission attempts.');

  const mission = await Mission.findById(toObjectId(missionId, 'missionId'));
  if (!mission) throw httpError(404, 'Mission not found.');

  let session = null;
  if (attemptId !== undefined && attemptId !== null) {
    // A session belongs to the signed-in student; nobody submits for someone else.
    if (String(req.user._id) !== String(student._id)) {
      throw sessionError(403, 'attempt_forbidden', 'This mission attempt belongs to another account.');
    }
    session = await claimSession({ attemptId, studentId: student._id, missionId: mission._id });
  } else if (Date.now() >= LEGACY_ATTEMPTS_UNTIL) {
    throw sessionError(428, 'attempt_required', 'AgriCore has been updated. Please reload the page and start the mission again.');
  }

  try {
    return await recordAttempt(res, { student, mission, session, answers, timeSpentSeconds });
  } catch (error) {
    // Free the claim, so the student can simply start again.
    if (session) {
      await MissionSession.updateOne(
        { _id: session._id, status: SESSION_STATUS.SUBMITTING },
        { $set: { status: SESSION_STATUS.FAILED, isActive: false, endedAt: new Date() } },
      ).catch(() => {});
    }
    throw error;
  }
}

async function recordAttempt(res, { student, mission, session, answers: submittedAnswers, timeSpentSeconds }) {
  let answers = submittedAnswers;
  const lesson = await Lesson.findById(mission.lessonId);
  const module = await Module.findById(lesson.moduleId);

  /*
   * With a session, play time is the server's own measurement. The matching
   * game also reports the seconds left on its countdown, which earns a bonus;
   * that is capped at what the server's clock allows, so it cannot be inflated.
   */
  const elapsedSeconds = session
    ? (Date.now() - session.startedAt.getTime()) / 1000
    : Number(timeSpentSeconds) || 0;
  const limit = Number(mission.scenarioData?.timeLimitSeconds);
  if (session && Number.isFinite(limit) && limit > 0 && 'timeRemainingSeconds' in answers) {
    const allowed = Math.max(0, limit - elapsedSeconds + 2);
    answers = { ...answers, timeRemainingSeconds: Math.min(Number(answers.timeRemainingSeconds) || 0, allowed) };
  }

  // Authoritative scoring, from the stored scenario rather than the request.
  const { score, isPassed, breakdown } = scoreMission({
    gameType: missionGameType(module, mission),
    scenarioData: mission.scenarioData,
    answers,
  });

  // Replays only add the difference, so repeating a mission can't farm XP.
  const previousAttempts = await MissionAttempt.find({ studentId: student._id, missionId: mission._id });
  const xpEarned = calculateXpAward({
    maxXP: mission.maxXP,
    score,
    isPassed,
    /*
     * isPassed has to travel with each row: the award rule ignores failed
     * attempts, so dropping the flag made every previous attempt look failed,
     * the previous best fall to zero, and a replay pay out in full — which is
     * exactly the XP farming the rule exists to prevent.
     */
    previousAttempts: previousAttempts.map((a) => ({ score: a.score, isPassed: a.isPassed })),
  });

  const attempt = await MissionAttempt.create({
    studentId: student._id,
    missionId: mission._id,
    score,
    xpEarned,
    timeSpentSeconds: Math.max(0, Math.min(MAX_TIME_SECONDS, Math.round(elapsedSeconds))),
    isPassed,
    attemptedAt: new Date(),
    ...(session ? { sessionId: session._id } : {}),
  });

  if (session) {
    await MissionSession.updateOne(
      { _id: session._id },
      { $set: { status: SESSION_STATUS.SUBMITTED, isActive: false, endedAt: new Date(), attemptId: attempt._id } },
    );
  }

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
      await notifyMissionPassed(student, { mission, lesson, module, score, xpEarned });
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

  return res.status(201).json({
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
