/**
 * Curriculum ordering and the linear unlock rules (Proposal functional requirement:
 * "a linear, restricted module map that locks future content until all prior
 * module prerequisites are fully cleared").
 *
 * Rules
 * - Module 1 is open. Module N opens when Module N-1 is cleared.
 * - A module is cleared when all its lessons are completed AND its quiz is passed.
 * - Inside an open module, Lesson 1 is open; Lesson N opens when Lesson N-1 is completed.
 * - A lesson is completed when its progress record says so, or when every mission
 *   level of the lesson has a passed attempt.
 * - The module quiz opens once every lesson in the module is completed.
 */
import { MISSION_KINDS } from '../constants/gameTypes.js';
import { LESSON_STATE, PROGRESS_STATUS } from '../constants/rules.js';
import { getBestAttemptsByMission } from './gamification.js';

export const byNumber = (key) => (a, b) => a[key] - b[key];

export function sortModules(modules) {
  return [...modules].sort(byNumber('moduleNumber'));
}

export function getModuleLessons(lessons, moduleId) {
  return lessons.filter((lesson) => lesson.moduleId === moduleId).sort(byNumber('lessonNumber'));
}

export function isQuiz(mission) {
  return mission.scenarioData?.kind === MISSION_KINDS.QUIZ;
}

export function getLessonGameMissions(missions, lessonId) {
  return missions
    .filter((mission) => mission.lessonId === lessonId && !isQuiz(mission))
    .sort(byNumber('levelNumber'));
}

export function getModuleQuiz(missions, moduleLessons) {
  const lessonIds = new Set(moduleLessons.map((lesson) => lesson._id));
  return missions.find((mission) => isQuiz(mission) && lessonIds.has(mission.lessonId)) ?? null;
}

/** All game missions of a module in level order. */
export function getModuleGameMissions(missions, moduleLessons) {
  return moduleLessons.flatMap((lesson) => getLessonGameMissions(missions, lesson._id));
}

/**
 * Full curriculum tree for one student with computed lock/progress state.
 *
 * @param {object} input
 * @param {object[]} input.modules
 * @param {object[]} input.lessons
 * @param {object[]} input.missions
 * @param {object[]} input.attempts  this student's attempts
 * @param {object[]} input.progress  this student's progress records
 */
