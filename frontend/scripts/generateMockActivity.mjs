/**
 * Generates the mock `users`, `missionAttempts` and `progress` collections.
 *
 *   npm run seed
 *
 * The output is deterministic (seeded random numbers), so running it twice gives
 * the same files. Scores, XP awards, progress and badges are produced with the same
 * rule functions the app uses (src/utils), so the seed data always obeys the rules.
 *
 * Re-run this after changing lessons or missions so attempts reference valid ids.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import modules from '../src/data/modules.js';
import lessons from '../src/data/lessons.js';
import missions from '../src/data/missions.js';
import sections from '../src/data/sections.js';
import { MOCK_SEED_ANCHOR_DAY, PROGRESS_STATUS, LESSON_STATE } from '../src/constants/rules.js';
import { GAME_TYPES } from '../src/constants/gameTypes.js';
import {
  buildStudentCurriculum,
  getLessonGameMissions,
  getModuleLessons,
  sortModules,
} from '../src/utils/curriculum.js';
import { calculateXpAward, isPassingScore, rankStudentsByXP } from '../src/utils/gamification.js';
import { evaluateNewBadges } from '../src/utils/badgeRules.js';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');

// ───────────── deterministic random ─────────────
function mulberry32(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20260914);
const between = (min, max) => min + random() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));
const normal = (mean, deviation) => {
  const u = 1 - random();
  const v = random();
  return mean + deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// ───────────── people ─────────────
const staff = [
  {
    _id: 'usr_adm_mercado',
    role: 'admin',
    firstName: 'Liza',
    lastName: 'Mercado',
    email: 'l.mercado@dorsu.edu.ph',
    schoolId: 'ADM-2019-001',
    sectionId: null,
    assignedSectionIds: [],
    status: 'active',
    earnedBadges: [],
  },
  {
    _id: 'usr_ins_reyes',
    role: 'instructor',
    firstName: 'Carmela',
    lastName: 'Reyes',
    email: 'c.reyes@dorsu.edu.ph',
    schoolId: 'FAC-2012-014',
    sectionId: null,
    assignedSectionIds: ['sec_bsa1a', 'sec_bsa1b'],
    status: 'active',
    earnedBadges: [],
  },
  {
    _id: 'usr_ins_villanueva',
    role: 'instructor',
    firstName: 'Antonio',
    lastName: 'Villanueva',
    email: 'a.villanueva@dorsu.edu.ph',
    schoolId: 'FAC-2015-022',
    sectionId: null,
    assignedSectionIds: ['sec_bsa1c'],
    status: 'active',
    earnedBadges: [],
  },
  {
    _id: 'usr_ins_lim',
    role: 'instructor',
    firstName: 'Grace',
    lastName: 'Lim',
    email: 'g.lim@dorsu.edu.ph',
    schoolId: 'FAC-2024-031',
    sectionId: null,
    assignedSectionIds: [],
    status: 'pending',
    earnedBadges: [],
  },
];

/**
 * Student profiles.
 * steps: missions passed in curriculum order (27 total)
 * skill: typical score · activity: chance of studying on a given day
 * idle: days since last activity · extra: 'failNext' | 'suddenDrop'
 */
