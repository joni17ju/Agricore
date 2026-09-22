import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A student's state on one lesson, as a single lifecycle:
 *   locked → unlocked → in-progress → completed
 *
 * All four values are valid, but only in-progress and completed are written
 * today. Lock state stays derived by the frontend's utils/curriculum.js from
 * prior-lesson completion, so it has one source of truth; locked/unlocked are
 * accepted here for when that logic deliberately moves server-side.
 */
export const PROGRESS_STATUSES = ['locked', 'unlocked', 'in-progress', 'completed'];

const progressSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    status: { type: String, enum: PROGRESS_STATUSES, required: true },
    isSeedData: { type: Boolean, default: false },
  },
  { collection: 'progress', timestamps: true },
);

// One progress row per student per lesson.
progressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });

export default mongoose.model('Progress', progressSchema);
