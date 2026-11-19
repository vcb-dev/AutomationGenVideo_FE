import { UserRole } from '@/types/auth'

type TeamWithLeader = { leader_id?: string | null }

/**
 * Phạm vi team hiển thị riêng cho trang lịch sử nhiệm vụ còn thiếu.
 * Backend vẫn là lớp phân quyền chính; hàm này giữ dropdown/thành viên trên UI
 * khớp với phạm vi đó, tránh để Leader nhìn thấy tên các team không quản lý.
 */
export function getComplianceVisibleTeams<T extends TeamWithLeader>(
  teams: T[],
  roles: UserRole[],
  userId?: string,
): T[] {
  const isAdminOrManager = roles.some(role =>
    role === UserRole.ADMIN || role === UserRole.MANAGER,
  )
  if (isAdminOrManager) return teams

  if (roles.includes(UserRole.LEADER)) {
    if (!userId) return []
    return teams.filter(team => team.leader_id === userId)
  }

  return []
}
