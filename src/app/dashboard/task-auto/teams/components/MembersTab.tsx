'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Crown, Users, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { formatDateTime } from '@/components/task-auto/helpers'
import { getTeams, getApprovals, setMemberEditorRole } from '@/lib/api/task-auto'
import { TeamMember } from '@/types/task-auto'

interface MembersTabProps {
  canManage: boolean
  isAdminOrManager: boolean
  userId?: string
}

export function MembersTab({ canManage, isAdminOrManager, userId }: MembersTabProps) {
  const qc = useQueryClient()
  const [selectedTeamId, setSelectedTeamId] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const { data: approvedEditors } = useQuery({
    queryKey: ['task-auto', 'approvals', 'APPROVED'],
    queryFn: () => getApprovals('APPROVED'),
  })
  const approvedEditorIds = new Set((approvedEditors || []).map(a => a.user_id))

  // Non-admin/manager: auto-select their own team
  useEffect(() => {
    if (!isAdminOrManager && userId && teams) {
      const myTeam =
        teams.find(t => t.leader_id === userId) ||
        teams.find(t => t.members?.some(m => m.user_id === userId))
      if (myTeam) setSelectedTeamId(myTeam.id)
    }
  }, [isAdminOrManager, userId, teams])

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const members: TeamMember[] = selectedTeam?.members || []

  const editorMut = useMutation({
    mutationFn: ({ memberId, isEditor }: { memberId: string; isEditor: boolean }) =>
      setMemberEditorRole(selectedTeamId, memberId, isEditor),
    onSuccess: (_, vars) => {
      toast.success(vars.isEditor ? 'Đã đặt làm Editor' : 'Đã thu hồi quyền Editor')
      qc.invalidateQueries({ queryKey: ['task-auto', 'approvals'] })
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  return (
    <div className="space-y-5">
      {/* Team selector — chỉ hiện với admin/manager */}
      {isAdminOrManager && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <CustomSelect
            value={selectedTeamId}
            onChange={setSelectedTeamId}
            options={[
              { value: '', label: 'Tất cả đội nhóm' },
              ...(teams ?? []).map(t => ({ value: t.id, label: t.name })),
            ]}
            className="min-w-[220px]"
            searchable
          />
        </div>
      )}

      {/* Content */}
      {!selectedTeamId ? (
        <EmptyState icon={Users} title="Chọn đội nhóm để xem thành viên" />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="Team chưa có thành viên" />
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {/* Team header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">{selectedTeam?.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{members.length} thành viên</p>
            </div>
            {selectedTeam?.leader && (
              <div className="flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4 text-amber-600" />
                <span className="text-slate-700 font-medium">{selectedTeam.leader.full_name}</span>
                <span className="bg-amber-50 text-amber-600 text-xs px-2 py-0.5 rounded-full">Leader</span>
              </div>
            )}
          </div>

          {/* Member list */}
          <div className="divide-y divide-gray-100">
            {members.map(member => {
              const isLeader = member.user_id === selectedTeam?.leader_id
              const isEditor = approvedEditorIds.has(member.user_id)

              return (
                <div key={member.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <AvatarInitials name={member.user?.full_name} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">
                        {member.user?.full_name || member.user_id}
                      </p>
                      {isLeader && (
                        <span className="bg-amber-50 text-amber-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> Leader
                        </span>
                      )}
                      {isEditor && (
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <PenLine className="w-2.5 h-2.5" /> Editor
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{member.user?.email}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">Tham gia</p>
                    <p className="text-xs text-slate-400 font-medium">
                      {formatDateTime(member.joined_at).split(' ')[0]}
                    </p>
                  </div>

                  {/* Editor toggle */}
                  {canManage && (
                    <button
                      onClick={() => editorMut.mutate({ memberId: member.user_id, isEditor: !isEditor })}
                      disabled={editorMut.isPending}
                      title={isEditor ? 'Thu hồi quyền Editor' : 'Gán làm Editor'}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors flex-shrink-0 text-xs font-semibold flex items-center gap-1',
                        isEditor
                          ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          : 'bg-gray-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                      )}
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      {isEditor ? 'Editor' : 'Gán Editor'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
