'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { UserPlus, UserMinus, Crown, Search, Check, Loader2, Users, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { formatDateTime } from '@/components/task-auto/helpers'
import { getTeams, addTeamMember, removeTeamMember, getUsers, getApprovals, setMemberEditorRole } from '@/lib/api/task-auto'
import type { Team, TeamMember } from '@/types/task-auto'

// ── Add Member Modal ────────────────────────────────

function AddMemberModal({
  open,
  teamId,
  existingUserIds,
  onClose,
  onSuccess,
}: {
  open: boolean
  teamId: string
  existingUserIds: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['task-auto', 'users'],
    queryFn: () => getUsers(),
  })

  const filteredUsers = (users || []).filter(u =>
    !existingUserIds.includes(u.id) &&
    (u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()))
  )

  const mutation = useMutation({
    mutationFn: () => addTeamMember(teamId, selectedUserId),
    onSuccess: () => {
      toast.success('Đã thêm thành viên')
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'team', teamId] })
      onSuccess()
    },
    onError: () => toast.error('Thêm thành viên thất bại'),
  })

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title="Thêm thành viên"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!selectedUserId || mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Thêm vào team
          </button>
        </>
      }
    >
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          placeholder="Tìm kiếm tên, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">Không tìm thấy người dùng</p>
        ) : (
          filteredUsers.map(u => (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                selectedUserId === u.id
                  ? 'bg-indigo-600/20 border border-indigo-500/40'
                  : 'hover:bg-gray-100'
              )}
            >
              <AvatarInitials name={u.full_name} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{u.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{u.email}</p>
              </div>
              {selectedUserId === u.id && (
                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </DarkModal>
  )
}

// ── Main Tab ────────────────────────────────────────

interface MembersTabProps {
  canManage: boolean
  isAdminOrManager: boolean
  userId?: string
}

export function MembersTab({ canManage, isAdminOrManager, userId }: MembersTabProps) {
  const qc = useQueryClient()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  // Approved editors list (user_id set)
  const { data: approvedEditors } = useQuery({
    queryKey: ['task-auto', 'approvals', 'APPROVED'],
    queryFn: () => getApprovals('APPROVED'),
  })
  const approvedEditorIds = new Set((approvedEditors || []).map(a => a.user_id))

  // For non-admin/manager: auto-select their team and lock the selector
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
  const existingUserIds = members.map(m => m.user_id)

  const removeMut = useMutation({
    mutationFn: (memberId: string) => removeTeamMember(selectedTeamId, memberId),
    onSuccess: () => {
      toast.success('Đã xoá thành viên')
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
    },
    onError: () => toast.error('Xoá thành viên thất bại'),
  })

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
      {/* Controls — card giống TaskFilters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {isAdminOrManager ? (
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
          ) : (
            selectedTeam && (
              <div className="flex items-center gap-2 px-4 py-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-base font-semibold text-indigo-700">
                <Users className="w-4 h-4" />
                {selectedTeam.name}
              </div>
            )
          )}

          {selectedTeamId && canManage && (
            <button
              onClick={() => setShowAddMember(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors ml-auto shrink-0"
            >
              <UserPlus className="w-5 h-5" /> Thêm thành viên
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      {!selectedTeamId ? (
        <EmptyState icon={Users} title="Chọn đội nhóm để xem thành viên" />
      ) : members.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl">
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <EmptyState icon={UserPlus} title="Team chưa có thành viên" />
            {canManage && (
              <button
                onClick={() => setShowAddMember(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Thêm thành viên đầu tiên
              </button>
            )}
          </div>
        </div>
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
                      <p className="font-semibold text-slate-800 text-sm">{member.user?.full_name || member.user_id}</p>
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
                    <p className="text-xs text-slate-400 font-medium">{formatDateTime(member.joined_at).split(' ')[0]}</p>
                  </div>

                  {/* Editor toggle — chỉ hiện khi canManage; leader có thể set chính mình */}
                  {canManage && (!isLeader || member.user_id === userId) && (
                    <button
                      onClick={() => editorMut.mutate({ memberId: member.user_id, isEditor: !isEditor })}
                      disabled={editorMut.isPending}
                      title={isEditor ? 'Thu hồi quyền Editor' : 'Đặt làm Editor'}
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

                  {/* Remove member — chỉ hiện khi canManage và không phải leader */}
                  {canManage && !isLeader && (
                    <button
                      onClick={() => {
                        if (confirm(`Xoá ${member.user?.full_name || 'thành viên này'} khỏi team?`)) {
                          removeMut.mutate(member.user_id)
                        }
                      }}
                      disabled={removeMut.isPending}
                      className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors flex-shrink-0"
                      title="Xoá khỏi team"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAddMember && selectedTeamId && (
        <AddMemberModal
          open={showAddMember}
          teamId={selectedTeamId}
          existingUserIds={existingUserIds}
          onClose={() => setShowAddMember(false)}
          onSuccess={() => setShowAddMember(false)}
        />
      )}
    </div>
  )
}
