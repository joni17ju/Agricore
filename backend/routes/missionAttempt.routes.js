import { Router } from 'express';
import { createMissionAttempt, listMissionAttempts } from '../controllers/missionAttempt.controller.js';
import { requireAuth, requireSelfOrStaff } from '../middleware/auth.js';

const router = Router();
router.get('/missionAttempts', requireAuth, requireSelfOrStaff((req) => req.query.studentId), listMissionAttempts);
router.post('/missionAttempts', requireAuth, requireSelfOrStaff((req) => req.body?.studentId), createMissionAttempt);
export default router;
