import { Router } from 'express';
import { createModule, deleteModule, getModule, listModules, updateModule } from '../controllers/module.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/modules', requireAuth, listModules);
router.get('/modules/:id', requireAuth, getModule);
router.post('/modules', requireAuth, requireRole('instructor'), createModule);
router.patch('/modules/:id', requireAuth, requireRole('instructor'), updateModule);
router.delete('/modules/:id', requireAuth, requireRole('instructor'), deleteModule);
export default router;
