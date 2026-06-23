'use client'

import { useState } from 'react'
import { Target, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MonthPicker } from '@/components/task-auto'
import { currentMonth } from '@/components/task-auto/helpers'
import { useAuthStore } from '@/store/auth-store'
import { UserRole } from '@/types/auth'
import { TeamKpiTab } from './components/TeamKpiTab'
import { EditorKpiTab } from './components/EditorKpiTab'

type KpiTab = 'team' | 'editor'

export default function KpiPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []
  const isAdmin   = roles.includes(UserRole.ADMIN)
  const isManager = roles.includes(UserRole.MANAGER)
  const isLeader  = roles.includes(UserRole.LEADER)

  const isAdminOrManager = isAdmin || isManager
  const canEditTeamKpi = isAdminOrManager
  const canEditEditorKpi = isAdminOrManager || isLeader

  const [activeTab, setActiveTab] = useState<KpiTab>('team')
  const [month, setMonth] = useState(currentMonth)
  // Shared team selection between KPI Team and KPI Editor tabs
  const [selectedTeamId, setSelectedTeamId] = useState('')

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">KPI</h1>
          <p className="text-slate-500 text-base mt-1">Quản lý KPI theo team và editor</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {isLeader && !isAdminOrManager && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5 text-sm text-blue-700">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            Là <strong>Leader</strong>: bạn có thể xem KPI team (chỉ đọc) và đặt KPI editor cho thành viên trong team của mình.
          </span>
        </div>
      )}

      {!canEditEditorKpi && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5 text-sm text-blue-700">
          <Info className="w-4 h-4 shrink-0" />
          <span>Bạn đang xem KPI ở chế độ chỉ đọc.</span>
        </div>
      )}

      <div className="border-b border-gray-200 flex gap-1">
        {(['team', 'editor'] as KpiTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('flex items-center gap-2 px-6 py-3 text-base font-medium rounded-t-lg transition-colors',
              activeTab === tab ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-800 hover:bg-gray-100')}>
            <Target className="w-4 h-4" />
            {tab === 'team' ? 'KPI Team' : 'KPI Editor'}
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
        />
      )}
    </div>
  )
}
