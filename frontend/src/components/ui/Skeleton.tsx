import type { CSSProperties } from 'react';

export function Skeleton({
  width,
  height,
  variant = 'text',
  className,
  style,
}: {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circle' | 'rect';
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`tpt-skeleton tpt-skeleton--${variant} ${className ?? ''}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonLine({ lines = 3 }: { lines?: number }) {
  return (
    <div className="tpt-skeleton__group" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}