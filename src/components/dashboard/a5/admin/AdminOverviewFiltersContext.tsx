"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlatformId } from "./admin-platform-channel-data";
import {
  ADMIN_COMPANY_VIDEO_TOTAL,
  ADMIN_PLATFORM_CHANNEL_ROWS,
  PLATFORM_OPTIONS,
  aggregateA5FromChannelRows,
  channelOptionsForPlatform,
  donutSlicesFromA5Acc,
  filterPlatformChannelRows,
  formatRevenueKpiLabel,
  formatTrafficKpiLabel,
  funnelViewLabelsForTraffic,
  sumTrafficK,
  videoTotalsByTeam,
  weightedVsPrevPct,
  withTrafficSharePct,
} from "./admin-platform-channel-data";
import {
  ADMIN_TEAM_PERF_ROWS,
  TEAM_REGION_OPTIONS,
  type AdminTeamPerfRow,
  type AdminTeamRegionId,
  aggregateTeamTotals,
  filterTeamPerfRows,
  scaleTeamPerfRowsByVideoScope,
} from "./admin-team-perf-data";

function buildGrowthFilterSummary(
  teamRegionId: AdminTeamRegionId | "all",
  platformId: PlatformId | "all",
  channelKey: string | "all",
  channelSelectOptions: { value: string; label: string }[],
): string {
  const teamLabel =
    TEAM_REGION_OPTIONS.find((o) => o.id === teamRegionId)?.label ?? "Team";
  const platLabel =
    PLATFORM_OPTIONS.find((o) => o.id === platformId)?.label ?? "Nền tảng";
  let channelLabel = "Tất cả kênh";
  if (channelKey !== "all") {
    channelLabel =
      channelSelectOptions.find((o) => o.value === channelKey)?.label ?? channelKey;
  } else if (platformId !== "all") {
    channelLabel = "Tất cả kênh trong nền tảng";
  }
  return `${teamLabel} · ${platLabel} · ${channelLabel}`;
}

export interface AdminOverviewFiltersValue {
  teamRegionId: AdminTeamRegionId | "all";
  setTeamRegionId: (v: AdminTeamRegionId | "all") => void;
  teamPerfRows: AdminTeamPerfRow[];
  teamPerfTotals: ReturnType<typeof aggregateTeamTotals>;
  platformId: PlatformId | "all";
  channelKey: string | "all";
  setPlatformId: (v: PlatformId | "all") => void;
  setChannelKey: (v: string | "all") => void;
  channelSelectOptions: { value: string; label: string }[];
  /** Kênh đã lọc Team + Nền tảng + Kênh */
  filteredChannelRows: typeof ADMIN_PLATFORM_CHANNEL_ROWS;
  platformTableRows: ReturnType<typeof withTrafficSharePct>;
  donutSlices: ReturnType<typeof donutSlicesFromA5Acc>;
  growthChartScaleFactor: number;
  /** Nhãn đồng bộ cho biểu đồ tăng trưởng (Team · nền tảng · kênh) */
  growthFilterSummary: string;
  totalVideoFiltered: number;
  /** KPI & phễu — đồng bộ Team + nền tảng + kênh */
  kpiTrafficLabel: string;
  kpiRevenueLabel: string;
  kpiVsPrevPct: number;
  kpiNewVideosEst: number;
  funnelViewLabels: string[];
}

const Ctx = createContext<AdminOverviewFiltersValue | null>(null);