const students = [
  // BSA 1-A
  { id: 'juan', first: 'Juan', last: 'Dela Cruz', section: 'sec_bsa1a', steps: 16, skill: 84, activity: 0.55, idle: 0, streakDays: 5, extra: 'failNext' },
  { id: 'msantos', first: 'Maria', last: 'Santos', section: 'sec_bsa1a', steps: 21, skill: 93, activity: 0.7, idle: 0 },
  { id: 'rbautista', first: 'Rodolfo', last: 'Bautista', section: 'sec_bsa1a', steps: 19, skill: 88, activity: 0.6, idle: 1 },
  { id: 'areyes', first: 'Ana', last: 'Reyes', section: 'sec_bsa1a', steps: 15, skill: 82, activity: 0.5, idle: 2 },
  { id: 'bnavarro', first: 'Ben', last: 'Navarro', section: 'sec_bsa1a', steps: 14, skill: 86, activity: 0.5, idle: 0, extra: 'suddenDrop' },
  { id: 'asantos', first: 'Anya', last: 'Santos', section: 'sec_bsa1a', steps: 13, skill: 79, activity: 0.45, idle: 1 },
  { id: 'cmendoza', first: 'Carlo', last: 'Mendoza', section: 'sec_bsa1a', steps: 11, skill: 75, activity: 0.4, idle: 3 },
  { id: 'kramos', first: 'Kristine', last: 'Ramos', section: 'sec_bsa1a', steps: 12, skill: 85, activity: 0.4, idle: 2 },
  { id: 'mgarcia', first: 'Mark Anthony', last: 'Garcia', section: 'sec_bsa1a', steps: 8, skill: 68, activity: 0.35, idle: 4 },
  { id: 'jvillareal', first: 'Jessa', last: 'Villareal', section: 'sec_bsa1a', steps: 6, skill: 62, activity: 0.3, idle: 12 },
  { id: 'pcastillo', first: 'Paolo', last: 'Castillo', section: 'sec_bsa1a', steps: 10, skill: 73, activity: 0.4, idle: 2 },
  { id: 'rdomingo', first: 'Rhea', last: 'Domingo', section: 'sec_bsa1a', steps: 3, skill: 52, activity: 0.25, idle: 9, extra: 'failNext' },
  // BSA 1-B
  { id: 'mbautista', first: 'Maria', last: 'Bautista', section: 'sec_bsa1b', steps: 18, skill: 90, activity: 0.6, idle: 0 },
  { id: 'jflores', first: 'Joshua', last: 'Flores', section: 'sec_bsa1b', steps: 15, skill: 83, activity: 0.5, idle: 1 },
  { id: 'atorres', first: 'Angelica', last: 'Torres', section: 'sec_bsa1b', steps: 17, skill: 87, activity: 0.55, idle: 0 },
  { id: 'raquino', first: 'Renz', last: 'Aquino', section: 'sec_bsa1b', steps: 9, skill: 70, activity: 0.35, idle: 3 },
  { id: 'pcabrera', first: 'Princess', last: 'Cabrera', section: 'sec_bsa1b', steps: 12, skill: 80, activity: 0.45, idle: 1, extra: 'suddenDrop' },
  { id: 'ksalazar', first: 'Kevin', last: 'Salazar', section: 'sec_bsa1b', steps: 7, skill: 66, activity: 0.3, idle: 5 },
  { id: 'mgonzales', first: 'Mae Ann', last: 'Gonzales', section: 'sec_bsa1b', steps: 13, skill: 81, activity: 0.45, idle: 2 },
  { id: 'jpascual', first: 'Jerome', last: 'Pascual', section: 'sec_bsa1b', steps: 4, skill: 57, activity: 0.25, idle: 10, extra: 'failNext' },
  { id: 'cmorales', first: 'Clarisse', last: 'Morales', section: 'sec_bsa1b', steps: 11, skill: 77, activity: 0.4, idle: 2 },
  { id: 'vrivera', first: 'Vince', last: 'Rivera', section: 'sec_bsa1b', steps: 2, skill: 60, activity: 0.2, idle: 25, status: 'inactive' },
  // BSA 1-C
  { id: 'dlopez', first: 'Daniel', last: 'Lopez', section: 'sec_bsa1c', steps: 14, skill: 84, activity: 0.5, idle: 1 },
  { id: 'hmercado', first: 'Hazel', last: 'Mercado', section: 'sec_bsa1c', steps: 16, skill: 89, activity: 0.55, idle: 0 },
  { id: 'atan', first: 'Arnel', last: 'Tan', section: 'sec_bsa1c', steps: 10, skill: 74, activity: 0.4, idle: 2 },
  { id: 'lsoriano', first: 'Lorraine', last: 'Soriano', section: 'sec_bsa1c', steps: 12, skill: 82, activity: 0.45, idle: 1 },
  { id: 'jignacio', first: 'Jomar', last: 'Ignacio', section: 'sec_bsa1c', steps: 5, skill: 58, activity: 0.3, idle: 8 },
  { id: 'tvaldez', first: 'Trisha', last: 'Valdez', section: 'sec_bsa1c', steps: 9, skill: 76, activity: 0.35, idle: 3 },
  { id: 'nfernandez', first: 'Nikko', last: 'Fernandez', section: 'sec_bsa1c', steps: 11, skill: 72, activity: 0.4, idle: 2, extra: 'suddenDrop' },
  { id: 'smanalo', first: 'Shaira', last: 'Manalo', section: 'sec_bsa1c', steps: 0, skill: 70, activity: 0, idle: null },
];

