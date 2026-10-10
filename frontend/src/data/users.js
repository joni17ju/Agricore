/**
 * Seed `users` collection.
 * Shape: { _id, role, firstName, lastName, email, schoolId, sectionId, assignedSectionIds, status, earnedBadges: [{ code, earnedAt }] }
 *
 * Two accounts, two roles. The large cohort of mock students was removed once
 * the app moved to real authentication — a demo needs one of each, not thirty,
 * and every extra account was data nobody could sign into.
 *
 * `earnedBadges` is deliberately empty here. Badges are awarded by the server's
 * own rules in scripts/lib/studentCompletion.js during the seed, so they can
 * never disagree with what the rules would actually grant.
 *
 * Optional: avatarUrl — set only once a user uploads a profile picture.
 */
const users = [
  {_id: "usr_ins_reyes", role: "instructor", firstName: "Carmela", lastName: "Reyes", email: "c.reyes@dorsu.edu.ph", schoolId: "FAC-2012-014", sectionId: null, assignedSectionIds: ["sec_bsa1a","sec_bsa1b"], status: "active", earnedBadges: []},
  {_id: "usr_stu_001", role: "student", firstName: "Juan", lastName: "Dela Cruz", email: "juan.delacruz@dorsu.edu.ph", schoolId: "2023-0101", sectionId: "sec_bsa1a", assignedSectionIds: [], status: "active", earnedBadges: []},
];

export default users;
