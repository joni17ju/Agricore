import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Accounts for all three roles. Nothing derived is stored here: totalXP,
 * level, streak and rank are all computed from missionAttempts at query time.
 */
const userSchema = new Schema(
  {
    role: { type: String, enum: ['student', 'instructor', 'admin'], required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Replaced with a real bcrypt hash in Phase 4; seeded rows carry a placeholder.
    passwordHash: { type: String, required: true },
    schoolId: { type: String, default: null },
    // Students belong to one section; instructors are assigned many.
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', default: null },
    assignedSectionIds: [{ type: Schema.Types.ObjectId, ref: 'Section' }],
    status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
    earnedBadges: [{ _id: false, code: { type: String, required: true }, earnedAt: { type: Date, required: true } }],
    // Set only once the user uploads a picture (a data URL in the prototype).
    avatarUrl: { type: String, default: null },
    /*
     * In-flight password reset. Embedded rather than given its own collection
     * so the seven-collection schema stays as it is: at most one reset can be
     * open per account, so there is nothing here a subdocument cannot hold.
     *
     * codeHash is a SHA-256 of the six digits, never the digits themselves, so
     * a dump of this collection hands an attacker nothing usable. The counters
     * drive rate limiting and live in the database rather than in process
     * memory, so the limits survive a restart.
     */
    passwordReset: {
      type: new Schema(
        {
          codeHash: { type: String, default: null },
          expiresAt: { type: Date, default: null },
          // Wrong guesses against the code currently outstanding.
          attemptCount: { type: Number, default: 0 },
          // Codes sent inside the current rate-limit window.
          requestCount: { type: Number, default: 0 },
          windowStartedAt: { type: Date, default: null },
          // Set when the code is accepted. The new password is taken only
          // while this is present and the reset has not expired.
          verifiedAt: { type: Date, default: null },
        },
        { _id: false },
      ),
      default: null,
    },
    isSeedData: { type: Boolean, default: false },
  },
  { collection: 'users', timestamps: true },
);

/*
 * School IDs are unique, but only where one exists. A plain unique index would
 * treat every null as the same value and reject the second account without an
 * ID — instructors and admins may legitimately have none. The partial filter
 * constrains real strings only.
 */
userSchema.index(
  { schoolId: 1 },
  { unique: true, partialFilterExpression: { schoolId: { $type: 'string' } } },
);

export default mongoose.model('User', userSchema);
