import { Router } from 'express';
import { createUser, deleteUser, getUser, listUsers, updateUser } from '../controllers/user.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
// Listing accounts is a management action, so students are kept out.
router.get('/users', requireAuth, requireRole('instructor'), listUsers);
router.get('/users/:id', requireAuth, getUser);
router.patch('/users/:id', requireAuth, updateUser);
// Creating and deleting accounts moved to the instructor with the
// administrator role; the controller adds the per-target safety rules.
router.post('/users', requireAuth, requireRole('instructor'), createUser);
router.delete('/users/:id', requireAuth, requireRole('instructor'), deleteUser);
export default router;
