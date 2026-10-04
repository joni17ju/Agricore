import { Router } from 'express';
import { createLesson, deleteLesson, getLesson, listLessons, reorderLessons, updateLesson } from '../controllers/lesson.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/lessons', requireAuth, listLessons);
router.get('/lessons/:id', requireAuth, getLesson);
router.post('/lessons', requireAuth, requireRole('instructor'), createLesson);
router.patch('/lessons/reorder', requireAuth, requireRole('instructor'), reorderLessons);
router.patch('/lessons/:id', requireAuth, requireRole('instructor'), updateLesson);
router.delete('/lessons/:id', requireAuth, requireRole('instructor'), deleteLesson);
export default router;
