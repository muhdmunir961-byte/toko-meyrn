import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  startAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, startAdornment, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className={`tpt-field${error ? ' tpt-field--error' : ''}`}>
      {label && (
        <label className="tpt-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="tpt-field__control">
        {startAdornment && (
          <span className="tpt-field__adornment" aria-hidden="true">
            {startAdornment}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`tpt-input ${className ?? ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </div>
      {error ? (
        <p className="tpt-field__message tpt-field__message--error" id={`${inputId}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="tpt-field__message" id={`${inputId}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});