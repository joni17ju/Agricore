/**
 * Curriculum ordering and the linear unlock rules (Proposal functional requirement:
 * "a linear, restricted module map that locks future content until all prior
 * module prerequisites are fully cleared").
 *
 * Rules
 * - Module 1 is open. Module N opens when Module N-1 is cleared.
 * - A module is cleared when all of its lessons are completed.
 * - Inside an open module, Lesson 1 is open; Lesson N opens when Lesson N-1 is completed.
 * - A lesson is completed when its progress record says so, or when every mission
 *   level of the lesson has a passed attempt.
 */
import { LESSON_STATE, PROGRESS_STATUS } from '../constants/rules.js';
import { getBestAttemptsByMission } from './gamification.js';

export const byNumber = (key) => (a, b) => a[key] - b[key];

export function sortModules(modules) {
  return [...modules].sort(byNumber('moduleNumber'));
}

export function getModuleLessons(lessons, moduleId) {
  return lessons.filter((lesson) => lesson.moduleId === moduleId).sort(byNumber('lessonNumber'));
}

export function getLessonGameMissions(missions, lessonId) {
  return missions
    .filter((mission) => mission.lessonId === lessonId)
    .sort(byNumber('levelNumber'));
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

    /*
     * A module with no lessons yet is not "cleared" — there is nothing in it
     * to clear, and counting it would inflate "n of m modules cleared" the
     * moment an instructor adds an empty module. This matches the server's
     * own findClearedModuleNumbers, which skips empty modules when awarding
     * the module badges.
     */
    const hasLessons = moduleLessons.length > 0;
    const isCleared = moduleUnlocked && hasLessons && allLessonsCompleted;
    const totalLevels = lessonEntries.reduce((sum, entry) => sum + entry.totalLevels, 0);
    const passedLevels = lessonEntries.reduce((sum, entry) => sum + entry.passedLevels, 0);

    let state = LESSON_STATE.LOCKED;
    if (moduleUnlocked) {
      if (isCleared) state = LESSON_STATE.COMPLETED;
      else if (lessonEntries.some((entry) => entry.state !== LESSON_STATE.AVAILABLE)) state = LESSON_STATE.IN_PROGRESS;
      else state = LESSON_STATE.AVAILABLE;
    }
    /*
     * An empty module cannot be a prerequisite either: treating it as unmet
     * would lock every module after it for good, with nothing a student could
     * do about it. It passes the chain through untouched instead.
     */
    previousModuleCleared = hasLessons ? isCleared : previousModuleCleared;

    return {
      module,
      state,
      isCleared,
      lessons: lessonEntries,
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
 * first open lesson. Returns null when everything is cleared.
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
  }
  return null;
}

