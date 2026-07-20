'use client'

import { useState, useEffect, useMemo } from 'react'
import { Package, FileText, Radio, BookUser, Archive, Eye } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { getTeams } from '@/lib/api/task-auto'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { UserRole } from '@/types/auth'
import { MyProductsTab } from './components/MyProductsTab'
import { MyContentsTab } from './components/MyContentsTab'
import { MySourcesTab } from './components/MySourcesTab'
import { MyWarehouseTab } from './components/MyWarehouseTab'
import type { BrandType, TeamMarket } from '@/types/task-auto'

type TabId = 'products' | 'contents' | 'sources' | 'warehouse'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'products',  label: 'Sản phẩm',  icon: Package },
  { id: 'contents',  label: 'Content',   icon: FileText },
  { id: 'sources',   label: 'Source',    icon: Radio },
  { id: 'warehouse', label: 'Kho tháng', icon: Archive },
]

export default function MyCatalogPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []
  const isAdminOrManager = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MANAGER)
  const isLeader = roles.includes(UserRole.LEADER)

  const [brand, setBrand]           = useState<BrandType>('TRANG_SUC')
  const [teamMarket, setTeamMarket] = useState<TeamMarket>('VIETNAM')
  const [activeTab, setActiveTab]   = useState<TabId>('products')
  const [viewUserId, setViewUserId] = useState('') // '' = xem kho của chính mình

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  // Auto-derive brand + market from user's team for non-admin/manager
  useEffect(() => {
    if (isAdminOrManager || !user?.id || !teams) return
    const myTeam =
      teams.find(t => t.leader_id === user.id) ||
      teams.find(t => t.members?.some(m => m.user_id === user.id))
    if (myTeam?.brand_type) setBrand(myTeam.brand_type)
    if (myTeam?.market) setTeamMarket(myTeam.market)
  }, [isAdminOrManager, user?.id, teams])

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

  const currentBrand = BRANDS.find(b => b.key === brand)!

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <BookUser className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              {readOnly ? `Kho cá nhân của ${selectedMember?.full_name ?? 'thành viên'}` : 'Kho cá nhân'}
            </h1>
            <p className="text-slate-500 text-base mt-0.5">
              {readOnly
                ? 'Bạn đang xem ở chế độ chỉ đọc — không thể thêm/sửa/xóa mục trong kho này'
                : 'Danh mục riêng của bạn — sản phẩm, content và source bạn tự thêm'}
            </p>
          </div>
        </div>
      </div>

      {/* Chọn xem kho của chính mình hoặc của thành viên khác (leader/admin/manager) */}
      {viewableMembers.length > 0 && (
        <div className="flex items-center gap-3">
          <CustomSelect
            label="Xem kho của"
            value={viewUserId}
            onChange={setViewUserId}
            options={[
              { value: '', label: 'Tôi (kho của bạn)' },
              ...viewableMembers.map(m => ({ value: m.user_id, label: `${m.full_name} — ${m.teamName}` })),
            ]}
            searchable
            className="min-w-[280px]"
          />
        </div>
      )}

      {readOnly ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-amber-700 text-sm">
          <Eye className="w-4 h-4 shrink-0" />
          Chế độ chỉ xem (leader/admin) — không thể chỉnh sửa kho cá nhân của thành viên khác.
        </div>
      ) : (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 text-indigo-700 text-sm">
          Những mục trong kho cá nhân chỉ mình bạn quản lý. Bạn có thể{' '}
          <strong>đẩy sang kho team</strong> để chia sẻ với cả đội.
        </div>
      )}

      {/* Tab bar + Brand indicator */}
      <div className="border-b border-gray-200 flex items-center justify-between">
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-base rounded-t-xl transition-all',
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-gray-100'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Brand: switcher cho admin/manager, badge cho user thường */}
        <div className="flex gap-3 pb-1">
          {isAdminOrManager ? (
            BRANDS.map(b => (
              <button
                key={b.key}
                onClick={() => setBrand(b.key)}
                className={cn(
                  'px-6 py-1.5 rounded-full text-sm font-semibold border-2 transition-all',
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
              'px-6 py-1.5 rounded-full text-sm font-semibold border-2',
              currentBrand.color === 'amber'
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-violet-600 border-violet-600 text-white'
            )}>
              {currentBrand.label}
            </span>
          )}
        </div>
      </div>

      {/* Tab content — key resets state khi đổi nhóm hoặc đổi người đang xem */}
      <div>
        {activeTab === 'products'  && <MyProductsTab  key={`${brand}-${targetUserId}`} userId={targetUserId} brandType={brand} readOnly={readOnly} />}
        {activeTab === 'contents'  && <MyContentsTab  key={`${brand}-${targetUserId}`} userId={targetUserId} brandType={brand} teamMarket={teamMarket} readOnly={readOnly} />}
        {activeTab === 'sources'   && <MySourcesTab   key={`${brand}-${targetUserId}`} userId={targetUserId} brandType={brand} readOnly={readOnly} />}
        {activeTab === 'warehouse' && <MyWarehouseTab key={`${brand}-${targetUserId}`} userId={targetUserId} brandType={brand} teamMarket={teamMarket} readOnly={readOnly} />}
      </div>
    </div>
  )
}
