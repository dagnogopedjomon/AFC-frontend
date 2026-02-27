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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-[var(--foreground)] mb-2">
          {title}
        </h2>
        <p id="confirm-modal-desc" className="text-slate-600 text-sm mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          {!singleButton && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-60"
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
                ? 'px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-medium disabled:opacity-60'
                : 'px-4 py-2 rounded-xl bg-[var(--sky-blue)] text-white hover:bg-[var(--sky-blue-dark)] font-medium disabled:opacity-60'
            }
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
