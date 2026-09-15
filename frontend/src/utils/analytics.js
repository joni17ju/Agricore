/**
 * Instructor/admin analytics derived from attempts and progress.
 * All functions are pure and take already-loaded records.
 */
import { MASTERY_BANDS, PERFORMANCE_RULES, PERFORMANCE_STATUS } from '../constants/rules.js';
import { countCompletedLessons, isQuiz } from './curriculum.js';
import {
  calculateLevel,
  calculateStreak,
  calculateTotalXP,
  daysSince,
  getBestAttemptsByMission,
  getLastActiveAt,
} from './gamification.js';

export function average(values) {
  const valid = values.filter((value) => typeof value === 'number' && !Number.isNaN(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

const roundOrNull = (value) => (value === null ? null : Math.round(value));

export function getMasteryBand(score) {
  if (score === null) return null;
  return MASTERY_BANDS.find((band) => score >= band.min);
}

/**
 * True when the average of the most recent attempts has fallen well below the
 * average of the student's earlier attempts.
 */
export function detectSuddenDrop(attempts) {
  const { suddenDropWindow, suddenDropPoints } = PERFORMANCE_RULES;
  if (attempts.length < suddenDropWindow * 2) return false;
  const ordered = [...attempts].sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));
  const recent = ordered.slice(-suddenDropWindow);
  const earlier = ordered.slice(0, -suddenDropWindow);
  return average(earlier.map((a) => a.score)) - average(recent.map((a) => a.score)) >= suddenDropPoints;
}

/**
 * Per-student metrics used by the dashboards, roster and performance pages.
 *
 * @param {object} input
 * @param {object[]} input.attempts  the student's attempts
 * @param {object[]} input.curriculum  buildStudentCurriculum result for the student
 * @param {Map<string, object>} input.missionsById
 * @param {Date} input.now
 */
export function computeStudentMetrics({ attempts, curriculum, missionsById, now = new Date() }) {
  const totalXP = calculateTotalXP(attempts);
  const totalLessons = curriculum.reduce((sum, entry) => sum + entry.totalLessons, 0);
  const completedLessons = countCompletedLessons(curriculum);
  const bestAttempts = [...getBestAttemptsByMission(attempts).values()];

  let weightedSum = 0;
  let weightTotal = 0;
  const lessonScores = new Map();
  for (const attempt of bestAttempts) {
    const mission = missionsById.get(attempt.missionId);
    if (!mission) continue;
    weightedSum += attempt.score * mission.maxXP;
    weightTotal += mission.maxXP;
    if (!isQuiz(mission)) {
      const scores = lessonScores.get(mission.lessonId) ?? [];
      scores.push(attempt.score);
      lessonScores.set(mission.lessonId, scores);
    }
  }

  let bestLesson = null;
  for (const [lessonId, scores] of lessonScores) {
    const score = Math.round(average(scores));
    if (!bestLesson || score > bestLesson.score) bestLesson = { lessonId, score };
  }

  const lastActiveAt = getLastActiveAt(attempts);

  return {
    totalXP,
    ...calculateLevel(totalXP),
    streak: calculateStreak(attempts, now),
    completedLessons,
    totalLessons,
    progressPercent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    averageBestScore: roundOrNull(average(bestAttempts.map((a) => a.score))),
    overallWeightedScore: weightTotal ? Math.round(weightedSum / weightTotal) : null,
    timeSpentSeconds: attempts.reduce((sum, attempt) => sum + attempt.timeSpentSeconds, 0),
    attemptsCount: attempts.length,
    lessonsAttempted: lessonScores.size,
    bestLesson,
    lastActiveAt,
    daysInactive: daysSince(lastActiveAt, now),
    hasSuddenDrop: detectSuddenDrop(attempts),
  };
}

/**
 * Status shown to instructors. Priority: At Risk → Sudden Drop → In Progress → On Track.
 */
export function determinePerformanceStatus(metrics, sectionAverageProgress) {
  const { inactiveDays, atRiskAverageScore, atRiskProgressRatio } = PERFORMANCE_RULES;
  const neverActive = metrics.attemptsCount === 0;
  const inactive = metrics.daysInactive !== null && metrics.daysInactive >= inactiveDays;
  const lowScores = metrics.averageBestScore !== null && metrics.averageBestScore < atRiskAverageScore;
  const farBehind = sectionAverageProgress > 0 && metrics.progressPercent < sectionAverageProgress * atRiskProgressRatio;

  if (neverActive || inactive || lowScores || farBehind) return PERFORMANCE_STATUS.AT_RISK;
  if (metrics.hasSuddenDrop) return PERFORMANCE_STATUS.SUDDEN_DROP;
  if (metrics.progressPercent < sectionAverageProgress) return PERFORMANCE_STATUS.IN_PROGRESS;
  return PERFORMANCE_STATUS.ON_TRACK;
}

/**
 * Average best score per lesson across a group of students (topic mastery heatmap).
 *
 * @param {object} input
 * @param {object[]} input.lessons
 * @param {object[]} input.missions
 * @param {object[]} input.attempts  attempts of the students in the group
 */
export function computeLessonMastery({ lessons, missions, attempts }) {
  const lessonByMission = new Map(
    missions.filter((mission) => !isQuiz(mission)).map((mission) => [mission._id, mission.lessonId]),
  );

  // Best score per student per mission, grouped by lesson.
  const bestByStudentMission = new Map();
  const firstAttempt = new Map();
  for (const attempt of attempts) {
    if (!lessonByMission.has(attempt.missionId)) continue;
    const key = `${attempt.studentId}|${attempt.missionId}`;
    const current = bestByStudentMission.get(key);
    if (!current || attempt.score > current.score) bestByStudentMission.set(key, attempt);
    const first = firstAttempt.get(key);
    if (!first || attempt.attemptedAt < first.attemptedAt) firstAttempt.set(key, attempt);
  }

  return lessons.map((lesson) => {
    const best = [...bestByStudentMission.values()].filter((a) => lessonByMission.get(a.missionId) === lesson._id);
    const firsts = [...firstAttempt.values()].filter((a) => lessonByMission.get(a.missionId) === lesson._id);
    const averageScore = roundOrNull(average(best.map((a) => a.score)));
    return {
      lessonId: lesson._id,
      moduleId: lesson.moduleId,
      lessonNumber: lesson.lessonNumber,
      title: lesson.title,
      averageScore,
      firstAttemptPassRate: firsts.length
        ? Math.round((firsts.filter((a) => a.isPassed).length / firsts.length) * 100)
        : null,
      studentsAttempted: new Set(best.map((a) => a.studentId)).size,
      band: getMasteryBand(averageScore),
    };
  });
}

/** Lessons with the lowest average scores ("Top Diagnostic Blindspots"). */
export function findBlindspots(lessonMastery, limit = 5) {
  return lessonMastery
    .filter((entry) => entry.averageScore !== null)
    .sort((a, b) => a.averageScore - b.averageScore || (a.firstAttemptPassRate ?? 0) - (b.firstAttemptPassRate ?? 0))
    .slice(0, limit);
}

/** Share of students (0–100) who have cleared each module. */
export function computeModuleCompletionRates(curricula) {
  if (curricula.length === 0) return [];
  return curricula[0].map((moduleEntry, index) => ({
    moduleId: moduleEntry.module._id,
    moduleNumber: moduleEntry.module.moduleNumber,
    title: moduleEntry.module.title,
    completionRate: Math.round((curricula.filter((c) => c[index].isCleared).length / curricula.length) * 100),
  }));
}
