import { Fragment, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { BreadcrumbProvider, useBreadcrumbTrail } from '../../context/BreadcrumbContext.jsx';
import { ROLE_LABELS } from '../../constants/roles.js';
import { Avatar, Logo } from '../common/Display.jsx';
import { IconButton } from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';
import NotificationBell from '../common/NotificationBell.jsx';
import ScrollToTopButton from '../common/ScrollToTopButton.jsx';

/**
 * Shared shell for the three role layouts: sidebar navigation, top bar with
 * breadcrumb, and the animated content area.
 *
 * @param {{ label: string, items: { to: string, label: string, icon: string, end?: boolean }[] }[]} navGroups
 */
export default function AppShell(props) {
  return (
    <BreadcrumbProvider>
      <AppShellInner {...props} />
    </BreadcrumbProvider>
  );
}

/**
 * Remembers the desktop sidebar choice between visits.
 *
 * Read once during the initial state, so a collapsed sidebar is collapsed on
 * the very first paint rather than flashing open. Storage can throw in a
 * private window or with site data blocked, so every access is guarded and the
 * fallback is simply "expanded".
 */
const SIDEBAR_KEY = 'agricore.sidebar-collapsed';

function readCollapsedPreference() {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === 'true';
  } catch {
    return false;
  }
}

function AppShellInner({ navGroups, topbarRight, homePath, outletContext }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readCollapsedPreference);
  /*
   * The width transition is suppressed until after the first paint. Without
   * this, loading a page with the sidebar already collapsed animates it in
   * from full width on every single navigation, which reads as a glitch.
   */
  const [canAnimate, setCanAnimate] = useState(false);
  const pageTrail = useBreadcrumbTrail();

  useEffect(() => {
    setIsDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setCanAnimate(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {
        // Storage unavailable: the choice still applies for this session.
      }
      return next;
    });
  };

  const items = navGroups.flatMap((group) => group.items);
  const current = [...items]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));

  // A page can extend the breadcrumb (e.g. into a lesson); otherwise show the nav item.
  const crumbs = pageTrail.length > 0 ? pageTrail : current ? [{ label: current.label }] : [];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className={[
        'app-shell',
        isDrawerOpen ? 'drawer-open' : '',
        isCollapsed ? 'sidebar-collapsed' : '',
        canAnimate ? 'sidebar-animated' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar__brand">
          <NavLink to={homePath} className="sidebar__logo">
            <Logo light />
          </NavLink>
          <IconButton icon="x" label="Close menu" className="sidebar__close" onClick={() => setIsDrawerOpen(false)} />
        </div>

        {/*
          Docked on the seam rather than inside the brand row: it keeps the
          same position and size in both states, so it never moves out from
          under the cursor. Hidden by CSS below the desktop breakpoint, where
          the rail and drawer already decide the width themselves.
        */}
        <button
          type="button"
          className="sidebar__collapse"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={isCollapsed ? 'chevron-right' : 'chevron-left'} size={16} />
        </button>

        <nav className="sidebar__nav">
          {navGroups.map((group) => (
            <div key={group.label} className="sidebar__group">
              <span className="sidebar__group-label">{group.label}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
                  // data-label feeds the CSS tooltip shown when the sidebar is
                  // collapsed; no title, whose delay makes it useless here.
                  data-label={item.label}
                >
                  <Icon name={item.icon} size={20} />
                  <span className="sidebar__link-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <Avatar firstName={user.firstName} lastName={user.lastName} size={36} src={user.avatarUrl} />
            <div className="sidebar__user-text">
              <strong>{user.role === 'instructor' ? `Prof. ${user.lastName}` : `${user.firstName} ${user.lastName}`}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
          </div>
          <button type="button" className="sidebar__logout" onClick={handleLogout} data-label="Log out">
            <Icon name="logout" size={18} />
            <span className="sidebar__link-label">Log out</span>
          </button>
        </div>
      </aside>

      <div className="drawer-scrim" onClick={() => setIsDrawerOpen(false)} aria-hidden="true" />

      <div className="app-main">
        <header className="topbar">
          <IconButton icon="menu" label="Open menu" className="topbar__menu" onClick={() => setIsDrawerOpen(true)} />
          <nav className="topbar__crumbs" aria-label="Breadcrumb">
            <span className="topbar__course">Principles of Crop Protection I</span>
            {crumbs.map((crumb, index) => (
              <Fragment key={crumb.label}>
                <Icon name="chevron-right" size={14} />
                {crumb.to && index < crumbs.length - 1 ? (
                  <Link to={crumb.to} className="topbar__crumb">{crumb.label}</Link>
                ) : (
                  <span className="topbar__page">{crumb.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
          <div className="topbar__right">
            <NotificationBell />
            {topbarRight}
          </div>
        </header>

        <main className="app-content">
          <div key={location.pathname} className="page-transition">
            <Outlet context={outletContext} />
          </div>
        </main>
      </div>

      <ScrollToTopButton />
    </div>
  );
}
