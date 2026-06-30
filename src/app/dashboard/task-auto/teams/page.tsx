'use client'

import { useState, useEffect } from 'react'
import { Package, User, BookOpen, Radio, Archive, BarChart2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { MembersTab } from './components/MembersTab'
import { TeamProductsTab } from './components/TeamProductsTab'
import { TeamContentsTab } from './components/TeamContentsTab'
import { TeamSourcesTab } from './components/TeamSourcesTab'
import { TeamWarehouseTab } from './components/TeamWarehouseTab'
import { TeamStatsTab } from './components/TeamStatsTab'
import { UserRole } from '@/types/auth'
import { getTeams } from '@/lib/api/task-auto'
import type { BrandType } from '@/types/task-auto'

type TabId = 'members' | 'products' | 'contents' | 'sources' | 'warehouse' | 'stats'

const BASE_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'members',   label: 'Nhóm của tôi', icon: User },
  { id: 'products',  label: 'Kho sản phẩm', icon: Package },
  { id: 'contents',  label: 'Kho content',  icon: BookOpen },
  { id: 'sources',   label: 'Kho source',   icon: Radio },
  { id: 'warehouse', label: 'Kho tháng',    icon: Archive },
]

const STATS_TAB = { id: 'stats' as TabId, label: 'Thống kê', icon: BarChart2 }

export default function TeamsPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []

  const isAdmin          = roles.includes(UserRole.ADMIN)
  const isManager        = roles.includes(UserRole.MANAGER)
  const isLeader         = roles.includes(UserRole.LEADER)
  const isAdminOrManager = isAdmin || isManager
  const canManage        = isAdmin || isManager || isLeader

  const [activeTab, setActiveTab]           = useState<TabId>('members')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  // Tab source của Scale Data members dùng state riêng để chọn team độc lập với các tab khác
  const [sourceTeamId, setSourceTeamId]     = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  // Auto-select own team for non-admin/manager
  useEffect(() => {
    if (!isAdminOrManager && user?.id && teams && !selectedTeamId) {
      const myTeam =
        teams.find(t => t.leader_id === user.id) ||
        teams.find(t => t.members?.some(m => m.user_id === user.id))
      if (myTeam) setSelectedTeamId(myTeam.id)
    }
  }, [isAdminOrManager, user?.id, teams, selectedTeamId])

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const brand: BrandType = selectedTeam?.brand_type ?? 'TRANG_SUC'

  // Scale Data membership: ADMIN/MANAGER hoặc là thành viên team "Scale Data"
  const scaleDataTeam = teams?.find(t => t.name === 'Scale Data')
  const scaleDataTeamId = scaleDataTeam?.id ?? ''
  const isScaleDataMember = isAdminOrManager || !!(scaleDataTeam?.members?.some((m: any) => m.user_id === user?.id))

  // Tab "Thống kê" hiển thị với mọi Scale Data member — luôn dùng Scale Data team ID
  const showStatsTab = isScaleDataMember && !!scaleDataTeamId
  const visibleTabs = showStatsTab ? [...BASE_TABS, STATS_TAB] : BASE_TABS

  // Nếu đang ở stats tab nhưng mất quyền (teams chưa load xong), reset về members
  useEffect(() => {
    if (activeTab === 'stats' && !showStatsTab) setActiveTab('members')
  }, [showStatsTab, activeTab])

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">Đội nhóm</h1>
        <p className="text-slate-500 text-base mt-1">Quản lý đội nhóm và thành viên</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 flex gap-1">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-base transition-all border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-gray-100 rounded-t-xl'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'members' && (
        <MembersTab
          canManage={canManage}
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
        />
      )}

      {activeTab === 'products' && (
        <TeamProductsTab
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
          brandType={brand}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
        />
      )}

      {activeTab === 'contents' && (
        <TeamContentsTab
          canManage={canManage}
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
          brandType={brand}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
        />
      )}

      {activeTab === 'sources' && (
        <TeamSourcesTab
          isAdminOrManager={isAdminOrManager}
          isScaleData={isScaleDataMember}
          userId={user?.id}
          brandType={isScaleDataMember && !isAdminOrManager
            ? (teams?.find(t => t.id === sourceTeamId)?.brand_type ?? brand)
            : brand}
          selectedTeamId={isScaleDataMember && !isAdminOrManager ? sourceTeamId : selectedTeamId}
          setSelectedTeamId={isScaleDataMember && !isAdminOrManager ? setSourceTeamId : setSelectedTeamId}
        />
      )}

      {activeTab === 'warehouse' && (
        <TeamWarehouseTab
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
          brandType={brand}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
        />
      )}

      {activeTab === 'stats' && showStatsTab && (
        <TeamStatsTab teamId={scaleDataTeamId} />
      )}
    </div>
  )
}
