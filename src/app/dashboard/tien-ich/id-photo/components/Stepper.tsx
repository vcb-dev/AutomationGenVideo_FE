'use client';

import { Check } from 'lucide-react';

export interface StepDef {
  step: number;
  label: string;
}

export const WIZARD_STEPS: StepDef[] = [
  { step: 1, label: '1. Chọn ảnh' },
  { step: 2, label: '2. Ghép áo' },
  { step: 3, label: '3. Nhập thông tin' },
  { step: 4, label: '4. Xuất PDF' },
];

/**
 * Stepper 4 bước theo đúng mockup — bấm quay lại được các bước ĐÃ hoàn thành (step < currentStep),
 * không bấm nhảy tới trước được (currentStep giữ đúng vị trí xử lý AI đang ở đâu).
 *
 * NGOẠI LỆ ở bước 4: KHÔNG cho quay lại bước nào cả. Tới bước 4 là bản ghi DB đã được tạo và
 * entry tạm (uploadId) đã bị xoá ngay sau đó (xem IdPhotoService#create) — nên mọi đường lùi
 * đều hỏng: về bước 3 bấm "Tiếp tục" sẽ gọi lại /id-photo/create với uploadId không còn tồn
 * tại (lỗi "phiên tải ảnh đã hết hạn" và tạo thêm bản ghi trùng nếu may mắn còn hạn), về bước
 * 2/1 thì state cũ vẫn còn nguyên nên người dùng lạc luồng. Muốn sửa thì dùng nút "Sửa thông
 * tin" / "Ghép áo lại" ngay tại bước 4; muốn làm mới hoàn toàn thì dùng "Làm lại từ đầu"
 * (nút đó reset sạch state, khác hẳn với việc bấm lùi trên stepper).
 */
export function Stepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick?: (step: number) => void;
}) {
  // Bản ghi đã tạo xong → chốt luồng, chỉ đi tiếp bằng các nút trong ExportStep.
  const navLocked = currentStep >= 4;

  return (
    <div className="flex items-center w-full">
      {WIZARD_STEPS.map((s, idx) => {
        const isDone = s.step < currentStep;
        const isActive = s.step === currentStep;
        const clickable = isDone && !navLocked && !!onStepClick;
        return (
          <div key={s.step} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(s.step)}
              className="flex flex-col items-center gap-1.5 flex-none"
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isDone
                    ? 'bg-[#4441cc] border-[#4441cc] text-white'
                    : isActive
                    ? 'bg-white border-[#4441cc] text-[#4441cc]'
                    : 'bg-white border-[#d5d3e0] text-[#9c9aa8]'
                } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s.step}
              </span>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap ${
                  isActive || isDone ? 'text-[#1b1b1d]' : 'text-[#9c9aa8]'
                }`}
              >
                {s.label}
              </span>
            </button>
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 -mt-5 ${
                  s.step < currentStep ? 'bg-[#4441cc]' : 'bg-[#e2e0ea]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
