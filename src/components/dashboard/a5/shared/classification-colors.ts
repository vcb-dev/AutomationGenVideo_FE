/**
 * Bảng màu cho biểu đồ "Content theo phân loại". BE trả danh sách đã sắp xếp (count giảm dần, tên
 * làm tie-break) nên ổn định — ta gán màu theo THỨ TỰ trong danh sách để các lát luôn khác hue rõ
 * rệt, thay vì hash tên (dễ rơi vào các sắc gần nhau). "Chưa phân loại" luôn xám, không tiêu tốn
 * slot màu.
 */
export const UNCLASSIFIED_LABEL = "Chưa phân loại";
export const UNCLASSIFIED_COLOR = "#94a3b8"; // slate-400

/** 10 hue cách xa nhau, đều đọc tốt trên nền trắng. */
export const CLASSIFICATION_PALETTE = [
  "#4f6ef7", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ef4444", // red
  "#0ea5e9", // sky
  "#a3e635", // lime
  "#f97316", // orange
  "#06b6d4", // cyan
];
