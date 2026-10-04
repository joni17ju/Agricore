import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { formatRelativeTime } from '../../utils/format.js';

/**
 * One notification row, shared by the bell dropdown and the full page.
 *
 * Deliberately off-brand: everything else in AgriCore is green, so
 * notifications use indigo as their accent with a per-type colour on the icon
 * chip. That keeps them from reading as just more of the same green furniture.
 */

/** Icon and colour per notification type. Unknown types fall back to neutral. */
export const NOTIFICATION_STYLES = {
  'badge-earned': { icon: 'medal', tone: 'violet' },
  'mission-passed': { icon: 'target', tone: 'blue' },
  'module-cleared': { icon: 'layers', tone: 'indigo' },
  'student-at-risk': { icon: 'alert', tone: 'amber' },
  'account-request': { icon: 'user-plus', tone: 'amber' },
  'account-approved': { icon: 'check-circle', tone: 'indigo' },
};

const FALLBACK = { icon: 'bell', tone: 'slate' };

export default function NotificationItem({ notification, onActivate, compact = false }) {
  const style = NOTIFICATION_STYLES[notification.type] ?? FALLBACK;
  const isUnread = !notification.isRead;

  const body = (
    <>
      <span className={`notif-item__icon notif-item__icon--${style.tone}`}>
        <Icon name={style.icon} size={compact ? 16 : 18} />
      </span>
      <span className="notif-item__text">
        <strong>{notification.title}</strong>
        {notification.body && <small>{notification.body}</small>}
      </span>
      <span className="notif-item__meta">
        <time dateTime={notification.createdAt}>{formatRelativeTime(notification.createdAt)}</time>
        {/* Announced for screen readers; the dot alone is purely visual. */}
        {isUnread && <span className="notif-item__dot"><span className="sr-only">Unread</span></span>}
      </span>
    </>
  );

  const className = `notif-item ${isUnread ? 'is-unread' : ''} ${compact ? 'notif-item--compact' : ''}`;

  /*
   * A row with somewhere to go is a link; one without is a button, so that
   * marking it read is still reachable by keyboard either way.
   */
  if (notification.link) {
    return (
      <Link to={notification.link} className={className} onClick={() => onActivate?.(notification)}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={() => onActivate?.(notification)}>
      {body}
    </button>
  );
}
