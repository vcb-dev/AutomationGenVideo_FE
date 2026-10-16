'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { getTeams, isPrivilegedSourceTeamMember, isContentTeamMember } from '@/lib/api/task-auto'
import { UserRole } from '@/types/auth'
import type { BrandType } from '@/types/task-auto'
import { WinVideosGrid } from '@/components/task-auto/WinVideosGrid'
import { ContentViewTabs, type ContentView } from '@/components/task-auto/ContentViewTabs'
import { ContentsTab } from './components/ContentsTab'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

export default function ContentPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []
  const isAdminOrManager = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MANAGER)

  const [view, setView] = useState<ContentView>('win')
  const [brand, setBrand] = useState<BrandType>('TRANG_SUC')
  const [month, setMonth] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const isScaleData = !isAdminOrManager && isPrivilegedSourceTeamMember(teams, user?.id)
  // Content Team làm content cho CẢ 2 thương hiệu (Đồ da + Trang sức) — không khóa vào brand_type
  // của 1 team sản xuất, nên cũng được quyền chuyển đổi thương hiệu như admin/manager.
  const isContentCreator = !isAdminOrManager && isContentTeamMember(teams, user?.id)
  const canSwitchBrand = isAdminOrManager || isScaleData || isContentCreator

  // Auto-derive brand from user's team for non-admin/manager — bỏ qua nếu team của user là
  // Content Team (team_kind=CONTENT) vì team đó không gắn cố định 1 thương hiệu.
  useEffect(() => {
    if (isAdminOrManager || isContentCreator || !user?.id || !teams) return
    const myTeam =
      teams.find(t => t.leader_id === user.id) ||
      teams.find(t => t.members?.some(m => m.user_id === user.id))
    if (myTeam?.brand_type) setBrand(myTeam.brand_type)
  }, [isAdminOrManager, isContentCreator, user?.id, teams])

  const currentBrand = BRANDS.find(b => b.key === brand)!

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Content nổi bật</h1>
          <p className="text-slate-500 text-base mt-1">
            {view === 'win'
              ? 'Toàn bộ video trên trang Facebook nội bộ đạt từ 10K lượt xem — lọc theo team, kênh, tuyến nội dung và thị trường'
              : 'Content dùng chung toàn hệ thống — đẩy lên từ kho team và content win, theo dõi theo tuyến'}
          </p>
        </div>

        {view === 'manual' && (
          <div className="flex gap-3 flex-wrap">
            {canSwitchBrand ? (
              BRANDS.map(b => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setBrand(b.key)}
                  aria-pressed={brand === b.key}
                  className={cn(
                    'px-6 py-2.5 rounded-full text-sm font-semibold border-2 transition-all',
                    brand === b.key
                      ? b.color === 'amber'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                        : 'bg-violet-600 border-violet-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                  )}
                >
                  {b.label}
                </button>
              ))
            ) : (
              <span className={cn(
                'px-6 py-2.5 rounded-full text-sm font-semibold border-2',
                currentBrand.color === 'amber'
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-violet-600 border-violet-600 text-white'
              )}>
                {currentBrand.label}
              </span>
            )}
          </div>
        )}
      </div>

      <ContentViewTabs value={view} onChange={setView} />

      {view === 'win'
        ? <WinVideosGrid />
        : <ContentsTab key={brand} brandType={brand} month={month} onMonthChange={setMonth} />}
    </div>
  )
}
