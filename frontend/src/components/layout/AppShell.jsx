import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABELS } from '../../constants/roles.js';
import { Avatar, Logo } from '../common/Display.jsx';
import { IconButton } from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';

/**
 * Shared shell for the three role layouts: sidebar navigation, top bar with
 * breadcrumb, and the animated content area.
 *
 * @param {{ label: string, items: { to: string, label: string, icon: string, end?: boolean }[] }[]} navGroups
 */
export default function AppShell({ navGroups, topbarRight, homePath, outletContext }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setIsDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const items = navGroups.flatMap((group) => group.items);
  const current = [...items]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`app-shell ${isDrawerOpen ? 'drawer-open' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar__brand">
          <NavLink to={homePath} className="sidebar__logo">
            <Logo light />
          </NavLink>
          <IconButton icon="x" label="Close menu" className="sidebar__close" onClick={() => setIsDrawerOpen(false)} />
        </div>

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
                  title={item.label}
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
            <Avatar firstName={user.firstName} lastName={user.lastName} size={36} />
            <div className="sidebar__user-text">
              <strong>{user.role === 'instructor' ? `Prof. ${user.lastName}` : `${user.firstName} ${user.lastName}`}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
          </div>
          <button type="button" className="sidebar__logout" onClick={handleLogout} title="Log out">
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
            {current && (
              <>
                <Icon name="chevron-right" size={14} />
                <span className="topbar__page">{current.label}</span>
              </>
            )}
          </nav>
          <div className="topbar__right">{topbarRight}</div>
        </header>

        <main className="app-content">
          <div key={location.pathname} className="page-transition">
            <Outlet context={outletContext} />
          </div>
        </main>
      </div>
    </div>
  );
}
