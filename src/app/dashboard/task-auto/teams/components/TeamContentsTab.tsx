'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileText, Plus, Search, X, BookOpen, Mic, Globe, Trash2, Edit2, Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { ContentFormModal, parseMarkets } from '@/components/task-auto/ContentFormModal'
import { ContentStatusBadge } from '@/components/task-auto/StatusBadge'
import {
  getTeams, getTeamContents, addTeamContent, removeTeamContent,
  pushTeamContentToGlobal,
} from '@/lib/api/task-auto'
import type { Content, TeamContent } from '@/types/task-auto'
import { AddContentModal } from './contents/AddContentModal'
import { ContentViewModal } from '@/components/task-auto/ContentViewModal'

interface TeamContentsTabProps {
  canManage: boolean
  isAdminOrManager: boolean
  userId?: string
  brandType: 'DO_DA' | 'TRANG_SUC'
  selectedTeamId: string
  setSelectedTeamId: (id: string) => void
  month: string
  setMonth: (month: string) => void
}

export function TeamContentsTab({ isAdminOrManager, userId, brandType, selectedTeamId, setSelectedTeamId, month, setMonth }: TeamContentsTabProps) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editingContent, setEditingContent] = useState<TeamContent | null>(null)
  const [search, setSearch] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const teamMarket: string = selectedTeam?.market ?? 'VIETNAM'
  const isLeaderOfSelected = selectedTeam?.leader_id === userId
  //const isMemberOfSelected = selectedTeam?.members?.some(m => m.user_id === userId) ?? false
  const canManageSelected = isAdminOrManager || isLeaderOfSelected 
  const canPushToGlobal = isAdminOrManager || isLeaderOfSelected

  const myTeams = (teams ?? []).filter(t =>
    t.leader_id === userId || t.members?.some((m: any) => m.user_id === userId)
  )
  const showTeamPicker = isAdminOrManager || myTeams.length > 1
  const teamPickerOptions = isAdminOrManager
    ? [{ value: '', label: 'Tất cả đội nhóm' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]
    : myTeams.map(t => ({ value: t.id, label: t.name }))

  const { data: teamContents, isLoading } = useQuery({
    queryKey: ['task-auto', 'team-contents', selectedTeamId, brandType, month],
    queryFn: () => getTeamContents(selectedTeamId, brandType, month),
    enabled: !!selectedTeamId,
  })

  const removeMut = useMutation({
    mutationFn: (contentId: string) => removeTeamContent(selectedTeamId, contentId),
    onSuccess: () => {
      toast.success('Đã xóa content khỏi kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId, brandType] })
      setRemovingContent(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xóa thất bại'),
  })

  const pushMut = useMutation({
    mutationFn: (contentId: string) => pushTeamContentToGlobal(selectedTeamId, contentId),
    onSuccess: () => {
      toast.success('Đã đẩy content ra kho tổng')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId, brandType] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'contents'] })
      setPushingContent(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Đẩy ra kho tổng thất bại'),
  })

  const existingContentIds = (teamContents ?? []).map(tc => tc.id)
  const [selectedContent, setSelectedContent] = useState<TeamContent | null>(null)
  const [removingContent, setRemovingContent] = useState<TeamContent | null>(null)
  const [pushingContent, setPushingContent] = useState<TeamContent | null>(null)

  const filtered = (teamContents ?? []).filter(tc => {
    const effectiveMarket = tc.market ?? tc.source_editor_content?.market ?? null
    if (effectiveMarket && effectiveMarket !== teamMarket) return false
    if (!search) return true
    const q = search.toLowerCase()
    const effectiveTitle = tc.title ?? tc.source_editor_content?.title ?? ''
    return (
      effectiveTitle.toLowerCase().includes(q) ||
      tc?.content_line?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {showTeamPicker ? (
            <CustomSelect
              value={selectedTeamId}
              onChange={setSelectedTeamId}
              options={teamPickerOptions}
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

          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-3.5 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

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

      {/* Table */}
      {!selectedTeamId ? (
        <EmptyState icon={BookOpen} title="Chọn đội nhóm để xem kho content" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-gray-200">
                  <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide w-[32%]">Tiêu đề</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[15%]">Tuyến ND</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[10%]">Thị trường</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[13%]">Trạng thái</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[9%]">File</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[13%]">Người thêm</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Ngày thêm</th>
                  <th className="w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}

                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8}>
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
                              <button onClick={() => setShowCreate(true)}
                                className="border border-indigo-500 text-indigo-600 hover:bg-indigo-50 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                                <Plus className="w-4 h-4" /> Tạo mới
                              </button>
                              <button onClick={() => setShowAdd(true)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                                <FileText className="w-4 h-4" /> Từ kho tổng
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-10 text-center">
                          <p className="text-slate-400 text-sm italic">Không tìm thấy content "{search}"</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}

                {!isLoading && filtered.map((tc: TeamContent) => {
                  const ec = tc.source_editor_content
                  const title = tc.title ?? ec?.title ?? null
                  const market = tc.market ?? ec?.market ?? null
                  const status = tc.status ?? ec?.status ?? null
                  const voiceUrl = tc.voice_url ?? ec?.voice_url ?? null
                  const fileContentUrl = tc.file_content_url ?? ec?.file_content_url ?? null
                  const markets = parseMarkets(market)
                  return (
                    <tr
                      key={tc.id}
                      onClick={() => setSelectedContent(tc)}
                      className="hover:bg-indigo-50/20 transition-colors group cursor-pointer"
                    >
                      {/* Tiêu đề */}
                      <td className="px-5 py-4 max-w-0">
                        <span className="text-base font-semibold text-slate-800 truncate block" title={title ?? ''}>
                          {title || <span className="text-slate-400 italic font-normal text-sm">Chưa đặt tên</span>}
                        </span>
                        {tc.source_editor_content_id && (
                          <span className="text-[10px] text-violet-400 mt-0.5 block">· từ kho cá nhân</span>
                        )}
                      </td>

                      {/* Tuyến ND */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {(tc?.content_line?.name ?? ec?.content_line?.name)
                          ? <span className="text-sm font-medium text-slate-700">{tc.content_line?.name ?? ec?.content_line?.name}</span>
                          : <span className="text-slate-300 text-sm">—</span>
                        }
                      </td>

                      {/* Thị trường */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {markets.length > 0
                            ? markets.map(m => (
                              <span key={m} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${{ VIETNAM: 'bg-emerald-100 text-emerald-700', INDONESIA: 'bg-amber-100 text-amber-700', JAPAN: 'bg-rose-100 text-rose-700', THAILAND: 'bg-sky-100 text-sky-700' }[m] ?? 'bg-gray-100 text-gray-600'}`}>
                                {{ VIETNAM: 'VN', INDONESIA: 'ID', JAPAN: 'JP', THAILAND: 'TH' }[m] ?? m}
                              </span>
                            ))
                            : <span className="text-slate-300 text-sm">—</span>
                          }
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <ContentStatusBadge status={status as any} />
                      </td>

                      {/* Voice / File */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {voiceUrl && (
                            <span className="inline-flex items-center gap-1 text-xs text-purple-500 font-medium">
                              <Mic className="w-3.5 h-3.5" /> Voice
                            </span>
                          )}
                          {fileContentUrl && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium">
                              <FileText className="w-3.5 h-3.5" /> File
                            </span>
                          )}
                          {!voiceUrl && !fileContentUrl && (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </div>
                      </td>

                      {/* Người thêm */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-500">
                          {tc.added_by?.full_name ?? <span className="text-slate-300">—</span>}
                        </span>
                      </td>

                      {/* Ngày thêm */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-500">
                          {(tc as any).added_at ? new Date((tc as any).added_at).toLocaleDateString('vi-VN') : <span className="text-slate-300">—</span>}
                        </span>
                      </td>

                      {/* Hành động */}
                      <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canManageSelected && tc && (
                            <button
                              onClick={() => setEditingContent(tc as TeamContent)}
                              title="Chỉnh sửa"
                              className="p-2 rounded-xl hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canPushToGlobal && (
                            <button
                              onClick={() => setPushingContent(tc)}
                              title="Đẩy ra kho tổng"
                              className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                            >
                              <Globe className="w-4 h-4" />
                            </button>
                          )}
                          {canManageSelected && (
                            <button
                              onClick={() => setRemovingContent(tc)}
                              title="Xóa khỏi kho team"
                              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedContent && (
        <ContentViewModal
          open
          item={selectedContent as any}
          catalogType="team"
          canEdit={canManageSelected}
          canDelete={canManageSelected}
          canPushToGlobal={canPushToGlobal}
          onClose={() => setSelectedContent(null)}
          onEdit={() => { setEditingContent(selectedContent); setSelectedContent(null) }}
          onDelete={() => { removeMut.mutate(selectedContent.id); setSelectedContent(null) }}
          onPushToGlobal={() => { pushMut.mutate(selectedContent.id); setSelectedContent(null) }}
        />
      )}

      <ConfirmDialog
        open={!!removingContent}
        title="Xóa content khỏi kho team"
        message={`Xóa "${removingContent?.title ?? removingContent?.source_editor_content?.title ?? 'content này'}" khỏi kho team? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa content"
        danger
        isLoading={removeMut.isPending}
        onConfirm={() => removingContent && removeMut.mutate(removingContent.id)}
        onCancel={() => setRemovingContent(null)}
      />

      <ConfirmDialog
        open={!!pushingContent}
        title="Đẩy content ra kho tổng"
        message={`Đẩy "${pushingContent?.title ?? pushingContent?.source_editor_content?.title ?? 'content này'}" ra kho tổng? Content sẽ xuất hiện cho toàn bộ hệ thống.`}
        confirmLabel="Đẩy ra kho tổng"
        isLoading={pushMut.isPending}
        onConfirm={() => pushingContent && pushMut.mutate(pushingContent.id)}
        onCancel={() => setPushingContent(null)}
      />

      <ContentFormModal
        open={showCreate || !!editingContent}
        editing={editingContent as unknown as Content}
        userId={userId}
        brandType={brandType}
        initialMarket={teamMarket}
        onClose={() => { setShowCreate(false); setEditingContent(null) }}
        onSuccess={async (content: Content) => {
          if (editingContent) {
            setEditingContent(null)
            qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId, brandType] })
          } else {
            setShowCreate(false)
            try {
              await addTeamContent(selectedTeamId, {
                brand_type: content.brand_type,
                market: content.market,
                title: content.title,
                body: content.body,
                script: content.script,
                file_content_url: content.file_content_url,
                voice_url: content.voice_url,
                content_line_id: content.content_line_id,
              })
              qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId, brandType] })
            } catch (e: any) {
              toast.error(e?.response?.data?.message || 'Content đã tạo nhưng không thể thêm vào kho team. Thử thêm từ "Từ kho tổng".')
            }
          }
        }}
      />

      {showAdd && selectedTeamId && (
        <AddContentModal
          open={showAdd}
          teamId={selectedTeamId}
          existingContentIds={existingContentIds}
          initialBrandType={brandType}
          initialMarket={teamMarket}
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
