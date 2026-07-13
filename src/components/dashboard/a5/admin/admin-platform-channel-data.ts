/** Nền tảng + kênh con (trong từng platform) — mock admin */

import type { AdminTeamRegionId } from "./admin-team-perf-data";
import type { A5Key } from "../constants";
import { A5_KEYS } from "../constants";

export type PlatformId = "facebook" | "tiktok" | "instagram" | "youtube" | "other";

export interface PlatformChannelRow {
  teamRegionId: AdminTeamRegionId;
  platformId: PlatformId;
  platformLabel: string;
  channelKey: string;
  channelLabel: string;
  video: number;
  trafficK: number;
  vsPrevPct: number;
  top5aTier: "A1" | "A2" | "A3" | "A4" | "A5";
  top5aPct: number;
}

export const PLATFORM_OPTIONS: { id: PlatformId | "all"; label: string }[] = [
  { id: "all", label: "Tất cả nền tảng" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "other", label: "Khác" },
];

export const ADMIN_PLATFORM_CHANNEL_ROWS: PlatformChannelRow[] = [
  {
    teamRegionId: "vietnam",
    platformId: "facebook",
    platformLabel: "Facebook",
    channelKey: "facebook:fanpage",
    channelLabel: "Fanpage LUXE chính",
    video: 98,
    trafficK: 265,
    vsPrevPct: 12,
    top5aTier: "A1",
    top5aPct: 48,
  },
  {
    teamRegionId: "japan",
    platformId: "facebook",
    platformLabel: "Facebook",
    channelKey: "facebook:group",
    channelLabel: "Group cộng đồng",
    video: 62,
    trafficK: 155,
    vsPrevPct: 18,
    top5aTier: "A1",
    top5aPct: 42,
  },
  {
    teamRegionId: "taiwan",
    platformId: "facebook",
    platformLabel: "Facebook",
    channelKey: "facebook:ads",
    channelLabel: "Quảng cáo (Ads)",
    video: 50,
    trafficK: 100,
    vsPrevPct: 14,
    top5aTier: "A2",
    top5aPct: 35,
  },
  {
    teamRegionId: "vietnam",
    platformId: "tiktok",
    platformLabel: "TikTok",
    channelKey: "tiktok:official",
    channelLabel: "Tài khoản chính thức",
    video: 165,
    trafficK: 410,
    vsPrevPct: 35,
    top5aTier: "A1",
    top5aPct: 52,
  },
  {
    teamRegionId: "japan",
    platformId: "tiktok",
    platformLabel: "TikTok",
    channelKey: "tiktok:staff",
    channelLabel: "Kênh nhân viên / UGC",
    video: 120,
    trafficK: 270,
    vsPrevPct: 28,
    top5aTier: "A1",
    top5aPct: 55,
  },
  {
    teamRegionId: "vietnam",
    platformId: "instagram",
    platformLabel: "Instagram",
    channelKey: "ig:feed",
    channelLabel: "Feed & Story",
    video: 88,
    trafficK: 205,
    vsPrevPct: 9,
    top5aTier: "A2",
    top5aPct: 40,
  },
  {
    teamRegionId: "japan",
    platformId: "instagram",
    platformLabel: "Instagram",
    channelKey: "ig:reels",
    channelLabel: "Reels",
    video: 57,
    trafficK: 115,
    vsPrevPct: 6,
    top5aTier: "A2",
    top5aPct: 36,
  },
  {
    teamRegionId: "vietnam",
    platformId: "youtube",
    platformLabel: "YouTube",
    channelKey: "yt:long",
    channelLabel: "Video dài",
    video: 48,
    trafficK: 155,
    vsPrevPct: 7,
    top5aTier: "A2",
    top5aPct: 44,
  },
  {
    teamRegionId: "taiwan",
    platformId: "youtube",
    platformLabel: "YouTube",
    channelKey: "yt:shorts",
    channelLabel: "Shorts",
    video: 27,
    trafficK: 75,
    vsPrevPct: 2,
    top5aTier: "A3",
    top5aPct: 38,
  },
  {
    teamRegionId: "taiwan",
    platformId: "other",
    platformLabel: "Khác",
    channelKey: "other:zalo",
    channelLabel: "Zalo OA",
    video: 22,
    trafficK: 58,
    vsPrevPct: -4,
    top5aTier: "A1",
    top5aPct: 33,
  },
  {
    teamRegionId: "taiwan",
    platformId: "other",
    platformLabel: "Khác",
    channelKey: "other:xhs",
    channelLabel: "Xiaohongshu / khác",
    video: 18,
    trafficK: 42,
    vsPrevPct: -2,
    top5aTier: "A1",
    top5aPct: 28,
  },
];

export function channelOptionsForPlatform(platformId: PlatformId | "all") {
  if (platformId === "all") {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const r of ADMIN_PLATFORM_CHANNEL_ROWS) {
      if (!seen.has(r.channelKey)) {
        seen.add(r.channelKey);
        opts.push({ value: r.channelKey, label: `${r.platformLabel} · ${r.channelLabel}` });
      }
    }
    return [{ value: "all", label: "Tất cả kênh" }, ...opts];
  }
  const rows = ADMIN_PLATFORM_CHANNEL_ROWS.filter((r) => r.platformId === platformId);
  return [
    { value: "all", label: "Tất cả kênh (nền tảng)" },
    ...rows.map((r) => ({ value: r.channelKey, label: r.channelLabel })),
  ];
}

