import mongoose from 'mongoose';
import { GAME_TYPES } from '../constants/gameTypes.js';

const { Schema } = mongoose;

/**
 * A mission level attached to a lesson.
 *
 * scenarioData is deliberately Mixed: each of the five game types stores a
 * genuinely different shape (decision scenarios, identification symptom spots,
 * matching columns, drag-and-drop targets, strategy tactics), so a strict
 * sub-schema would reject four of the five. Shape validation belongs to the
 * game logic, not the collection.
 */
const missionSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    levelNumber: { type: Number, required: true, min: 1 },
    maxXP: { type: Number, required: true, min: 0 },
    scenarioData: { type: Schema.Types.Mixed, required: true },
    // Null plays the module's game; a value lets one level use another game,
    // e.g. a decision scenario for a concept topic in a drag-and-drop module.
    gameType: { type: String, enum: [...Object.values(GAME_TYPES), null], default: null },
    isSeedData: { type: Boolean, default: false },
  },
  { collection: 'missions', timestamps: true },
);

missionSchema.index({ lessonId: 1, levelNumber: 1 }, { unique: true });

export default mongoose.model('Mission', missionSchema);
