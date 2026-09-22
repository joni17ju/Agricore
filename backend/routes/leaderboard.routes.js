import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/leaderboard', requireAuth, getLeaderboard);
export default router;
