import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../lib/theme';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * Responsive marketing navbar. Mobile collapses to a disclosure menu.
 * Rendered on public (marketing/storefront) surfaces; not the dashboard.
 */
export function Navbar({ links }: { links?: { to: string; label: string }[] }) {
  const { isAuthenticated, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  const navLinks = links ?? [];

  return (
    <header className="tpt-navbar">
      <div className="tpt-navbar__inner">
        <Link to="/" className="tpt-navbar__brand">
          <span className="tpt-navbar__logo" aria-hidden="true">
            <Icon name="spark" size={22} />
          </span>
          <span className="tpt-navbar__name">Topup</span>
        </Link>

        <nav className="tpt-navbar__links" aria-label="Primary">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className="tpt-navbar__link">
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="tpt-navbar__actions">
          <button
            type="button"
            className="tpt-icon-btn"
            onClick={toggle}
            aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
          >
            <Icon name={resolved === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          {isAuthenticated ? (
            <>
              <Button asChildLink to="/dash" variant="secondary" size="sm">
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} startIcon={<Icon name="logout" size={16} />}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChildLink to="/login" variant="ghost" size="sm">
                Sign in
              </Button>
              <Button asChildLink to="/register" variant="primary" size="sm">
                Get started
              </Button>
            </>
          )}
          <button
            type="button"
            className="tpt-icon-btn tpt-navbar__menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="navbar-menu"
            aria-label="Toggle navigation menu"
          >
            <Icon name={open ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {open && (
        <div id="navbar-menu" className="tpt-navbar__mobile">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className="tpt-navbar__mobile-link"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}