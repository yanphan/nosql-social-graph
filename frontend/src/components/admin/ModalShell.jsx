import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2';

const SIZES = { md: 'max-w-md', lg: 'max-w-2xl' };

// Khung hộp thoại dùng chung: Esc để đóng, bấm nền để đóng, giữ Tab trong hộp, trả focus về nút đã mở
export function ModalShell({ titleId, descId, onClose, children, busy = false, size = 'md' }) {
  const panelRef = useRef(null);
  // Giữ giá trị mới nhất trong ref để effect chỉ chạy một lần khi mở/đóng
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };

  useEffect(() => {
    const opener = document.activeElement;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !latest.current.busy) latest.current.onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[rgba(15,23,42,0.5)]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`bg-white border border-[#E5E9F0] rounded-[16px] p-6 ${SIZES[size] ?? SIZES.md} w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({ titleId, descId, title, description, onClose, busy }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#E5E9F0] pb-3">
      <div className="min-w-0">
        <h3 id={titleId} className="font-semibold text-base text-[#0F172A] break-words">
          {title}
        </h3>
        <p id={descId} className="text-xs text-[#475569] mt-0.5">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        aria-label="Đóng hộp thoại"
        className={`text-[#64748B] hover:text-[#0F172A] p-1 rounded-md shrink-0 ${focusRing}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-[10px] px-3 py-2">
      {children}
    </p>
  );
}

export const btnSecondary = `h-9 px-4 rounded-[10px] text-xs font-medium text-[#334155] border border-[#E5E9F0] hover:bg-[#F8FAFC] disabled:opacity-60 ${focusRing}`;
export const btnDanger = `h-9 px-4 rounded-[10px] text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:text-slate-600 ${focusRing}`;
export const btnPrimary = `h-9 px-4 rounded-[10px] text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-300 disabled:text-slate-600 ${focusRing}`;
