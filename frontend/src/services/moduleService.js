/**
 * The five course modules. The module list is fixed by the syllabus
 * (Proposal Scope item 2), so modules can be read and renamed but never
 * created or deleted.
 */
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
 * Replace a module's cover image, or pass null to clear it and fall back to
 * the static file shipped with the app.
 *
 * Follows the same mock-upload approach as avatars and lesson media: the file
 * becomes a data URL on the document, with the shared size cap.
 */
export async function updateModuleCover(moduleId, file) {
  await requireModule(moduleId);

  let coverImage = null;
  if (file) {
    if (!file.type.startsWith('image/')) throw new ServiceError('Choose an image file (PNG, JPG or WebP).');
    if (file.size > MAX_MOCK_UPLOAD_BYTES) {
      const limitMb = (MAX_MOCK_UPLOAD_BYTES / 1024 / 1024).toFixed(1);
      throw new ServiceError(`Images must be ${limitMb} MB or smaller in the prototype.`, 413);
    }
    coverImage = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new ServiceError('The file could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  const updated = await api.patch(`/modules/${moduleId}`, { coverImage });
  invalidateCourse();
  return updated;
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
