'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Crown, Users, PenLine, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { formatDateTime } from '@/components/task-auto/helpers'
import { getTeams, getApprovals, setMemberEditorRole, updateTeam } from '@/lib/api/task-auto'
import type { BrandType, TeamMarket, TeamMember } from '@/types/task-auto'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

const MARKETS: { key: TeamMarket; label: string; color: string }[] = [
  { key: 'VIETNAM',   label: 'Việt Nam',  color: 'emerald' },
  { key: 'INDONESIA', label: 'Indonesia', color: 'amber' },
  { key: 'JAPAN',     label: 'Nhật Bản', color: 'rose' },
  { key: 'THAILAND',  label: 'Thái Lan',  color: 'sky' },
]

const marketBtnClass = (color: string, active: boolean) => cn(
  'px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all',
  active ? {
    emerald: 'bg-emerald-500 border-emerald-500 text-white shadow-sm',
    amber:   'bg-amber-500 border-amber-500 text-white shadow-sm',
    rose:    'bg-rose-500 border-rose-500 text-white shadow-sm',
    sky:     'bg-sky-500 border-sky-500 text-white shadow-sm',
  }[color] : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
)

interface MembersTabProps {
  canManage: boolean
  isAdminOrManager: boolean
  userId?: string
  selectedTeamId: string
  setSelectedTeamId: (id: string) => void
}

export function MembersTab({ canManage, isAdminOrManager, userId, selectedTeamId, setSelectedTeamId }: MembersTabProps) {
  const qc = useQueryClient()
  const [editingTeam, setEditingTeam] = useState(false)
  const [pendingBrand, setPendingBrand] = useState<BrandType | null>(null)
  const [pendingMarket, setPendingMarket] = useState<TeamMarket | null>(null)

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const { data: approvedEditors } = useQuery({
    queryKey: ['task-auto', 'approvals', 'APPROVED'],
    queryFn: () => getApprovals('APPROVED'),
  })
  const approvedEditorIds = new Set((approvedEditors || []).map(a => a.user_id))

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const members: TeamMember[] = selectedTeam?.members || []
  const brand: BrandType = selectedTeam?.brand_type ?? 'TRANG_SUC'

  const isLeaderOfSelected = selectedTeam?.leader_id === userId
  const canEditBrand = isAdminOrManager || isLeaderOfSelected

  const myTeams = (teams ?? []).filter(t =>
    t.leader_id === userId || t.members?.some((m: any) => m.user_id === userId)
  )
  const showTeamPicker = isAdminOrManager || myTeams.length > 1
  const teamPickerOptions = isAdminOrManager
    ? [{ value: '', label: 'Tất cả đội nhóm' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]
    : myTeams.map(t => ({ value: t.id, label: t.name }))

  const editorMut = useMutation({
    mutationFn: ({ memberId, isEditor }: { memberId: string; isEditor: boolean }) =>
      setMemberEditorRole(selectedTeamId, memberId, isEditor),
    onSuccess: (_, vars) => {
      toast.success(vars.isEditor ? 'Đã đặt làm Editor' : 'Đã thu hồi quyền Editor')
      qc.invalidateQueries({ queryKey: ['task-auto', 'approvals'] })
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  const market: TeamMarket = selectedTeam?.market ?? 'VIETNAM'
  const currentMarket = MARKETS.find(m => m.key === market)!

  const teamMut = useMutation({
    mutationFn: ({ brand, mkt }: { brand: BrandType; mkt: TeamMarket }) =>
      updateTeam(selectedTeamId, { brand_type: brand, market: mkt } as any),
    onSuccess: () => {
      toast.success('Đã cập nhật thông tin team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
      setEditingTeam(false)
      setPendingBrand(null)
      setPendingMarket(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Thay đổi thất bại'),
  })

  const handleSave = () => {
    const newBrand = pendingBrand ?? brand
    const newMarket = pendingMarket ?? market
    if (newBrand !== brand || newMarket !== market) {
      teamMut.mutate({ brand: newBrand, mkt: newMarket })
    } else {
      setEditingTeam(false)
    }
  }

  const currentBrand = BRANDS.find(b => b.key === brand)!

  return (
    <div className="space-y-5">

      {/* Content */}
      {!selectedTeamId ? (
        <EmptyState icon={Users} title="Chọn đội nhóm để xem thành viên" />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="Team chưa có thành viên" />
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {/* Team header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
            <div>
              {showTeamPicker ? (
                <select
                  value={selectedTeamId}
                  onChange={e => { setSelectedTeamId(e.target.value); setEditingTeam(false); setPendingBrand(null); setPendingMarket(null) }}
                  className="font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer text-sm"
                >
                  {teamPickerOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <h3 className="font-bold text-slate-900">{selectedTeam?.name}</h3>
              )}
              <p className="text-xs text-slate-400 mt-0.5">{members.length} thành viên</p>
            </div>

            {/* Brand + Market editor */}
            <div className="flex items-center gap-2 flex-wrap">
              {editingTeam ? (
                <>
                  {/* Brand buttons */}
                  <span className="text-xs text-slate-400 font-medium">Loại:</span>
                  {BRANDS.map(b => (
                    <button
                      key={b.key}
                      onClick={() => setPendingBrand(b.key)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all',
                        (pendingBrand ?? brand) === b.key
                          ? b.color === 'amber'
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                            : 'bg-violet-600 border-violet-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                  <span className="text-slate-300 mx-1">|</span>
                  {/* Market buttons */}
                  <span className="text-xs text-slate-400 font-medium">TT:</span>
                  {MARKETS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setPendingMarket(m.key)}
                      className={marketBtnClass(m.color, (pendingMarket ?? market) === m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                  <span className="text-slate-300 mx-1">|</span>
                  <button
                    onClick={handleSave}
                    disabled={teamMut.isPending}
                    className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setEditingTeam(false); setPendingBrand(null); setPendingMarket(null) }}
                    className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold border-2',
                    currentBrand.color === 'amber'
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-violet-600 border-violet-600 text-white'
                  )}>
                    {currentBrand.label}
                  </span>
                  <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border-2', {
                    emerald: 'bg-emerald-500 border-emerald-500 text-white',
                    amber:   'bg-amber-500 border-amber-500 text-white',
                    rose:    'bg-rose-500 border-rose-500 text-white',
                    sky:     'bg-sky-500 border-sky-500 text-white',
                  }[currentMarket.color])}>
                    {currentMarket.label}
                  </span>
                  {canEditBrand && (
                    <button
                      onClick={() => { setEditingTeam(true); setPendingBrand(brand); setPendingMarket(market) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                      title="Đổi loại & thị trường"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {selectedTeam?.leader && (
              <div className="flex items-center gap-2 text-sm ml-auto">
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