/** Whether the student may open a lesson or play a mission right now. */
export function canAccessMission(curriculum, missionId) {
  for (const moduleEntry of curriculum) {
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

/**
 * What a student should do at the end of a lesson, from the curriculum the
 * unlock rules above already computed (nothing here changes those rules).
 *
 * Returns
 *   primary    the one main action: { kind, to, label, ariaLabel }
 *              kind 'mission' | 'lesson' | 'module' | 'dashboard' | 'module-page'
 *   secondary  an extra link, or null (the next topic while the mission is
 *              still open, when that topic is already unlocked)
 *   previous   { to, title, label } of the topic before, or null — the
 *              previous module's last topic for a module's first topic
 *   note       one sentence explaining what unlocks what, or null
 *   isCourseComplete  true on the last topic once every module is cleared
 *
 * Never returns a disabled or dead action: when the way forward is locked it
 * points at the mission (or the module page) and the note says what unlocks it.
 * Returns null when the lesson is not in the curriculum.
 */
export function lessonNextStep(curriculum, lessonId) {
  const modules = curriculum.filter((entry) => entry.lessons.length > 0);
  const moduleIndex = modules.findIndex((entry) => entry.lessons.some((item) => String(item.lesson._id) === String(lessonId)));
  if (moduleIndex === -1) return null;

  const moduleEntry = modules[moduleIndex];
  const { module } = moduleEntry;
  const lessonIndex = moduleEntry.lessons.findIndex((item) => String(item.lesson._id) === String(lessonId));
  const lessonEntry = moduleEntry.lessons[lessonIndex];
  const nextLessonEntry = moduleEntry.lessons[lessonIndex + 1] ?? null;
  const nextModuleEntry = modules[moduleIndex + 1] ?? null;
  const previousModuleEntry = modules[moduleIndex - 1] ?? null;

  const lessonPath = (lesson) => `/student/lessons/${lesson._id}`;
  const isOpen = (entry) => Boolean(entry) && entry.state !== LESSON_STATE.LOCKED;
  const topicLabel = (lesson) => `Next topic: ${lesson.title}`;
  const moduleLabel = (entry) => `Module ${entry.module.moduleNumber}: ${entry.module.title}`;

  // Previous: the topic before in this module, else the previous module's last topic.
  const previousEntry = lessonIndex > 0 ? moduleEntry.lessons[lessonIndex - 1] : previousModuleEntry?.lessons.at(-1) ?? null;
  const previous = isOpen(previousEntry)
    ? { to: lessonPath(previousEntry.lesson), title: previousEntry.lesson.title, label: lessonIndex > 0 ? 'Previous topic' : `Previous module · Module ${previousModuleEntry.module.moduleNumber}` }
    : null;

  const openLevel = lessonEntry.levels.find((level) => !level.isPassed) ?? null;
  const isCompleted = lessonEntry.state === LESSON_STATE.COMPLETED;
  const result = { primary: null, secondary: null, previous, note: null, isCourseComplete: false };

  // 0. A locked lesson (normally never shown): point back to its module.
  if (lessonEntry.state === LESSON_STATE.LOCKED) {
    result.primary = { kind: 'module-page', to: `/student/modules/${module._id}`, label: `Back to Module ${module.moduleNumber}`, ariaLabel: `Back to ${moduleLabel(moduleEntry)}` };
    result.note = 'This topic opens once the topics before it are cleared.';
    return result;
  }

  // 1. The lesson still has a mission to clear: that is the main action.
  if (!isCompleted && openLevel) {
    result.primary = {
      kind: 'mission',
      to: `/student/missions/${openLevel.mission._id}/play`,
      label: 'Take the mission',
      ariaLabel: `Take the mission: ${openLevel.mission.scenarioData?.title ?? lessonEntry.lesson.title}`,
    };
    if (nextLessonEntry && isOpen(nextLessonEntry)) {
      result.secondary = { to: lessonPath(nextLessonEntry.lesson), label: topicLabel(nextLessonEntry.lesson), ariaLabel: topicLabel(nextLessonEntry.lesson) };
    } else if (nextLessonEntry) {
      result.note = `Clear this mission to unlock the next topic, ${nextLessonEntry.lesson.title}.`;
    } else if (nextModuleEntry && !isOpen(nextModuleEntry)) {
      result.note = `Clear this mission to unlock Module ${nextModuleEntry.module.moduleNumber}: ${nextModuleEntry.module.title}.`;
    } else if (!nextModuleEntry) {
      result.note = 'Clear this mission to finish the course.';
    }
    return result;
  }

  // 2. Not completed and no mission at all: it cannot be cleared by the student.
  if (!isCompleted && !openLevel) {
    if (nextLessonEntry && isOpen(nextLessonEntry)) {
      result.primary = { kind: 'lesson', to: lessonPath(nextLessonEntry.lesson), label: topicLabel(nextLessonEntry.lesson), ariaLabel: topicLabel(nextLessonEntry.lesson) };
    } else {
      result.primary = { kind: 'module-page', to: `/student/modules/${module._id}`, label: `Back to Module ${module.moduleNumber}`, ariaLabel: `Back to ${moduleLabel(moduleEntry)}` };
      result.note = 'This topic has no mission yet, so the topics after it stay locked. Your instructor needs to add one.';
    }
    return result;
  }

  // 3. Completed, and another topic follows in this module.
  if (nextLessonEntry) {
    if (isOpen(nextLessonEntry)) {
      result.primary = { kind: 'lesson', to: lessonPath(nextLessonEntry.lesson), label: topicLabel(nextLessonEntry.lesson), ariaLabel: topicLabel(nextLessonEntry.lesson) };
    } else {
      result.primary = { kind: 'module-page', to: `/student/modules/${module._id}`, label: `Back to Module ${module.moduleNumber}`, ariaLabel: `Back to ${moduleLabel(moduleEntry)}` };
      result.note = `${nextLessonEntry.lesson.title} opens once every topic before it is cleared.`;
    }
    return result;
  }

  // 4. Completed, last topic of the module, and a module follows.
  if (nextModuleEntry) {
    if (isOpen(nextModuleEntry)) {
      const first = nextModuleEntry.lessons[0];
      const label = `Continue to ${moduleLabel(nextModuleEntry)}`;
      result.primary = { kind: 'module', to: lessonPath(first.lesson), label, ariaLabel: `${label}, first topic: ${first.lesson.title}` };
    } else {
      result.primary = { kind: 'module-page', to: `/student/modules/${module._id}`, label: `Back to Module ${module.moduleNumber}`, ariaLabel: `Back to ${moduleLabel(moduleEntry)}` };
      result.note = `Clear every topic in Module ${module.moduleNumber} to unlock Module ${nextModuleEntry.module.moduleNumber}: ${nextModuleEntry.module.title}.`;
    }
    return result;
  }

  // 5. Completed, last topic of the last module.
  result.isCourseComplete = modules.every((entry) => entry.isCleared);
  result.primary = { kind: 'dashboard', to: '/student', label: 'Back to dashboard', ariaLabel: 'Back to dashboard' };
  result.note = result.isCourseComplete
    ? 'You have cleared every module of the course. Well done!'
    : 'This was the last topic. Clear the remaining topics to finish the course.';
  return result;
}

/**
 * The previous / next links in a student lesson's footer, from the curriculum
 * the unlock rules above already computed (the rules are unchanged).
 *
 *   next      the next topic when it is unlocked; on a module's last topic the
 *             next module's first topic ("Next module"); on the course's last
 *             topic the dashboard. A locked next module is still shown, muted,
 *             with a hint, and leads to what unlocks it (this topic's mission,
 *             or the module page) — never a dead link.
 *   previous  the topic before; on a module's first topic, the previous
 *             module's last topic when it is unlocked.
 *
 * Each link: { to, title, label, ariaLabel, muted?, hint? }. Returns
 * { previous: null, next: null } for a lesson that is not in the curriculum.
 */
export function lessonFooterLinks(curriculum, lessonId) {
  const modules = curriculum.filter((entry) => entry.lessons.length > 0);
  const moduleIndex = modules.findIndex((entry) => entry.lessons.some((item) => String(item.lesson._id) === String(lessonId)));
  if (moduleIndex === -1) return { previous: null, next: null };

  const moduleEntry = modules[moduleIndex];
  const lessonIndex = moduleEntry.lessons.findIndex((item) => String(item.lesson._id) === String(lessonId));
  const lessonEntry = moduleEntry.lessons[lessonIndex];
  const isOpen = (entry) => Boolean(entry) && entry.state !== LESSON_STATE.LOCKED;
  const lessonPath = (lesson) => `/student/lessons/${lesson._id}`;
  const moduleName = (entry) => `Module ${entry.module.moduleNumber}: ${entry.module.title}`;

  let previous = null;
  if (lessonIndex > 0) {
    const entry = moduleEntry.lessons[lessonIndex - 1];
    if (isOpen(entry)) previous = { to: lessonPath(entry.lesson), title: entry.lesson.title, label: 'Previous topic', ariaLabel: `Previous topic: ${entry.lesson.title}` };
  } else if (moduleIndex > 0) {
    const previousModule = modules[moduleIndex - 1];
    const entry = previousModule.lessons.at(-1);
    if (isOpen(entry)) {
      previous = { to: lessonPath(entry.lesson), title: moduleName(previousModule), label: 'Previous module', ariaLabel: `Previous module, ${moduleName(previousModule)}: last topic, ${entry.lesson.title}` };
    }
  }

  let next = null;
  const nextLesson = moduleEntry.lessons[lessonIndex + 1];
  const nextModule = modules[moduleIndex + 1];
  if (nextLesson) {
    if (isOpen(nextLesson)) next = { to: lessonPath(nextLesson.lesson), title: nextLesson.lesson.title, label: 'Next topic', ariaLabel: `Next topic: ${nextLesson.lesson.title}` };
  } else if (nextModule) {
    const first = nextModule.lessons[0];
    if (isOpen(nextModule) && isOpen(first)) {
      next = { to: lessonPath(first.lesson), title: moduleName(nextModule), label: 'Next module', ariaLabel: `Next module, ${moduleName(nextModule)}: first topic, ${first.lesson.title}` };
    } else {
      // Locked: shown muted, and it leads to what unlocks it.
      const openLevel = lessonEntry.levels.find((level) => !level.isPassed);
      next = openLevel
        ? { to: `/student/missions/${openLevel.mission._id}/play`, title: moduleName(nextModule), label: 'Next module', muted: true, hint: 'Clear the mission to unlock this module', ariaLabel: `${moduleName(nextModule)} is locked. Clear the mission to unlock it: take the mission` }
        : { to: `/student/modules/${moduleEntry.module._id}`, title: moduleName(nextModule), label: 'Next module', muted: true, hint: 'Clear every topic in this module to unlock it', ariaLabel: `${moduleName(nextModule)} is locked. Clear every topic in Module ${moduleEntry.module.moduleNumber} to unlock it: go to the module` };
    }
  } else {
    next = { to: '/student', title: 'Dashboard', label: 'Back to dashboard', ariaLabel: 'Back to dashboard' };
  }

  return { previous, next };
}

export function countCompletedLessons(curriculum) {
  return curriculum.reduce((sum, moduleEntry) => sum + moduleEntry.completedLessons, 0);
}
