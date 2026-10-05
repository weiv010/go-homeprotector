import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  onClose(): void;
  children: ReactNode;
  footer?: ReactNode;
}

/** 화면 아래에서 올라오는 도트 창 */
export function Modal({ title, onClose, children, footer }: Props) {
  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal pixel-box" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmProps {
  message: ReactNode;
  confirmLabel?: string;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ message, confirmLabel = '확인', onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="modal-backdrop center" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="confirm pixel-box" role="alertdialog">
        <p>{message}</p>
        <div className="row gap">
          <button className="btn" onClick={onCancel}>
            취소
          </button>
          <button className="btn danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