export function filterPlatformChannelRows(
  rows: PlatformChannelRow[],
  teamRegionId: AdminTeamRegionId | "all",
  platformId: PlatformId | "all",
  channelKey: string | "all",
) {
  return rows.filter((r) => {
    const tOk = teamRegionId === "all" || r.teamRegionId === teamRegionId;
    const pOk = platformId === "all" || r.platformId === platformId;
    const cOk = channelKey === "all" || r.channelKey === channelKey;
    return tOk && pOk && cOk;
  });
}

const A5_WEIGHTS = [32, 26, 21, 12, 9] as const;

/** Chia `video` của dòng kênh thành A1–A5 (tỉ lệ mock 32/26/21/12/9%) */
export function splitVideoIntoA5Tiers(video: number): Record<A5Key, number> {
  const floors = A5_WEIGHTS.map((w) => Math.floor((video * w) / 100));
  let rem = video - floors.reduce((a, b) => a + b, 0);
  const nums = [...floors];
  let i = 0;
  while (rem > 0) {
    nums[i % 5] += 1;
    rem -= 1;
    i += 1;
  }
  return { a1: nums[0], a2: nums[1], a3: nums[2], a4: nums[3], a5: nums[4] };
}

export function aggregateA5FromChannelRows(rows: PlatformChannelRow[]) {
  const acc: Record<A5Key, number> = { a1: 0, a2: 0, a3: 0, a4: 0, a5: 0 };
  for (const r of rows) {
    const p = splitVideoIntoA5Tiers(r.video);
    for (const k of A5_KEYS) acc[k] += p[k];
  }
  return acc;
}

export function donutSlicesFromA5Acc(acc: Record<A5Key, number>) {
  const total = A5_KEYS.reduce((s, k) => s + acc[k], 0);
  return A5_KEYS.map((k) => ({
    key: k,
    label: k.toUpperCase(),
    count: acc[k],
    pct: total > 0 ? `${Math.round((acc[k] / total) * 100)}%` : "0%",
  }));
}

/** Tổng video theo từng team (dùng scale bảng hiệu suất team theo bộ lọc kênh) */
export function videoTotalsByTeam(rows: PlatformChannelRow[]): Record<AdminTeamRegionId, number> {
  const o: Record<AdminTeamRegionId, number> = { vietnam: 0, japan: 0, taiwan: 0 };
  for (const r of rows) o[r.teamRegionId] += r.video;
  return o;
}

export function withTrafficSharePct(rows: PlatformChannelRow[]) {
  const trafficSum = rows.reduce((s, r) => s + r.trafficK, 0);
  return rows.map((r) => ({
    ...r,
    sharePct: trafficSum > 0 ? Math.round((r.trafficK / trafficSum) * 100) : 0,
  }));
}

export const ADMIN_COMPANY_TRAFFIC_K_TOTAL = ADMIN_PLATFORM_CHANNEL_ROWS.reduce(
  (s, r) => s + r.trafficK,
  0,
);

export const ADMIN_COMPANY_VIDEO_TOTAL = ADMIN_PLATFORM_CHANNEL_ROWS.reduce(
  (s, r) => s + r.video,
  0,
);

export function sumTrafficK(rows: PlatformChannelRow[]) {
  return rows.reduce((s, r) => s + r.trafficK, 0);
}

/** trafficK là nghìn (K) — hiển thị dạng 1.85M */
export function formatTrafficKpiLabel(trafficK: number): string {
  if (trafficK >= 1000) return `${(trafficK / 1000).toFixed(2)}M`;
  return `${Math.round(trafficK)}K`;
}

/** Doanh thu mock: 2.8 Tỷ khi đủ traffic công ty; tỉ lệ theo traffic đã lọc */
export function formatRevenueKpiLabel(trafficKFiltered: number): string {
  if (trafficKFiltered <= 0) return "0 Tỷ";
  const den = ADMIN_COMPANY_TRAFFIC_K_TOTAL;
  const ratio = den > 0 ? trafficKFiltered / den : 0;
  const billion = 2.8 * ratio;
  if (billion >= 1) return `${billion.toFixed(1)} Tỷ`;
  if (billion >= 0.01) return `${(billion * 1000).toFixed(1)} Triệu`;
  return `${Math.round(billion * 1_000_000).toLocaleString("vi-VN")} đ`;
}

/** % vs kỳ trước — trung bình có trọng số traffic */
export function weightedVsPrevPct(rows: PlatformChannelRow[]): number {
  const t = sumTrafficK(rows);
  if (t <= 0) return 0;
  return rows.reduce((s, r) => s + r.vsPrevPct * r.trafficK, 0) / t;
}

/** View phễu 5A (mock công ty đầy đủ) — scale theo tỉ lệ traffic đã lọc / traffic công ty */
export const FUNNEL_VIEW_BASES = [1_200_000, 420_000, 185_000, 95_000, 28_000] as const;

export function formatFunnelViewCount(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m >= 10 ? `${Math.round(m)}M` : `${Number(m.toFixed(1))}M`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${Math.round(n)}`;
}

export function funnelViewLabelsForTraffic(trafficKFiltered: number): string[] {
  const den = ADMIN_COMPANY_TRAFFIC_K_TOTAL;
  const scale = den > 0 ? trafficKFiltered / den : 0;
  return FUNNEL_VIEW_BASES.map((base) => formatFunnelViewCount(base * scale));
}
