'use client';

import { ReactNode, useEffect } from 'react';
import { Minimize2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Số còn lại trong vòng quay, hiện góc trên để khán giả biết còn bao nhiêu lượt. */
  poolLabel: string;
  poolCount: number;
  children: ReactNode;
}

/**
 * Chế độ trình chiếu: giấu toàn bộ giao diện quản trị, chỉ để lại bánh xe trên nền tối.
 *
 * Trang mặc định là màn hình quản trị — có header, menu, bảng biểu — nên khi chiếu lên máy
 * chiếu thì phần lớn diện tích đang phục vụ thứ khán giả không cần thấy, còn bánh xe thì bé.
 * Ở đây bánh xe chiếm gần hết chiều cao màn hình.
 */
export function PresentationStage({ open, onClose, poolLabel, poolCount, children }: Props) {
  // Esc để thoát: MC đứng xa laptop, bấm phím dễ hơn tìm nút.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Khoá cuộn nền để không lỡ tay cuộn lệch giữa lúc đang chiếu.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-[#0B0E14] px-6 py-8">
      <div className="absolute left-8 top-7 flex items-baseline gap-3">
        <span className="text-[44px] font-bold leading-none tracking-[-0.02em] text-[#F4B63D]">{poolCount}</span>
        <span className="text-[17px] text-white/45">{poolLabel}</span>
      </div>

      <button
        type="button"
        onClick={onClose}
        title="Thoát trình chiếu (Esc)"
        className="absolute right-8 top-7 flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 text-white/50 transition-colors hover:border-white/30 hover:text-white"
      >
        <Minimize2 className="h-5 w-5" strokeWidth={1.8} />
      </button>

      {children}
    </div>
  );
}
