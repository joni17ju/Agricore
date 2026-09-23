import { Router } from 'express';
import { createLesson, deleteLesson, getLesson, listLessons, reorderLessons, updateLesson } from '../controllers/lesson.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/lessons', requireAuth, listLessons);
router.get('/lessons/:id', requireAuth, getLesson);
router.post('/lessons', requireAuth, requireRole('instructor', 'admin'), createLesson);
router.patch('/lessons/reorder', requireAuth, requireRole('instructor', 'admin'), reorderLessons);
router.patch('/lessons/:id', requireAuth, requireRole('instructor', 'admin'), updateLesson);
router.delete('/lessons/:id', requireAuth, requireRole('instructor', 'admin'), deleteLesson);
export default router;
