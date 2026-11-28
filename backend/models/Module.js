import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A syllabus module. The seeded course has five, but instructors can add more
 * from the Manage Modules page, so nothing here assumes a count — only that
 * moduleNumber is unique and forms the 1..n order the unlock chain walks.
 *
 * gameType picks which mission game the module uses.
 */
export const GAME_TYPES = ['decision-making', 'identification', 'matching', 'drag-and-drop', 'strategy-management', 'inspection'];

const moduleSchema = new Schema(
  {
    moduleNumber: { type: Number, required: true, unique: true, min: 1 },
    title: { type: String, required: true, trim: true },
    gameType: { type: String, enum: GAME_TYPES, required: true },
    // Instructor-uploaded cover, stored as a data URL like avatars and lesson
    // media. Null falls back to the static file, then to a gradient.
    coverImage: { type: String, default: null },
    isSeedData: { type: Boolean, default: false },
  },
  { collection: 'modules', timestamps: true },
);

export default mongoose.model('Module', moduleSchema);
