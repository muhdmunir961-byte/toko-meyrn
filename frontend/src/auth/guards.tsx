import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Route guards. Authorization is ultimately enforced by the backend; these
 * guards only shape the client UI (redirects + permission-aware nav). Role
 * names match the Prisma `Role` enum: SUPER_ADMIN, OWNER, STAFF, CUSTOMER.
 */

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
  fallback = <Navigate to="/dash" replace />,
}: {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { session } = useAuth();
  if (!session || !roles.includes(session.role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

/** Owner/staff are the only tenant-facing roles with dashboard access today. */
export const TENANT_ROLES = ['OWNER', 'STAFF'] as const;
export const ADMIN_ROLES = ['SUPER_ADMIN'] as const;

export function hasRole(sessionRole: string | undefined, allowed: readonly string[]): boolean {
  return !!sessionRole && (allowed as readonly string[]).includes(sessionRole);
}