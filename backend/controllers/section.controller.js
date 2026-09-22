import { Section } from '../models/index.js';
import { findOr404, httpError } from '../utils/http.js';

/** GET /api/sections */
export async function listSections(req, res) {
  const sections = await Section.find().sort({ sectionName: 1 });
  res.json(sections);
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
