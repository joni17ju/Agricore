import { Router } from 'express';
import { changePassword, demoAccounts, login, me, register } from '../controllers/auth.controller.js';
import { requestPasswordReset, resetPassword, verifyResetCode } from '../controllers/passwordReset.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/auth/demo-accounts', demoAccounts);
router.post('/auth/login', login);
router.post('/auth/register', register);
// Public by necessity: someone who has forgotten their password cannot hold
// a session. Abuse is bounded by the per-account limits in the controller.
router.post('/auth/forgot-password', requestPasswordReset);
router.post('/auth/verify-reset-code', verifyResetCode);
router.post('/auth/reset-password', resetPassword);
router.get('/auth/me', requireAuth, me);
router.patch('/auth/change-password', requireAuth, changePassword);
export default router;
