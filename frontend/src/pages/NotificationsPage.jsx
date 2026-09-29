import { useCallback, useEffect, useState } from 'react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/common/Display.jsx';
import NotificationItem from '../components/common/NotificationItem.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { listNotifications } from '../services/notificationService.js';
import { dayGroupLabel } from '../utils/format.js';

/**
 * The full notification history, at /<role>/notifications.
 *
 * One page for all three roles: the rows are already scoped to the signed-in
 * user by the server, and a student's badge and an instructor's at-risk alert
 * want exactly the same presentation.
 */

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  useDocumentTitle('Notifications');
  const { unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const [rows, setRows] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const load = useCallback(async (unreadOnly) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listNotifications({ limit: PAGE_SIZE, unreadOnly });
      setRows(data.notifications);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(showUnreadOnly);
  }, [load, showUnreadOnly]);

  /*
   * Paging on the oldest row's timestamp rather than an offset: new rows
   * arriving while you read would shift an offset window and silently skip
   * one.
   */
  const loadMore = async () => {
    const oldest = rows[rows.length - 1];
    if (!oldest) return;
    setIsLoadingMore(true);
    try {
      const data = await listNotifications({
        limit: PAGE_SIZE,
        before: oldest.createdAt,
        unreadOnly: showUnreadOnly,
      });
      setRows((current) => [...current, ...data.notifications]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const activate = (notification) => {
    if (notification.isRead) return;
    markRead(notification._id);
    setRows((current) =>
      current.map((row) => (row._id === notification._id ? { ...row, isRead: true } : row)),
    );
  };

  const readEverything = async () => {
    await markAllRead();
    setRows((current) => current.map((row) => ({ ...row, isRead: true })));
    refresh();
  };

  if (isLoading && rows.length === 0) return <LoadingState label="Loading notifications…" />;
  if (error) return <ErrorState error={error} onRetry={() => load(showUnreadOnly)} />;

  const groups = [];
  for (const row of rows) {
    const heading = dayGroupLabel(row.createdAt);
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.items.push(row);
    else groups.push({ heading, items: [row] });
  }

  return (
    <div className="page notif-page">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" icon="check" onClick={readEverything}>Mark all as read</Button>
          )
        }
      />

      <Card className="anim-fade-up">
        <div className="notif-page__filters">
          <button
            type="button"
            className={`notif-page__filter ${showUnreadOnly ? '' : 'is-active'}`}
            onClick={() => setShowUnreadOnly(false)}
          >
            All
          </button>
          <button
            type="button"
            className={`notif-page__filter ${showUnreadOnly ? 'is-active' : ''}`}
            onClick={() => setShowUnreadOnly(true)}
          >
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="bell"
            title={showUnreadOnly ? 'Nothing unread' : 'No notifications yet'}
            message={
              showUnreadOnly
                ? 'Everything here has been read.'
                : 'Finish a mission or earn a badge and it will appear here.'
            }
          />
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.heading} className="notif-page__group">
                <h2 className="notif-page__group-head">{group.heading}</h2>
                <ul className="notif-page__list">
                  {group.items.map((row, index) => (
                    <li key={row._id} className="anim-fade-up" style={{ '--i': Math.min(index, 8) }}>
                      <NotificationItem notification={row} onActivate={activate} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {hasMore && (
              <div className="notif-page__more">
                <Button variant="secondary" onClick={loadMore} isLoading={isLoadingMore}>
                  Load older notifications
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
