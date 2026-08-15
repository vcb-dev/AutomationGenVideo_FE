'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Asset, fetchAssets } from '@/lib/equipment/api';
import { stockSummary, stockByCategory } from '@/lib/equipment/stock-summary';
import { KpiCard } from '@/components/equipment/KpiCard';

/**
 * MH-01. Toàn bộ con số trên màn này tính từ chính danh sách kho nên luôn khớp với màn
 * Danh sách kho — không có đường nào để hai màn nói hai số khác nhau.
 */
export default function EquipmentOverviewPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchAssets()
      .then(setAssets)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const summary = stockSummary(assets);
  const categories = stockByCategory(assets);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Bảng điều khiển kho thiết bị
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ảnh chụp kho tại thời điểm hiện tại. Bấm vào một chỉ số để xem đúng danh sách máy
          sinh ra nó.
        </p>
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : failed ? (
        <p className="text-red-600 dark:text-red-400">
          Không đọc được kho thiết bị. Kiểm tra lại kết nối tới máy chủ rồi tải lại trang.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              label="Tổng thiết bị"
              value={summary.total}
              hint="không tính đã thanh lý"
              href="/dashboard/equipment"
            />
            <KpiCard
              label="Đang sẵn sàng"
              value={summary.available}
              tone="ok"
              hint={
                summary.total
                  ? `${Math.round((summary.available / summary.total) * 100)}% tổng kho`
                  : undefined
              }
              href="/dashboard/equipment?status=AVAILABLE"
            />
            <KpiCard
              label="Đang được mượn"
              value={summary.onLoan}
              tone="busy"
              href="/dashboard/equipment?status=ON_LOAN"
            />
            <KpiCard
              label="Bảo trì hoặc hỏng"
              value={summary.maintenance}
              tone="maint"
              href="/dashboard/equipment?status=UNDER_MAINTENANCE"
            />
            <KpiCard
              label="Chờ kiểm tra"
              value={summary.pendingCheck}
              tone="bad"
              hint="chưa cho mượn được"
              href="/dashboard/equipment?status=PENDING_INSPECTION"
            />
          </div>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Tình trạng kho theo danh mục
              </h2>
              <span className="text-xs text-slate-400">sẵn sàng / tổng số</span>
            </div>

            {categories.length === 0 ? (
              <p className="text-sm text-slate-500">Kho chưa có thiết bị nào.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {categories.map((c) => (
                  <div
                    key={c.categoryId}
                    className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm"
                  >
                    <span className="truncate text-slate-500 dark:text-slate-400">
                      {c.categoryName}
                    </span>
                    <span className="h-2 overflow-hidden rounded bg-slate-100 dark:bg-white/[0.07]">
                      <i
                        className="block h-full rounded bg-blue-500"
                        style={{ width: `${(c.available / c.total) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-semibold text-slate-900 dark:text-white">
                      {c.available}/{c.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Các khối phiếu mượn (chờ duyệt, quá hạn, sắp đến hạn) sẽ hiện ở đây khi phần thống kê
            hoàn thành. Hiện tại bạn có thể{' '}
            <Link href="/dashboard/equipment/new-request" className="font-semibold underline">
              tạo phiếu mượn
            </Link>{' '}
            và tra kho.
          </div>
        </>
      )}
    </div>
  );
}
