'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileText, Plus, Trash2, Search, Check, Loader2, BookOpen, X, Globe, ExternalLink, Play, Mic, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ContentFormModal } from '@/components/task-auto/ContentFormModal'
import {
  getTeams, getTeamContents, addTeamContent, removeTeamContent,
  getContents, pushTeamContentToGlobal, getContent,
} from '@/lib/api/task-auto'
import type { Content, TeamContent } from '@/types/task-auto'

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_TASK:   'Đang dùng',
  USED:      'Đã dùng',
  ARCHIVED:  'Lưu trữ',
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  IN_TASK:   'bg-blue-100 text-blue-700',
  USED:      'bg-gray-100 text-slate-500',
  ARCHIVED:  'bg-amber-100 text-amber-600',
}

const MARKET_LABELS: Record<string, string> = {
  VIETNAM: 'VN',
  GLOBAL:  'Global',
}

// ── Add from Catalog Modal ────────────────────────────────────────────────────

function AddContentModal({
  open,
  teamId,
  existingContentIds,
  onClose,
  onSuccess,
}: {
  open: boolean
  teamId: string
  existingContentIds: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')

  const { data: contentsData, isLoading } = useQuery({
    queryKey: ['task-auto', 'contents-catalog', search],
    queryFn: () => getContents({ search: search || undefined, limit: 50, status: 'AVAILABLE' } as any),
    enabled: open,
  })

  const available = (contentsData?.data ?? []).filter(c => !existingContentIds.includes(c.id))

  const mutation = useMutation({
    mutationFn: () => addTeamContent(teamId, selectedId),
    onSuccess: () => {
      toast.success('Đã thêm content vào kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', teamId] })
      setSelectedId('')
      onSuccess()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Thêm content thất bại'),
  })

  useEffect(() => { if (!open) { setSearch(''); setSelectedId('') } }, [open])

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title="Thêm từ kho tổng"
      subtitle="Chọn content từ catalog để thêm vào kho team"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!selectedId || mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Thêm vào kho
          </button>
        </>
      }
    >
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tiêu đề content..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
        ) : available.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10 italic">
            {search ? 'Không tìm thấy content phù hợp' : 'Tất cả content sẵn sàng đã có trong kho team'}
          </p>
        ) : (
          available.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                selectedId === c.id
                  ? 'bg-indigo-50 border border-indigo-300'
                  : 'hover:bg-gray-50 border border-transparent'
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {c.title || <span className="text-slate-400 italic font-normal">Chưa đặt tên</span>}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {c.content_line?.name ?? 'Chưa có tuyến nội dung'}
                </p>
              </div>
              {selectedId === c.id && <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-1" />}
            </button>
          ))
        )}
      </div>
    </DarkModal>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

interface TeamContentsTabProps {
  canManage: boolean
  isAdminOrManager: boolean
  userId?: string
}

