import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
// Scoped to the signed-in student inside the controller; no id parameter.
router.get('/dashboard', requireAuth, getDashboard);
export default router;
