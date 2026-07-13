"use client";

import type { LucideIcon } from "lucide-react";
import {
  Facebook,
  Instagram,
  MoreHorizontal,
  Music2,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../shared/SectionHeading";
import { PLATFORM_OPTIONS, type PlatformId } from "./admin-platform-channel-data";
import { useAdminOverviewFilters } from "./AdminOverviewFiltersContext";

const TOP5A_CLASS: Record<string, string> = {
  A1: "text-a1",
  A2: "text-a2",
  A3: "text-a3",
  A4: "text-a4",
  A5: "text-a5",
};

const PLATFORM_ICONS: Record<PlatformId, LucideIcon> = {
  facebook: Facebook,
  tiktok: Music2,
  instagram: Instagram,
  youtube: Youtube,
  other: MoreHorizontal,
};

function formatTraffic(k: number) {
  if (k >= 1000) return `${(k / 1000).toFixed(2)}M`;
  return `${k}K`;
}

export function AdminPlatformTable() {
  const { platformTableRows: rows, platformId } = useAdminOverviewFilters();
  const platformHint =
    platformId !== "all"
      ? PLATFORM_OPTIONS.find((o) => o.id === platformId)?.label
      : null;

  const totalVideo = rows.reduce((s, r) => s + r.video, 0);
  const totalTrafficK = rows.reduce((s, r) => s + r.trafficK, 0);
  const weightedVs =
    totalTrafficK > 0
      ? rows.reduce((s, r) => s + r.vsPrevPct * r.trafficK, 0) / totalTrafficK
      : 0;

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <SectionHeading icon={Smartphone} className="mb-1">
        Hiệu suất theo kênh
      </SectionHeading>
      {platformHint ? (
        <p className="mb-3 text-xs text-gray-500">
          Đang lọc nền tảng: <span className="font-medium text-gray-700">{platformHint}</span>
        </p>
      ) : (
        <p className="mb-3 text-xs text-gray-500">
          Chọn nền tảng ở bộ lọc phía trên; danh sách hiển thị các kênh tương ứng.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                KÊNH
              </th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                VIDEO
              </th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                TRAFFIC
              </th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                %
              </th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                VS TRƯỚC
              </th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                TOP 5A
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  Không có dữ liệu cho bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const Icon = PLATFORM_ICONS[r.platformId];
                const up = r.vsPrevPct >= 0;
                return (
                  <tr key={r.channelKey} className="border-b border-gray-50">
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                        {platformId === "all" ? (
                          <Icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                        ) : null}
                        {r.channelLabel}
                      </span>
                    </td>
                    <td className="text-center">{r.video}</td>
                    <td className="text-center font-semibold">{formatTraffic(r.trafficK)}</td>
                    <td className="text-center">{r.sharePct}%</td>
                    <td className={up ? "text-center text-emerald-600" : "text-center text-red-500"}>
                      <span className="inline-flex items-center justify-center gap-0.5">
                        {up ? (
                          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {up ? "+" : ""}
                        {r.vsPrevPct}%
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={cn("font-semibold", TOP5A_CLASS[r.top5aTier] ?? "text-gray-800")}>
                        {r.top5aTier}
                      </span>{" "}
                      ({r.top5aPct}%)
                    </td>
                  </tr>
                );
              })
            )}
            {rows.length > 0 ? (
              <tr className="bg-blue-50 font-bold">
                <td className="py-2.5">TỔNG</td>
                <td className="text-center">{totalVideo}</td>
                <td className="text-center">{formatTraffic(totalTrafficK)}</td>
                <td className="text-center">100%</td>
                <td
                  className={
                    weightedVs >= 0 ? "text-center text-emerald-600" : "text-center text-red-500"
                  }
                >
                  <span className="inline-flex items-center justify-center gap-0.5">
                    {weightedVs >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {weightedVs >= 0 ? "+" : ""}
                    {Math.round(weightedVs)}%
                  </span>
                </td>
                <td className="text-center" />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}