export function TeamContentsTab({ canManage, isAdminOrManager, userId }: TeamContentsTabProps) {
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
    queryKey: ['task-auto', 'team-contents', selectedTeamId],
    queryFn: () => getTeamContents(selectedTeamId),
    enabled: !!selectedTeamId,
  })

  const removeMut = useMutation({
    mutationFn: (contentId: string) => removeTeamContent(selectedTeamId, contentId),
    onSuccess: () => {
      toast.success('Đã xóa content khỏi kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xóa thất bại'),
  })

  const pushMut = useMutation({
    mutationFn: (contentId: string) => pushTeamContentToGlobal(selectedTeamId, contentId),
    onSuccess: () => {
      toast.success('Đã đẩy content ra kho tổng')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId] })
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
                <BookOpen className="w-4 h-4" />
                {selectedTeam.name}
              </div>
            )
          )}

          {/* Search */}
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
              {teamContents.length} content
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


      {/* Content */}
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
          ) : (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm italic">Không tìm thấy content "{search}"</p>
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
        onClose={() => setShowCreate(false)}
        onSuccess={async (content: Content) => {
          setShowCreate(false)
          try {
            await addTeamContent(selectedTeamId, content.id)
            qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId] })
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
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// ── Content Detail Modal ──────────────────────────────────────────────────────

function ContentDetailModal({
  teamContent,
  canRemove,
  canPushToGlobal,
  onRemove,
  onPush,
  onClose,
}: {
  teamContent: TeamContent
  canRemove: boolean
  canPushToGlobal: boolean
  onRemove: () => void
  onPush: () => void
  onClose: () => void
}) {
  const { data: content, isLoading } = useQuery({
    queryKey: ['task-auto', 'content', teamContent.content_id],
    queryFn: () => getContent(teamContent.content_id),
  })

  const c = content ?? teamContent.content

  return (
    <>
      <div className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/8">

          {/* Header */}
          <div className="flex items-start gap-4 px-7 py-5 border-b border-gray-100 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {c?.status && (
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', STATUS_COLORS[c.status])}>
                    {STATUS_LABELS[c.status]}
                  </span>
                )}
                {c?.market && (
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
                    c.market === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  )}>
                    {MARKET_LABELS[c.market] ?? c.market}
                  </span>
                )}
                {c?.content_line && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                    {c.content_line.name}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-snug">
                {c?.title || <span className="text-slate-400 italic font-normal">Chưa đặt tên</span>}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <div className="p-7 space-y-6">

                {/* Stats */}
                {content?.view_count && Number(content.view_count) > 0 && (
                  <div className="flex items-center gap-2 text-base text-slate-500">
                    <Eye className="w-5 h-5 text-slate-400" />
                    <span>{Number(content.view_count).toLocaleString('vi-VN')} lượt xem</span>
                  </div>
                )}

                {/* Body text */}
                {content?.body && (
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Nội dung</p>
                    <div className="bg-gray-50 rounded-xl p-5 text-base text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-gray-100">
                      {content.body}
                    </div>
                  </div>
                )}

                {/* Script */}
                {content?.script && (
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Script</p>
                    <div className="bg-gray-50 rounded-xl p-5 text-base text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-gray-100">
                      {content.script}
                    </div>
                  </div>
                )}

                {/* Media links */}
                <div className="flex flex-wrap gap-3">
                  {content?.file_content_url && (
                    <a href={content.file_content_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                      <Play className="w-4 h-4" /> Xem file
                    </a>
                  )}
                  {content?.voice_url && (
                    <a href={content.voice_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors">
                      <Mic className="w-4 h-4" /> Nghe voice
                    </a>
                  )}
                </div>

                {/* Meta */}
                <div className="pt-4 border-t border-gray-100 text-sm text-slate-400 space-y-1">
                  <p>Thêm bởi <span className="font-semibold text-slate-600">{teamContent.added_by?.full_name ?? '—'}</span></p>
                  <p>{new Date(teamContent.added_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
            <div className="flex gap-2">
              {canPushToGlobal && (
                <button onClick={() => { onPush(); onClose() }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors">
                  <Globe className="w-4 h-4" /> Đẩy ra kho tổng
                </button>
              )}
              {c?.file_content_url && (
                <a href={c.file_content_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Mở file
                </a>
              )}
            </div>
            <div className="flex gap-2">
              {canRemove && (
                <button onClick={() => { onRemove(); onClose() }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" /> Xóa khỏi kho
                </button>
              )}
              <button onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-gray-200 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Content Card ──────────────────────────────────────────────────────────────

function ContentCard({
  teamContent,
  canRemove,
  canPushToGlobal,
  onRemove,
  onPush,
}: {
  teamContent: TeamContent
  canRemove: boolean
  canPushToGlobal: boolean
  onRemove: () => void
  onPush: () => void
}) {
  const [showDetail, setShowDetail] = useState(false)
  const c = teamContent.content

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer flex flex-col"
      >
        {/* Color accent bar based on status */}
        <div className={cn(
          'h-1.5 w-full shrink-0',
          c?.status === 'AVAILABLE' ? 'bg-emerald-400' :
          c?.status === 'IN_TASK'   ? 'bg-blue-400' :
          c?.status === 'USED'      ? 'bg-gray-300' : 'bg-amber-400'
        )} />

        <div className="px-5 pt-5 pb-4 flex-1 flex flex-col gap-3">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {c?.status && (
              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap', STATUS_COLORS[c.status])}>
                {STATUS_LABELS[c.status]}
              </span>
            )}
            {c?.market && (
              <span className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide whitespace-nowrap',
                c.market === 'VIETNAM' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              )}>
                {MARKET_LABELS[c.market] ?? c.market}
              </span>
            )}
            {c?.content_line && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-600 whitespace-nowrap">
                {c.content_line.name}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="font-bold text-slate-800 text-base leading-snug line-clamp-2 min-h-[3rem]">
            {c?.title || <span className="text-slate-400 italic font-normal">Chưa đặt tên</span>}
          </p>

          {c?.content_line && (
            <div className="flex items-center gap-2 mt-auto pt-1">
              <p className="text-sm text-slate-500 truncate">{c.content_line.name}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2 bg-gray-50/50">
          <p className="text-sm text-slate-400 truncate">
            {teamContent.added_by?.full_name ?? '—'}
          </p>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {canPushToGlobal && (
              <button
                onClick={e => { e.stopPropagation(); onPush() }}
                title="Đẩy ra kho tổng"
                className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
              >
                <Globe className="w-4 h-4" />
              </button>
            )}
            {canRemove && (
              <button
                onClick={e => { e.stopPropagation(); onRemove() }}
                title="Xóa khỏi kho team"
                className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showDetail && (
        <ContentDetailModal
          teamContent={teamContent}
          canRemove={canRemove}
          canPushToGlobal={canPushToGlobal}
          onRemove={() => { onRemove(); setShowDetail(false) }}
          onPush={() => { onPush(); setShowDetail(false) }}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}
