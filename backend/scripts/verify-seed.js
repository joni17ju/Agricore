/**
 * Read-only check that the seeded Atlas data carries the fields the frontend
 * actually reads. Writes nothing.
 *
 * Usage: node scripts/verify-seed.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

/** Fields each game component destructures out of mission.scenarioData. */
const GAME_FIELDS = {
  'decision-making': ['title', 'scenarios'],
  identification: ['instructions', 'host', 'specimenKey', 'minZoomToMark', 'symptomSpots', 'pathogenOptions', 'correctPathogenId'],
  matching: ['target', 'columns', 'otherPests', 'timeLimitSeconds'],
  'drag-and-drop': ['specimen', 'targets', 'labels', 'timeLimitSeconds'],
  'strategy-management': ['crop', 'sceneKey', 'guideMessage', 'observations', 'pestOptions', 'requiredTacticCount', 'tactics', 'bestTacticIds', 'goals'],
};

/** Top-level fields each collection must carry for the services to work. */
const DOC_FIELDS = {
  users: ['role', 'firstName', 'lastName', 'email', 'schoolId', 'sectionId', 'assignedSectionIds', 'status', 'earnedBadges', 'passwordHash'],
  sections: ['sectionName', 'instructorId'],
  modules: ['moduleNumber', 'title', 'gameType'],
  lessons: ['moduleId', 'lessonNumber', 'title', 'contentBody', 'mediaAssets'],
  missions: ['lessonId', 'levelNumber', 'maxXP', 'scenarioData'],
  missionAttempts: ['studentId', 'missionId', 'score', 'xpEarned', 'timeSpentSeconds', 'isPassed', 'attemptedAt'],
  progress: ['studentId', 'lessonId', 'status'],
};

const MEDIA_FIELDS = ['assetId', 'type', 'title', 'caption', 'url'];

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const db = mongoose.connection.db;
const col = (n) => db.collection(n);

console.log(`database: ${db.databaseName}\n`);

console.log('Document counts:');
for (const name of Object.keys(DOC_FIELDS)) {
  console.log(`  ${name.padEnd(16)} ${await col(name).countDocuments()}`);
}

console.log('\nRequired top-level fields (sampled document per collection):');
for (const [name, fields] of Object.entries(DOC_FIELDS)) {
  const doc = await col(name).findOne();
  const missing = fields.filter((f) => !(f in (doc ?? {})));
  check(name, missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : `${fields.length} fields present`);
}

console.log('\nscenarioData per game type (every mission checked):');
for (const [gameType, fields] of Object.entries(GAME_FIELDS)) {
  const module = await col('modules').findOne({ gameType });
  if (!module) {
    check(gameType, false, 'no module with this gameType');
    continue;
  }
  const lessonIds = (await col('lessons').find({ moduleId: module._id }).toArray()).map((l) => l._id);
  const missions = await col('missions').find({ lessonId: { $in: lessonIds } }).toArray();
  const bad = missions.filter((m) => fields.some((f) => !(f in (m.scenarioData ?? {}))));
  check(
    `${gameType} (${missions.length} missions)`,
    missions.length > 0 && bad.length === 0,
    bad.length ? `${bad.length} missing fields` : `all carry ${fields.join(', ')}`,
  );
}

console.log('\nLesson media assets are objects, not filenames:');
const withMedia = await col('lessons').findOne({ 'mediaAssets.0': { $exists: true } });
const asset = withMedia?.mediaAssets?.[0];
check(
  'mediaAssets[0] shape',
  Boolean(asset) && typeof asset === 'object' && MEDIA_FIELDS.every((f) => f in asset),
  asset ? `keys: ${Object.keys(asset).join(', ')}` : 'no lesson has media',
);

console.log('\nReference integrity (every document resolved):');
for (const [name, field, target] of [
  ['lessons', 'moduleId', 'modules'],
  ['missions', 'lessonId', 'lessons'],
  ['missionAttempts', 'studentId', 'users'],
  ['missionAttempts', 'missionId', 'missions'],
  ['progress', 'studentId', 'users'],
  ['progress', 'lessonId', 'lessons'],
  ['sections', 'instructorId', 'users'],
]) {
  const ids = await col(target).distinct('_id');
  const idSet = new Set(ids.map(String));
  const docs = await col(name).find({}, { projection: { [field]: 1 } }).toArray();
  const orphans = docs.filter((d) => d[field] && !idSet.has(String(d[field])));
  check(`${name}.${field} → ${target}`, orphans.length === 0, `${docs.length} checked, ${orphans.length} orphaned`);
}

console.log('\nEnum values actually present:');
for (const [name, field] of [['users', 'role'], ['users', 'status'], ['modules', 'gameType'], ['progress', 'status'], ['lessons', 'lessonNumber']]) {
  const values = await col(name).distinct(field);
  console.log(`  ${name}.${field}: ${JSON.stringify(values.slice(0, 8))}`);
}

await mongoose.disconnect();
console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
