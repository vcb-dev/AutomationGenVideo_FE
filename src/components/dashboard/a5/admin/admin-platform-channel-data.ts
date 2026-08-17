/** Nền tảng — danh sách tĩnh hợp lệ (khớp giá trị thật trong huyk_channels.platform), không phải mock số liệu. */

export type PlatformId = "facebook" | "tiktok" | "instagram" | "youtube" | "other";

export const PLATFORM_OPTIONS: { id: PlatformId | "all"; label: string }[] = [
  { id: "all", label: "Tất cả nền tảng" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "other", label: "Khác" },
];

export function toPlatformId(raw: string | null | undefined): PlatformId {
  const p = (raw || "").toLowerCase().trim();
  if (p === "facebook" || p === "tiktok" || p === "instagram" || p === "youtube") return p;
  return "other";
}
