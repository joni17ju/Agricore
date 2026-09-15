/**
 * Mock `modules` collection — the five fixed modules of the
 * Principles of Crop Protection I syllabus (Proposal §1.5, Table 1).
 * Shape: { _id, moduleNumber, title, gameType }
 */
const modules = [
  { _id: 'mod_1', moduleNumber: 1, title: 'Introduction to Crop Protection', gameType: 'decision-making' },
  { _id: 'mod_2', moduleNumber: 2, title: 'Plant Pathology', gameType: 'identification' },
  { _id: 'mod_3', moduleNumber: 3, title: 'Agricultural Entomology', gameType: 'matching' },
  { _id: 'mod_4', moduleNumber: 4, title: 'Weed Science', gameType: 'drag-and-drop' },
  { _id: 'mod_5', moduleNumber: 5, title: 'Integrated Pest Management', gameType: 'strategy-management' },
];

export default modules;
