'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { BatchPersonStatus } from '../bulk/id-photo-batch';
import { IdCardPreview } from './ExportStep';

/**
 * Lưới kết quả (cột phải) — 4 ô/hàng, mỗi ô 1 người với 4 trạng thái tách bạch:
 *   PENDING     → ô nét đứt trống
 *   PROCESSING  → icon loading xoay
 *   SUCCESS     → ẢNH THẺ HOÀN CHỈNH có khung màu theo vị trí (IdCardPreview — cùng component
 *                 dựng khung của luồng đơn lẻ). Kèm nút "Ghép áo lại" (ảnh AI không ưng ý, vd
 *                 đỉnh đầu bị cắt) — TỐN 1 lượt Gemini nên bắt xác nhận 2 lần, giống luồng đơn lẻ.
 *   FAILED      → ô đỏ + icon cảnh báo + nút "Thử lại" (lỗi kỹ thuật)
 *
 * "Thử lại" (FAILED) và "Ghép áo lại" (SUCCESS) đều đẩy người đó về PENDING ở BE → worker chạy
 * lại đủ ghép áo → ghép khung → PDF. Poll tự cập nhật lại đúng ô này, không đụng người khác.
 */
export function BulkResultGrid({
  people,
  thumbs,
  retryingIds,
  remergingIds,
  onRetry,
  onRemerge,
}: {
  people: BatchPersonStatus[];
  thumbs: Record<string, string>;
  retryingIds: Set<string>;
  remergingIds: Set<string>;
  onRetry: (historyId: string) => void;
  onRemerge: (historyId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {people.map((p) => (
        <Cell
          key={p.id}
          person={p}
          thumbUrl={thumbs[p.id]}
          retrying={retryingIds.has(p.id)}
          remerging={remergingIds.has(p.id)}
          onRetry={() => onRetry(p.id)}
          onRemerge={() => onRemerge(p.id)}
        />
      ))}
    </div>
  );
}

function Cell({
  person,
  thumbUrl,
  retrying,
  remerging,
  onRetry,
  onRemerge,
}: {
  person: BatchPersonStatus;
  thumbUrl?: string;
  retrying: boolean;
  remerging: boolean;
  onRetry: () => void;
  onRemerge: () => void;
}) {
  const name = person.employee_name.trim() || '(chưa có tên)';

  if (person.status === 'SUCCESS') {
    return <SuccessCell person={person} name={name} thumbUrl={thumbUrl} remerging={remerging} onRemerge={onRemerge} />;
  }

  if (person.status === 'FAILED') {
    return (
      <div className="rounded-xl border border-[#dc2626]/40 bg-[#dc2626]/5 overflow-hidden">
        <div className="aspect-[420/669] flex flex-col items-center justify-center text-center gap-2 px-2">
          <AlertTriangle className="w-6 h-6 text-[#dc2626]" />
          <p className="text-[11px] text-[#dc2626] line-clamp-3" title={person.error_message ?? ''}>
            {person.error_message || 'Xử lý thất bại'}
          </p>
          <button
            type="button"
            disabled={retrying}
            onClick={onRetry}
            className="inline-flex items-center gap-1 rounded-lg bg-[#dc2626] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#dc2626]/90 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Đang thử...' : 'Thử lại'}
          </button>
        </div>
        <div className="px-2 py-1.5 text-[11px] font-medium text-[#dc2626] truncate">{name}</div>
      </div>
    );
  }

  if (person.status === 'PROCESSING') {
    return (
      <div className="rounded-xl border border-[#4441cc]/30 bg-[#4441cc]/5 overflow-hidden">
        <div className="aspect-[420/669] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#4441cc] animate-spin" />
        </div>
        <div className="px-2 py-1.5 text-[11px] font-medium text-[#4441cc] truncate">{name}</div>
      </div>
    );
  }

  // PENDING
  return (
    <div className="rounded-xl border-2 border-dashed border-[#d5d3e0] bg-white overflow-hidden">
      <div className="aspect-[420/669] flex items-center justify-center">
        <span className="text-[11px] text-[#9c9aa8]">Chờ xử lý</span>
      </div>
      <div className="px-2 py-1.5 text-[11px] font-medium text-[#9c9aa8] truncate">{name}</div>
    </div>
  );
}

function SuccessCell({
  person,
  name,
  thumbUrl,
  remerging,
  onRemerge,
}: {
  person: BatchPersonStatus;
  name: string;
  thumbUrl?: string;
  remerging: boolean;
  onRemerge: () => void;
}) {
  // Xác nhận 2 lần trước khi tốn 1 lượt Gemini — cùng cơ chế `confirmingRemerge` của ExportStep.
  const [confirming, setConfirming] = useState(false);

  return (
    <figure className="rounded-xl border border-[#e2e0ea] bg-[#fafafb] p-2">
      <div className="relative">
        {thumbUrl ? (
          <IdCardPreview
            employeeName={person.employee_name}
            employeeTeam={person.employee_team}
            employeeId={person.employee_id}
            position={person.position}
            photoUrl={thumbUrl}
          />
        ) : (
          <div className="aspect-[420/669] flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#c7c4d7] animate-spin" />
          </div>
        )}
        {remerging && (
          <div className="absolute inset-0 rounded-2xl bg-white/80 flex flex-col items-center justify-center gap-1.5 text-center px-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#4441cc]" />
            <p className="text-[11px] font-semibold text-[#1b1b1d]">AI đang ghép áo lại...</p>
          </div>
        )}
      </div>

      <figcaption className="mt-1.5 px-1 text-center text-[11px] font-medium text-[#1b1b1d] truncate">{name}</figcaption>

      {!remerging && (
        <div className="mt-1.5 px-1">
          {confirming ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-1.5 space-y-1.5">
              <p className="text-[10px] leading-snug text-amber-900">
                Tạo lại ảnh bằng AI — <span className="font-semibold">tốn thêm chi phí, ảnh mới có thể khác</span>.
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-md border border-amber-400 px-2 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    onRemerge();
                  }}
                  className="flex-1 rounded-md bg-amber-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-amber-700"
                >
                  Ghép lại
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              title="Ảnh chưa ưng (đỉnh đầu bị cắt…)? AI dựng lại ảnh từ ảnh gốc — tốn 1 lượt Gemini"
              className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-[#d5d3e0] px-2 py-1 text-[10px] font-semibold text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Ghép áo lại
            </button>
          )}
        </div>
      )}
    </figure>
  );
}
