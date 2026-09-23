/**
 * Remove mission attempts left behind by smoke tests.
 *
 * scripts/smoke-test.js submits one real attempt to prove the server re-scores
 * answers, and now deletes it again. Earlier runs did not, so this clears any
 * strays: a zero-score, zero-XP, failed attempt recorded today. Nothing a
 * student actually played looks like that, because a genuine 0% attempt still
 * takes longer than a few seconds and is rarely on an already-passed mission.
 *
 * Usage:
 *   node scripts/remove-test-attempts.js          report only
 *   node scripts/remove-test-attempts.js --apply  delete them
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const apply = process.argv.includes('--apply');

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const attempts = mongoose.connection.db.collection('missionAttempts');

const since = new Date();
since.setHours(0, 0, 0, 0);
const filter = { score: 0, xpEarned: 0, isPassed: false, timeSpentSeconds: { $lte: 60 }, attemptedAt: { $gte: since } };

const matches = await attempts.find(filter).toArray();
console.log(`matching attempts today: ${matches.length}`);
for (const attempt of matches) {
  console.log(`  student ${attempt.studentId} mission ${attempt.missionId} at ${attempt.attemptedAt.toISOString()}`);
}

if (!apply) {
  console.log('\nreport only — pass --apply to delete them.');
} else {
  const result = await attempts.deleteMany(filter);
  console.log(`\ndeleted ${result.deletedCount}.`);
}

await mongoose.disconnect();
