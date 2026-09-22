import { Router } from 'express';
import { listProgress, upsertProgress } from '../controllers/progress.controller.js';
import { requireAuth, requireSelfOrStaff } from '../middleware/auth.js';

const router = Router();
router.get('/progress', requireAuth, requireSelfOrStaff((req) => req.query.studentId), listProgress);
router.patch('/progress', requireAuth, requireSelfOrStaff((req) => req.body?.studentId), upsertProgress);
export default router;
