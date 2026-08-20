'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Asset, fetchAssets, photoSrc } from '@/lib/equipment/api';
import { listCategories } from '@/lib/equipment/group-models';
import { CONDITION_OPTIONS, STATUS_OPTIONS } from '@/lib/equipment/status-label';
import { StatusPill } from '@/components/equipment/StatusPill';
import { ConditionDot } from '@/components/equipment/ConditionDot';
import { AddAssetDialog } from '@/components/equipment/AddAssetDialog';

const inputClass =
  'rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';

function EquipmentTable() {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  // Chỉ số ở màn Bảng điều khiển dẫn sang đây kèm ?status=, lọc phải nhận được ngay từ URL.
  const [status, setStatus] = useState(searchParams?.get('status') ?? '');
  const [condition, setCondition] = useState('');

  const load = () => {
    setLoading(true);
    fetchAssets()
      .then(setAssets)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const categories = useMemo(() => listCategories(assets), [assets]);

  // Lọc tại chỗ chứ không gọi lại API: cả kho chỉ vài chục máy, gọi lại mỗi lần gõ phím là phí.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter(
      (a) =>
        (!q ||
          a.asset_code.toLowerCase().includes(q) ||
          a.model.name.toLowerCase().includes(q) ||
          a.serial_number.toLowerCase().includes(q)) &&
        (!categoryId || a.model.category.id === categoryId) &&
        (!status || a.status === status) &&
        (!condition || a.condition === condition),
    );
  }, [assets, query, categoryId, status, condition]);

  return (
    <div className="mx-auto max-w-6xl pb-20 sm:pb-8">
      <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Danh sách kho thiết bị
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Quản lý máy ảnh, ống kính, đèn flash, phụ kiện và tình trạng mượn trả trong kho.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAdding(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            <span>+</span> Thêm thiết bị
          </button>
          <Link
            href="/dashboard/equipment/new-request"
            className="flex-1 sm:flex-initial flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all dark:border-white/[0.12] dark:text-slate-200 dark:hover:bg-white/[0.05]"
          >
            Tạo phiếu mượn
          </Link>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
        {/* BỘ LỌC TÌM KIẾM */}
        <div className="grid grid-cols-1 gap-2.5 border-b border-slate-100 p-3.5 sm:p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/[0.06]">
          <input
            className={`${inputClass} w-full`}
            placeholder="🔍 Tìm mã, tên hoặc serial…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className={inputClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">📁 Mọi danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">⚡ Mọi trạng thái</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="">🔍 Mọi tình trạng</option>
            {CONDITION_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
            <p className="text-sm">Đang tải danh sách kho…</p>
          </div>
        ) : failed ? (
          <p className="p-8 text-center text-red-600 dark:text-red-400">
            Không đọc được kho thiết bị. Kiểm tra kết nối tới máy chủ rồi tải lại trang.
          </p>
        ) : (
          <>
            {/* GIAO DIỆN MOBILE: DẠNG THẺ (CARD VIEW) */}
            <div className="divide-y divide-slate-100 sm:hidden dark:divide-white/[0.06]">
              {rows.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/equipment/assets/${encodeURIComponent(a.asset_code)}`}
                  className="flex items-start gap-3.5 p-4 hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-white/[0.02] dark:active:bg-white/[0.04] transition-colors"
                >
                  {a.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoSrc(a.photos[0].url)}
                      alt={a.model.name}
                      className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm dark:border-white/[0.08]"
                    />
                  ) : (
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-white/[0.12]">
                      📷
                    </span>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                        {a.asset_code}
                      </span>
                      <StatusPill status={a.status} />
                    </div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {a.model.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                        {a.model.category.name}
                      </span>
                      <span className="font-mono">SN: {a.serial_number}</span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <ConditionDot condition={a.condition} />
                      <span>{a.location?.name ?? 'Chưa xếp chỗ'}</span>
                    </div>
                  </div>
                </Link>
              ))}

              {rows.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  {assets.length === 0 ? 'Kho chưa có thiết bị nào.' : 'Không có thiết bị nào khớp bộ lọc.'}
                </div>
              )}
            </div>

            {/* GIAO DIỆN DESKTOP: DẠNG BẢNG (TABLE VIEW) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <th className="px-4 py-3 font-semibold">Mã</th>
                    <th className="px-4 py-3 font-semibold">Thiết bị</th>
                    <th className="px-4 py-3 font-semibold">Danh mục</th>
                    <th className="px-4 py-3 font-semibold">Tình trạng</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold">Vị trí</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-white/[0.05] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/equipment/assets/${encodeURIComponent(a.asset_code)}`}
                          className="font-mono font-bold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {a.asset_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {a.photos?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photoSrc(a.photos[0].url)}
                              alt={a.model.name}
                              className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover shadow-sm dark:border-white/[0.08]"
                            />
                          ) : (
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-dashed border-slate-300 text-[10px] text-slate-400 dark:border-white/[0.12]">
                              —
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-900 dark:text-white">
                              {a.model.name}
                            </span>
                            <span className="mt-0.5 block font-mono text-xs text-slate-400">
                              {a.serial_number}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                        {a.model.category.name}
                      </td>
                      <td className="px-4 py-3">
                        <ConditionDot condition={a.condition} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={a.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {a.location?.name ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        {assets.length === 0
                          ? 'Kho chưa có thiết bị nào.'
                          : 'Không có thiết bị nào khớp bộ lọc.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {adding && <AddAssetDialog onClose={() => setAdding(false)} onCreated={load} />}
    </div>
  );
}

export default function EquipmentPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Đang tải…</p>}>
      <EquipmentTable />
    </Suspense>
  );
}
