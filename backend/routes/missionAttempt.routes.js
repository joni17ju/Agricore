import { Router } from 'express';
import { createMissionAttempt, listMissionAttempts, startMissionAttempt } from '../controllers/missionAttempt.controller.js';
import { requireAuth, requireSelfOrStaff } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

/*
 * Generous for real play (a level takes a minute or more), tight enough that
 * a script hammering start or submit is cut off.
 */
const startLimit = rateLimit({ name: 'mission-start', windowMs: 5 * 60 * 1000, max: 40 });
const submitLimit = rateLimit({ name: 'mission-submit', windowMs: 5 * 60 * 1000, max: 30 });

const router = Router();
router.get('/missionAttempts', requireAuth, requireSelfOrStaff((req) => req.query.studentId), listMissionAttempts);
// Declared before any '/missionAttempts/:id' route could shadow "start".
router.post('/missionAttempts/start', requireAuth, startLimit, startMissionAttempt);
router.post('/missionAttempts', requireAuth, submitLimit, requireSelfOrStaff((req) => req.body?.studentId), createMissionAttempt);
export default router;
