import { Notification } from '../models/index.js';
import { httpError, toObjectId } from '../utils/http.js';

/**
 * Reading and clearing your own notifications.
 *
 * Every query here is scoped to req.user._id rather than to an id from the
 * request, so there is no route on which one user can see or modify another's
 * notifications — not even an administrator. Nothing is created here; rows are
 * written only by server-side events through utils/notify.js.
 */

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/notifications?limit=&before=&unreadOnly=
 *
 * Newest first. `before` is an ISO date for cursor paging — it pages on
 * createdAt rather than a numeric offset so that rows arriving mid-scroll
 * cannot shift the window and cause a page to be skipped.
 */
export async function listNotifications(req, res) {
  const { limit, before, unreadOnly } = req.query ?? {};

  const parsedLimit = Number.parseInt(limit, 10);
  const take = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const query = { userId: req.user._id };
  if (unreadOnly === 'true') query.isRead = false;
  if (before) {
    const cursor = new Date(before);
    if (Number.isNaN(cursor.getTime())) throw httpError(400, 'before must be a date.');
    query.createdAt = { $lt: cursor };
  }

  // One extra row tells us whether another page exists without a second count.
  const rows = await Notification.find(query).sort({ createdAt: -1 }).limit(take + 1);
  const hasMore = rows.length > take;
  const notifications = hasMore ? rows.slice(0, take) : rows;

  res.json({
    notifications,
    hasMore,
    unreadCount: await Notification.countDocuments({ userId: req.user._id, isRead: false }),
  });
}

/** GET /api/notifications/unread-count — the bell polls this. */
export async function unreadCount(req, res) {
  res.json({ unreadCount: await Notification.countDocuments({ userId: req.user._id, isRead: false }) });
}

/** PATCH /api/notifications/:id/read */
export async function markRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    // The userId in the filter is what makes this safe: another user's id
    // simply matches nothing, so it 404s rather than updating their row.
    { _id: toObjectId(req.params.id, 'notification id'), userId: req.user._id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true },
  );
  if (!notification) throw httpError(404, 'Notification not found.');

  res.json({
    notification,
    unreadCount: await Notification.countDocuments({ userId: req.user._id, isRead: false }),
  });
}

/** PATCH /api/notifications/read-all */
export async function markAllRead(req, res) {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
  res.json({ updated: result.modifiedCount ?? 0, unreadCount: 0 });
}
