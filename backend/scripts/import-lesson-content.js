/**
 * Brings one module's lessons and missions in the database in line with the
 * seed data in frontend/src/data (lessons.js and missions.js), without
 * touching anything else.
 *
 * Unlike seed.js, which replaces whole collections, this only:
 *   - updates contentBody of lessons that already exist (matched by module
 *     number and title), run through the same sanitiser as the lesson API;
 *   - creates lessons that are in the seed data but not in the database,
 *     together with their missions. A lesson whose seed data has no mission is
 *     refused: it could never be completed and would lock every lesson after it;
 *   - adds seed missions missing from an existing lesson (matched by lesson and
 *     mission title), and sets levelNumber on matched missions to the seed's.
 *     A matched mission's content, XP and game type are left as they are, so
 *     edits made in the mission editor survive;
 *   - puts the module's lessons in the seed data's lessonNumber order.
 *
 * Nothing is deleted. Lesson and mission ids never change, so attempts and
 * progress stay linked. Lessons and missions that exist only in the database
 * are kept (after the seed's, in their current order).
 *
 * Before writing, the module's current lessons and missions are saved to
 * backups/<timestamp>-module-<n>.json at the repository root.
 *
 * Reports by default and changes nothing. Add --apply to make the changes:
 *
 *   node --env-file=.env scripts/import-lesson-content.js --module 4           # dry run
 *   node --env-file=.env scripts/import-lesson-content.js --module 4 --apply   # for real
 *
 * Idempotent: running it twice leaves the same database.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { Lesson, Mission, Module } from '../models/index.js';
import { sanitizeLessonHtml } from '../utils/lessonHtml.js';
import { validateScenario } from '../utils/missionValidation.js';
import { missionGameType } from '../constants/gameTypes.js';

const APPLY = process.argv.includes('--apply');
const MODULE_NUMBER = Number(process.argv[process.argv.indexOf('--module') + 1]);
if (!process.argv.includes('--module') || !Number.isInteger(MODULE_NUMBER)) {
  console.error('Usage: node --env-file=.env scripts/import-lesson-content.js --module <number> [--apply]');
  process.exit(1);
}

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA_DIR = path.join(REPO_ROOT, 'frontend', 'src', 'data');
const loadData = async (name) => (await import(pathToFileURL(path.join(DATA_DIR, `${name}.js`)).href)).default;

const textLength = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
const key = (text) => String(text ?? '').trim().toLowerCase();

/** Lesson HTML as the lesson API would store it; refuses if the sanitiser drops text. */
function cleanContent(seed) {
  const clean = sanitizeLessonHtml(seed.contentBody);
  if (textLength(clean) < textLength(seed.contentBody) * 0.98) {
    throw new Error(`Sanitising "${seed.title}" removed text (${textLength(seed.contentBody)} -> ${textLength(clean)} chars). Check its tags.`);
  }
  return clean;
}

/** Same check the mission API makes, so nothing is stored that the game could not play. */
function assertPlayable(seedMission, dbModule) {
  const gameType = missionGameType(dbModule, seedMission);
  const { errors } = validateScenario(gameType, seedMission.scenarioData);
  if (errors.length) throw new Error(`Mission "${seedMission.scenarioData.title}" is not valid for ${gameType}: ${errors[0].message}`);
}

const [seedModules, seedLessons, seedMissions] = await Promise.all([loadData('modules'), loadData('lessons'), loadData('missions')]);
const seedModule = seedModules.find((m) => m.moduleNumber === MODULE_NUMBER);
if (!seedModule) throw new Error(`Module ${MODULE_NUMBER} is not in the seed data.`);
const wanted = seedLessons.filter((l) => l.moduleId === seedModule._id).sort((a, b) => a.lessonNumber - b.lessonNumber);
const missionsOf = (seedLesson) => seedMissions.filter((m) => m.lessonId === seedLesson._id).sort((a, b) => a.levelNumber - b.levelNumber);

