'use client'

import { useMemo } from 'react'
import { Eye } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { getTeams } from '@/lib/api/task-auto'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { WinVideosGrid } from '@/components/task-auto/WinVideosGrid'
import type { ContentView } from '@/components/task-auto/ContentViewTabs'
import { UserRole } from '@/types/auth'
import type { BrandType } from '@/types/task-auto'
import { MyProductsTab } from './MyProductsTab'
import { MyContentsTab } from './MyContentsTab'
import { MySourcesTab } from './MySourcesTab'

export type PersonalCatalogKind = 'products' | 'contents' | 'sources'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

interface PersonalCatalogPanelProps {
  kind: PersonalCatalogKind
  contentView: ContentView
  viewUserId: string
  onViewUserIdChange: (userId: string) => void
  brand: BrandType
  onBrandChange: (brand: BrandType) => void
}

export function PersonalCatalogPanel({ kind, contentView, viewUserId, onViewUserIdChange, brand, onBrandChange }: PersonalCatalogPanelProps) {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []
  const isAdminOrManager = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MANAGER)
  const isLeader = roles.includes(UserRole.LEADER)

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  // Admin/manager đổi nhóm tự do; người khác theo nhóm + thị trường của team mình
  const myTeam = isAdminOrManager || !user?.id
    ? undefined
    : teams?.find(t => t.leader_id === user.id) || teams?.find(t => t.members?.some(m => m.user_id === user.id))
  const brandType = myTeam?.brand_type ?? brand
  const teamMarket = myTeam?.market ?? 'VIETNAM'

  // Danh sách thành viên mà mình có quyền xem kho cá nhân (ngoài chính mình):
  // - ADMIN/MANAGER: mọi thành viên + leader của mọi team.
  // - LEADER: chỉ thành viên + leader (nếu khác mình) của (các) team mình đang lãnh đạo.
  // - MEMBER/EDITOR thường: không có quyền xem kho người khác.
  const viewableMembers = useMemo(() => {
    if (!teams || !user?.id) return []
    const relevantTeams = isAdminOrManager
      ? teams
      : isLeader
        ? teams.filter(t => t.leader_id === user.id)
        : []
    if (relevantTeams.length === 0) return []

    const map = new Map<string, { user_id: string; full_name: string; email: string; teamName: string }>()
    for (const t of relevantTeams) {
      if (t.leader && t.leader.id !== user.id && !map.has(t.leader.id)) {
        map.set(t.leader.id, { user_id: t.leader.id, full_name: t.leader.full_name, email: t.leader.email, teamName: t.name })
      }
      for (const m of t.members ?? []) {
        if (m.user_id === user.id || map.has(m.user_id)) continue
        map.set(m.user_id, {
          user_id: m.user_id,
          full_name: m.user?.full_name ?? m.user_id,
          email: m.user?.email ?? '',
          teamName: t.name,
        })
      }
    }
    return [...map.values()].sort((a, b) => a.full_name.localeCompare(b.full_name))
  }, [teams, user?.id, isAdminOrManager, isLeader])

  const selectedMember = viewableMembers.find(m => m.user_id === viewUserId)
  const targetUserId = viewUserId || user?.id
  const readOnly = !!viewUserId

  if (!user || !targetUserId) return null

  const showBrandSwitch = isAdminOrManager && (kind !== 'contents' || contentView === 'manual')
  const tabKey = `${brandType}-${targetUserId}`

  return (
    <div className="space-y-5">
      {(viewableMembers.length > 0 || showBrandSwitch) && (
        <div className="flex flex-wrap items-center gap-3">
          {viewableMembers.length > 0 && (
            <CustomSelect
              label="Xem kho của"
              value={viewUserId}
              onChange={onViewUserIdChange}
              options={[
                { value: '', label: 'Tôi (kho của bạn)' },
                ...viewableMembers.map(m => ({ value: m.user_id, label: `${m.full_name} — ${m.teamName}` })),
              ]}
              searchable
              className="min-w-[280px]"
            />
          )}

          {showBrandSwitch && (
            <div className="flex gap-2 flex-wrap sm:ml-auto">
              {BRANDS.map(b => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => onBrandChange(b.key)}
                  aria-pressed={brandType === b.key}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-semibold border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
                    brandType === b.key
                      ? b.color === 'amber'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                        : 'bg-violet-600 border-violet-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {readOnly ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-amber-700 text-sm">
          <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
          Đang xem kho cá nhân của {selectedMember?.full_name ?? 'thành viên'} ở chế độ chỉ xem — không thể thêm/sửa/xóa.
        </div>
      ) : (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 text-indigo-700 text-sm">
          {kind === 'contents' && contentView === 'manual'
            ? <>Content bạn <strong>viết mới khi tạo nhiệm vụ</strong> sẽ tự lưu vào kho cá nhân. </>
            : 'Những mục trong kho cá nhân chỉ mình bạn quản lý. '}
          Bạn có thể <strong>đẩy sang kho team</strong> để chia sẻ với cả đội.
        </div>
      )}

      {kind === 'products' && <MyProductsTab key={tabKey} userId={targetUserId} brandType={brandType} readOnly={readOnly} />}
      {kind === 'contents' && (contentView === 'win' ? (
        <WinVideosGrid
          key={targetUserId}
          defaultOwnerId={targetUserId}
          defaultOwnerName={readOnly ? selectedMember?.full_name : user.full_name}
        />
      ) : (
        <MyContentsTab key={tabKey} userId={targetUserId} brandType={brandType} teamMarket={teamMarket} readOnly={readOnly} />
      ))}
      {kind === 'sources' && <MySourcesTab key={tabKey} userId={targetUserId} brandType={brandType} readOnly={readOnly} />}
    </div>
  )
}
