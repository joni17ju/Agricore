import { Router } from 'express';
import { createSection, deleteSection, getSection, listSections, updateSection } from '../controllers/section.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/sections', requireAuth, listSections);
router.get('/sections/:id', requireAuth, getSection);
router.post('/sections', requireAuth, requireRole('admin'), createSection);
router.patch('/sections/:id', requireAuth, requireRole('admin'), updateSection);
router.delete('/sections/:id', requireAuth, requireRole('admin'), deleteSection);
export default router;