export function buildStudentCurriculum({ modules, lessons, missions, attempts, progress }) {
  const bestByMission = getBestAttemptsByMission(attempts);
  const passedMissionIds = new Set(attempts.filter((a) => a.isPassed).map((a) => a.missionId));
  const attemptedMissionIds = new Set(attempts.map((a) => a.missionId));
  const progressByLesson = new Map(progress.map((record) => [record.lessonId, record.status]));

  const describeMission = (mission) => ({
    mission,
    isPassed: passedMissionIds.has(mission._id),
    isAttempted: attemptedMissionIds.has(mission._id),
    bestScore: bestByMission.get(mission._id)?.score ?? null,
  });

  let previousModuleCleared = true;

  return sortModules(modules).map((module) => {
    const moduleLessons = getModuleLessons(lessons, module._id);
    const moduleUnlocked = previousModuleCleared;
    let previousLessonCompleted = true;

    const lessonEntries = moduleLessons.map((lesson) => {
      const levels = getLessonGameMissions(missions, lesson._id).map(describeMission);
      const passedLevels = levels.filter((level) => level.isPassed).length;
      const storedStatus = progressByLesson.get(lesson._id);
      const isCompleted =
        storedStatus === PROGRESS_STATUS.COMPLETED || (levels.length > 0 && passedLevels === levels.length);
      const isStarted = storedStatus === PROGRESS_STATUS.IN_PROGRESS || levels.some((level) => level.isAttempted);

      let state = LESSON_STATE.LOCKED;
      if (moduleUnlocked && previousLessonCompleted) {
        if (isCompleted) state = LESSON_STATE.COMPLETED;
        else if (isStarted) state = LESSON_STATE.IN_PROGRESS;
        else state = LESSON_STATE.AVAILABLE;
      }
      previousLessonCompleted = previousLessonCompleted && isCompleted;

      return { lesson, state, levels, passedLevels, totalLevels: levels.length };
    });

    const completedLessons = lessonEntries.filter((entry) => entry.state === LESSON_STATE.COMPLETED).length;
    const allLessonsCompleted = completedLessons === moduleLessons.length;

    const quizMission = getModuleQuiz(missions, moduleLessons);
    let quiz = null;
    if (quizMission) {
      quiz = describeMission(quizMission);
      if (!moduleUnlocked || !allLessonsCompleted) quiz.state = LESSON_STATE.LOCKED;
      else quiz.state = quiz.isPassed ? LESSON_STATE.COMPLETED : LESSON_STATE.AVAILABLE;
    }

    const isCleared = moduleUnlocked && allLessonsCompleted && (!quiz || quiz.isPassed);
    const totalLevels = lessonEntries.reduce((sum, entry) => sum + entry.totalLevels, 0);
    const passedLevels = lessonEntries.reduce((sum, entry) => sum + entry.passedLevels, 0);

    let state = LESSON_STATE.LOCKED;
    if (moduleUnlocked) {
      if (isCleared) state = LESSON_STATE.COMPLETED;
      else if (lessonEntries.some((entry) => entry.state !== LESSON_STATE.AVAILABLE)) state = LESSON_STATE.IN_PROGRESS;
      else state = LESSON_STATE.AVAILABLE;
    }
    previousModuleCleared = isCleared;

    return {
      module,
      state,
      isCleared,
      lessons: lessonEntries,
      quiz,
      completedLessons,
      totalLessons: moduleLessons.length,
      passedLevels,
      totalLevels,
      progressPercent: moduleLessons.length ? Math.round((completedLessons / moduleLessons.length) * 100) : 0,
    };
  });
}

/**
 * The next thing the student should do: the first unpassed mission level of the
 * first open lesson, or an open quiz. Returns null when everything is cleared.
 */
export function findNextStep(curriculum) {
  for (const moduleEntry of curriculum) {
    if (moduleEntry.state === LESSON_STATE.LOCKED || moduleEntry.isCleared) continue;
    for (const lessonEntry of moduleEntry.lessons) {
      if (lessonEntry.state === LESSON_STATE.AVAILABLE || lessonEntry.state === LESSON_STATE.IN_PROGRESS) {
        const level = lessonEntry.levels.find((item) => !item.isPassed);
        return { type: level ? 'mission' : 'lesson', module: moduleEntry.module, lesson: lessonEntry.lesson, mission: level?.mission ?? null };
      }
    }
    if (moduleEntry.quiz?.state === LESSON_STATE.AVAILABLE) {
      return { type: 'quiz', module: moduleEntry.module, lesson: null, mission: moduleEntry.quiz.mission };
    }
  }
  return null;
}

/** Whether the student may open a lesson or play a mission right now. */
export function canAccessMission(curriculum, missionId) {
  for (const moduleEntry of curriculum) {
    if (moduleEntry.quiz?.mission._id === missionId) return moduleEntry.quiz.state !== LESSON_STATE.LOCKED;
    for (const lessonEntry of moduleEntry.lessons) {
      if (lessonEntry.levels.some((level) => level.mission._id === missionId)) {
        return lessonEntry.state !== LESSON_STATE.LOCKED;
      }
    }
  }
  return false;
}

export function canAccessLesson(curriculum, lessonId) {
  for (const moduleEntry of curriculum) {
    const entry = moduleEntry.lessons.find((item) => item.lesson._id === lessonId);
    if (entry) return entry.state !== LESSON_STATE.LOCKED;
  }
  return false;
}

export function countCompletedLessons(curriculum) {
  return curriculum.reduce((sum, moduleEntry) => sum + moduleEntry.completedLessons, 0);
}