// ───────────── curriculum order ─────────────
const moduleById = new Map(modules.map((m) => [m._id, m]));
const lessonById = new Map(lessons.map((l) => [l._id, l]));
const missionsById = new Map(missions.map((m) => [m._id, m]));

const orderedSteps = sortModules(modules).flatMap((module) =>
  getModuleLessons(lessons, module._id).flatMap((lesson) => getLessonGameMissions(missions, lesson._id)),
);

const gameTypeOf = (mission) => moduleById.get(lessonById.get(mission.lessonId).moduleId).gameType;

// ───────────── realistic score / time values ─────────────
const ALLOWED_SCORES = {
  [GAME_TYPES.MATCHING]: [0, 30, 60, 90, 100],
  [GAME_TYPES.DRAG_AND_DROP]: [0, 25, 50, 75, 100],
};
const DIFFICULTY = {
  [GAME_TYPES.DECISION_MAKING]: 2,
  [GAME_TYPES.IDENTIFICATION]: -3,
  [GAME_TYPES.MATCHING]: -5,
  [GAME_TYPES.DRAG_AND_DROP]: -4,
  [GAME_TYPES.STRATEGY_MANAGEMENT]: -6,
};

/** Topics students typically find harder, so instructor blindspot analytics have a signal. */
const LESSON_DIFFICULTY = {
  les_1_4: -10, // Economic Importance of Pests (EIL / ET)
  les_2_4: -14, // Disease Epidemiology
  les_2_5: -9, // Variability of Plant Pathogens
  les_3_2: -8, // Vertebrate Pests
  les_4_2: -11, // Classification of Weeds
};

function snapScore(mission, raw) {
  const clamped = Math.max(0, Math.min(100, raw));
  const allowed = ALLOWED_SCORES[gameTypeOf(mission)];
  if (!allowed) return Math.round(clamped / 5) * 5;
  return allowed.reduce((best, value) => (Math.abs(value - clamped) < Math.abs(best - clamped) ? value : best));
}

function timeSpent(mission, passed) {
  const limit = mission.scenarioData.timeLimitSeconds;
  if (limit) return passed ? Math.round(limit * between(0.3, 0.9)) : Math.round(limit * between(0.85, 1));
  const ranges = {
    [GAME_TYPES.DECISION_MAKING]: [60, 150],
    [GAME_TYPES.IDENTIFICATION]: [90, 260],
    [GAME_TYPES.STRATEGY_MANAGEMENT]: [120, 300],
  };
  const [min, max] = ranges[gameTypeOf(mission)];
  return intBetween(min, max);
}

// ───────────── dates ─────────────
const ANCHOR = new Date(`${MOCK_SEED_ANCHOR_DAY}T00:00:00+08:00`);
const SEMESTER_DAYS = 35; // day 0 = 5 weeks before the anchor day
const dayDate = (dayIndex) => new Date(ANCHOR.getTime() - (SEMESTER_DAYS - dayIndex) * 86400000);

function sessionDays(profile) {
  const lastDay = SEMESTER_DAYS - profile.idle;
  const days = new Set([lastDay]);
  const startDay = intBetween(0, 4);
  for (let day = startDay; day < lastDay; day += 1) {
    if (random() < profile.activity) days.add(day);
  }
  for (let i = 0; i < (profile.streakDays ?? 0); i += 1) days.add(lastDay - i);
  if (profile.streakDays) days.delete(lastDay - profile.streakDays); // make the streak exact
  return [...days].sort((a, b) => a - b);
}

