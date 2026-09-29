import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService.js';

/**
 * The live unread count, shared by the bell and the notifications page.
 *
 * "Live" here means polled, not pushed — there is no socket layer in this app
 * and one notification bell does not justify adding one. The count refreshes
 * on a timer, whenever the tab regains focus, and immediately after an action
 * that is known to have created something (finishing a mission). Worst case a
 * notification raised by someone else's action appears within POLL_MS.
 */

const NotificationContext = createContext(null);

/** Slow enough to be free, quick enough that the bell is not visibly stale. */
const POLL_MS = 30000;

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const { unreadCount: count } = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // A failed poll is not worth surfacing; the next tick will try again.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }

    refresh();

    /*
     * Polling stops while the tab is hidden — a background tab counting down
     * every 30 seconds is wasted work on both ends — and catches up the moment
     * it comes back, which also covers waking from sleep.
     */
    const start = () => {
      stop();
      timerRef.current = window.setInterval(refresh, POLL_MS);
    };
    const stop = () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        refresh();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
    };
  }, [user, refresh]);

  /** Mark one read; the server returns the recalculated count. */
  const markRead = useCallback(async (notificationId) => {
    // Optimistic, so the badge responds to the click straight away.
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      const { unreadCount: count } = await markNotificationRead(notificationId);
      setUnreadCount(count);
    } catch {
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ unreadCount, refresh, markRead, markAllRead, listNotifications }),
    [unreadCount, refresh, markRead, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside a NotificationProvider');
  return context;
}
