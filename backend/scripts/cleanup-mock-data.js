/**
 * Strips the database down to the two accounts the app is demonstrated with,
 * and brings the student's history up to full completion.
 *
 * Keeps:
 *   - Carmela Reyes (instructor) and Juan Dela Cruz (student)
 *   - every section either of them still references
 *   - all modules, lessons and missions — that is real course content
 *
 * Removes:
 *   - every other account, and its attempts, progress and notifications
 *   - sections no kept account references
 *
 * Reports by default and changes nothing. Add --apply to make the changes:
 *
 *   node --env-file=.env scripts/cleanup-mock-data.js            # dry run
 *   node --env-file=.env scripts/cleanup-mock-data.js --apply    # for real
 *
 * Idempotent: running it twice leaves the same database.
 */
import mongoose from 'mongoose';
import {
  Lesson,
  Mission,
  MissionAttempt,
  Module,
  Notification,
  Progress,
  Section,
  User,
} from '../models/index.js';
import { completeCourseFor } from './lib/studentCompletion.js';

const APPLY = process.argv.includes('--apply');

const KEEP_EMAILS = ['c.reyes@dorsu.edu.ph', 'juan.delacruz@dorsu.edu.ph'];
const STUDENT_EMAIL = 'juan.delacruz@dorsu.edu.ph';

const COLLECTIONS = {
  users: User,
  sections: Section,
  modules: Module,
  lessons: Lesson,
  missions: Mission,
  missionAttempts: MissionAttempt,
  progress: Progress,
  notifications: Notification,
};

const counts = async () => {
  const out = {};
  for (const [name, Model] of Object.entries(COLLECTIONS)) out[name] = await Model.countDocuments();
  return out;
};

const table = (before, after) => {
  console.log(`\n  ${'collection'.padEnd(18)} ${'before'.padStart(7)} ${'after'.padStart(7)}`);
  for (const name of Object.keys(COLLECTIONS)) {
    const changed = before[name] !== after[name];
    console.log(`  ${name.padEnd(18)} ${String(before[name]).padStart(7)} ${String(after[name]).padStart(7)}${changed ? '  <-' : ''}`);
  }
};

await mongoose.connect(process.env.MONGODB_URI);

