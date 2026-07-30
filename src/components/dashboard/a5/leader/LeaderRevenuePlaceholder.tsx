"use client";

/** Chưa có nguồn dữ liệu doanh số thật theo thành viên — giữ khung UI, để trống số liệu. */
export function LeaderRevenuePlaceholder() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Doanh số luỹ kế</div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-extrabold text-gray-300">—</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100" />
      </div>
      <div className="mt-2 text-xs text-gray-400">Chưa có dữ liệu doanh số cho team này.</div>
    </div>
  );
}
