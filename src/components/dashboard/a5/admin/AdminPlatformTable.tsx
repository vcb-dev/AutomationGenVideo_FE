"use client";

import type { LucideIcon } from "lucide-react";
import { Facebook, Instagram, MoreHorizontal, Music2, Smartphone, Youtube } from "lucide-react";
import { useMemo, useState } from "react";
import { A5NotAvailable } from "../shared/A5NotAvailable";
import { SectionHeading } from "../shared/SectionHeading";
import { PLATFORM_OPTIONS, toPlatformId, type PlatformId } from "./admin-platform-channel-data";
import { useAdminOverviewFilters } from "./AdminOverviewFiltersContext";

const PLATFORM_ICONS: Record<PlatformId, LucideIcon> = {
  facebook: Facebook,
  tiktok: Music2,
  instagram: Instagram,
  youtube: Youtube,
  other: MoreHorizontal,
};

export function AdminPlatformTable() {
  const { channels, isLoading, a5Note } = useAdminOverviewFilters();
  const [platformId, setPlatformId] = useState<PlatformId | "all">("all");

  const rows = useMemo(() => {
    if (platformId === "all") return channels;
    return channels.filter((c) => toPlatformId(c.platform) === platformId);
  }, [channels, platformId]);

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <SectionHeading icon={Smartphone}>Danh sách kênh</SectionHeading>
        <select
          value={platformId}
          onChange={(e) => setPlatformId(e.target.value as PlatformId | "all")}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none"
          aria-label="Lọc nền tảng"
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Danh sách kênh thật (huyk_channels) theo team/nền tảng đã chọn.
      </p>
      <div className="mb-3">
        <A5NotAvailable note={`Video / Traffic / % tăng trưởng / Top 5A theo từng kênh: ${a5Note} (huyk_channels chưa lưu số liệu này).`} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">KÊNH</th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">TEAM</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TRẠNG THÁI</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">VIDEO</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TRAFFIC</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">VS TRƯỚC</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TOP 5A</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  Đang tải dữ liệu…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  Không có kênh nào khớp bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const pid = toPlatformId(r.platform);
                const Icon = PLATFORM_ICONS[pid];
                return (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                        <Icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                        {r.name}
                      </span>
                    </td>
                    <td className="text-left text-gray-600">{r.team ?? "—"}</td>
                    <td className="text-center text-gray-600">{r.status ?? "—"}</td>
                    <td className="text-center text-gray-300">—</td>
                    <td className="text-center text-gray-300">—</td>
                    <td className="text-center text-gray-300">—</td>
                    <td className="text-center text-gray-300">—</td>
                  </tr>
                );
              })
            )}
            {rows.length > 0 ? (
              <tr className="bg-blue-50 font-bold">
                <td className="py-2.5" colSpan={2}>
                  TỔNG
                </td>
                <td className="text-center">{rows.length} kênh</td>
                <td className="text-center text-gray-300" colSpan={4}>
                  —
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
