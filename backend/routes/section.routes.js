import { Router } from 'express';
import { createSection, deleteSection, getSection, listSectionOptions, listSections, updateSection } from '../controllers/section.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/sections', requireAuth, listSections);
// Public, and declared before '/sections/:id' so "options" is not read as an id.
// The registration form needs this before the student has an account.
router.get('/sections/options', listSectionOptions);
router.get('/sections/:id', requireAuth, getSection);
router.post('/sections', requireAuth, requireRole('admin'), createSection);
router.patch('/sections/:id', requireAuth, requireRole('admin'), updateSection);
router.delete('/sections/:id', requireAuth, requireRole('admin'), deleteSection);
export default router;
