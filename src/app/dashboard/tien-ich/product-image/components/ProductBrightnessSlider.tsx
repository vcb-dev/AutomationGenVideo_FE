'use client';

import { useState } from 'react';
import { RotateCcw, Sun, SunDim } from 'lucide-react';
import { PRODUCT_BRIGHTNESS_MAX, PRODUCT_BRIGHTNESS_MIN } from '@/lib/product-image/realism';

interface ProductBrightnessSliderProps {
  value: number;
  /** Ảnh chưa chỉnh tay, đang theo mức tự động. */
  followingAi: boolean;
  /** Tiến độ học hoặc lỗi cấu hình, hiện dưới thanh kéo. */
  hint: string | null;
  disabled: boolean;
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
  disabled,
  canApplyAll,
  onCommit,
  onReset,
  onApplyAll,
}: ProductBrightnessSliderProps) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <div className="mt-3 rounded-xl border border-[#e2e0ea] bg-[#fafafb] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#464554]">
        <span>Độ sáng sản phẩm</span>
        <span className="tabular-nums">{draft > 0 ? `+${draft}` : draft}</span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <SunDim className="w-4 h-4 flex-none text-[#9c9aa8]" />
        <input
          type="range"
          min={PRODUCT_BRIGHTNESS_MIN}
          max={PRODUCT_BRIGHTNESS_MAX}
          step={1}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          className="flex-1 accent-[#4441cc] disabled:opacity-40"
          aria-label="Độ sáng sản phẩm"
        />
        <Sun className="w-4 h-4 flex-none text-[#9c9aa8]" />
        <button
          type="button"
          onClick={onReset}
          disabled={disabled || followingAi}
          title="Về độ sáng tự động"
          aria-label="Đặt lại độ sáng"
          className="flex-none p-1.5 rounded-lg border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        {canApplyAll && (
          <button
            type="button"
            onClick={() => onApplyAll(draft)}
            disabled={disabled}
            className="flex-none px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40"
          >
            Áp dụng cả lô
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-[#9c9aa8]">{hint}</p>}
    </div>
  );
}
