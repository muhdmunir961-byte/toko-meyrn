import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ADMIN_NAV, DASHBOARD_NAV, filterNav, resolveActiveNavItem } from '../../auth/permissions';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../ui/Icon';
import { Sidebar } from './Sidebar';

export function DashboardShell({ admin = false }: { admin?: boolean }) {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = filterNav(admin ? ADMIN_NAV : DASHBOARD_NAV, session);
  const active = resolveActiveNavItem(items, pathname);

  return (
    <div className="tpt-shell">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="tpt-shell__main">
        <div className="tpt-appbar">
          <button
            type="button"
            className="tpt-icon-btn tpt-appbar__menu"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
          <h1 className="tpt-appbar__title">{active?.label ?? (admin ? 'Admin' : 'Dashboard')}</h1>
        </div>
        <Outlet />
      </div>
    </div>
  );
}