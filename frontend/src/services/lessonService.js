/**
 * Lessons (syllabus topics) and their media assets.
 * Students read lessons; instructors create, edit and delete them.
 *
 * Renumbering after a delete now happens server-side in the lessons and
 * missions controllers, so the old local renumber helpers are gone.
 */
import { MAX_MOCK_UPLOAD_BYTES } from '../constants/rules.js';
import { getModuleLessons } from '../utils/curriculum.js';
import { isBlank } from '../utils/validation.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';
import { getCourse, invalidateCourse } from './serviceContext.js';

const MEDIA_TYPES = ['image', 'video', 'animation'];

async function requireLesson(lessonId) {
  const { lessonsById } = await getCourse();
  const lesson = lessonsById.get(String(lessonId));
  if (!lesson) throw new ServiceError('Lesson not found.', 404);
  return lesson;
}

export async function listLessons(moduleId) {
  const { lessons } = await getCourse();
  return moduleId ? getModuleLessons(lessons, moduleId) : lessons;
}

/** Lesson with its module. */
export async function getLesson(lessonId) {
  const { lessonsById, modulesById } = await getCourse();
  const lesson = lessonsById.get(String(lessonId));
  if (!lesson) throw new ServiceError('Lesson not found.', 404);
  return { lesson, module: modulesById.get(String(lesson.moduleId)) ?? null };
}

export async function createLesson({ moduleId, title, contentBody = '' }) {
  if (isBlank(title)) throw new ServiceError('Lesson title is required.');
  const { modulesById } = await getCourse();
  if (!modulesById.get(String(moduleId))) throw new ServiceError('Module not found.', 404);
  // The server assigns lessonNumber from the module's current last lesson.
  const lesson = await api.post('/lessons', { moduleId, title: title.trim(), contentBody });
  invalidateCourse();
  return lesson;
}

export async function updateLesson(lessonId, { title, contentBody }) {
  const changes = {};
  if (title !== undefined) {
    if (isBlank(title)) throw new ServiceError('Lesson title is required.');
    changes.title = title.trim();
  }
  if (contentBody !== undefined) changes.contentBody = contentBody;
  const lesson = await api.patch(`/lessons/${lessonId}`, changes);
  invalidateCourse();
  return lesson;
}

/**
 * Reorder a module's lessons. `lessonIds` is the full list in its new order;
 * the server assigns lessonNumber 1..n to match.
 */
export async function reorderLessons(moduleId, lessonIds) {
  const lessons = await api.patch('/lessons/reorder', { moduleId, lessonIds });
  invalidateCourse();
  return lessons;
}

/**
 * Delete a lesson together with its missions and the progress records for it.
 * The server removes the dependants and renumbers what remains.
 */
export async function deleteLesson(lessonId) {
  const result = await api.del(`/lessons/${lessonId}`);
  invalidateCourse();
  return result;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ServiceError('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Media upload, still stored as a data URL on the lesson document — the media
 * assets array is part of the approved lessons shape. A real file store would
 * replace the data URL with a hosted URL without changing this signature.
 */
export async function uploadMediaAsset(lessonId, file, { title, caption = '', type } = {}) {
  const lesson = await requireLesson(lessonId);
  if (!file) throw new ServiceError('Choose a file to upload.');
  const detectedType = type ?? (file.type.startsWith('video/') ? 'video' : 'image');
  if (!MEDIA_TYPES.includes(detectedType)) throw new ServiceError('Unsupported media type.');
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    throw new ServiceError('Upload an image or video file.');
  }
  if (file.size > MAX_MOCK_UPLOAD_BYTES) {
    const limitMb = (MAX_MOCK_UPLOAD_BYTES / 1024 / 1024).toFixed(1);
    throw new ServiceError(`Files must be ${limitMb} MB or smaller in the prototype.`, 413);
  }

  const url = await readFileAsDataUrl(file);
  const asset = {
    // Local id: media assets are sub-documents, so the server does not mint one.
    assetId: `asset_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    type: detectedType,
    title: isBlank(title) ? file.name : title.trim(),
    caption,
    url,
    placeholderKey: null,
  };
  await api.patch(`/lessons/${lessonId}`, { mediaAssets: [...(lesson.mediaAssets ?? []), asset] });
  invalidateCourse();
  return asset;
}

export async function updateMediaAsset(lessonId, assetId, { title, caption }) {
  const lesson = await requireLesson(lessonId);
  if (!(lesson.mediaAssets ?? []).some((asset) => asset.assetId === assetId)) {
    throw new ServiceError('Media asset not found.', 404);
  }
  const mediaAssets = lesson.mediaAssets.map((asset) =>
    asset.assetId === assetId
      ? { ...asset, ...(title !== undefined && { title }), ...(caption !== undefined && { caption }) }
      : asset,
  );
  const updated = await api.patch(`/lessons/${lessonId}`, { mediaAssets });
  invalidateCourse();
  return updated;
}

export async function removeMediaAsset(lessonId, assetId) {
  const lesson = await requireLesson(lessonId);
  const updated = await api.patch(`/lessons/${lessonId}`, {
    mediaAssets: (lesson.mediaAssets ?? []).filter((asset) => asset.assetId !== assetId),
  });
  invalidateCourse();
  return updated;
}
