/**
 * Seed `sections` collection.
 * Shape: { _id, sectionName, instructorId }
 *
 * Both belong to Prof. Reyes. BSA 1-C was removed with its instructor when the
 * mock cohort went.
 */
const sections = [
  { _id: 'sec_bsa1a', sectionName: 'BSA 1-A', instructorId: 'usr_ins_reyes' },
  { _id: 'sec_bsa1b', sectionName: 'BSA 1-B', instructorId: 'usr_ins_reyes' },
];

export default sections;
