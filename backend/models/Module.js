import mongoose from 'mongoose';

const { Schema } = mongoose;

/** The five fixed syllabus modules. gameType picks which mission game the module uses. */
export const GAME_TYPES = ['decision-making', 'identification', 'matching', 'drag-and-drop', 'strategy-management'];

const moduleSchema = new Schema(
  {
    moduleNumber: { type: Number, required: true, unique: true, min: 1 },
    title: { type: String, required: true, trim: true },
    gameType: { type: String, enum: GAME_TYPES, required: true },
    isSeedData: { type: Boolean, default: false },
  },
  { collection: 'modules', timestamps: true },
);

export default mongoose.model('Module', moduleSchema);
