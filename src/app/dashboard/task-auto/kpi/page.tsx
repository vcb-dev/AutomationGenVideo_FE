'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Target, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MonthPicker } from '@/components/task-auto'
import { currentMonth } from '@/components/task-auto/helpers'
import { useAuthStore } from '@/store/auth-store'
import { UserRole } from '@/types/auth'
import { getTeams, getMyEditorApproval } from '@/lib/api/task-auto'
import { TeamKpiTab } from './components/TeamKpiTab'
import { EditorKpiTab } from './components/EditorKpiTab'
import { DailyKpiTab } from './components/DailyKpiTab'
import { ContentCreatorKpiTab } from './components/ContentCreatorKpiTab'
import { ContentCreatorDailyKpiTab } from './components/ContentCreatorDailyKpiTab'
import { PerformanceGoalsTab } from './components/PerformanceGoalsTab'

type KpiTab = 'team' | 'editor' | 'okr' | 'daily' | 'content-creator' | 'content-creator-daily'

const TAB_LABELS: Record<KpiTab, string> = {
  editor: 'KPI Editor',
  okr: 'OKR',
  daily: 'KPI Ngày',
  'content-creator': 'KPI Content',
  'content-creator-daily': 'KPI Ngày Content',
  team: 'KPI Team',
}

const TAB_ORDER = Object.keys(TAB_LABELS) as KpiTab[]

export default function KpiPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []
  const isAdmin   = roles.includes(UserRole.ADMIN)
  const isManager = roles.includes(UserRole.MANAGER)
  const isLeader  = roles.includes(UserRole.LEADER)

  const isAdminOrManager = isAdmin || isManager
  const canEditTeamKpi = isAdminOrManager
  const canEditEditorKpi = isAdminOrManager || isLeader

  // Member thường (không admin/manager/leader): chỉ thấy nhóm tab ứng với vai trò thực tế của mình
  // (editor và/hoặc content creator), suy ra từ EditorApproval + TeamMember.is_content_creator.
  const isPlainMember = !isAdminOrManager && !isLeader

  const { data: teamsForRoleCheck, isLoading: teamsLoading } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
    enabled: isPlainMember,
  })
  const { data: myApproval, isLoading: approvalsLoading } = useQuery({
    queryKey: ['task-auto', 'editor-approvals', 'me'],
    queryFn: getMyEditorApproval,
    enabled: isPlainMember,
  })

  const roleCheckLoading = isPlainMember && (teamsLoading || approvalsLoading)
  const isEditorUser = !isPlainMember || roleCheckLoading || myApproval?.status === 'APPROVED'
  const isContentCreatorUser = !isPlainMember || roleCheckLoading
    || (teamsForRoleCheck?.some(t => t.members?.some(m => m.user_id === user?.id && m.is_content_creator)) ?? false)

  const visibleTabs = TAB_ORDER
    .filter(tab => {
      if (!isPlainMember) return true
      if (tab === 'editor' || tab === 'daily') return isEditorUser
      if (tab === 'okr') return true
      if (tab === 'content-creator' || tab === 'content-creator-daily') return isContentCreatorUser
      return true
    })

  const [activeTab, setActiveTab] = useState<KpiTab>('editor')
  const [month, setMonth] = useState(currentMonth)
  // Shared team selection between KPI Team and KPI Editor tabs
  const [selectedTeamId, setSelectedTeamId] = useState('')

  useEffect(() => {
    if (!roleCheckLoading && !visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] ?? 'editor')
    }
  }, [roleCheckLoading, visibleTabs, activeTab])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">KPI</h1>
          <p className="text-slate-500 text-base mt-1">KPI được tổ chức theo nhóm; OKR được quản lý riêng theo từng nhân sự</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {isLeader && !isAdminOrManager && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5 text-sm text-blue-700">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            Là <strong>Leader</strong>: bạn có thể xem KPI team (chỉ đọc), đặt KPI cố định và giao KPI/OKR linh hoạt cho thành viên hoặc chính mình trong team đang lead.
          </span>
        </div>
      )}

      {!canEditEditorKpi && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5 text-sm text-blue-700">
          <Info className="w-4 h-4 shrink-0" />
          <span>Bạn đang xem KPI ở chế độ chỉ đọc.</span>
        </div>
      )}

      <div className="border-b border-gray-200 flex gap-1 overflow-x-auto scrollbar-none">
        {visibleTabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('flex items-center gap-2 px-6 py-3 text-base font-medium rounded-t-lg transition-colors shrink-0 whitespace-nowrap',
              activeTab === tab ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-800 hover:bg-gray-100')}>
            <Target className="w-4 h-4" />
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'team' && (
        <TeamKpiTab
          month={month}
          canEdit={canEditTeamKpi}
          userId={user?.id}
          isAdminOrManager={isAdminOrManager}
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
        />
      )}
      {activeTab === 'editor' && (
        <EditorKpiTab
          month={month}
          canEdit={canEditEditorKpi}
          isLeader={isLeader && !isAdminOrManager}
          userId={user?.id}
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
        />
      )}
      {activeTab === 'okr' && (
        <PerformanceGoalsTab
          month={month}
          canEdit={canEditEditorKpi}
          isLeader={isLeader && !isAdminOrManager}
          userId={user?.id}
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
          fixedType="OKR"
        />
      )}
      {activeTab === 'daily' && (
        <DailyKpiTab
          canEdit={canEditEditorKpi}
          isLeader={isLeader && !isAdminOrManager}
          userId={user?.id}
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
        />
      )}
      {activeTab === 'content-creator' && (
        <ContentCreatorKpiTab
          month={month}
          canEdit={canEditEditorKpi}
          isLeader={isLeader && !isAdminOrManager}
          userId={user?.id}
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
        />
      )}
      {activeTab === 'content-creator-daily' && (
        <ContentCreatorDailyKpiTab
          canEdit={canEditEditorKpi}
          isLeader={isLeader && !isAdminOrManager}
          userId={user?.id}
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
        />
      )}
    </div>
  )
}
