import { Section, User } from '../models/index.js';
import { findOr404, httpError } from '../utils/http.js';

/** GET /api/sections */
export async function listSections(req, res) {
  const sections = await Section.find().sort({ sectionName: 1 });
  res.json(sections);
}

/**
 * GET /api/sections/options — public.
 *
 * The registration form has to offer real sections to someone who is not
 * signed in yet, so it cannot use GET /sections. Rather than opening that
 * route up, this one returns only what a dropdown needs: the id and the name.
 * Instructor assignment and timestamps stay behind authentication.
 */
export async function listSectionOptions(req, res) {
  const sections = await Section.find().select('sectionName').sort({ sectionName: 1 });
  res.json(sections.map((section) => ({ _id: section._id, sectionName: section.sectionName })));
}

/** GET /api/sections/:id */
export async function getSection(req, res) {
  res.json(await findOr404(Section, req.params.id, 'Section'));
}

/** POST /api/sections — admin creates a class section. */
export async function createSection(req, res) {
  const { sectionName, instructorId = null } = req.body ?? {};
  if (!sectionName?.trim()) throw httpError(400, 'sectionName is required.');
  const section = await Section.create({ sectionName: sectionName.trim(), instructorId });
  res.status(201).json(section);
}

/** PATCH /api/sections/:id */
export async function updateSection(req, res) {
  const section = await findOr404(Section, req.params.id, 'Section');
  const { sectionName, instructorId } = req.body ?? {};
  if (sectionName !== undefined) section.sectionName = String(sectionName).trim();
  if (instructorId !== undefined) section.instructorId = instructorId;
  await section.save();
  res.json(section);
}

/** DELETE /api/sections/:id — refuses while students are still enrolled. */
export async function deleteSection(req, res) {
  const section = await findOr404(Section, req.params.id, 'Section');
  const enrolled = await User.countDocuments({ role: 'student', sectionId: section._id });
  if (enrolled > 0) {
    throw httpError(409, `Move the ${enrolled} enrolled student(s) to another section first.`);
  }
  // Clear the reciprocal link before removing the section.
  await User.updateMany({ assignedSectionIds: section._id }, { $pull: { assignedSectionIds: section._id } });
  await section.deleteOne();
  res.json({ deleted: true });
}
