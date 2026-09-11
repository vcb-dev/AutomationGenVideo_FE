'use client';

import { ReactNode, useEffect } from 'react';
import { X, CircleNotch } from '@phosphor-icons/react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'emerald' | 'danger' | 'primary';
  icon?: ReactNode;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'emerald',
  icon,
  isLoading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBox: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
          btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
        };
      case 'primary':
        return {
          iconBox: 'bg-primary/10 text-primary border border-primary/20',
          btnConfirm: 'bg-primary hover:opacity-90 text-primary-foreground shadow-primary/20',
        };
      case 'emerald':
      default:
        return {
          iconBox: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
          btnConfirm: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div className="flex items-start gap-3.5">
            {icon && (
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${styles.iconBox}`}>
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-foreground leading-snug">{title}</h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {description}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 -mr-1 -mt-1 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-3.5 border-t border-border bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer ${styles.btnConfirm}`}
          >
            {isLoading && <CircleNotch size={14} className="animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
