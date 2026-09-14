'use client';

/**
 * Mục "Lịch sử mượn" ở màn chi tiết máy — máy này từng ai mượn, giữ bao lâu, có trễ không.
 *
 * Không tự lọc theo quyền ở đây: BE đã lọc rồi (thành viên thường chỉ nhận về lượt của chính
 * mình). Lọc lại lần nữa ở FE thì hai nơi sớm muộn lệch nhau, mà chỗ lệch đó lại là chỗ lộ
 * dữ liệu người khác.
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { borrowHistoryLabel } from '@/lib/equipment/borrow-history-label';
import { apiErrorMessage } from '@/lib/equipment/api-error';
import {
  fetchAssetBorrowHistory,
  type AssetBorrowHistoryRow,
} from '@/lib/equipment/request-api';

const TONE_CLASS: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  busy: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  maint: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
  bad: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  wait: 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
};

const fmt = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

export function AssetBorrowHistory({ assetId }: { assetId: string }) {
  const [rows, setRows] = useState<AssetBorrowHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssetBorrowHistory(assetId)
      .then(setRows)
      .catch((e: unknown) => setError(apiErrorMessage(e, 'Không đọc được lịch sử mượn của máy này.')))
      .finally(() => setLoading(false));
  }, [assetId]);

  return (
    <div>
      <div className="border-b border-slate-100 p-5 dark:border-white/[0.06]">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Lịch sử mượn</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Thời gian giữ tính theo lúc giao và lúc nhận lại thực tế, đối chiếu với hạn trên phiếu.
        </p>
      </div>

      <div className="p-5">
        {loading && <p className="text-sm text-slate-500">Đang tải…</p>}
        {!loading && error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Chưa có lượt mượn nào được ghi nhận cho máy này.
          </p>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Người mượn</th>
                  <th className="pb-2 font-medium">Dự án</th>
                  <th className="pb-2 font-medium">Giao</th>
                  <th className="pb-2 font-medium">Trả</th>
                  <th className="pb-2 font-medium">Thời gian giữ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const label = borrowHistoryLabel(row);
                  return (
                    <tr
                      key={`${row.borrowerId}-${row.handedOverAt}-${index}`}
                      className="border-t border-slate-100 dark:border-white/[0.06]"
                    >
                      <td className="py-2.5 text-slate-900 dark:text-white">
                        {row.borrowerName ?? 'Không rõ'}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                        {row.project ?? '—'}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                        {fmt(row.handedOverAt)}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                        {fmt(row.returnedAt)}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2.5 py-1 text-xs font-medium',
                            TONE_CLASS[label.tone] ?? TONE_CLASS.wait,
                          )}
                        >
                          {label.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
