'use client'

import { Crown, Edit2, Trash2, Users, Loader2 } from 'lucide-react'
import { getInitials } from '@/components/task-auto/helpers'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { Team } from '@/types/task-auto'

interface Props {
  teams: Team[] | undefined
  isLoading: boolean
  canDelete: boolean
  canEdit: boolean
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
}

export function TeamsGrid({ teams, isLoading, canDelete, canEdit, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-5">
      {/* Header row */}
      <p className="text-base text-slate-500">{teams?.length ?? 0} đội nhóm</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : !teams || teams.length === 0 ? (
        <EmptyState icon={Users} title="Chưa có đội nhóm nào" description="Dữ liệu team được đồng bộ từ hệ thống gốc" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => onEdit(team)}
              onDelete={() => onDelete(team)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TeamCard({
  team,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  team: Team
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const memberCount = team._count?.members ?? team.members?.length ?? 0
  const taskCount = team._count?.tasks ?? 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
      {/* Top row: name + status + actions */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="text-lg font-bold text-slate-900 truncate">{team.name}</h3>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold flex-shrink-0 ${
            team.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-slate-500'
          }`}>
            {team.is_active ? 'Hoạt động' : 'Dừng'}
          </span>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {canEdit && (
              <button onClick={onEdit} className="p-2 hover:bg-gray-100 text-indigo-600 rounded-xl transition-colors" title="Sửa">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors" title="Xoá">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leader row */}
      {team.leader ? (
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-base text-slate-600 truncate">{team.leader.full_name}</span>
          <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 text-sm font-semibold rounded-full flex-shrink-0">Leader</span>
        </div>
      ) : (
        <div className="mb-4 h-6" />
      )}

      {/* Divider + Stats + Avatars on one row */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        {/* Stats inline */}
        <div className="flex items-center gap-2 text-base">
          <span className="font-bold text-slate-800">{memberCount}</span>
          <span className="text-slate-400">Thành viên</span>
          <span className="text-gray-200">·</span>
          <span className="font-bold text-indigo-600">{taskCount}</span>
          <span className="text-slate-400">Tasks</span>
        </div>

        {/* Avatar stack */}
        {team.members && team.members.length > 0 && (
          <div className="flex -space-x-2">
            {team.members.slice(0, 4).map(m => (
              <div
                key={m.id}
                className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold flex items-center justify-center border-2 border-white shadow-sm"
                title={m.user?.full_name}
              >
                {getInitials(m.user?.full_name)}
              </div>
            ))}
            {(team.members?.length ?? 0) > 4 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 text-slate-500 text-sm font-bold flex items-center justify-center border-2 border-white shadow-sm">
                +{(team.members?.length ?? 0) - 4}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