function toIso(dayIndex, minuteOfDay) {
  const date = dayDate(dayIndex);
  return new Date(date.getTime() + minuteOfDay * 60000).toISOString();
}

// ───────────── generate ─────────────
const users = [...staff];
const missionAttempts = [];
const progress = [];
let attemptCounter = 0;
let progressCounter = 0;
const pad = (value, size) => String(value).padStart(size, '0');

for (const [index, profile] of students.entries()) {
  const studentId = `usr_stu_${pad(index + 1, 3)}`;
  const user = {
    _id: studentId,
    role: 'student',
    firstName: profile.first,
    lastName: profile.last,
    email: `${profile.first.split(' ')[0].toLowerCase()}.${profile.last.replace(/\s/g, '').toLowerCase()}@dorsu.edu.ph`,
    schoolId: `2023-${pad(101 + index, 4)}`,
    sectionId: profile.section,
    assignedSectionIds: [],
    status: profile.status ?? 'active',
    earnedBadges: [],
  };
  users.push(user);
  if (profile.steps === 0 && !profile.extra) continue;

  // 1. Plan attempts: [mission, score] in curriculum order.
  const planned = [];
  for (let step = 0; step < profile.steps; step += 1) {
    const mission = orderedSteps[step];
    const difficulty = DIFFICULTY[gameTypeOf(mission)] + (LESSON_DIFFICULTY[mission.lessonId] ?? 0);
    for (let tries = 0; tries < 3; tries += 1) {
      let score = snapScore(mission, normal(profile.skill + difficulty + tries * 8, 9));
      if (tries === 2 && !isPassingScore(score)) score = snapScore(mission, 72 + random() * 10);
      planned.push({ mission, score });
      if (isPassingScore(score)) break;
    }
  }
  const nextMission = orderedSteps[profile.steps];
  if (nextMission && profile.extra === 'failNext') {
    planned.push({ mission: nextMission, score: snapScore(nextMission, between(40, 62)) });
  }
  if (nextMission && profile.extra === 'suddenDrop') {
    for (let i = 0; i < 3; i += 1) planned.push({ mission: nextMission, score: snapScore(nextMission, between(30, 55)) });
  }

  // 2. Spread attempts over study days.
  // Streak students get one of their final attempts on each streak day.
  const days = sessionDays(profile);
  const streakDays = profile.streakDays ? days.slice(-profile.streakDays) : [];
  const tailCount = Math.min(streakDays.length, planned.length);
  const headItems = planned.slice(0, planned.length - tailCount);
  const headDays = days.slice(0, days.length - streakDays.length);
  const perDay = new Map();
  const addToDay = (dayIndex, item) => perDay.set(dayIndex, [...(perDay.get(dayIndex) ?? []), item]);
  headItems.forEach((item, i) => {
    const pool = headDays.length ? headDays : days;
    // Spread evenly from the first to the last study day.
    const position = headItems.length > 1 ? Math.round((i * (pool.length - 1)) / (headItems.length - 1)) : pool.length - 1;
    addToDay(pool[position], item);
  });
  planned.slice(planned.length - tailCount).forEach((item, i) => {
    addToDay(streakDays[streakDays.length - tailCount + i], item);
  });

  // 3. Materialize attempts chronologically with XP and badges.
  const studentAttempts = [];
  const earnedBadges = [];
  for (const [dayIndex, items] of [...perDay.entries()].sort((a, b) => a[0] - b[0])) {
    let minute = intBetween(8 * 60, 18 * 60);
    for (const { mission, score } of items) {
      const isPassed = isPassingScore(score);
      const attempt = {
        _id: `att_${pad(++attemptCounter, 5)}`,
        studentId,
        missionId: mission._id,
        score,
        xpEarned: calculateXpAward({
          maxXP: mission.maxXP,
          score,
          isPassed,
          previousAttempts: studentAttempts.filter((a) => a.missionId === mission._id),
        }),
        timeSpentSeconds: timeSpent(mission, isPassed),
        isPassed,
        attemptedAt: toIso(dayIndex, minute),
      };
      minute += Math.ceil(attempt.timeSpentSeconds / 60) + intBetween(2, 15);
      studentAttempts.push(attempt);

      const curriculum = buildStudentCurriculum({ modules, lessons, missions, attempts: studentAttempts, progress: [] });
      const newCodes = evaluateNewBadges({
        attempts: studentAttempts,
        curriculum,
        missionsById,
        earnedCodes: earnedBadges.map((b) => b.code),
        sectionRank: null,
        now: new Date(attempt.attemptedAt),
      });
      newCodes.forEach((code) => earnedBadges.push({ code, earnedAt: attempt.attemptedAt }));
    }
  }
  missionAttempts.push(...studentAttempts);
  user.earnedBadges = earnedBadges;

  // 4. Progress records: completed lessons + the lesson currently being studied.
  const curriculum = buildStudentCurriculum({ modules, lessons, missions, attempts: studentAttempts, progress: [] });
  for (const moduleEntry of curriculum) {
    for (const lessonEntry of moduleEntry.lessons) {
      const status =
        lessonEntry.state === LESSON_STATE.COMPLETED
          ? PROGRESS_STATUS.COMPLETED
          : lessonEntry.state === LESSON_STATE.IN_PROGRESS || lessonEntry.state === LESSON_STATE.AVAILABLE
            ? PROGRESS_STATUS.IN_PROGRESS
            : null;
      if (status) {
        progress.push({ _id: `prg_${pad(++progressCounter, 5)}`, studentId, lessonId: lessonEntry.lesson._id, status });
      }
    }
  }
}

