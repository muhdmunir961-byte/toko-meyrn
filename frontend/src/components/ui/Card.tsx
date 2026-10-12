import type { HTMLAttributes, ReactNode } from 'react';

export function Card({
  children,
  className,
  interactive = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
}) {
  return (
    <div
      className={`tpt-card${interactive ? ' tpt-card--interactive' : ''} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="tpt-card__header">
      <div className="tpt-card__heading">
        <h3 className="tpt-card__title">{title}</h3>
        {subtitle && <p className="tpt-card__subtitle">{subtitle}</p>}
      </div>
      {action && <div className="tpt-card__action">{action}</div>}
    </div>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="tpt-card__body">{children}</div>;
}