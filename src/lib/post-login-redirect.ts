import { UserRole } from "@/types/auth";

/** Đích mặc định sau đăng nhập theo role (ưu tiên: Admin → Leader → Manager). */
export function getDashboardPathForRoles(roles: string[] | undefined | null): string {
  const r = roles ?? [];
  if (r.includes(UserRole.ADMIN)) return "/dashboard/admin";
  if (r.includes(UserRole.LEADER)) return "/dashboard/leader";
  if (r.includes(UserRole.MANAGER)) return "/dashboard/admin";
  return "/dashboard/manager/user-activity?tab=performance";
}
