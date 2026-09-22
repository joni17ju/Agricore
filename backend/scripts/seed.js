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
import mongoose from 'mongoose';

const DATA_DIR = path.resolve(process.cwd(), '..', 'frontend', 'src', 'data');
const isDryRun = process.argv.includes('--dry');

/** Placeholder until Phase 4 hashes real passwords for the demo accounts. */
const PLACEHOLDER_HASH = 'DEV_SEED_PLACEHOLDER_HASH_NOT_REAL';

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

function transform(data, idMap) {
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
        if (doc[field]) doc[field] = new Date(doc[field]);
      }

      if (name === 'users') {
        // Atlas already carried passwordHash; keep the field so Phase 4 can rehash in place.
        doc.passwordHash = source.passwordHash ?? PLACEHOLDER_HASH;
        doc.earnedBadges = (source.earnedBadges ?? []).map((badge) => ({
          ...badge,
          earnedAt: new Date(badge.earnedAt),
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
const documents = transform(data, idMap);

console.log('Loaded from frontend/src/data:');
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
