import { ReactNode, useEffect } from 'react';
import { Minimize2, Shuffle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Số còn lại trong vòng quay, hiện góc trên để khán giả biết còn bao nhiêu lượt. */
  poolLabel: string;
  poolCount: number;
  onShuffle?: () => void;
  children: ReactNode;
}

/**
 * Chế độ trình chiếu: giấu toàn bộ giao diện quản trị, chỉ để lại bánh xe trên nền tối.
 *
 * Trang mặc định là màn hình quản trị — có header, menu, bảng biểu — nên khi chiếu lên máy
 * chiếu thì phần lớn diện tích đang phục vụ thứ khán giả không cần thấy, còn bánh xe thì bé.
 * Ở đây bánh xe chiếm gần hết chiều cao màn hình.
 */
export function PresentationStage({ open, onClose, poolLabel, poolCount, onShuffle, children }: Props) {
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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-[#0B0E14] px-6 py-8">
      <div className="absolute left-8 top-6 flex items-baseline gap-3">
        <span className="text-[44px] font-bold leading-none tracking-[-0.02em] text-[#F4B63D]">{poolCount}</span>
        <span className="text-[17px] text-white/45">{poolLabel}</span>
      </div>

      <div className="absolute right-8 top-6 flex items-center gap-3">
        {onShuffle && (
          <button
            type="button"
            onClick={onShuffle}
            title="Xáo trộn vị trí các ô"
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3.5 py-2.5 text-[14px] font-medium text-white/80 shadow-md backdrop-blur-sm transition-all hover:border-[#F4B63D] hover:bg-[#F4B63D]/15 hover:text-[#F4B63D]"
          >
            <Shuffle className="h-4 w-4" strokeWidth={2} />
            <span>Xáo trộn</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          title="Thoát trình chiếu (Esc)"
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3.5 py-2.5 text-[14px] font-medium text-white/80 shadow-md backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/15 hover:text-white"
        >
          <Minimize2 className="h-4 w-4" strokeWidth={2} />
          <span>Thoát (Esc)</span>
        </button>
      </div>

      {children}
    </div>
  );
}


