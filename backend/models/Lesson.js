import mongoose from 'mongoose';

const { Schema } = mongoose;

/** One uploaded or placeholder asset attached to a lesson. */
const mediaAssetSchema = new Schema(
  {
    assetId: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    title: { type: String, default: '' },
    caption: { type: String, default: '' },
    // Data URL in the prototype; a real file URL once uploads move to storage.
    url: { type: String, default: null },
    placeholderKey: { type: String, default: null },
  },
  { _id: false },
);

/** Syllabus topics within a module. contentBody is sanitised rich-text HTML. */
const lessonSchema = new Schema(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    lessonNumber: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    contentBody: { type: String, default: '' },
    mediaAssets: { type: [mediaAssetSchema], default: [] },
    isSeedData: { type: Boolean, default: false },
  },
  { collection: 'lessons', timestamps: true },
);

// Lessons are numbered within their module, not globally.
lessonSchema.index({ moduleId: 1, lessonNumber: 1 }, { unique: true });

export default mongoose.model('Lesson', lessonSchema);
