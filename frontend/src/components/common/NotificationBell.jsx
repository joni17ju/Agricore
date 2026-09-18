import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * Navbar notification bell.
 *
 * ── MOCK / PLACEHOLDER ────────────────────────────────────────────────
 * Nothing here is wired to real data yet: there is no notifications
 * collection, service or backend. The unread count and the rows below are
 * hardcoded so the navbar is visually complete while the feature is built.
 *
 * To wire this up later, replace MOCK_UNREAD_COUNT and MOCK_NOTIFICATIONS
 * with data from a notificationService (and drop the "not connected" note
 * at the bottom of the panel). The markup and styles can stay as they are.
 * ──────────────────────────────────────────────────────────────────────
 */
const MOCK_UNREAD_COUNT = 3;

/**
 * MOCK: sample rows, shaped the way real notifications would be.
 * Kept role-neutral on purpose — the same three rows are shown to students,
 * instructors and admins, so nothing here should read as wrong for any role.
 */
const MOCK_NOTIFICATIONS = [
  { id: 'mock-1', icon: 'file', title: 'New topic published', detail: 'Lesson 3.4 · Vertebrate Pests', when: '2h ago', isUnread: true },
  { id: 'mock-2', icon: 'layers', title: 'Module content updated', detail: 'Module 3 · Agricultural Entomology', when: 'Yesterday', isUnread: true },
  { id: 'mock-3', icon: 'chart', title: 'Weekly summary ready', detail: 'Section BSA 1-A', when: '3d ago', isUnread: true },
];

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

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

  const count = MOCK_UNREAD_COUNT;
  const label = count > 0 ? `Notifications (${count} unread)` : 'Notifications';

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
        {count > 0 && (
          <span className="notif__badge" aria-hidden="true">{count > 9 ? '9+' : count}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif__panel" role="dialog" aria-label="Notifications">
          <header className="notif__head">
            <strong>Notifications</strong>
            {count > 0 && <span className="notif__count">{count} new</span>}
          </header>

          <ul className="notif__list">
            {MOCK_NOTIFICATIONS.map((item, index) => (
              <li key={item.id} className={`notif__item ${item.isUnread ? 'is-unread' : ''} anim-fade-up`} style={{ '--i': index }}>
                <span className="notif__icon"><Icon name={item.icon} size={16} /></span>
                <span className="notif__text">
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <time className="notif__when">{item.when}</time>
              </li>
            ))}
          </ul>

          {/* Remove once notifications are backed by real data. */}
          <footer className="notif__foot">Sample items — notifications are not connected yet.</footer>
        </div>
      )}
    </div>
  );
}
