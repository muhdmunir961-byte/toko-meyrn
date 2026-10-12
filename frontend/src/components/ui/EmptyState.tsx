import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="tpt-empty">
      {icon && <div className="tpt-empty__icon" aria-hidden="true">{icon}</div>}
      <h3 className="tpt-empty__title">{title}</h3>
      {description && <p className="tpt-empty__description">{description}</p>}
      {action && <div className="tpt-empty__action">{action}</div>}
    </div>
  );
}