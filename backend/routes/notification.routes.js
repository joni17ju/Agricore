import { Router } from 'express';
import { listNotifications, markAllRead, markRead, unreadCount } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
// Every route is scoped to the signed-in user inside the controller; there is
// no id parameter for "whose" notifications, because there is no such thing.
router.get('/notifications', requireAuth, listNotifications);
// Declared before '/notifications/:id/read' so "unread-count" is not read as an id.
router.get('/notifications/unread-count', requireAuth, unreadCount);
router.patch('/notifications/read-all', requireAuth, markAllRead);
router.patch('/notifications/:id/read', requireAuth, markRead);
export default router;
