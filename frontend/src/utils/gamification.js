/**
 * Pure gamification calculations. Nothing here is stored — every value is
 * derived from `missionAttempts` so the same logic can move to the backend.
 */
import { ENVIRONMENTAL_GRADES, PASSING_SCORE, XP_PER_LEVEL } from '../constants/rules.js';
import { addDays, calendarDaysBetween, isWithinLastDays, toDayKey } from './dates.js';

export function isPassingScore(score) {
  return score >= PASSING_SCORE;
}

export function calculateTotalXP(attempts) {
  return attempts.reduce((sum, attempt) => sum + (attempt.xpEarned || 0), 0);
}

export function calculateLevel(totalXP) {
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXP % XP_PER_LEVEL;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
    progressPercent: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
  };
}

/** XP a score is worth on a mission, before considering previous attempts. */
export function xpForScore(maxXP, score) {
  return Math.round((maxXP * score) / 100);
}

/**
 * XP awarded for a new attempt. Only passed attempts earn XP, and replaying a
 * mission only awards the improvement over the student's previous best, so
 * totals cannot be farmed by repeating easy missions.
 */
export function calculateXpAward({ maxXP, score, isPassed, previousAttempts }) {
  if (!isPassed) return 0;
  const previousBestXP = previousAttempts
    .filter((attempt) => attempt.isPassed)
    .reduce((best, attempt) => Math.max(best, xpForScore(maxXP, attempt.score)), 0);
  return Math.max(0, xpForScore(maxXP, score) - previousBestXP);
}

/**
 * Consecutive days with at least one attempt, ending today — or yesterday, so a
 * streak is not shown as broken before the student has had a chance to play today.
 */
export function calculateStreak(attempts, now = new Date()) {
  const activeDays = new Set(attempts.map((attempt) => toDayKey(attempt.attemptedAt)));
  let cursor = new Date(now);
  if (!activeDays.has(toDayKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!activeDays.has(toDayKey(cursor))) return 0;
  }
  let streak = 0;
  while (activeDays.has(toDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Highest score among attempts, or null if there are none. */
export function getBestScore(attempts) {
  if (attempts.length === 0) return null;
  return Math.max(...attempts.map((attempt) => attempt.score));
}

/** Map of missionId → best attempt (highest score, earliest on ties). */
export function getBestAttemptsByMission(attempts) {
  const best = new Map();
  for (const attempt of attempts) {
    const current = best.get(attempt.missionId);
    if (!current || attempt.score > current.score) best.set(attempt.missionId, attempt);
  }
  return best;
}

export function getLastActiveAt(attempts) {
  if (attempts.length === 0) return null;
  return attempts.reduce(
    (latest, attempt) => (attempt.attemptedAt > latest ? attempt.attemptedAt : latest),
    attempts[0].attemptedAt,
  );
}

/** XP and attempt counts for each of the last 7 days (oldest first). */
export function calculateWeeklyActivity(attempts, now = new Date()) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(now, index - 6);
    return {
      dayKey: toDayKey(date),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      xp: 0,
      attempts: 0,
      isToday: index === 6,
    };
  });
  const byKey = new Map(days.map((day) => [day.dayKey, day]));
  for (const attempt of attempts) {
    if (!isWithinLastDays(attempt.attemptedAt, 7, now)) continue;
    const day = byKey.get(toDayKey(attempt.attemptedAt));
    if (day) {
      day.xp += attempt.xpEarned || 0;
      day.attempts += 1;
    }
  }
  return days;
}

/**
 * Rank students by XP. Students with equal XP share a rank (1, 2, 2, 4).
 *
 * @param {object[]} students user documents
 * @param {object[]} attempts attempts to count (already filtered by period/module)
 * @returns {{ student, xp, rank }[]}
 */
export function rankStudentsByXP(students, attempts) {
  const xpByStudent = new Map(students.map((student) => [student._id, 0]));
  for (const attempt of attempts) {
    if (xpByStudent.has(attempt.studentId)) {
      xpByStudent.set(attempt.studentId, xpByStudent.get(attempt.studentId) + (attempt.xpEarned || 0));
    }
  }

  const rows = students
    .map((student) => ({ student, xp: xpByStudent.get(student._id) }))
    .sort(
      (a, b) =>
        b.xp - a.xp ||
        a.student.lastName.localeCompare(b.student.lastName) ||
        a.student.firstName.localeCompare(b.student.firstName),
    );

  let previousXP = null;
  let previousRank = 0;
  return rows.map((row, index) => {
    const rank = row.xp === previousXP ? previousRank : index + 1;
    previousXP = row.xp;
    previousRank = rank;
    return { ...row, rank };
  });
}

export function getEnvironmentalGrade(score) {
  return ENVIRONMENTAL_GRADES.find((band) => score >= band.min).grade;
}

export function daysSince(value, now = new Date()) {
  return value ? calendarDaysBetween(value, now) : null;
}