try {
  const before = await counts();

  const keep = await User.find({ email: { $in: KEEP_EMAILS } });
  if (keep.length !== KEEP_EMAILS.length) {
    const found = keep.map((u) => u.email);
    throw new Error(`expected both kept accounts, found: ${found.join(', ') || 'none'}`);
  }
  const keepIds = keep.map((u) => u._id);
  const student = keep.find((u) => u.email === STUDENT_EMAIL);

  const doomedUsers = await User.find({ _id: { $nin: keepIds } }).select('email role status');

  /*
   * Sections are kept by reference, not by name: whatever the kept accounts
   * still point at survives. Anything else is a section only deleted users
   * were using.
   */
  const referenced = new Set(
    [
      ...keep.flatMap((u) => (u.assignedSectionIds ?? []).map(String)),
      ...keep.map((u) => (u.sectionId ? String(u.sectionId) : null)),
    ].filter(Boolean),
  );
  const allSections = await Section.find().select('sectionName instructorId');
  const doomedSections = allSections.filter((s) => !referenced.has(String(s._id)));
  const keptSections = allSections.filter((s) => referenced.has(String(s._id)));

  console.log(APPLY ? 'Cleaning up:' : 'Dry run — nothing will be changed:');
  console.log(`\n  keeping ${keep.length} accounts:`);
  for (const u of keep) console.log(`    ${u.role.padEnd(11)} ${u.firstName} ${u.lastName} <${u.email}>`);

  console.log(`\n  removing ${doomedUsers.length} accounts:`);
  const byRole = doomedUsers.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] ?? 0) + 1 }), {});
  for (const [role, n] of Object.entries(byRole)) console.log(`    ${String(n).padStart(3)} ${role}(s)`);

  console.log(`\n  keeping ${keptSections.length} sections:`);
  for (const s of keptSections) console.log(`    ${s.sectionName}`);
  console.log(`  removing ${doomedSections.length} sections:`);
  for (const s of doomedSections) console.log(`    ${s.sectionName} (no kept account references it)`);

  const doomedIds = doomedUsers.map((u) => u._id);

  /*
   * Rows whose owner is already gone — left behind by accounts deleted before
   * this script existed. Swept here so the result is the same whether or not
   * anything was tidied by hand first, which is what makes this idempotent.
   */
  const liveUserIds = (await User.find().select('_id')).map((u) => String(u._id));
  const liveSet = new Set(liveUserIds);
  const keptSet = new Set(keepIds.map(String));
  const survives = (id) => liveSet.has(String(id)) && (keptSet.has(String(id)) || !doomedIds.some((d) => String(d) === String(id)));
  const orphanAttempts = (await MissionAttempt.find().select('studentId').lean()).filter((r) => !survives(r.studentId));
  const orphanProgress = (await Progress.find().select('studentId').lean()).filter((r) => !survives(r.studentId));
  const orphanNotifications = (await Notification.find().select('userId').lean()).filter((r) => !survives(r.userId));
  const orphanTotal = orphanAttempts.length + orphanProgress.length + orphanNotifications.length;
  const doomedAttempts = await MissionAttempt.countDocuments({ studentId: { $in: doomedIds } });
  const doomedProgress = await Progress.countDocuments({ studentId: { $in: doomedIds } });
  const doomedNotifications = await Notification.countDocuments({ userId: { $in: doomedIds } });
  console.log(`\n  their data: ${doomedAttempts} attempts, ${doomedProgress} progress rows, ${doomedNotifications} notifications`);

  if (!APPLY) {
    const after = before;
    table(before, after);
    console.log('\nRe-run with --apply to make these changes.');
  } else {
    await MissionAttempt.deleteMany({ studentId: { $in: doomedIds } });
    await Progress.deleteMany({ studentId: { $in: doomedIds } });
    await Notification.deleteMany({ userId: { $in: doomedIds } });
    // ...and anything already orphaned before this run.
    await MissionAttempt.deleteMany({ studentId: { $nin: liveUserIds } });
    await Progress.deleteMany({ studentId: { $nin: liveUserIds } });
    await Notification.deleteMany({ userId: { $nin: liveUserIds } });

    /*
     * A notification can survive its subject: "New account request" sits in an
     * instructor's inbox and names a student who may since have been deleted.
     * Clicking it would lead nowhere, so it goes with them.
     */
    const stale = (await Notification.find({ 'meta.studentId': { $exists: true } }).select('meta').lean())
      .filter((n) => n.meta?.studentId && !liveUserIds.includes(String(n.meta.studentId)));
    if (stale.length) await Notification.deleteMany({ _id: { $in: stale.map((n) => n._id) } });
    // Notifications *about* a removed student, sitting in a kept inbox.
    await Notification.deleteMany({ 'meta.studentId': { $in: doomedIds.map(String) } });
    await User.deleteMany({ _id: { $in: doomedIds } });
    if (doomedSections.length) await Section.deleteMany({ _id: { $in: doomedSections.map((s) => s._id) } });

    /*
     * The kept instructor may have been assigned a section that has just been
     * deleted; drop any such reference so nothing points at a missing row.
     */
    const keptSectionIds = keptSections.map((s) => s._id);
    for (const u of keep) {
      const assigned = (u.assignedSectionIds ?? []).filter((id) => keptSectionIds.some((k) => String(k) === String(id)));
      if (assigned.length !== (u.assignedSectionIds ?? []).length) {
        u.assignedSectionIds = assigned;
        await u.save();
      }
    }

    // Task 4: the kept student previews the whole course, so finish it for them.
    const [missions, lessons, modules] = await Promise.all([
      Mission.find().select('_id lessonId maxXP scenarioData'),
      Lesson.find().select('_id'),
      Module.find().select('_id moduleNumber title'),
    ]);
    const completion = await completeCourseFor(student._id, { missions, lessons, modules });
    console.log(`\n  ${student.firstName}: ${completion.attempts} attempts, ${completion.progress} completed lessons`);
    console.log(`  badges: ${completion.badges.join(', ') || 'none'}`);

    table(before, await counts());
  }

  // Referential check, run in both modes against the resulting state.
  const finalSections = await Section.find().select('_id sectionName');
  const finalIds = new Set(finalSections.map((s) => String(s._id)));
  const finalUsers = await User.find().select('email sectionId assignedSectionIds role');
  const dangling = finalUsers.filter(
    (u) =>
      (u.sectionId && !finalIds.has(String(u.sectionId)) && (APPLY || KEEP_EMAILS.includes(u.email)))
      || (u.assignedSectionIds ?? []).some((id) => !finalIds.has(String(id)) && (APPLY || KEEP_EMAILS.includes(u.email))),
  );
  console.log(`\n  section references intact: ${dangling.length === 0 ? 'yes' : `NO — ${dangling.map((u) => u.email).join(', ')}`}`);
} finally {
  await mongoose.disconnect();
}
