/**
 * Lessons (syllabus topics) and their media assets.
 * Students read lessons; instructors create, edit and delete them.
 */
import { MAX_MOCK_UPLOAD_BYTES } from '../constants/rules.js';
import { getModuleLessons } from '../utils/curriculum.js';
import { isBlank } from '../utils/validation.js';
import { createId, db, request, ServiceError } from './mockDb.js';
import { renumberLessons, renumberModuleLevels } from './serviceContext.js';

const MEDIA_TYPES = ['image', 'video', 'animation'];

function requireLesson(lessonId) {
  const lesson = db.findById('lessons', lessonId);
  if (!lesson) throw new ServiceError('Lesson not found.', 404);
  return lesson;
}

export function listLessons(moduleId) {
  return request(() => (moduleId ? getModuleLessons(db.all('lessons'), moduleId) : db.all('lessons')));
}

/** Lesson with its module. */
export function getLesson(lessonId) {
  return request(() => {
    const lesson = requireLesson(lessonId);
    return { lesson, module: db.findById('modules', lesson.moduleId) };
  });
}

export function createLesson({ moduleId, title, contentBody = '' }) {
  return request(() => {
    if (!db.findById('modules', moduleId)) throw new ServiceError('Module not found.', 404);
    if (isBlank(title)) throw new ServiceError('Lesson title is required.');
    const lastNumber = Math.max(0, ...db.find('lessons', (l) => l.moduleId === moduleId).map((l) => l.lessonNumber));
    return db.insert('lessons', {
      moduleId,
      lessonNumber: lastNumber + 1,
      title: title.trim(),
      contentBody,
      mediaAssets: [],
    });
  });
}

export function updateLesson(lessonId, { title, contentBody }) {
  return request(() => {
    requireLesson(lessonId);
    const changes = {};
    if (title !== undefined) {
      if (isBlank(title)) throw new ServiceError('Lesson title is required.');
      changes.title = title.trim();
    }
    if (contentBody !== undefined) changes.contentBody = contentBody;
    return db.update('lessons', lessonId, changes);
  });
}

/**
 * Delete a lesson together with its missions, those missions' attempts and all
 * progress records for the lesson.
 */
export function deleteLesson(lessonId) {
  return request(() => {
    const lesson = requireLesson(lessonId);
    const missionIds = db.find('missions', (m) => m.lessonId === lessonId).map((m) => m._id);
    db.removeWhere('missionAttempts', (a) => missionIds.includes(a.missionId));
    db.removeWhere('missions', (m) => m.lessonId === lessonId);
    db.removeWhere('progress', (p) => p.lessonId === lessonId);
    db.remove('lessons', lessonId);
    renumberLessons(lesson.moduleId);
    renumberModuleLevels(lesson.moduleId);
    return { deleted: true, removedMissions: missionIds.length };
  });
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
 * Mock media upload: the file is stored as a data URL inside the lesson.
 * The real backend will store the file and return its URL instead.
 */
export function uploadMediaAsset(lessonId, file, { title, caption = '', type } = {}) {
  return request(async () => {
    requireLesson(lessonId);
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
    const lesson = requireLesson(lessonId);
    const asset = {
      assetId: createId('asset'),
      type: detectedType,
      title: isBlank(title) ? file.name : title.trim(),
      caption,
      url,
      placeholderKey: null,
    };
    db.update('lessons', lessonId, { mediaAssets: [...lesson.mediaAssets, asset] });
    return asset;
  });
}

export function updateMediaAsset(lessonId, assetId, { title, caption }) {
  return request(() => {
    const lesson = requireLesson(lessonId);
    if (!lesson.mediaAssets.some((asset) => asset.assetId === assetId)) {
      throw new ServiceError('Media asset not found.', 404);
    }
    const mediaAssets = lesson.mediaAssets.map((asset) =>
      asset.assetId === assetId
        ? { ...asset, ...(title !== undefined && { title }), ...(caption !== undefined && { caption }) }
        : asset,
    );
    return db.update('lessons', lessonId, { mediaAssets });
  });
}

export function removeMediaAsset(lessonId, assetId) {
  return request(() => {
    const lesson = requireLesson(lessonId);
    return db.update('lessons', lessonId, {
      mediaAssets: lesson.mediaAssets.filter((asset) => asset.assetId !== assetId),
    });
  });
}
