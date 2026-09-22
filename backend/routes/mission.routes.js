import { Router } from 'express';
import { createMission, deleteMission, getMission, listMissions, updateMission } from '../controllers/mission.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/missions', requireAuth, listMissions);
router.get('/missions/:id', requireAuth, getMission);
router.post('/missions', requireAuth, requireRole('instructor', 'admin'), createMission);
router.patch('/missions/:id', requireAuth, requireRole('instructor', 'admin'), updateMission);
router.delete('/missions/:id', requireAuth, requireRole('instructor', 'admin'), deleteMission);
export default router;
