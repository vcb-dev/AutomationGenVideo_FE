'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Sun, SunDim } from 'lucide-react';
import { PRODUCT_BRIGHTNESS_MAX, PRODUCT_BRIGHTNESS_MIN } from '@/lib/product-image/realism';

/** Giữ phím mũi tên hoặc bấm liên tiếp thì đợi dừng tay mới ghép lại. */
const KEYBOARD_COMMIT_DELAY_MS = 400;

interface ProductBrightnessSliderProps {
  value: number;
  /** Ảnh chưa chỉnh tay, đang theo mức tự động. */
  followingAi: boolean;
  /** Tiến độ học hoặc lỗi cấu hình, hiện dưới thanh kéo. */
  hint: string | null;
  /** Có nhiều ảnh trong lô thì hiện nút áp dụng cả lô. */
  canApplyAll: boolean;
  onCommit: (value: number) => void;
  onReset: () => void;
  onApplyAll: (value: number) => void;
}

/** Thanh kéo độ sáng SP: giữ giá trị nháp trong lúc kéo, thả tay mới ghép lại ảnh. */
export function ProductBrightnessSlider({
  value,
  followingAi,
  hint,
  canApplyAll,
  onCommit,
  onReset,
  onApplyAll,
}: ProductBrightnessSliderProps) {
  const [draft, setDraftState] = useState(value);
  const draftRef = useRef(value);
  const dragging = useRef(false);
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ value, onCommit });
  latest.current = { value, onCommit };

  const setDraft = (next: number) => {
    draftRef.current = next;
    setDraftState(next);
  };
  const commit = (next: number) => {
    if (next !== latest.current.value) latest.current.onCommit(next);
  };
  const cancelKey = () => {
    if (keyTimer.current) clearTimeout(keyTimer.current);
    keyTimer.current = null;
  };
  /** Còn thay đổi bàn phím chưa chốt thì chốt ngay (rời ô, đổi ảnh). */
  const flushKey = () => {
    if (!keyTimer.current) return;
    cancelKey();
    commit(draftRef.current);
  };

  useEffect(() => {
    if (!dragging.current && !keyTimer.current) setDraft(value);
  }, [value]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => flushKey, []);
  const endDrag = () => {
    dragging.current = false;
    commit(draft);
  };
  const cancelDrag = () => {
    dragging.current = false;
    setDraft(value);
  };
  const commitKey = () => {
    cancelKey();
    keyTimer.current = setTimeout(flushKey, KEYBOARD_COMMIT_DELAY_MS);
  };

  return (
    <div className="mt-3 rounded-xl border border-[#e2e0ea] bg-[#fafafb] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#464554]">
        <span>Độ sáng sản phẩm</span>
        <span className="tabular-nums">{draft > 0 ? `+${draft}` : draft}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-0 flex-[1_1_180px] items-center gap-2.5">
          <SunDim className="w-4 h-4 flex-none text-[#9c9aa8]" />
          <input
            type="range"
            min={PRODUCT_BRIGHTNESS_MIN}
            max={PRODUCT_BRIGHTNESS_MAX}
            step={1}
            value={draft}
            onChange={(e) => setDraft(Number(e.target.value))}
            onPointerDown={() => {
              dragging.current = true;
            }}
            onPointerUp={endDrag}
            onPointerCancel={cancelDrag}
            onKeyUp={commitKey}
            onBlur={flushKey}
            className="min-w-0 flex-1 accent-[#4441cc]"
            aria-label="Độ sáng sản phẩm"
          />
          <Sun className="w-4 h-4 flex-none text-[#9c9aa8]" />
        </div>
        <button
          type="button"
          onClick={() => {
            cancelKey();
            onReset();
          }}
          disabled={followingAi}
          title="Về độ sáng tự động"
          aria-label="Đặt lại độ sáng"
          className="flex-none p-1.5 rounded-lg border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        {canApplyAll && (
          <button
            type="button"
            onClick={() => {
              cancelKey();
              onApplyAll(draftRef.current);
            }}
            className="flex-none px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc]"
          >
            Áp dụng cả lô
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-[#9c9aa8] break-words">{hint}</p>}
    </div>
  );
}
