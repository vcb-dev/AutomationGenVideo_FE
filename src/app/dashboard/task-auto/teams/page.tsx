'use client'

import { useState, useEffect } from 'react'
import { Package, User, BookOpen, Radio, Archive } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { MembersTab } from './components/MembersTab'
import { TeamProductsTab } from './components/TeamProductsTab'
import { TeamContentsTab } from './components/TeamContentsTab'
import { TeamSourcesTab } from './components/TeamSourcesTab'
import { TeamWarehouseTab } from './components/TeamWarehouseTab'
import { UserRole } from '@/types/auth'
import { getTeams } from '@/lib/api/task-auto'
import type { BrandType } from '@/types/task-auto'

type TabId = 'members' | 'products' | 'contents' | 'sources' | 'warehouse'

const ALL_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'members',   label: 'Nhóm của tôi', icon: User },
  { id: 'products',  label: 'Kho sản phẩm', icon: Package },
  { id: 'contents',  label: 'Kho content',  icon: BookOpen },
  { id: 'sources',   label: 'Kho source',   icon: Radio },
  { id: 'warehouse', label: 'Kho tháng',    icon: Archive },
]

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

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">Đội nhóm</h1>
        <p className="text-slate-500 text-base mt-1">Quản lý đội nhóm và thành viên</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 flex gap-1">
        {ALL_TABS.map(tab => (
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
          userId={user?.id}
          brandType={brand}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
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
    </div>
  )
}
