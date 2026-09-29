/**
 * Notifications for the signed-in user.
 *
 * Every endpoint is scoped to the session on the server, so nothing here takes
 * a user id — there is no way to ask for someone else's notifications.
 * Notifications are never created from the client; they are written by
 * server-side events (passing a mission, earning a badge, a student joining a
 * section) and only read and marked here.
 */
import { api } from './apiClient.js';

/** How many rows the bell dropdown shows before "View all". */
export const PANEL_LIMIT = 6;

/**
 * @param {{ limit?: number, before?: string, unreadOnly?: boolean }} options
 * @returns {Promise<{ notifications: object[], hasMore: boolean, unreadCount: number }>}
 */
export function listNotifications({ limit, before, unreadOnly } = {}) {
  return api.get('/notifications', {
    limit,
    before,
    unreadOnly: unreadOnly ? 'true' : undefined,
  });
}

export function getUnreadCount() {
  return api.get('/notifications/unread-count');
}

/** Resolves with the updated row and the recalculated unread count. */
export function markNotificationRead(notificationId) {
  return api.patch(`/notifications/${notificationId}/read`);
}

export function markAllNotificationsRead() {
  return api.patch('/notifications/read-all');
}
