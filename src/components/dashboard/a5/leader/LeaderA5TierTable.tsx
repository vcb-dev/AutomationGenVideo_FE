"use client";

import { BarChart3, Circle } from "lucide-react";
import { useMemo } from "react";
import { useAdminOverviewFilters } from "../admin/AdminOverviewFiltersContext";

function TierLabel({ tier, colorClass }: { tier: string; colorClass: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 font-bold ${colorClass}`}>
            <Circle className="h-2.5 w-2.5 shrink-0 fill-current stroke-none" aria-hidden />
            {tier}
        </span>
    );
}

/** vs: chênh lệch số video so với tháng trước (mock) */
const BASE_ROWS: {
    tier: string;
    colorClass: string;
    video: number;
    vs: string;
    trafficK: number;
}[] = [
    { tier: "A1", colorClass: "text-a1", video: 72, vs: "+8", trafficK: 680 },
    { tier: "A2", colorClass: "text-a2", video: 57, vs: "+5", trafficK: 210 },
    { tier: "A3", colorClass: "text-a3", video: 37, vs: "-2", trafficK: 125 },
    { tier: "A4", colorClass: "text-a4", video: 26, vs: "+6", trafficK: 65 },
    { tier: "A5", colorClass: "text-a5", video: 16, vs: "-1", trafficK: 20 },
];

function formatTrafficK(k: number) {
    if (k >= 1000) return `${(k / 1000).toFixed(2)}M`;
    return `${Math.round(k)}K`;
}

/** trafficK: nghìn lượt xem (hiển thị dạng xxxK) → lượt xem / 1 video */
function formatTrafficPerVideo(trafficK: number, video: number) {
    if (video <= 0) return "—";
    const views = trafficK * 1000;
    const per = Math.round(views / video);
    return `${per.toLocaleString("vi-VN")}`;
}

export function LeaderA5TierTable() {
    const { growthChartScaleFactor: sf } = useAdminOverviewFilters();

    const rows = useMemo(
        () =>
            BASE_ROWS.map((r) => {
                const videoDisp = Math.max(0, Math.round(r.video * sf));
                const trafficKScaled = r.trafficK * sf;
                return {
                    ...r,
                    videoDisp,
                    trafficDisp: formatTrafficK(trafficKScaled),
                    effPerVideo: formatTrafficPerVideo(r.trafficK, r.video),
                };
            }),
        [sf],
    );

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-base font-bold">
                <BarChart3 className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                Hiệu suất 5A — Team VN
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                TẦNG
                            </th>
                            <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                                VIDEO
                            </th>
                            <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                                So với tháng trước
                            </th>
                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                TRAFFIC
                            </th>
                            <th className="pb-2 text-right text-xs font-semibold text-gray-500">
                                <span className="block leading-snug">Traffic / video</span>
                                <span className="block text-[10px] font-normal normal-case text-gray-400">
                                    (lượt xem / 1 video)
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.tier} className="border-b border-gray-50">
                                <td className="py-2">
                                    <TierLabel tier={r.tier} colorClass={r.colorClass} />
                                </td>
                                <td className="text-center font-semibold">{r.videoDisp}</td>
                                <td
                                    className={`text-center ${r.vs.startsWith("-") ? "text-red-500" : "text-emerald-600"}`}
                                >
                                    {r.vs}
                                </td>
                                <td>{r.trafficDisp}</td>
                                <td className="text-right font-semibold tabular-nums">
                                    {r.effPerVideo}
                                    <span className="text-xs font-normal text-gray-500"> /v</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
