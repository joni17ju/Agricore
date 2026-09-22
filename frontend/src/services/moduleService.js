/**
 * The five course modules. The module list is fixed by the syllabus
 * (Proposal Scope item 2), so modules can be read and renamed but never
 * created or deleted.
 */
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
