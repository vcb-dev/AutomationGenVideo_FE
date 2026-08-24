'use client';

import { Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

export type MergeStatus = 'processing' | 'success' | 'error';

export function MergeOutfitStep({
  status,
  mergedPreviewUrl,
  errorMessage,
  onCancel,
  onRetry,
  onBack,
  onContinue,
}: {
  status: MergeStatus;
  mergedPreviewUrl: string | null;
  errorMessage: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="border border-[#e2e0ea] rounded-2xl bg-white p-6">
      {status === 'processing' && (
        <div className="flex flex-col items-center justify-center h-[420px] text-center gap-4">
          <Loader2 className="w-10 h-10 text-[#4441cc] animate-spin" />
          <div>
            <p className="text-sm font-semibold text-[#1b1b1d]">Đang xử lý ghép áo đồng phục...</p>
            <p className="text-xs text-[#9c9aa8] mt-1">AI đang giữ nguyên khuôn mặt và đổi trang phục — thường mất 10-30 giây.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] transition-colors"
          >
            Huỷ
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center h-[420px] text-center gap-4">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-[#1b1b1d]">Không ghép áo được</p>
            <p className="text-xs text-[#464554] mt-1 max-w-sm">{errorMessage}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] transition-colors"
            >
              ← Chọn ảnh khác
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#4441cc] hover:bg-[#4441cc]/90 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Thử lại
            </button>
          </div>
        </div>
      )}

      {status === 'success' && (
        <>
          <h3 className="text-base font-bold text-[#1b1b1d] mb-3">Ảnh sau khi ghép áo đồng phục</h3>
          <div className="border border-[#e2e0ea] rounded-2xl h-[420px] flex items-center justify-center bg-[#fafafb] overflow-hidden mb-6">
            {mergedPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mergedPreviewUrl} alt="Ảnh đã ghép áo" className="w-full h-full object-contain" />
            )}
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] transition-colors"
            >
              ← Chọn ảnh khác
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 transition-colors"
            >
              Tiếp tục →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
