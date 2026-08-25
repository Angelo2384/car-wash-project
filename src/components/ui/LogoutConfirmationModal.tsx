import { useEffect, useRef } from 'react';
import { LogOut, X } from 'lucide-react';
import { Button } from './Button';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
}

export default function LogoutConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: LogoutConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus management and Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button initially to prevent accidental Enter submit
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-desc"
        className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden text-left animate-in zoom-in-95 duration-200 transition-colors"
      >
        {/* Top subtle accent gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E86A33] via-orange-400 to-[#E86A33]" />

        {/* Close icon button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#E86A33]/15 border border-[#E86A33]/30 flex items-center justify-center shrink-0 text-[#E86A33]">
            <LogOut className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="logout-dialog-title"
              className="text-xl font-bold font-display text-[#F5F5F5] tracking-tight"
            >
              Are you sure?
            </h3>
            <p
              id="logout-dialog-desc"
              className="text-sm font-semibold text-[#D8D5CF] mt-1"
            >
              Are you sure you want to log out?
            </p>
          </div>
        </div>

        <p className="text-xs text-[#A1A1AA] leading-relaxed mb-6 bg-[#101010] p-3.5 rounded-xl border border-[#2C2C2C]">
          You will need to sign in again to access your account.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            ref={cancelBtnRef}
            type="button"
            variant="outline"
            fullWidth
            onClick={onClose}
            disabled={isLoading}
            className="py-2.5 text-sm !border-[#2C2C2C] hover:!border-[#E86A33] transition-colors"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className="py-2.5 text-sm font-bold bg-[#E86A33] hover:bg-[#cc5a2a] text-white shadow-lg shadow-[#E86A33]/25"
          >
            {isLoading ? 'Logging out...' : 'Log Out'}
          </Button>
        </div>
      </div>
    </div>
  );
}
