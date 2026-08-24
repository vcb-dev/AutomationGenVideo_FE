'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileText, Plus, Search, X, BookOpen, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { ContentFormModal } from '@/components/task-auto/ContentFormModal'
import {
  getTeams, getTeamContents, getTeamContent, addTeamContent, removeTeamContent,
  pushTeamContentToGlobal, getContentClassifications,
} from '@/lib/api/task-auto'
import type { Content, TeamContent, ContentOrigin } from '@/types/task-auto'
import { AddContentModal } from './contents/AddContentModal'
import { TeamContentsBoard } from './contents/TeamContentsBoard'
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
  const [presetLineId, setPresetLineId] = useState<string | undefined>(undefined)
  const [editingContent, setEditingContent] = useState<TeamContent | null>(null)
  const [search, setSearch] = useState('')
  const [classificationFilter, setClassificationFilter] = useState('')
  const [pendingOrigin, setPendingOrigin] = useState<ContentOrigin | null>(null)

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
  const isContentCreatorOfSelected = selectedTeam?.members?.some(m => m.user_id === userId && m.is_content_creator) ?? false

  const myTeams = (teams ?? []).filter(t =>
    t.leader_id === userId || t.members?.some((m: any) => m.user_id === userId)
  )
  const showTeamPicker = isAdminOrManager || myTeams.length > 1
  const teamPickerOptions = isAdminOrManager
    ? [{ value: '', label: 'Tất cả đội nhóm' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]
    : myTeams.map(t => ({ value: t.id, label: t.name }))

  // Danh sách đầy đủ (không phân trang) — chỉ dùng để loại content đã có ra khỏi danh sách
  // "chọn từ kho tổng" trong AddContentModal, không dùng để hiển thị board.
  const { data: allTeamContents } = useQuery({
    queryKey: ['task-auto', 'team-contents-all-ids', selectedTeamId, brandType],
    queryFn: () => getTeamContents(selectedTeamId, brandType),
    enabled: !!selectedTeamId && showAdd,
  })

  // Danh sách phân loại toàn hệ thống — dùng làm option cho dropdown lọc trong toolbar. Tuyến ND
  // không cần dropdown lọc riêng nữa vì board đã tự nhóm cột theo tuyến.
  const { data: allClassifications } = useQuery({ queryKey: ['task-auto', 'content-classifications'], queryFn: getContentClassifications })
  const classificationOptions = (allClassifications ?? []).map(c => ({ value: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label, 'vi'))

  const removeMut = useMutation({
    mutationFn: (contentId: string) => removeTeamContent(selectedTeamId, contentId),
    onSuccess: () => {
      toast.success('Đã xóa content khỏi kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents'] })
      setRemovingContent(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xóa thất bại'),
  })

  const pushMut = useMutation({
    mutationFn: (contentId: string) => pushTeamContentToGlobal(selectedTeamId, contentId),
    onSuccess: () => {
      toast.success('Đã đẩy content ra kho tổng')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'contents'] })
      setPushingContent(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Đẩy ra kho tổng thất bại'),
  })

  const existingContentIds = (allTeamContents ?? []).map(tc => tc.id)
  const [selectedContent, setSelectedContent] = useState<TeamContent | null>(null)
  const [removingContent, setRemovingContent] = useState<TeamContent | null>(null)
  const [pushingContent, setPushingContent] = useState<TeamContent | null>(null)

  useEffect(() => { setPendingOrigin(null) }, [selectedTeamId])

  // Board chỉ trả field rút gọn (không có body/script) để nhẹ payload — mở xem chi tiết/sửa phải
  // lấy lại bản đầy đủ, không thì modal/form hiện trống dù content đã có nội dung.
  const openDetail = (tc: TeamContent) => {
    setSelectedContent(tc)
    getTeamContent(selectedTeamId, tc.id).then(setSelectedContent).catch(() => toast.error('Không thể tải nội dung content'))
  }
  const openEdit = (tc: TeamContent) => {
    setEditingContent(tc)
    getTeamContent(selectedTeamId, tc.id).then(setEditingContent).catch(() => toast.error('Không thể tải nội dung content'))
  }

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

          {selectedTeamId && (
            <CustomSelect
              value={classificationFilter}
              onChange={setClassificationFilter}
              options={[{ value: '', label: 'Tất cả phân loại' }, ...classificationOptions]}
              className="min-w-[170px]"
              compact
            />
          )}

          {selectedTeamId && isContentCreatorOfSelected && (
            <div className="flex items-center gap-1.5 shrink-0 bg-emerald-50 border border-emerald-200 rounded-xl p-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 ml-1.5" />
              {(['COLLECTED', 'SELF_CREATED'] as ContentOrigin[]).map(o => (
                <button
                  key={o}
                  onClick={() => setPendingOrigin(o)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    pendingOrigin === o ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-100',
                  )}
                >
                  {o === 'COLLECTED' ? 'Sưu tầm' : 'Tự nghĩ'}
                </button>
              ))}
            </div>
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

      {/* Board theo tuyến */}
      {!selectedTeamId ? (
        <EmptyState icon={BookOpen} title="Chọn đội nhóm để xem kho content" />
      ) : (
        <TeamContentsBoard
          teamId={selectedTeamId}
          brandType={brandType}
          month={month}
          search={search}
          classificationId={classificationFilter}
          market={teamMarket}
          canManage={canManageSelected}
          canPush={canPushToGlobal}
          onSelect={openDetail}
          onEdit={openEdit}
          onRemove={setRemovingContent}
          onPush={setPushingContent}
          onAdd={contentLineId => { setPresetLineId(contentLineId); setShowCreate(true) }}
        />
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
          onEdit={() => { openEdit(selectedContent); setSelectedContent(null) }}
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
        teamId={selectedTeamId}
        brandType={brandType}
        initialMarket={teamMarket}
        initialContentLineId={presetLineId}
        onClose={() => { setShowCreate(false); setEditingContent(null); setPresetLineId(undefined) }}
        onSuccess={async (content: Content) => {
          if (editingContent) {
            setEditingContent(null)
            qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents'] })
          } else {
            setShowCreate(false)
            setPresetLineId(undefined)
            try {
              await addTeamContent(selectedTeamId, {
                brand_type: content.brand_type,
                market: content.market,
                code: content.code,
                title: content.title,
                body: content.body,
                script: content.script,
                file_content_url: content.file_content_url,
                voice_url: content.voice_url,
                content_line_id: content.content_line_id,
                classification_id: content.classification_id,
                origin: isContentCreatorOfSelected ? (pendingOrigin ?? undefined) : undefined,
              })
              qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents'] })
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
          showOriginPicker={isContentCreatorOfSelected}
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
