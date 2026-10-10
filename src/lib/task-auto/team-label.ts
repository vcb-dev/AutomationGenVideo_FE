import type { Team } from '@/types/task-auto'

type TeamLike = Pick<Team, 'name' | 'leader_id'> & { members?: { user_id: string }[] }

/** Các team user đang thuộc về — làm leader hoặc là thành viên. */
export function getMyTeams<T extends TeamLike>(teams: T[] | undefined, userId: string | undefined): T[] {
  if (!userId) return []
  return (teams ?? []).filter(t =>
    t.leader_id === userId || t.members?.some(m => m.user_id === userId),
  )
}

/** "K4" → "Team K4"; tên đã có tiền tố Team (vd "Team K4") thì giữ nguyên để không thành "Team Team K4". */
export function formatTeamName(name: string): string {
  const trimmed = name.trim()
  return /^team\b/i.test(trimmed) ? trimmed : `Team ${trimmed}`
}

/**
 * Nhãn cho trang quản lý team (/dashboard/task-auto/teams):
 *  - Admin/Manager thấy mọi team        → "Quản lý team"
 *  - Thuộc đúng 1 team                  → tên team, vd "Team K4", "Team MEDIA"
 *  - Nhiều team / chưa có team / đang tải → "Team của tôi" (trang có ô chọn team)
 */
export function getTeamsPageLabel(myTeams: Pick<Team, 'name'>[], isAdminOrManager: boolean): string {
  if (isAdminOrManager) return 'Quản lý team'
  if (myTeams.length === 1) return formatTeamName(myTeams[0].name)
  return 'Team của tôi'
}
