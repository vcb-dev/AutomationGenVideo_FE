'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Search } from 'lucide-react'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { CustomSelect, CreatableSelect } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { ContentProductFilter } from '@/components/task-auto/ContentProductFilter'
import { MarketPicker, VoicePicker } from '@/components/task-auto/ContentFormModal'
import type { VoicePickerHandle } from '@/components/task-auto/ContentFormModal'
import {
  ContentSourcePicker, contentSourceFrom, contentSourceFields, contentRequiredErrors, focusFirstInvalid, REQUIRED_TOAST,
  type ContentSource,
} from '@/components/task-auto/ContentSourcePicker'
import { DarkInput } from '@/components/task-auto/DarkInput'
import {
  getEditorContent, updateEditorContent, deleteEditorContent, pushEditorContentToTeam,
  getContentLines, getContentClassifications, createContentClassification, getTeams, getMyPushRequests,
} from '@/lib/api/task-auto'
import { Content, ContentUsageStatus } from '@/types/task-auto'
import { ContentViewModal } from '@/components/task-auto/ContentViewModal'
import { MyContentsBoard } from './MyContentsBoard'

// ── Push to team modal ────────────────────────────────────────────────────────

function PushModal({ content, userId, onClose }: { content: Content; userId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  const myTeams = teams?.filter(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId)) ?? []
  const [teamId, setTeamId] = useState('')
  const effectiveTeamId = teamId || myTeams[0]?.id || ''
  const selectedTeam = myTeams.find(t => t.id === effectiveTeamId)
  const isLeaderOfTeam = selectedTeam?.leader_id === userId
  const push = useMutation({
    mutationFn: () => pushEditorContentToTeam(userId, content.id, effectiveTeamId),
    onSuccess: (res: any) => {
      toast.success(res?.pending ? 'Đã gửi yêu cầu — chờ leader duyệt' : 'Đã đẩy sang kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-push-requests'] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể đẩy sang team'),
  })
  return (
    <DarkModal open onClose={onClose} title="Đẩy sang kho team" size="sm"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button disabled={!effectiveTeamId || push.isPending} onClick={() => push.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {push.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isLeaderOfTeam ? 'Đẩy sang team' : 'Gửi yêu cầu'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Content <strong className="text-slate-800">{content.title || '(không tiêu đề)'}</strong> sẽ được thêm vào kho của team.
        </p>
        {myTeams.length > 1 ? (
          <CustomSelect
            label="Chọn team"
            value={effectiveTeamId}
            onChange={setTeamId}
            options={myTeams.map(t => ({ value: t.id, label: t.name }))}
          />
        ) : myTeams.length === 1 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <span className="font-semibold">{myTeams[0].name}</span>
          </div>
        ) : (
          <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Bạn chưa thuộc team nào
          </div>
        )}
        {!isLeaderOfTeam && effectiveTeamId && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Yêu cầu sẽ được gửi tới leader của team để duyệt trước khi content vào kho team.
          </p>
        )}
      </div>
    </DarkModal>
  )
}

// ── Personal content form modal ───────────────────────────────────────────────

function PersonalContentModal({
  editing,
  userId,
  onClose,
  onSuccess,
}: {
  editing: Content
  userId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const formFrom = (c: Content): Partial<Content> => ({
    code: c.code ?? '',
    title: c.title ?? '',
    body: c.body ?? '',
    script: c.script ?? '',
    file_content_url: c.file_content_url ?? '',
    voice_url: c.voice_url ?? '',
    content_line_id: c.content_line_id ?? '',
    classification_id: c.classification_id ?? '',
  })
  const [form, setForm] = useState<Partial<Content>>(() => formFrom(editing))
  const [market, setMarket] = useState<string>(editing.market ?? 'VIETNAM')
  const [initialSource, setInitialSource] = useState(() => contentSourceFrom(editing.body, editing.file_content_url))
  const [source, setSource] = useState<ContentSource>(initialSource)
  const [showErrors, setShowErrors] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const voicePickerRef = useRef<VoicePickerHandle>(null)

  // Danh sách không trả body/script: bản đầy đủ tải về sau thì nạp lại form, không thì lưu sẽ xoá mất nội dung
  useEffect(() => {
    setForm(formFrom(editing))
    const s = contentSourceFrom(editing.body, editing.file_content_url)
    setInitialSource(s)
    setSource(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const { data: contentLines } = useQuery({ queryKey: ['task-auto', 'content-lines'], queryFn: getContentLines })
  const { data: contentClassifications } = useQuery({ queryKey: ['task-auto', 'content-classifications'], queryFn: getContentClassifications })

  const errors = showErrors ? contentRequiredErrors({ ...form, source }) : {}
  const sourceFields = () => contentSourceFields(source, form.body ?? '', { mode: initialSource.mode, fileUrl: editing.file_content_url })

  const updateMut = useMutation({
    mutationFn: async () => updateEditorContent(userId, editing.id, {
      code: form.code?.trim() || null,
      title: form.title,
      ...sourceFields(),
      script: form.script,
      voice_url: await voicePickerRef.current!.resolvePending(form.voice_url ?? ''),
      content_line_id: form.content_line_id || null,
      classification_id: form.classification_id || null,
      market: market as any,
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] })
      toast.success('Đã cập nhật content')
      onSuccess()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể cập nhật content'),
  })

  const saving = updateMut.isPending

  const handleSubmit = () => {
    if (Object.keys(contentRequiredErrors({ ...form, source })).length) {
      setShowErrors(true)
      focusFirstInvalid(formRef.current)
      return toast.error(REQUIRED_TOAST)
    }
    updateMut.mutate()
  }

  return (
    <DarkModal
      open
      onClose={onClose}
      title="Chỉnh sửa content"
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Lưu thay đổi
          </button>
        </>
      }
    >
      <div ref={formRef} className="space-y-6">
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Thông tin chính
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DarkInput
              label="Mã content"
              placeholder="VD: CT-101"
              value={form.code ?? ''}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            />
            <DarkInput
              label="Tiêu đề content *"
              placeholder="Nhập tiêu đề..."
              value={form.title ?? ''}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              error={errors.title}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              label="Tuyến nội dung *"
              placeholder="— Chọn tuyến —"
              value={form.content_line_id ?? ''}
              onChange={v => setForm(f => ({ ...f, content_line_id: v }))}
              options={contentLines?.map(l => ({ value: l.id, label: l.name })) ?? []}
              searchable
              error={errors.line}
            />
            <CreatableSelect
              label="Phân loại nội dung *"
              placeholder="— Chọn phân loại —"
              value={form.classification_id ?? ''}
              onChange={v => setForm(f => ({ ...f, classification_id: v }))}
              options={contentClassifications?.map(c => ({ value: c.id, label: c.name })) ?? []}
              createLabel="Thêm phân loại nội dung"
              required
              error={errors.classification}
              onCreate={async (name) => {
                const created = await createContentClassification(name)
                qc.setQueryData<typeof contentClassifications>(['task-auto', 'content-classifications'], old => [...(old ?? []), created])
                return { id: created.id, label: created.name }
              }}
            />
          </div>
          <MarketPicker label="Thị trường" value={market} onChange={setMarket} />

        </div>
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Nội dung
          </p>
          <ContentSourcePicker
            value={source}
            onChange={setSource}
            body={form.body ?? ''}
            onBodyChange={body => setForm(f => ({ ...f, body }))}
            error={errors.source}
          />
        </div>
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            File đính kèm
          </p>
          <VoicePicker ref={voicePickerRef} value={form.voice_url ?? ''} onChange={url => setForm(f => ({ ...f, voice_url: url }))} />
        </div>
      </div>
    </DarkModal>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

interface Props { userId: string; brandType: 'DO_DA' | 'TRANG_SUC'; teamMarket?: string; readOnly?: boolean }

export function MyContentsTab({ userId, brandType, teamMarket = 'VIETNAM', readOnly = false }: Props) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContentUsageStatus | ''>('')
  const [classificationFilter, setClassificationFilter] = useState('')
  const [productSku, setProductSku] = useState('')
  const [month, setMonth] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Content | null>(null)
  const [detailItem, setDetailItem] = useState<Content | null>(null)
  const [pushItem, setPushItem] = useState<Content | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: contentClassifications } = useQuery({ queryKey: ['task-auto', 'content-classifications'], queryFn: getContentClassifications })
  const classificationOptions = (contentClassifications ?? []).map(c => ({ value: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label, 'vi'))

  const { data: myPushRequests } = useQuery({
    queryKey: ['task-auto', 'my-push-requests', userId],
    queryFn: () => getMyPushRequests(userId, 'PENDING'),
  })
  const pendingContentIds = new Set((myPushRequests ?? []).map(r => r.editor_content_id).filter((id): id is string => !!id))

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEditorContent(userId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] }); toast.success('Đã xóa content'); setDeletingId(null) },
    onError: () => { toast.error('Không thể xóa content'); setDeletingId(null) },
  })

  // Danh sách chỉ trả về field rút gọn (không có body/script) để nhẹ payload — mở sửa/xem chi
  // tiết phải lấy lại bản đầy đủ, không thì form/modal hiện trống dù content đã có nội dung.
  const openEdit = (c: Content) => {
    setEditing(c)
    setShowModal(true)
    getEditorContent(userId, c.id).then(setEditing).catch(() => toast.error('Không thể tải nội dung content'))
  }
  const openDetail = (c: Content) => {
    setDetailItem(c)
    getEditorContent(userId, c.id).then(setDetailItem).catch(() => toast.error('Không thể tải nội dung content'))
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm mã, tiêu đề content..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={v => setStatusFilter(v as ContentUsageStatus | '')}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'AVAILABLE', label: 'Sẵn sàng' },
              { value: 'IN_TASK', label: 'Đang dùng' },
              { value: 'USED', label: 'Đã dùng' },
              { value: 'ARCHIVED', label: 'Lưu trữ' },
            ]}
            className="min-w-[175px]"
          />
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-3.5 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <CustomSelect
            value={classificationFilter}
            onChange={setClassificationFilter}
            options={[{ value: '', label: 'Tất cả phân loại' }, ...classificationOptions]}
            className="min-w-[170px]"
            compact
          />
          <ContentProductFilter scope={{ kind: 'personal', userId, brandType }} value={productSku} onChange={setProductSku} />
        </div>
      </div>

      {/* Board theo tuyến */}
      <MyContentsBoard
        userId={userId}
        brandType={brandType}
        market={teamMarket}
        month={month}
        search={search}
        status={statusFilter}
        classificationId={classificationFilter}
        productSku={productSku}
        readOnly={readOnly}
        pendingContentIds={pendingContentIds}
        onSelect={openDetail}
        onEdit={openEdit}
        onPush={setPushItem}
        onDelete={c => setDeletingId(c.id)}
      />

      {showModal && editing && (
        <PersonalContentModal
          editing={editing}
          userId={userId}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}

      {detailItem && (
        <ContentViewModal
          open
          item={detailItem as any}
          catalogType="editor"
          canEdit={!readOnly}
          canDelete={!readOnly && detailItem.status !== 'IN_TASK'}
          canPushToTeam={!readOnly}
          onClose={() => setDetailItem(null)}
          onEdit={() => { openEdit(detailItem); setDetailItem(null) }}
          onDelete={() => { setDeletingId(detailItem.id); setDetailItem(null) }}
          onPushToTeam={() => setPushItem(detailItem)}
        />
      )}

      {pushItem && <PushModal content={pushItem} userId={userId} onClose={() => setPushItem(null)} />}

      <ConfirmDialog
        open={!!deletingId}
        title="Xóa content"
        message="Content sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xóa content"
        danger
        isLoading={deleteMut.isPending}
        onConfirm={() => deletingId && deleteMut.mutate(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
