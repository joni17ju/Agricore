import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One recorded play of a mission. This is the raw material every derived
 * figure is computed from — totalXP, level, streak, best score, section
 * averages and the leaderboard ranking are all aggregated from these rows at
 * request time and never stored.
 *
 * Note the explicit collection name: Mongoose would otherwise pluralise
 * "MissionAttempt" to "missionattempts" and silently miss this collection.
 */
const missionAttemptSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    missionId: { type: Schema.Types.ObjectId, ref: 'Mission', required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    xpEarned: { type: Number, required: true, min: 0 },
    timeSpentSeconds: { type: Number, required: true, min: 0 },
    isPassed: { type: Boolean, required: true },
    attemptedAt: { type: Date, required: true, default: Date.now },
    isSeedData: { type: Boolean, default: false },
  },
  { collection: 'missionAttempts', timestamps: true },
);

// Leaderboard and performance queries read a student's attempts newest-first.
missionAttemptSchema.index({ studentId: 1, attemptedAt: -1 });

export default mongoose.model('MissionAttempt', missionAttemptSchema);
