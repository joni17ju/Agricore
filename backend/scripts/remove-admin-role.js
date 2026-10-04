/**
 * Removes the administrator role from an existing database.
 *
 * The programme head now does the administrator's job as an instructor, so the
 * role is gone from the code. Any account still carrying `role: "admin"` would
 * fail the User model's enum on its next save and could never sign in, so it
 * has to be cleared out of the database too.
 *
 * Also removes instructor accounts still sitting at `pending`. Instructors are
 * no longer created through registration and nothing approves them any more,
 * so a pending instructor is an account that can never be used.
 *
 * Reports by default and changes nothing. Add --apply to delete:
 *
 *   node --env-file=.env scripts/remove-admin-role.js            # dry run
 *   node --env-file=.env scripts/remove-admin-role.js --apply    # delete
 *
 * Students are never touched, whatever their status.
 */
import mongoose from 'mongoose';
import { Notification, Section, User } from '../models/index.js';

const APPLY = process.argv.includes('--apply');

const line = (label, value) => console.log(`  ${String(label).padEnd(42)} ${value}`);

await mongoose.connect(process.env.MONGODB_URI);

try {
  /*
   * Queried with a raw collection read rather than through the model: the enum
   * no longer contains "admin", and a strict read could filter out the very
   * documents this script exists to find.
   */
  const admins = await mongoose.connection.db
    .collection('users')
    .find({ role: 'admin' })
    .toArray();

  const pendingInstructors = await User.find({ role: 'instructor', status: 'pending' }).lean();

  console.log(APPLY ? 'Removing legacy accounts:\n' : 'Dry run — nothing will be changed:\n');

  for (const admin of admins) {
    line(`admin  ${admin.email}`, `${admin.firstName} ${admin.lastName}`);
  }
  for (const instructor of pendingInstructors) {
    line(`pending instructor  ${instructor.email}`, `${instructor.firstName} ${instructor.lastName}`);
  }
  if (admins.length === 0 && pendingInstructors.length === 0) {
    console.log('  nothing to remove.');
  }

  const ids = [...admins.map((a) => a._id), ...pendingInstructors.map((i) => i._id)];

  /*
   * Sections point at an instructor. Deleting an account without clearing that
   * reference would leave a section pointing at a user that no longer exists,
   * and the roster screens would read it as "unassigned" only by accident.
   */
  const orphanedSections = ids.length
    ? await Section.find({ instructorId: { $in: ids } }).select('sectionName').lean()
    : [];
  for (const section of orphanedSections) {
    line(`section to unassign  ${section.sectionName}`, '(instructor is being removed)');
  }

  console.log('');
  line('accounts to remove', ids.length);
  line('sections to unassign', orphanedSections.length);

  if (!APPLY) {
    console.log('\nRe-run with --apply to make these changes.');
  } else if (ids.length === 0) {
    console.log('\nNothing to do.');
  } else {
    // Their own notifications go too; nobody can read them any more.
    const notifications = await Notification.deleteMany({ userId: { $in: ids } });
    const sections = await Section.updateMany({ instructorId: { $in: ids } }, { $set: { instructorId: null } });
    const users = await User.deleteMany({ _id: { $in: ids } });

    console.log('');
    line('accounts deleted', users.deletedCount ?? 0);
    line('sections unassigned', sections.modifiedCount ?? 0);
    line('notifications deleted', notifications.deletedCount ?? 0);
  }

  console.log('\nRemaining accounts:');
  line('students', await User.countDocuments({ role: 'student' }));
  line('instructors', await User.countDocuments({ role: 'instructor' }));
  const leftoverAdmins = await mongoose.connection.db.collection('users').countDocuments({ role: 'admin' });
  line('admins', leftoverAdmins);
} finally {
  await mongoose.disconnect();
}
