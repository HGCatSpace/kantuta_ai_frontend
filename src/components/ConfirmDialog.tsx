import { AlertTriangle, Loader2 } from 'lucide-react';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <div className="cd-overlay" onClick={onCancel}>
      <div className="cd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className={`cd-dialog__icon-wrap cd-dialog__icon-wrap--${variant}`}>
          <AlertTriangle className="cd-dialog__icon" />
        </div>
        <h2 className="cd-dialog__title">{title}</h2>
        <div className="cd-dialog__body">{message}</div>
        <div className="cd-dialog__actions">
          <button
            className="cd-dialog__cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            className={`cd-dialog__confirm-btn cd-dialog__confirm-btn--${variant}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="cd-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
