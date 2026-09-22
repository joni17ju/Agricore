import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Class sections (BSA 1-A, 1-B, 1-C). Enrolled students are found via users.sectionId. */
const sectionSchema = new Schema(
  {
    sectionName: { type: String, required: true, trim: true },
    instructorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isSeedData: { type: Boolean, default: false },
  },
  { collection: 'sections', timestamps: true },
);

export default mongoose.model('Section', sectionSchema);
