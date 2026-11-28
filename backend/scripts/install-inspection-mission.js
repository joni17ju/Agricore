/**
 * Turn one existing mission level into an inspection mission, from a content file.
 *
 *   node scripts/install-inspection-mission.js                 dry run (default): shows what would change
 *   node scripts/install-inspection-mission.js --apply         backs up the mission, then writes it
 *
 * Options (defaults install the Module 2 mission):
 *   --module 2  --level 3  --title "Yellowing Rice Leaves"  --content content/inspection/module-2.json
 *
 * Safety
 * - The mission is found by module number + level number, and its current
 *   title must match --title (or already be the content file's title, so a
 *   rerun only refreshes it). Anything else is skipped, so the script cannot
 *   overwrite a mission an instructor has since replaced.
 * - It keeps the mission's _id, lesson, level number and max XP, so saved
 *   attempts, progress and XP stay linked. Only gameType and scenarioData change.
 * - The content is validated with the same rules the mission editor uses;
 *   any error stops the script.
 * - --apply first writes the mission as it is now to
 *   backups/mission-before-inspection-<timestamp>.json (git-ignored). Restore
 *   by writing that document's gameType and scenarioData back.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { Lesson, Mission, Module } from '../models/index.js';
import { GAME_TYPES } from '../constants/gameTypes.js';
import { validateScenario } from '../utils/missionValidation.js';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const apply = process.argv.includes('--apply');
const moduleNumber = Number(arg('module', 2));
const levelNumber = Number(arg('level', 3));
const expectedTitle = arg('title', 'Yellowing Rice Leaves');
const contentFile = path.resolve(arg('content', 'content/inspection/module-2.json'));

const content = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
const { errors, warnings } = validateScenario(GAME_TYPES.INSPECTION, content);
for (const w of warnings) console.log(`warning ${w.path}: ${w.message}`);
if (errors.length) {
  for (const e of errors) console.log(`error ${e.path}: ${e.message}`);
  console.log('The content file has errors; nothing was changed.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  const module = await Module.findOne({ moduleNumber }).lean();
  if (!module) throw new Error(`Module ${moduleNumber} not found.`);
  const lessonIds = (await Lesson.find({ moduleId: module._id }).select('_id').lean()).map((l) => l._id);
  const mission = await Mission.findOne({ lessonId: { $in: lessonIds }, levelNumber }).lean();
  const currentTitle = mission?.scenarioData?.title;
  if (!mission || (currentTitle !== expectedTitle && currentTitle !== content.title)) {
    console.log(`Module ${moduleNumber} level ${levelNumber}: expected "${expectedTitle}", found "${currentTitle ?? 'nothing'}" — skipped.`);
  } else if (mission.gameType === GAME_TYPES.INSPECTION && JSON.stringify(mission.scenarioData) === JSON.stringify(content)) {
    console.log(`Module ${moduleNumber} level ${levelNumber}: already installed.`);
  } else if (!apply) {
    console.log(`Module ${moduleNumber} level ${levelNumber} "${currentTitle}" (${mission.gameType ?? module.gameType}) → inspection "${content.title}", ${content.rounds.length} rounds, max XP stays ${mission.maxXP}.`);
    console.log('Dry run: nothing was changed. Run with --apply to write it.');
  } else {
    const dir = path.resolve('backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `mission-before-inspection-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify(mission, null, 2));
    console.log(`Backed up the mission to ${file}`);
    const result = await Mission.updateOne(
      { _id: mission._id, 'scenarioData.title': currentTitle },
      { $set: { gameType: GAME_TYPES.INSPECTION, scenarioData: content } },
    );
    console.log(result.modifiedCount === 1 ? `Installed "${content.title}" as Module ${moduleNumber} level ${levelNumber}.` : 'The mission changed meanwhile; nothing was written.');
  }
} finally {
  await mongoose.disconnect();
}
