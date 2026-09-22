import { Router } from 'express';
import { changePassword, demoAccounts, login, me, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/auth/demo-accounts', demoAccounts);
router.post('/auth/login', login);
router.post('/auth/register', register);
router.get('/auth/me', requireAuth, me);
router.post('/auth/change-password', requireAuth, changePassword);
export default router;
