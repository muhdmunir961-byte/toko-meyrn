import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  /** Render as a router link instead of a <button>. */
  asChildLink?: boolean;
  to?: string;
}

const baseClass = 'tpt-button';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      startIcon,
      endIcon,
      asChildLink = false,
      to,
      children,
      disabled,
      type = 'button',
      className,
      ...rest
    },
    ref,
  ) {
    const classes = [
      baseClass,
      `${baseClass}--${variant}`,
      `${baseClass}--${size}`,
      fullWidth ? `${baseClass}--full` : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    if (asChildLink && to) {
      return (
        <Link to={to} className={classes} aria-disabled={disabled || undefined}>
          {startIcon && (
            <span className={`${baseClass}__icon`} aria-hidden="true">
              {startIcon}
            </span>
          )}
          <span className={`${baseClass}__label`}>{children}</span>
          {endIcon && (
            <span className={`${baseClass}__icon`} aria-hidden="true">
              {endIcon}
            </span>
          )}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading && <span className={`${baseClass}__spinner`} aria-hidden="true" />}
        {!loading && startIcon && (
          <span className={`${baseClass}__icon`} aria-hidden="true">
            {startIcon}
          </span>
        )}
        <span className={`${baseClass}__label`}>{children}</span>
        {!loading && endIcon && (
          <span className={`${baseClass}__icon`} aria-hidden="true">
            {endIcon}
          </span>
        )}
      </button>
    );
  },
);