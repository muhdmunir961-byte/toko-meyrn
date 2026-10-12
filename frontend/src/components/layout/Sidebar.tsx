import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DASHBOARD_NAV, filterNav } from '../../auth/permissions';
import { useTheme } from '../../lib/theme';
import { Icon, type IconName } from '../ui/Icon';

/**
 * Dashboard sidebar. Desktop: fixed rail. Mobile/tablet: off-canvas drawer
 * toggled by a hamburger in the app bar.
 */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const items = filterNav(DASHBOARD_NAV, session);

  const content = (
    <div className="tpt-sidebar__content">
      <div className="tpt-sidebar__brand">
        <Icon name="spark" size={22} />
        <span>Topup</span>
      </div>

      <nav className="tpt-sidebar__nav" aria-label="Dashboard">
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            className={({ isActive }) =>
              `tpt-sidebar__item${isActive ? ' tpt-sidebar__item--active' : ''}`
            }
            onClick={onClose}
          >
            <Icon name={(item.icon as IconName) ?? 'grid'} size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="tpt-sidebar__footer">
        <button
          type="button"
          className="tpt-sidebar__item tpt-sidebar__item--plain"
          onClick={toggle}
        >
          <Icon name={resolved === 'dark' ? 'sun' : 'moon'} size={18} />
          <span>{resolved === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button
          type="button"
          className="tpt-sidebar__item tpt-sidebar__item--plain"
          onClick={logout}
        >
          <Icon name="logout" size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="tpt-sidebar tpt-sidebar--desktop">{content}</aside>
      {open && (
        <div className="tpt-sidebar__drawer">
          <div className="tpt-sidebar__backdrop" onClick={onClose} aria-hidden="true" />
          <aside className="tpt-sidebar tpt-sidebar--mobile">{content}</aside>
        </div>
      )}
    </>
  );
}