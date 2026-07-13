/** Team khu vực — mock hiệu suất admin */

export type AdminTeamRegionId = "vietnam" | "japan" | "taiwan";

export interface AdminTeamPerfRow {
  id: AdminTeamRegionId;
  label: string;
  staff: number;
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
  trafficLabel: string;
  progressPct: number;
}

export const TEAM_REGION_OPTIONS: { id: AdminTeamRegionId | "all"; label: string }[] = [
  { id: "all", label: "Tất cả Team" },
  { id: "vietnam", label: "Team Việt Nam" },
  { id: "japan", label: "Team Nhật Bản" },
  { id: "taiwan", label: "Team Đài Loan" },
];

/** Tổng 5A = 317 (khớp mock dashboard cũ) */
export const ADMIN_TEAM_PERF_ROWS: AdminTeamPerfRow[] = [
  {
    id: "vietnam",
    label: "Team Việt Nam",
    staff: 5,
    a1: 73,
    a2: 48,
    a3: 32,
    a4: 22,
    a5: 18,
    trafficLabel: "1.10M",
    progressPct: 76,
  },
  {
    id: "japan",
    label: "Team Nhật Bản",
    staff: 4,
    a1: 25,
    a2: 19,
    a3: 14,
    a4: 9,
    a5: 5,
    trafficLabel: "340K",
    progressPct: 71,
  },
  {
    id: "taiwan",
    label: "Team Đài Loan",
    staff: 4,
    a1: 18,
    a2: 14,
    a3: 10,
    a4: 7,
    a5: 3,
    trafficLabel: "410K",
    progressPct: 69,
  },
];

export function sumA1to5(r: AdminTeamPerfRow) {
  return r.a1 + r.a2 + r.a3 + r.a4 + r.a5;
}

export function filterTeamPerfRows(
  rows: AdminTeamPerfRow[],
  teamId: AdminTeamRegionId | "all",
): AdminTeamPerfRow[] {
  if (teamId === "all") return rows;
  return rows.filter((r) => r.id === teamId);
}

/** Co A1–A5 & traffic theo tỉ lệ video trong bộ lọc kênh / video baseline của team */
export function scaleTeamPerfRowsByVideoScope(
  rows: AdminTeamPerfRow[],
  videoFullByTeam: Record<AdminTeamRegionId, number>,
  videoFilteredByTeam: Record<AdminTeamRegionId, number>,
): AdminTeamPerfRow[] {
  const scaleTraffic = (label: string, scale: number) => {
    const m = label.match(/^([\d.]+)(M|K)$/);
    if (!m) return label;
    const n = Number.parseFloat(m[1]);
    const k = m[2] === "M" ? n * 1000 : n;
    const next = k * scale;
    if (next >= 1000) return `${(next / 1000).toFixed(2)}M`;
    return `${Math.round(next)}K`;
  };

  return rows.map((r) => {
    const full = videoFullByTeam[r.id];
    const flt = videoFilteredByTeam[r.id];
    const scale = full > 0 ? flt / full : 0;
    const q = (n: number) => Math.max(0, Math.round(n * scale));
    return {
      ...r,
      a1: q(r.a1),
      a2: q(r.a2),
      a3: q(r.a3),
      a4: q(r.a4),
      a5: q(r.a5),
      trafficLabel: scaleTraffic(r.trafficLabel, scale),
      progressPct: r.progressPct,
    };
  });
}

export function aggregateTeamTotals(rows: AdminTeamPerfRow[]) {
  const staff = rows.reduce((s, r) => s + r.staff, 0);
  const a1 = rows.reduce((s, r) => s + r.a1, 0);
  const a2 = rows.reduce((s, r) => s + r.a2, 0);
  const a3 = rows.reduce((s, r) => s + r.a3, 0);
  const a4 = rows.reduce((s, r) => s + r.a4, 0);
  const a5 = rows.reduce((s, r) => s + r.a5, 0);
  const total5 = a1 + a2 + a3 + a4 + a5;
  const progressWeighted =
    total5 > 0
      ? rows.reduce((s, r) => s + r.progressPct * sumA1to5(r), 0) / total5
      : 0;
  // Traffic tổng mock (K): parse đơn giản từ label
  const trafficK = rows.reduce((s, r) => {
    const m = r.trafficLabel.match(/^([\d.]+)(M|K)$/);
    if (!m) return s;
    const n = Number.parseFloat(m[1]);
    return s + (m[2] === "M" ? n * 1000 : n);
  }, 0);
  const trafficLabel =
    trafficK >= 1000 ? `${(trafficK / 1000).toFixed(2)}M` : `${Math.round(trafficK)}K`;
  return {
    staff,
    a1,
    a2,
    a3,
    a4,
    a5,
    total5,
    progressPct: Math.round(progressWeighted),
    trafficLabel,
  };
}
