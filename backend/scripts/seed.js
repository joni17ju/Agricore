/**
 * Seed Atlas from the frontend's mock data.
 *
 * The mock files under frontend/src/data are the source of truth for content:
 * they hold the scenarioData the five mission games actually render, the rich
 * lesson HTML, and the generated activity history. This script loads them,
 * swaps their readable string ids (usr_stu_001, mod_1, les_1_1) for real
 * ObjectIds, rewires every reference, and replaces the contents of the seven
 * collections.
 *
 * The seven collections and their field shapes are unchanged — only the id
 * type and the reference wiring differ from the mock files.
 *
 * Usage:  node scripts/seed.js          (replaces seeded data)
 *         node scripts/seed.js --dry    (report only, writes nothing)
 */
import 'dotenv/config';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { MOCK_SEED_ANCHOR_DAY } from '../constants/rules.js';
import { addDays, calendarDaysBetween } from '../utils/dates.js';

const DATA_DIR = path.resolve(process.cwd(), '..', 'frontend', 'src', 'data');
const isDryRun = process.argv.includes('--dry');

/**
 * Every seeded account gets this password, hashed properly with bcrypt, so the
 * demo accounts can sign in immediately after a seed. Without it a re-seed
 * would silently lock everyone out until scripts/set-passwords.js was run —
 * a bad surprise right before a demo.
 */
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'agricore123';

const COLLECTIONS = ['users', 'sections', 'modules', 'lessons', 'missions', 'missionAttempts', 'progress'];

/** Which fields point at which collection, so references can be rewritten. */
const REFERENCES = {
  users: { sectionId: 'sections', assignedSectionIds: 'sections' },
  sections: { instructorId: 'users' },
  modules: {},
  lessons: { moduleId: 'modules' },
  missions: { lessonId: 'lessons' },
  missionAttempts: { studentId: 'users', missionId: 'missions' },
  progress: { studentId: 'users', lessonId: 'lessons' },
};

/** ISO strings that should land in Mongo as real Dates. */
const DATE_FIELDS = { missionAttempts: ['attemptedAt'] };

/**
 * The generated activity ends on MOCK_SEED_ANCHOR_DAY. Seeding those dates
 * verbatim means the data ages: a week later every student looks inactive and
 * the at-risk count balloons. Shifting the whole history so the anchor day
 * becomes "yesterday" keeps streaks, weekly activity and at-risk status
 * realistic whenever the seed is run — the same trick the mock layer used.
 */
const SEED_DATE_OFFSET_DAYS = calendarDaysBetween(new Date(`${MOCK_SEED_ANCHOR_DAY}T12:00:00`), new Date()) - 1;

const shiftDate = (value) =>
  SEED_DATE_OFFSET_DAYS === 0 ? new Date(value) : addDays(value, SEED_DATE_OFFSET_DAYS);

async function loadMockData() {
  const data = {};
  for (const name of COLLECTIONS) {
    const module = await import(pathToFileURL(path.join(DATA_DIR, `${name}.js`)).href);
    data[name] = module.default;
    if (!Array.isArray(data[name])) throw new Error(`${name}.js did not default-export an array`);
  }
  return data;
}

/** oldStringId -> new ObjectId, for every document in every collection. */
function buildIdMap(data) {
  const map = {};
  for (const name of COLLECTIONS) {
    map[name] = new Map(data[name].map((doc) => [doc._id, new mongoose.Types.ObjectId()]));
  }
  return map;
}

function resolve(map, collection, value, field, sourceCollection) {
  if (value === null || value === undefined) return value;
  const found = map[collection].get(value);
  if (!found) throw new Error(`${sourceCollection}.${field} points at missing ${collection} id "${value}"`);
  return found;
}

function transform(data, idMap, passwordHash) {
  const seededAt = new Date();
  const out = {};
  for (const name of COLLECTIONS) {
    out[name] = data[name].map((source) => {
      const doc = { ...source, _id: idMap[name].get(source._id) };

      for (const [field, target] of Object.entries(REFERENCES[name])) {
        if (!(field in doc)) continue;
        doc[field] = Array.isArray(doc[field])
          ? doc[field].map((value) => resolve(idMap, target, value, field, name))
          : resolve(idMap, target, doc[field], field, name);
      }

      for (const field of DATE_FIELDS[name] ?? []) {
        if (doc[field]) doc[field] = shiftDate(doc[field]);
      }

      if (name === 'users') {
        doc.passwordHash = passwordHash;
        doc.earnedBadges = (source.earnedBadges ?? []).map((badge) => ({
          ...badge,
          earnedAt: shiftDate(badge.earnedAt),
        }));
      }

      // Marks documents this script owns, matching the flag already in Atlas.
      doc.isSeedData = true;
      // Written explicitly because insertMany bypasses Mongoose's timestamps.
      doc.createdAt = seededAt;
      doc.updatedAt = seededAt;
      return doc;
    });
  }
  return out;
}

const data = await loadMockData();
const idMap = buildIdMap(data);
// One hash reused across the demo accounts: bcrypt is slow by design.
const seedPasswordHash = await bcrypt.hash(SEED_PASSWORD, 10);
const documents = transform(data, idMap, seedPasswordHash);

const newestAttempt = documents.missionAttempts.reduce(
  (latest, doc) => (doc.attemptedAt > latest ? doc.attemptedAt : latest),
  new Date(0),
);
console.log(
  `Loaded from frontend/src/data — activity shifted ${SEED_DATE_OFFSET_DAYS} day(s); ` +
    `newest attempt ${newestAttempt.toISOString().slice(0, 10)} (today is ${new Date().toISOString().slice(0, 10)}):`,
);
for (const name of COLLECTIONS) console.log(`  ${name.padEnd(16)} ${String(documents[name].length).padStart(4)} documents`);

if (isDryRun) {
  console.log('\n--dry: nothing written. Sample transformed documents:');
  console.log('  lesson  :', JSON.stringify(documents.lessons[0]).slice(0, 180));
  console.log('  mission :', JSON.stringify({ ...documents.missions[0], scenarioData: '…' }).slice(0, 180));
  process.exit(0);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const db = mongoose.connection.db;
console.log(`\nConnected to "${db.databaseName}".`);

console.log('\nReplacing collection contents:');
for (const name of COLLECTIONS) {
  const before = await db.collection(name).countDocuments();
  await db.collection(name).deleteMany({});
  await db.collection(name).insertMany(documents[name]);
  const after = await db.collection(name).countDocuments();
  console.log(`  ${name.padEnd(16)} ${String(before).padStart(4)} → ${String(after).padStart(4)}`);
}

await mongoose.disconnect();
console.log('\nSeed complete.');
