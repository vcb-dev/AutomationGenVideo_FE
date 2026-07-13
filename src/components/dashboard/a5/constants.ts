/** Dữ liệu biểu đồ tăng trưởng 5A — đồng bộ với mock HTML */
export const CHART_LABELS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"] as const;

export type A5Key = "a1" | "a2" | "a3" | "a4" | "a5";

export const A5_KEYS: A5Key[] = ["a1", "a2", "a3", "a4", "a5"];

export const A5_LINE_COLORS: Record<A5Key, string> = {
  a1: "#D44876",
  a2: "#3B6FD9",
  a3: "#1A9E78",
  a4: "#D08A18",
  a5: "#8B5CC6",
};

export const A5_AREA_BG: Record<A5Key, string> = {
  a1: "rgba(212,72,118,.08)",
  a2: "rgba(59,111,217,.08)",
  a3: "rgba(26,158,120,.08)",
  a4: "rgba(208,138,24,.08)",
  a5: "rgba(139,92,198,.08)",
};

export const DATA_2026 = {
  labels: [...CHART_LABELS],
  a1: [42, 58, 72, null, null, null, null, null, null, null, null, null] as (number | null)[],
  a2: [30, 45, 57, null, null, null, null, null, null, null, null, null] as (number | null)[],
  a3: [22, 30, 37, null, null, null, null, null, null, null, null, null] as (number | null)[],
  a4: [18, 24, 26, null, null, null, null, null, null, null, null, null] as (number | null)[],
  a5: [8, 12, 16, null, null, null, null, null, null, null, null, null] as (number | null)[],
};

export const DATA_2025 = {
  labels: [...CHART_LABELS],
  a1: [15, 18, 22, 25, 28, 32, 34, 30, 35, 38, 40, 42],
  a2: [10, 12, 15, 18, 20, 22, 25, 23, 26, 28, 29, 30],
  a3: [8, 10, 12, 14, 15, 17, 18, 16, 18, 20, 21, 22],
  a4: [5, 7, 9, 10, 12, 14, 15, 14, 16, 17, 18, 18],
  a5: [3, 4, 5, 6, 7, 8, 8, 7, 9, 10, 10, 8],
};

export type YearKey = "2026" | "2025";
