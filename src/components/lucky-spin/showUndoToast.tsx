'use client';

import { CheckCircle2, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';

/** Đủ lâu để nhận ra mình bấm nhầm, đủ ngắn để không che màn hình lúc đang dẫn chương trình. */
const UNDO_WINDOW_MS = 10_000;

/**
 * Báo kết quả kèm một đường lùi.
 *
 * Xác nhận một lượt quay là thao tác không hoàn tác được, mà lại đang bấm trước cả hội trường —
 * đúng hoàn cảnh dễ bấm nhầm nhất. Nút "Hoàn tác" gọi thẳng việc hủy kết quả ở server.
 */
export function showUndoToast(message: string, undo: () => Promise<unknown>) {
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-4 rounded-[14px] border border-[#E8EBEF] bg-white py-3 pl-4 pr-3 shadow-[0_10px_28px_rgba(17,24,39,0.12)] dark:border-white/[0.09] dark:bg-[#141821] ${
          t.visible ? 'animate-in fade-in slide-in-from-bottom-2' : 'opacity-0'
        }`}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22C55E]" strokeWidth={1.8} />
        <span className="text-[15px] text-[#111827] dark:text-gray-100">{message}</span>
        <button
          type="button"
          onClick={async () => {
            toast.dismiss(t.id);
            try {
              await undo();
              toast.success('Đã hoàn tác lượt quay.');
            } catch {
              toast.error('Không hoàn tác được, thử hủy kết quả ở tab Lịch sử.');
            }
          }}
          className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[#D6DAE1] px-3 py-1.5 text-[13px] font-semibold text-[#111827] transition-colors hover:border-[#F4B63D] hover:bg-[#FFF8E7] dark:border-white/[0.12] dark:text-gray-200"
        >
          <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
          Hoàn tác
        </button>
      </div>
    ),
    { duration: UNDO_WINDOW_MS },
  );
}