await mongoose.connect(process.env.MONGODB_URI);
try {
  const dbModule = await Module.findOne({ moduleNumber: MODULE_NUMBER });
  if (!dbModule) throw new Error(`Module ${MODULE_NUMBER} is not in the database.`);
  const dbLessons = await Lesson.find({ moduleId: dbModule._id }).sort({ lessonNumber: 1 });
  const dbMissions = await Mission.find({ lessonId: { $in: dbLessons.map((l) => l._id) } }).sort({ levelNumber: 1 });
  const lessonByTitle = new Map(dbLessons.map((l) => [key(l.title), l]));

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'}: Module ${MODULE_NUMBER} ${dbModule.title}\n`);

  const contentUpdates = [];
  const lessonCreates = [];
  const missionCreates = []; // { seedMission, lesson | seedLesson }
  const levelUpdates = [];

  for (const seed of wanted) {
    const current = lessonByTitle.get(key(seed.title));
    const seedLevels = missionsOf(seed);
    seedLevels.forEach((m) => assertPlayable(m, dbModule));

    if (!current) {
      if (seedLevels.length === 0) throw new Error(`"${seed.title}" has no mission in the seed data; it would lock the lessons after it.`);
      const contentBody = cleanContent(seed);
      lessonCreates.push({ seed, contentBody });
      seedLevels.forEach((m) => missionCreates.push({ seedMission: m, seedLesson: seed }));
      console.log(`  create     ${seed.title}: ${textLength(contentBody)} chars, ${(contentBody.match(/<img /g) ?? []).length} images, missions: ${seedLevels.map((m) => `L${m.levelNumber} "${m.scenarioData.title}"`).join(', ')}`);
      continue;
    }

    const contentBody = cleanContent(seed);
    if (contentBody === current.contentBody) {
      console.log(`  unchanged  ${current.title}`);
    } else {
      contentUpdates.push({ lesson: current, contentBody });
      console.log(`  update     ${current.title}: ${textLength(current.contentBody)} -> ${textLength(contentBody)} chars, ${(contentBody.match(/<img /g) ?? []).length} images`);
    }

    const existing = dbMissions.filter((m) => String(m.lessonId) === String(current._id));
    for (const seedMission of seedLevels) {
      const match = existing.find((m) => key(m.scenarioData?.title) === key(seedMission.scenarioData.title));
      if (!match) {
        missionCreates.push({ seedMission, lesson: current });
        console.log(`    + mission L${seedMission.levelNumber} "${seedMission.scenarioData.title}"${seedMission.gameType ? ` (${seedMission.gameType})` : ''}`);
      } else if (match.levelNumber !== seedMission.levelNumber) {
        levelUpdates.push({ mission: match, levelNumber: seedMission.levelNumber });
        console.log(`    ~ mission "${match.scenarioData.title}": level ${match.levelNumber} -> ${seedMission.levelNumber}`);
      }
    }
  }

  // Order: the seed's lessons first (existing or new), then any database-only ones.
  const known = wanted.map((s) => lessonByTitle.get(key(s.title)) ?? s.title);
  const extra = dbLessons.filter((l) => !known.includes(l));
  const finalOrder = [...known, ...extra];
  const reorder = lessonCreates.length > 0 || finalOrder.some((l, i) => typeof l !== 'string' && l.lessonNumber !== i + 1);
  console.log(`\n  order ${reorder ? 'becomes' : 'unchanged'}: ${finalOrder.map((l, i) => `${i + 1}. ${typeof l === 'string' ? `${l} (new)` : l.title}`).join(', ')}`);
  if (extra.length) console.log(`  kept at the end (database only): ${extra.map((l) => l.title).join(', ')}`);

  const changes = contentUpdates.length + lessonCreates.length + missionCreates.length + levelUpdates.length + (reorder ? 1 : 0);
  if (!APPLY) {
    console.log(changes ? '\nNothing written. Add --apply to make these changes.' : '\nAlready up to date.');
  } else if (changes) {
    const backupDir = path.join(REPO_ROOT, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-module-${MODULE_NUMBER}.json`);
    fs.writeFileSync(backupFile, JSON.stringify({ lessons: dbLessons.map((l) => l.toObject()), missions: dbMissions.map((m) => m.toObject()) }, null, 1));
    console.log(`\n  backup: ${path.relative(REPO_ROOT, backupFile)}`);

    for (const { lesson, contentBody } of contentUpdates) {
      await Lesson.updateOne({ _id: lesson._id }, { $set: { contentBody } });
    }

    // New lessons go in at numbers that cannot collide, then the reorder below settles them.
    const created = new Map();
    for (const [i, { seed, contentBody }] of lessonCreates.entries()) {
      const doc = await Lesson.create({
        moduleId: dbModule._id,
        lessonNumber: 1000 + i,
        title: seed.title,
        contentBody,
        mediaAssets: seed.mediaAssets ?? [],
        isSeedData: true,
      });
      created.set(seed.title, doc);
    }

    // Level numbers are unique per lesson: move matched missions out of the way first.
    if (levelUpdates.length) {
      await Mission.bulkWrite(levelUpdates.map(({ mission }, i) => ({ updateOne: { filter: { _id: mission._id }, update: { $set: { levelNumber: 10000 + i } } } })));
      await Mission.bulkWrite(levelUpdates.map(({ mission, levelNumber }) => ({ updateOne: { filter: { _id: mission._id }, update: { $set: { levelNumber } } } })));
    }
    for (const { seedMission, lesson, seedLesson } of missionCreates) {
      await Mission.create({
        lessonId: (lesson ?? created.get(seedLesson.title))._id,
        levelNumber: seedMission.levelNumber,
        maxXP: seedMission.maxXP,
        scenarioData: seedMission.scenarioData,
        gameType: seedMission.gameType ?? null,
        isSeedData: true,
      });
    }

    if (reorder) {
      // Two passes, as in the reorder endpoint: (moduleId, lessonNumber) is a unique index.
      const ids = finalOrder.map((l) => (typeof l === 'string' ? created.get(l)._id : l._id));
      await Lesson.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { lessonNumber: -(i + 1) } } } })));
      await Lesson.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { lessonNumber: i + 1 } } } })));
    }
    console.log(`  written: ${contentUpdates.length} lesson(s) updated, ${lessonCreates.length} created, ${missionCreates.length} mission(s) added, ${levelUpdates.length} renumbered${reorder ? ', order set' : ''}.`);
  } else {
    console.log('\nAlready up to date.');
  }
} finally {
  await mongoose.disconnect();
}
