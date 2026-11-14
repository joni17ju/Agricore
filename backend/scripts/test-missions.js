/**
 * Mission write endpoints: validation, permissions and cleanup.
 *
 *  1. Every stored mission passes the validator (so tightening it broke nothing).
 *  2. Malformed scenarioData for each game type, bad Max XP and oversized
 *     content are refused with a 400 — and the mission is left untouched.
 *  3. Students get 403 on every mission write, and on attempt/progress lists
 *     that don't name them.
 *  4. Deleting a mission removes its attempts.
 *
 * Every record created here is deleted again; attempts made on the throwaway
 * mission go with it, which is part of what is being tested.
 *
 * Usage: node --env-file=.env scripts/test-missions.js [baseUrl]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Lesson, Mission, MissionAttempt, Module, Notification } from '../models/index.js';
import { validateScenario } from '../utils/missionValidation.js';

const BASE = process.argv[2] ?? 'http://localhost:5000/api';
const PASSWORD = 'agricore123';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};
async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}
const login = async (identifier) => (await call('/auth/login', { method: 'POST', body: { identifier, password: PASSWORD } })).data;
const clone = (value) => JSON.parse(JSON.stringify(value));

await mongoose.connect(process.env.MONGODB_URI);
const startedAt = new Date();

// ── 1. Stored missions all pass ──
console.log('Stored missions:');
const modules = await Module.find();
const lessons = await Lesson.find();
const moduleById = new Map(modules.map((m) => [String(m._id), m]));
const typeOfLesson = new Map(lessons.map((l) => [String(l._id), moduleById.get(String(l.moduleId)).gameType]));
const missions = await Mission.find().sort({ lessonId: 1, levelNumber: 1 });
const invalid = missions.filter((m) => validateScenario(typeOfLesson.get(String(m.lessonId)), m.scenarioData).errors.length > 0);
check(`all ${missions.length} stored missions pass validation`, invalid.length === 0, invalid.map((m) => m.scenarioData.title).join(', '));

const staff = await login('c.reyes@dorsu.edu.ph');
const student = await login('juan.delacruz@dorsu.edu.ph');
const byType = {};
for (const m of missions) byType[typeOfLesson.get(String(m.lessonId))] ??= m;

// ── 2. Malformed content is refused and leaves the mission untouched ──
console.log('\nMalformed content is refused:');
const cases = {
  'decision-making': [
    ['points above 100', (d) => { d.scenarios[0].choices[0].points = 150; }],
    ['scenarios not a list', (d) => { d.scenarios = 'many'; }],
    ['only two options', (d) => { d.scenarios[0].choices = d.scenarios[0].choices.slice(0, 2); }],
    ['missing data card (the game would crash)', (d) => { delete d.scenarios[0].dataVisual; }],
  ],
  identification: [
    ['spot outside the image', (d) => { d.symptomSpots[0].x = 500; }],
    ['no correct pathogen', (d) => { d.correctPathogenId = 'nope'; }],
    ['unsupported zoom', (d) => { d.minZoomToMark = 3; }],
    ['spot size not a number', (d) => { d.symptomSpots[0].radius = '7'; }],
  ],
  matching: [
    ['too few decoys', (d) => { d.columns[0].options = d.columns[0].options.slice(0, 2); }],
    ['no countdown', (d) => { delete d.timeLimitSeconds; }],
    ['countdown of 0', (d) => { d.timeLimitSeconds = 0; }],
    ['a column missing', (d) => { d.columns = d.columns.slice(0, 2); }],
  ],
  'drag-and-drop': [
    ['zone with a missing label', (d) => { d.targets[0].correctLabelId = 'nope'; }],
    ['two zones on one label', (d) => { d.targets[1].correctLabelId = d.targets[0].correctLabelId; }],
    ['zone off the image', (d) => { d.targets[0].y = -4; }],
  ],
  'strategy-management': [
    ['best tactics do not match the count', (d) => { d.bestTacticIds = d.bestTacticIds.slice(0, 1); }],
    ['unknown tactic category', (d) => { d.tactics[0].category = 'magic'; }],
    ['effectiveness above 100', (d) => { d.tactics[0].effectiveness = 1000; }],
    ['goal missing', (d) => { delete d.goals; }],
  ],
};
for (const [type, list] of Object.entries(cases)) {
  const mission = byType[type];
  const before = JSON.stringify((await Mission.findById(mission._id)).scenarioData);
  for (const [label, corrupt] of list) {
    const data = clone(mission.scenarioData);
    corrupt(data);
    const res = await call(`/missions/${mission._id}`, { method: 'PATCH', token: staff.token, body: { scenarioData: data } });
    check(`${type}: ${label} → 400 in plain words`, res.status === 400 && typeof res.data?.message === 'string' && !/SyntaxError|undefined|TypeError/.test(res.data.message), `${res.status} "${res.data?.message}"`);
  }
  const after = JSON.stringify((await Mission.findById(mission._id)).scenarioData);
  check(`${type}: the mission is unchanged after the refused saves`, after === before);
}

const any = byType['decision-making'];
const generic = [
  ['a title that is an object (would crash the game)', (d) => { d.title = { evil: true }; }],
  ['a 10,000-character title', (d) => { d.title = 'x'.repeat(10000); }],
  ['an oversized document (>200,000 characters)', (d) => { d.padding = 'x'.repeat(250000); }],
];
for (const [label, corrupt] of generic) {
  const data = clone(any.scenarioData);
  corrupt(data);
  const res = await call(`/missions/${any._id}`, { method: 'PATCH', token: staff.token, body: { scenarioData: data } });
  check(`${label} → 400`, res.status === 400 || res.status === 413, `${res.status} "${String(res.data?.message ?? '').slice(0, 70)}"`);
}
for (const bad of [1000, -5, 2.5, 'abc', null]) {
  const res = await call(`/missions/${any._id}`, { method: 'PATCH', token: staff.token, body: { maxXP: bad } });
  check(`maxXP ${JSON.stringify(bad)} → 400`, res.status === 400, `${res.status} "${res.data?.message}"`);
}
const allProblems = await call(`/missions/${any._id}`, { method: 'PATCH', token: staff.token, body: { scenarioData: { title: '' , scenarios: [] } } });
check('a 400 lists every problem, not just the first', Array.isArray(allProblems.data?.problems) && allProblems.data.problems.length >= 2, `${allProblems.data?.problems?.length} problems`);
const edges = [];
for (const value of [0, 500]) edges.push((await call(`/missions/${any._id}`, { method: 'PATCH', token: staff.token, body: { maxXP: value } })).status);
const restored = await call(`/missions/${any._id}`, { method: 'PATCH', token: staff.token, body: { maxXP: any.maxXP } });
check('Max XP 0 and 500 are accepted (bounds inclusive)', edges.every((s) => s === 200), edges.join(', '));
check('…and the original Max XP is put back', restored.status === 200 && restored.data.maxXP === any.maxXP);

// ── 3. Permissions ──
console.log('\nPermissions:');
const studentCreate = await call('/missions', { method: 'POST', token: student.token, body: { lessonId: any.lessonId, maxXP: 100, scenarioData: any.scenarioData } });
check('a student cannot create a mission (403)', studentCreate.status === 403, `${studentCreate.status}`);
const studentUpdate = await call(`/missions/${any._id}`, { method: 'PATCH', token: student.token, body: { maxXP: 500 } });
check('a student cannot edit a mission (403)', studentUpdate.status === 403, `${studentUpdate.status}`);
const studentDelete = await call(`/missions/${any._id}`, { method: 'DELETE', token: student.token });
check('a student cannot delete a mission (403)', studentDelete.status === 403, `${studentDelete.status}`);
check('…and nothing changed', (await Mission.findById(any._id)).maxXP === any.maxXP);
const noTarget = await call('/missionAttempts', { token: student.token });
check('a student listing attempts without naming themselves gets 403 (was: everyone\'s)', noTarget.status === 403, `${noTarget.status}`);
const noTargetProgress = await call('/progress', { token: student.token });
check('the same for progress', noTargetProgress.status === 403, `${noTargetProgress.status}`);
const own = await call(`/missionAttempts?studentId=${student.user._id}`, { token: student.token });
check('a student can still list their own attempts', own.status === 200 && Array.isArray(own.data), `${own.status}`);
const other = await call(`/missionAttempts?studentId=${staff.user._id}`, { token: student.token });
check('…but not someone else\'s', other.status === 403, `${other.status}`);
const staffAll = await call(`/missionAttempts?missionId=${any._id}`, { token: staff.token });
check('instructors can still list attempts by mission', staffAll.status === 200 && Array.isArray(staffAll.data), `${staffAll.status}`);

// ── 4. Create, play, delete: attempts go with the mission ──
console.log('\nDelete removes the mission\'s attempts:');
const created = await call('/missions', { method: 'POST', token: staff.token, body: { lessonId: String(any.lessonId), maxXP: 120, scenarioData: { ...clone(any.scenarioData), title: 'Throwaway test level' } } });
check('an instructor can create a valid mission', created.status === 201 && created.data.levelNumber > 1, `${created.status} level ${created.data?.levelNumber}`);
const throwaway = created.data;
try {
  const choices = Object.fromEntries(throwaway.scenarioData.scenarios.map((s) => [s.id, [...s.choices].sort((a, b) => b.points - a.points)[0].id]));
  const played = await call('/missionAttempts', { method: 'POST', token: student.token, body: { studentId: student.user._id, missionId: throwaway._id, answers: { choices }, timeSpentSeconds: 30 } });
  check('the student can play it and the server scores it with its Max XP', played.status === 201 && played.data.score === 100 && played.data.xpEarned === 120, `${played.status} score ${played.data?.score} xp ${played.data?.xpEarned}`);
  const removed = await call(`/missions/${throwaway._id}`, { method: 'DELETE', token: staff.token });
  check('deleting it reports the attempts removed', removed.status === 200 && removed.data.removedAttempts === 1, JSON.stringify(removed.data));
  check('no attempt on it is left behind', (await MissionAttempt.countDocuments({ missionId: throwaway._id })) === 0);
} finally {
  // Belt and braces: whatever happened above, leave nothing behind.
  await MissionAttempt.deleteMany({ missionId: throwaway?._id });
  await Mission.deleteOne({ _id: throwaway?._id });
  const notes = await Notification.deleteMany({ createdAt: { $gte: startedAt } });
  // Playing a new level in a completed lesson may rewrite its progress row
  // (completed → in-progress); the cleanup script restores the seeded state.
  console.log(`         cleaned up: ${notes.deletedCount} notification(s) from this run`);
}
check('back to the original mission count', (await Mission.countDocuments()) === missions.length, `${await Mission.countDocuments()}`);

await mongoose.disconnect();
console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
