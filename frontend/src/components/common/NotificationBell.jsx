import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import NotificationItem from './NotificationItem.jsx';
import { ROLE_HOME } from '../../constants/roles.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { PANEL_LIMIT, listNotifications } from '../../services/notificationService.js';
import { dayGroupLabel } from '../../utils/format.js';

/**
 * Navbar notification bell.
 *
 * The badge count comes from NotificationContext, which polls, so it stays
 * current without this component doing anything. The rows themselves are only
 * fetched when the panel is opened — there is no reason to carry a list around
 * for a dropdown most page views never open.
 */
export default function NotificationBell() {
  const { user } = useAuth();
  const { unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const wrapperRef = useRef(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await listNotifications({ limit: PANEL_LIMIT });
      setRows(data.notifications);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on open, and again whenever the count changes while open — that is
  // what makes a notification arriving mid-session show up without a refresh.
  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, unreadCount, load]);

  // Close on outside click or Escape, the same way the drawer and modals behave.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const activate = (notification) => {
    if (!notification.isRead) {
      markRead(notification._id);
      setRows((current) =>
        current.map((row) => (row._id === notification._id ? { ...row, isRead: true } : row)),
      );
    }
    setIsOpen(false);
  };

  const readEverything = async () => {
    await markAllRead();
    setRows((current) => current.map((row) => ({ ...row, isRead: true })));
    refresh();
  };

  const label = unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications';
  const allPath = `${ROLE_HOME[user.role]}/notifications`;

  // Group by day so a long-ish list still reads as a timeline.
  const groups = [];
  for (const row of rows) {
    const heading = dayGroupLabel(row.createdAt);
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.items.push(row);
    else groups.push({ heading, items: [row] });
  }

  return (
    <div className="notif" ref={wrapperRef}>
      <button
        type="button"
        className={`icon-btn icon-btn--outline notif__trigger ${isOpen ? 'is-open' : ''}`}
        aria-label={label}
        title={label}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Icon name="bell" size={21} />
        {unreadCount > 0 && (
          <span className="notif__badge" aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif__panel" role="dialog" aria-label="Notifications">
          <header className="notif__head">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" className="notif__mark-all" onClick={readEverything}>
                Mark all as read
              </button>
            )}
          </header>

          {isLoading && rows.length === 0 && <p className="notif__empty">Loading…</p>}
          {error && !isLoading && <p className="notif__empty">{error}</p>}

          {!isLoading && !error && rows.length === 0 && (
            <div className="notif__empty notif__empty--none">
              <Icon name="bell" size={24} />
              <p>Nothing yet. Finish a mission and this is where it shows up.</p>
            </div>
          )}

          {groups.map((group) => (
            <section key={group.heading} className="notif__group">
              <h3 className="notif__group-head">{group.heading}</h3>
              <ul className="notif__list">
                {group.items.map((row, index) => (
                  <li key={row._id} className="anim-fade-up" style={{ '--i': index }}>
                    <NotificationItem notification={row} onActivate={activate} compact />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {(hasMore || rows.length > 0) && (
            <footer className="notif__foot">
              <Link to={allPath} onClick={() => setIsOpen(false)}>View all notifications</Link>
            </footer>
          )}
        </div>
      )}
    </div>
  );
}