// 5. "Top Grower" badges from the final section rankings.
for (const section of sections) {
  const sectionStudents = users.filter((u) => u.role === 'student' && u.sectionId === section._id);
  const ranking = rankStudentsByXP(sectionStudents, missionAttempts);
  for (const row of ranking) {
    const attempts = missionAttempts.filter((a) => a.studentId === row.student._id);
    if (attempts.length === 0) continue;
    const curriculum = buildStudentCurriculum({ modules, lessons, missions, attempts, progress: [] });
    const lastAt = attempts[attempts.length - 1].attemptedAt;
    const codes = evaluateNewBadges({
      attempts,
      curriculum,
      missionsById,
      earnedCodes: row.student.earnedBadges.map((b) => b.code),
      sectionRank: row.rank,
      now: new Date(lastAt),
    });
    codes.forEach((code) => row.student.earnedBadges.push({ code, earnedAt: lastAt }));
  }
}

// ───────────── write files ─────────────
const toJs = (value) => JSON.stringify(value).replace(/"(\w+)":/g, '$1: ').replace(/,(?=\w+: )/g, ', ');

function writeCollection(fileName, name, shape, records, note) {
  const body = records.map((record) => `  ${toJs(record)},`).join('\n');
  const content = `/**
 * Mock \`${name}\` collection.
 * Shape: ${shape}
 *
 * GENERATED by scripts/generateMockActivity.mjs — run \`npm run seed\` to regenerate.
 * ${note}
 */
const ${name} = [
${body}
];

export default ${name};
`;
  writeFileSync(join(DATA_DIR, fileName), content);
  console.log(`✓ ${fileName} (${records.length} records)`);
}

writeCollection(
  'users.js',
  'users',
  '{ _id, role, firstName, lastName, email, schoolId, sectionId, assignedSectionIds, status, earnedBadges: [{ code, earnedAt }] }',
  users,
  'Mock sign-in needs no password. Seeded dates are shifted to the current date by services/mockDb.js.',
);
writeCollection(
  'missionAttempts.js',
  'missionAttempts',
  '{ _id, studentId, missionId, score, xpEarned, timeSpentSeconds, isPassed, attemptedAt }',
  missionAttempts,
  'xpEarned is the XP newly awarded by that attempt (only improvements over a previous best count).',
);
writeCollection(
  'progress.js',
  'progress',
  "{ _id, studentId, lessonId, status: 'in-progress' | 'completed' }",
  progress,
  'Locked/available states are computed by utils/curriculum.js and never stored.',
);
