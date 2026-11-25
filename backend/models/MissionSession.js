import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One started play of a mission level: the "attempt id" a submission must
 * carry.
 *
 * Kept in its own collection rather than as unfinished rows in
 * missionAttempts, because every figure in the app (XP, levels, streaks, the
 * leaderboard, instructor analytics) is summed from missionAttempts and must
 * never see a play that has not finished. A missionAttempts row is written
 * only when a session is submitted, and it links back through `sessionId`.
 *
 * Lifecycle:  in_progress → submitting → submitted
 *                         ↘ replaced   (the student started again elsewhere)
 *                         ↘ failed     (the submission errored; start again)
 *
 * `isActive` is true only while in_progress or submitting. The partial unique
 * index on it means a student can hold at most ONE active session per mission
 * level, enforced by the database rather than by a check-then-write that two
 * tabs could race past.
 */
export const SESSION_STATUS = Object.freeze({
  IN_PROGRESS: 'in_progress',
  SUBMITTING: 'submitting',
  SUBMITTED: 'submitted',
  REPLACED: 'replaced',
  FAILED: 'failed',
});

const missionSessionSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    missionId: { type: Schema.Types.ObjectId, ref: 'Mission', required: true },
    status: { type: String, enum: Object.values(SESSION_STATUS), required: true, default: SESSION_STATUS.IN_PROGRESS },
    isActive: { type: Boolean, default: true },
    startedAt: { type: Date, required: true, default: Date.now },
    submittingAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    // The recorded attempt, once submitted.
    attemptId: { type: Schema.Types.ObjectId, ref: 'MissionAttempt', default: null },
    // The session that took over, when this one was replaced.
    replacedBy: { type: Schema.Types.ObjectId, default: null },
  },
  { collection: 'missionSessions', timestamps: true },
);

missionSessionSchema.index(
  { studentId: 1, missionId: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: 'one_active_session_per_mission' },
);

export default mongoose.model('MissionSession', missionSessionSchema);
