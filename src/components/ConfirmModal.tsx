'use client';

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
  /** Si true, n'affiche que le bouton OK (pour message de succès / info). */
  singleButton?: boolean;
};

export function ConfirmModal({
  open,
  title = 'Confirmation',
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
  singleButton = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    /* Fenêtre de la charte : trait fin + ombre large, fond de page flouté derrière. */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div className="fade-in w-full max-w-[520px] overflow-hidden rounded-[14px] border border-[var(--afc-border)] bg-[var(--card)] shadow-lg">
        <div className="px-6 pb-5 pt-6">
          <h2 id="confirm-modal-title" className="font-serif text-xl text-[var(--foreground)]">
            {title}
          </h2>
          <p id="confirm-modal-desc" className="mt-2 text-sm text-[var(--afc-muted)]">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--afc-border)] bg-[var(--secondary)] px-6 py-4">
          {!singleButton && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="afc-button-secondary disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? 'btn-primary bg-[var(--destructive)] text-white hover:bg-[var(--destructive)] disabled:opacity-60'
                : 'btn-primary disabled:opacity-60'
            }
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
