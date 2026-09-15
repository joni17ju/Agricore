/**
 * The five course modules. The module list is fixed by the syllabus
 * (Proposal Scope item 2), so modules can be read and renamed but never
 * created or deleted.
 */
import { isBlank } from '../utils/validation.js';
import { getLessonGameMissions, getModuleLessons, getModuleQuiz, sortModules } from '../utils/curriculum.js';
import { db, request, ServiceError } from './mockDb.js';
import { getCourse } from './serviceContext.js';

function requireModule(moduleId) {
  const module = db.findById('modules', moduleId);
  if (!module) throw new ServiceError('Module not found.', 404);
  return module;
}

export function listModules() {
  return request(() => sortModules(db.all('modules')));
}

export function getModule(moduleId) {
  return request(() => requireModule(moduleId));
}

export function getModuleByNumber(moduleNumber) {
  return request(() => {
    const module = db.findOne('modules', (m) => m.moduleNumber === Number(moduleNumber));
    if (!module) throw new ServiceError('Module not found.', 404);
    return module;
  });
}

/** Instructors may rename a module. Its number and game type are fixed. */
export function updateModuleTitle(moduleId, title) {
  return request(() => {
    requireModule(moduleId);
    if (isBlank(title)) throw new ServiceError('Module title is required.');
    return db.update('modules', moduleId, { title: title.trim() });
  });
}

/**
 * Module → lessons → mission levels tree for the instructor's
 * Curriculum Navigation panel (Proposal Fig 25).
 */
export function getCourseStructure() {
  return request(() => {
    const { modules, lessons, missions } = getCourse();
    return sortModules(modules).map((module) => {
      const moduleLessons = getModuleLessons(lessons, module._id);
      return {
        module,
        lessons: moduleLessons.map((lesson) => ({
          lesson,
          missions: getLessonGameMissions(missions, lesson._id),
        })),
        quiz: getModuleQuiz(missions, moduleLessons),
      };
    });
  });
}
