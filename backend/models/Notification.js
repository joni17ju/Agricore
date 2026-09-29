import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Per-user notification log — the eighth collection.
 *
 * The other seven deliberately store nothing derived: XP, levels, streaks and
 * leaderboard rank are all recomputed from missionAttempts at request time. A
 * notification is the opposite kind of thing. "You earned Crop Guardian on
 * Tuesday, and you have since read it" is a record of an event and of the
 * reader's response to it; there is no source to recompute it from, so it has
 * to be stored.
 *
 * It is a collection rather than an array on the user because it grows without
 * bound, and the user document is loaded on every authenticated request — a
 * long-running account would slowly make every call heavier. Marking all as
 * read would also become a full-document rewrite instead of one indexed update.
 */

export const NOTIFICATION_TYPES = Object.freeze({
  BADGE_EARNED: 'badge-earned',
  MISSION_PASSED: 'mission-passed',
  MODULE_CLEARED: 'module-cleared',
  STUDENT_AT_RISK: 'student-at-risk',
  STUDENT_JOINED: 'student-joined',
  ACCOUNT_APPROVED: 'account-approved',
  INSTRUCTOR_PENDING: 'instructor-pending',
});

const notificationSchema = new Schema(
  {
    // Recipient. Everything is scoped to this — a user can only ever read
    // or modify rows where this matches their own id.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    // In-app path the row links to, e.g. /student/achievements.
    link: { type: String, default: null },
    /*
     * Type-specific extras (badge code, missionId, studentId). Mixed because
     * the shape differs per type and nothing queries inside it — it is read
     * back whole by the client.
     */
    meta: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { collection: 'notifications', timestamps: true },
);

// The two queries this collection serves: a user's newest rows, and their
// unread count.
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);
