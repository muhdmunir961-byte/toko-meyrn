import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

/**
 * Accessible modal dialog: focus trap, Escape to close, backdrop click to
 * close, focus restore on unmount, ARIA wiring (`role="dialog"`,
 * `aria-modal`, labelled by title).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      cancelAnimationFrame(raf);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="tpt-dialog__overlay" onClick={onClose}>
      <div
        className={`tpt-dialog tpt-dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tpt-dialog__header">
          <h2 className="tpt-dialog__title" id={titleId}>
            {title}
          </h2>
          {description && (
            <p className="tpt-dialog__description" id={descId}>
              {description}
            </p>
          )}
          <button
            type="button"
            className="tpt-dialog__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {children && <div className="tpt-dialog__body">{children}</div>}
        {footer && <footer className="tpt-dialog__footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function DialogConfirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="tpt-dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    />
  );
}