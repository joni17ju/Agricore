/**
 * The course modules.
 *
 * The syllabus ships with five (Proposal Scope item 2), but an instructor can
 * add further modules and delete ones that are still empty, so nothing here
 * assumes a fixed count.
 */
import { GAME_TYPES } from '../constants/gameTypes.js';
import { MAX_MOCK_UPLOAD_BYTES } from '../constants/rules.js';
import { isBlank } from '../utils/validation.js';
import { getLessonGameMissions, getModuleLessons, sortModules } from '../utils/curriculum.js';
import { api } from './apiClient.js';
import { ServiceError } from './serviceError.js';
import { getCourse, invalidateCourse } from './serviceContext.js';

async function requireModule(moduleId) {
  const { modulesById } = await getCourse();
  const module = modulesById.get(String(moduleId));
  if (!module) throw new ServiceError('Module not found.', 404);
  return module;
}

export async function listModules() {
  const { modules } = await getCourse();
  return sortModules(modules);
}

export function getModule(moduleId) {
  return requireModule(moduleId);
}

export async function getModuleByNumber(moduleNumber) {
  const { modules } = await getCourse();
  const module = modules.find((m) => m.moduleNumber === Number(moduleNumber));
  if (!module) throw new ServiceError('Module not found.', 404);
  return module;
}

/** Instructors may rename a module. Its number and game type are fixed. */
export async function updateModuleTitle(moduleId, title) {
  if (isBlank(title)) throw new ServiceError('Module title is required.');
  await requireModule(moduleId);
  const updated = await api.patch(`/modules/${moduleId}`, { title: title.trim() });
  invalidateCourse();
  return updated;
}

/**
 * A chosen cover file as a data URL, or null for no file.
 *
 * Follows the same mock-upload approach as avatars and lesson media: the file
 * becomes a data URL on the document, with the shared size cap. Shared by the
 * create form and the cover editor so both reject the same files the same way.
 */
async function readCoverImage(file) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new ServiceError('Choose an image file (PNG, JPG or WebP).');
  if (file.size > MAX_MOCK_UPLOAD_BYTES) {
    const limitMb = (MAX_MOCK_UPLOAD_BYTES / 1024 / 1024).toFixed(1);
    throw new ServiceError(`Images must be ${limitMb} MB or smaller.`, 413);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ServiceError('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Replace a module's cover image, or pass null to clear it and fall back to
 * the static file shipped with the app.
 */
export async function updateModuleCover(moduleId, file) {
  await requireModule(moduleId);
  const updated = await api.patch(`/modules/${moduleId}`, { coverImage: await readCoverImage(file) });
  invalidateCourse();
  return updated;
}

/**
 * Add a module to the end of the course.
 *
 * The number is left to the server, which appends after the highest existing
 * one — the only ordering the linear unlock chain can read.
 */
export async function createModule({ title, gameType, coverFile = null }) {
  if (isBlank(title)) throw new ServiceError('Module title is required.');
  if (!Object.values(GAME_TYPES).includes(gameType)) throw new ServiceError('Choose a mission game type for this module.');

  const created = await api.post('/modules', {
    title: title.trim(),
    gameType,
    coverImage: await readCoverImage(coverFile),
  });
  invalidateCourse();
  return created;
}

/**
 * Delete a module that has no lessons.
 *
 * The lesson check is the server's to make — it owns the missions, attempts
 * and progress underneath — so this only turns its refusal into the message
 * the dialog shows.
 */
export async function deleteModule(moduleId) {
  await requireModule(moduleId);
  const result = await api.del(`/modules/${moduleId}`);
  invalidateCourse();
  return result;
}

/**
 * Module → lessons → mission levels tree for the instructor's
 * Curriculum Navigation panel (Proposal Fig 25).
 */
export async function getCourseStructure() {
  const { modules, lessons, missions } = await getCourse();
  return sortModules(modules).map((module) => {
    const moduleLessons = getModuleLessons(lessons, module._id);
    return {
      module,
      lessons: moduleLessons.map((lesson) => ({
        lesson,
        missions: getLessonGameMissions(missions, lesson._id),
      })),
    };
  });
}