export function AdminOverviewFiltersProvider({ children }: { children: ReactNode }) {
  const [teamRegionId, setTeamRegionId] = useState<AdminTeamRegionId | "all">("all");
  const [platformId, setPlatformIdState] = useState<PlatformId | "all">("all");
  const [channelKey, setChannelKeyState] = useState<string | "all">("all");

  const setPlatformId = (v: PlatformId | "all") => {
    setPlatformIdState(v);
    setChannelKeyState("all");
  };

  const setChannelKey = (v: string | "all") => {
    setChannelKeyState(v);
  };

  const channelSelectOptions = useMemo(
    () => channelOptionsForPlatform(platformId),
    [platformId],
  );

  const filteredChannelRows = useMemo(
    () =>
      filterPlatformChannelRows(
        ADMIN_PLATFORM_CHANNEL_ROWS,
        teamRegionId,
        platformId,
        channelKey,
      ),
    [teamRegionId, platformId, channelKey],
  );

  const platformTableRows = useMemo(
    () => withTrafficSharePct(filteredChannelRows),
    [filteredChannelRows],
  );

  const donutSlices = useMemo(
    () => donutSlicesFromA5Acc(aggregateA5FromChannelRows(filteredChannelRows)),
    [filteredChannelRows],
  );

  const baselineChannelRowsForTeam = useMemo(
    () =>
      filterPlatformChannelRows(
        ADMIN_PLATFORM_CHANNEL_ROWS,
        teamRegionId,
        "all",
        "all",
      ),
    [teamRegionId],
  );

  /** Tỉ lệ video đang xem / video trong cùng phạm vi team (không gồm lọc nền tảng·kênh) */
  const growthChartScaleFactor = useMemo(() => {
    const num = filteredChannelRows.reduce((s, r) => s + r.video, 0);
    const den = baselineChannelRowsForTeam.reduce((s, r) => s + r.video, 0);
    return den > 0 ? num / den : 0;
  }, [filteredChannelRows, baselineChannelRowsForTeam]);

  const growthFilterSummary = useMemo(
    () =>
      buildGrowthFilterSummary(
        teamRegionId,
        platformId,
        channelKey,
        channelSelectOptions,
      ),
    [teamRegionId, platformId, channelKey, channelSelectOptions],
  );

  const totalVideoFiltered = useMemo(
    () => filteredChannelRows.reduce((s, r) => s + r.video, 0),
    [filteredChannelRows],
  );

  const trafficKFiltered = useMemo(
    () => sumTrafficK(filteredChannelRows),
    [filteredChannelRows],
  );

  const kpiTrafficLabel = useMemo(
    () => formatTrafficKpiLabel(trafficKFiltered),
    [trafficKFiltered],
  );

  const kpiRevenueLabel = useMemo(
    () => formatRevenueKpiLabel(trafficKFiltered),
    [trafficKFiltered],
  );

  const kpiVsPrevPct = useMemo(
    () => weightedVsPrevPct(filteredChannelRows),
    [filteredChannelRows],
  );

  const kpiNewVideosEst = useMemo(
    () =>
      Math.round(
        (141 * totalVideoFiltered) / Math.max(1, ADMIN_COMPANY_VIDEO_TOTAL),
      ),
    [totalVideoFiltered],
  );

  const funnelViewLabels = useMemo(
    () => funnelViewLabelsForTraffic(trafficKFiltered),
    [trafficKFiltered],
  );

  const videoFullByTeam = useMemo(
    () => videoTotalsByTeam(baselineChannelRowsForTeam),
    [baselineChannelRowsForTeam],
  );

  const videoFilteredByTeam = useMemo(
    () => videoTotalsByTeam(filteredChannelRows),
    [filteredChannelRows],
  );

  const teamPerfRows = useMemo(
    () =>
      scaleTeamPerfRowsByVideoScope(
        filterTeamPerfRows(ADMIN_TEAM_PERF_ROWS, teamRegionId),
        videoFullByTeam,
        videoFilteredByTeam,
      ),
    [teamRegionId, videoFullByTeam, videoFilteredByTeam],
  );

  const teamPerfTotals = useMemo(() => aggregateTeamTotals(teamPerfRows), [teamPerfRows]);

  const value = useMemo(
    () => ({
      teamRegionId,
      setTeamRegionId,
      teamPerfRows,
      teamPerfTotals,
      platformId,
      channelKey,
      setPlatformId,
      setChannelKey,
      channelSelectOptions,
      filteredChannelRows,
      platformTableRows,
      donutSlices,
      growthChartScaleFactor,
      growthFilterSummary,
      totalVideoFiltered,
      kpiTrafficLabel,
      kpiRevenueLabel,
      kpiVsPrevPct,
      kpiNewVideosEst,
      funnelViewLabels,
    }),
    [
      teamRegionId,
      teamPerfRows,
      teamPerfTotals,
      platformId,
      channelKey,
      channelSelectOptions,
      filteredChannelRows,
      platformTableRows,
      donutSlices,
      growthChartScaleFactor,
      growthFilterSummary,
      totalVideoFiltered,
      kpiTrafficLabel,
      kpiRevenueLabel,
      kpiVsPrevPct,
      kpiNewVideosEst,
      funnelViewLabels,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminOverviewFilters() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useAdminOverviewFilters requires AdminOverviewFiltersProvider");
  }
  return v;
}
