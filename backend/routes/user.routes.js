import { Router } from 'express';
import { createUser, deleteUser, getUser, listUsers, updateUser } from '../controllers/user.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
// Listing accounts is a management action, so students are kept out.
router.get('/users', requireAuth, requireRole('instructor', 'admin'), listUsers);
router.get('/users/:id', requireAuth, getUser);
router.patch('/users/:id', requireAuth, updateUser);
router.post('/users', requireAuth, requireRole('admin'), createUser);
router.delete('/users/:id', requireAuth, requireRole('admin'), deleteUser);
export default router;
