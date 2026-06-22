'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileText, Plus, Search, X, BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ContentFormModal } from '@/components/task-auto/ContentFormModal'
import {
  getTeams, getTeamContents, addTeamContent, removeTeamContent,
  pushTeamContentToGlobal,
} from '@/lib/api/task-auto'
import type { Content, TeamContent } from '@/types/task-auto'
import { AddContentModal } from './contents/AddContentModal'
import { ContentCard } from './contents/ContentCard'

interface TeamContentsTabProps {
  canManage: boolean
  isAdminOrManager: boolean
  userId?: string
  brandType: 'DO_DA' | 'TRANG_SUC'
}

export function TeamContentsTab({ canManage, isAdminOrManager, userId, brandType }: TeamContentsTabProps) {
  const qc = useQueryClient()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  useEffect(() => {
    if (!isAdminOrManager && userId && teams) {
      const myTeam =
        teams.find(t => t.leader_id === userId) ||
        teams.find(t => t.members?.some(m => m.user_id === userId))
      if (myTeam) setSelectedTeamId(myTeam.id)
    }
  }, [isAdminOrManager, userId, teams])

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const isLeaderOfSelected = selectedTeam?.leader_id === userId
  const isMemberOfSelected = selectedTeam?.members?.some(m => m.user_id === userId) ?? false
  const canManageSelected = isAdminOrManager || isLeaderOfSelected || isMemberOfSelected
  const canPushToGlobal = isAdminOrManager || isLeaderOfSelected

  const { data: teamContents, isLoading } = useQuery({
    queryKey: ['task-auto', 'team-contents', selectedTeamId, brandType],
    queryFn: () => getTeamContents(selectedTeamId, brandType),
    enabled: !!selectedTeamId,
  })

  const removeMut = useMutation({
    mutationFn: (contentId: string) => removeTeamContent(selectedTeamId, contentId),
    onSuccess: () => {
      toast.success('Đã xóa content khỏi kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId, brandType] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xóa thất bại'),
  })

  const pushMut = useMutation({
    mutationFn: (contentId: string) => pushTeamContentToGlobal(selectedTeamId, contentId),
    onSuccess: () => {
      toast.success('Đã đẩy content ra kho tổng')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId, brandType] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'contents'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Đẩy ra kho tổng thất bại'),
  })

  const existingContentIds = (teamContents ?? []).map(tc => tc.content_id)

  const filtered = (teamContents ?? []).filter(tc => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      tc.content?.title?.toLowerCase().includes(q) ||
      tc.content?.content_line?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
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
                <BookOpen className="w-4 h-4" />
                {selectedTeam.name}
              </div>
            )
          )}

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm content trong kho team..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedTeamId && teamContents && (
            <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
              {filtered.length} content
            </span>
          )}

          {selectedTeamId && canManageSelected && (
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button
                onClick={() => setShowCreate(true)}
                className="border border-indigo-500 text-indigo-600 hover:bg-indigo-50 rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" /> Tạo mới
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors"
              >
                <FileText className="w-5 h-5" /> Từ kho tổng
              </button>
            </div>
          )}
        </div>
      </div>

      {!selectedTeamId ? (
        <EmptyState icon={BookOpen} title="Chọn đội nhóm để xem kho content" />
      ) : isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl">
          {teamContents?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <FileText className="w-7 h-7 text-indigo-300" />
              </div>
              <p className="font-semibold text-slate-600">Kho team chưa có content</p>
              <p className="text-sm text-slate-400">
                {canManageSelected ? 'Tạo content mới hoặc thêm từ kho tổng' : 'Leader chưa thêm content nào'}
              </p>
              {canManageSelected && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setShowCreate(true)}
                    className="border border-indigo-500 text-indigo-600 hover:bg-indigo-50 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Tạo mới
                  </button>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Từ kho tổng
                  </button>
                </div>
              )}
            </div>
          ) : search ? (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm italic">Không tìm thấy content "{search}"</p>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm italic">Kho team chưa có content nhóm này</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tc: TeamContent) => (
            <ContentCard
              key={tc.id}
              teamContent={tc}
              canRemove={canManageSelected}
              canPushToGlobal={canPushToGlobal}
              onRemove={() => {
                if (confirm(`Xóa content "${tc.content?.title || 'này'}" khỏi kho team?`)) {
                  removeMut.mutate(tc.content_id)
                }
              }}
              onPush={() => {
                if (confirm(`Đẩy content "${tc.content?.title || 'này'}" ra kho tổng? Content sẽ bị xóa khỏi kho team.`)) {
                  pushMut.mutate(tc.content_id)
                }
              }}
            />
          ))}
        </div>
      )}

      <ContentFormModal
        open={showCreate}
        userId={userId}
        brandType={brandType}
        onClose={() => setShowCreate(false)}
        onSuccess={async (content: Content) => {
          setShowCreate(false)
          try {
            await addTeamContent(selectedTeamId, content.id)
            qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId, brandType] })
          } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Content đã tạo nhưng không thể thêm vào kho team. Thử thêm từ "Từ kho tổng".')
          }
        }}
      />

      {showAdd && selectedTeamId && (
        <AddContentModal
          open={showAdd}
          teamId={selectedTeamId}
          existingContentIds={existingContentIds}
          initialBrandType={brandType}
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
