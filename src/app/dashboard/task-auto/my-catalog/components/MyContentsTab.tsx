'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Loader2, FileText, Search, Download, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { CustomSelect, CreatableSelect } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import {
  parseMarkets, MarketPicker, VoicePicker, ContentFilePicker,
} from '@/components/task-auto/ContentFormModal'
import type { VoicePickerHandle } from '@/components/task-auto/ContentFormModal'
import { DarkInput, DarkTextarea } from '@/components/task-auto/DarkInput'
import {
  getContents, getTeamContents,
  getEditorContents, getEditorContent, createEditorContent, updateEditorContent, deleteEditorContent, pushEditorContentToTeam,
  getContentLines, getContentClassifications, createContentClassification, getTeams, getMyPushRequests,
} from '@/lib/api/task-auto'
import { Content, TeamContent, ContentUsageStatus } from '@/types/task-auto'
import { ContentViewModal } from '@/components/task-auto/ContentViewModal'
import { MyContentsBoard } from './MyContentsBoard'

const MARKET_COLOR: Record<string, string> = {
  VIETNAM: 'bg-emerald-100 text-emerald-700',
  INDONESIA: 'bg-amber-100 text-amber-700',
  JAPAN: 'bg-rose-100 text-rose-700',
  THAILAND: 'bg-sky-100 text-sky-700',
}
const MARKET_SHORT: Record<string, string> = { VIETNAM: 'VN', INDONESIA: 'ID', JAPAN: 'JP', THAILAND: 'TH' }
const MarketBadge = ({ market }: { market: string }) => (
  <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', MARKET_COLOR[market] ?? 'bg-gray-100 text-gray-600')}>
    {MARKET_SHORT[market] ?? market}
  </span>
)

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

// ── Import from catalog modal ─────────────────────────────────────────────────

function ImportModal({
  userId,
  brandType: initialBrandType,
  teamMarket,
  onImported,
  onClose,
}: {
  userId: string
  brandType: 'DO_DA' | 'TRANG_SUC'
  teamMarket?: string
  onImported: () => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'global' | 'team'>('global')
  const brandType = initialBrandType
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const qc = useQueryClient()

  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  const myTeam = teams?.find(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))

  const { data: myContents, isLoading: loadingMyContents } = useQuery({
    queryKey: ['task-auto', 'my-contents-titles', userId],
    queryFn: () => getEditorContents(userId, { limit: 500 }),
  })
  const myTitleSet = new Set(myContents?.data?.map(c => c.title?.trim().toLowerCase()).filter(Boolean) ?? [])

  const { data: globalData, isLoading: loadingGlobal } = useQuery({
    queryKey: ['task-auto', 'import-contents-global', brandType, teamMarket, search],
    queryFn: () => getContents({ brand_type: brandType, market: teamMarket, search: search || undefined, limit: 50, status: 'AVAILABLE' } as any),
    enabled: scope === 'global',
  })

  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ['task-auto', 'import-contents-team', myTeam?.id, brandType],
    queryFn: () => getTeamContents(myTeam!.id, brandType),
    enabled: scope === 'team' && !!myTeam,
  })

  const isLoading = scope === 'global' ? loadingGlobal : loadingTeam

  const rawItems: Array<Content | TeamContent> = scope === 'global'
    ? (globalData?.data ?? [])
    : (teamData ?? [])

  // Content được đẩy lên kho tổng/kho team từ kho khác có title/body rỗng ở bản ghi gốc —
  // dữ liệu thật nằm ở source_team_content (kho tổng) hoặc source_editor_content (kho team).
  const resolveImportItem = (c: Content | TeamContent) => {
    if (scope === 'global') {
      const g = c as Content
      const tc = g.source_team_content
      const tc_ec = tc?.source_editor_content
      return {
        code: g.code || tc?.code || tc_ec?.code || '',
        title: g.title || tc?.title || tc_ec?.title || '',
        body: g.body ?? tc?.body ?? tc_ec?.body ?? null,
        script: g.script ?? tc?.script ?? tc_ec?.script ?? null,
        fileContentUrl: g.file_content_url ?? tc?.file_content_url ?? tc_ec?.file_content_url ?? null,
        voiceUrl: g.voice_url ?? tc?.voice_url ?? tc_ec?.voice_url ?? null,
        contentLineId: g.content_line_id ?? tc?.content_line?.id ?? tc_ec?.content_line?.id ?? null,
        contentLine: g.content_line ?? tc?.content_line ?? tc_ec?.content_line ?? null,
        classificationId: g.classification_id ?? tc?.classification?.id ?? tc_ec?.classification?.id ?? null,
        market: g.market ?? tc?.market ?? tc_ec?.market ?? 'VIETNAM',
      }
    }
    const t = c as TeamContent
    const ec = t.source_editor_content
    return {
      code: t.code || ec?.code || '',
      title: t.title || ec?.title || '',
      body: t.body ?? ec?.body ?? null,
      script: t.script ?? ec?.script ?? null,
      fileContentUrl: t.file_content_url ?? ec?.file_content_url ?? null,
      voiceUrl: t.voice_url ?? ec?.voice_url ?? null,
      contentLineId: t.content_line_id ?? ec?.content_line_id ?? null,
      contentLine: t.content_line ?? ec?.content_line ?? null,
      classificationId: t.classification_id ?? ec?.classification_id ?? null,
      market: t.market ?? ec?.market ?? 'VIETNAM',
    }
  }

  const available = rawItems.filter(c => {
    const title = resolveImportItem(c).title.trim().toLowerCase()
    if (myTitleSet.has(title)) return false
    if (scope === 'team' && search) return title.includes(search.toLowerCase())
    return true
  })

  const toggleId = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () =>
    setSelectedIds(selectedIds.size === available.length ? new Set() : new Set(available.map(c => c.id)))
  const allSelected = available.length > 0 && selectedIds.size === available.length

  const copyMut = useMutation({
    mutationFn: async () => {
      const selected = available.filter(c => selectedIds.has(c.id))
      const results = await Promise.allSettled(
        selected.map(c => {
          const isTeamContent = scope === 'team'
          const sourceId = isTeamContent
            ? (c as TeamContent).source_content_id ?? undefined
            : c.id
          const r = resolveImportItem(c)
          return createEditorContent(userId, {
            ...(sourceId ? { source_content_id: sourceId } : {}),
            brand_type: brandType,
            title: r.title || undefined,
            body: r.body ?? undefined,
            script: r.script ?? undefined,
            file_content_url: r.fileContentUrl ?? undefined,
            voice_url: r.voiceUrl ?? undefined,
            content_line_id: r.contentLineId ?? undefined,
            classification_id: r.classificationId ?? undefined,
            market: r.market as any,
          } as any)
        })
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} content thêm thất bại`)
    },
    onSuccess: () => {
      toast.success(`Đã thêm ${selectedIds.size} content vào kho cá nhân`)
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents-titles'] })
      onImported()
    },
    onError: (e: any) => toast.error(e?.message || 'Không thể thêm content'),
  })

  return (
    <DarkModal
      open
      onClose={onClose}
      title="Lấy từ kho danh mục"
      subtitle="Chọn nhiều content để thêm vào kho cá nhân"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button
            onClick={() => copyMut.mutate()}
            disabled={copyMut.isPending || selectedIds.size === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {copyMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : selectedIds.size > 0 ? <Check className="w-3.5 h-3.5" /> : null}
            {selectedIds.size > 0 ? `Thêm ${selectedIds.size} content` : 'Thêm vào kho'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Scope switcher */}
        <div className="flex gap-1.5">
          {(['global', 'team'] as const).map(s => (
            <button key={s} onClick={() => { setScope(s); setSelectedIds(new Set()) }}
              className={cn('px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors',
                scope === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200')}>
              {s === 'global' ? 'Kho chung' : 'Kho team'}
            </button>
          ))}
        </div>

        {scope === 'team' && (myTeam ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700">
            <span className="font-semibold">{myTeam.name}</span>
            <span className="text-indigo-400 text-xs">— kho team của bạn</span>
          </div>
        ) : (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Bạn chưa thuộc team nào
          </div>
        ))}

        {/* Search + select all */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedIds(new Set()) }}
              placeholder="Tìm tiêu đề content..."
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {available.length > 0 && (
            <button onClick={toggleAll} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap">
              {allSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${available.length})`}
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto space-y-1">
          {(isLoading || loadingMyContents) && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>}
          {!isLoading && !loadingMyContents && available.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 italic">
              {search ? 'Không tìm thấy content phù hợp' : 'Tất cả content đã có trong kho cá nhân'}
            </p>
          )}
          {!isLoading && !loadingMyContents && available.map(c => {
            const selected = selectedIds.has(c.id)
            const r = resolveImportItem(c)
            return (
              <button
                key={c.id}
                onClick={() => toggleId(c.id)}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                  selected ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-gray-50 border border-transparent'
                )}
              >
                <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                  selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white')}>
                  {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {r.title || <span className="text-slate-400 italic font-normal">Chưa đặt tên</span>}
                  </p>
                  <p className="text-xs text-slate-400 truncate">Mã: {r.code || '—'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {parseMarkets(r.market).map(m => <MarketBadge key={m} market={m} />)}
                    {r.contentLine?.name && <span className="text-xs text-slate-400">{r.contentLine.name}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </DarkModal>
  )
}

// ── Personal content form modal ───────────────────────────────────────────────

function PersonalContentModal({
  editing,
  userId,
  defaultBrandType = 'DO_DA',
  defaultMarket = 'VIETNAM',
  presetContentLineId,
  onClose,
  onSuccess,
}: {
  editing?: Content | null
  userId: string
  defaultBrandType?: 'DO_DA' | 'TRANG_SUC'
  defaultMarket?: string
  presetContentLineId?: string
  onClose: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const brandType: 'DO_DA' | 'TRANG_SUC' = (editing?.brand_type as 'DO_DA' | 'TRANG_SUC') ?? defaultBrandType ?? 'TRANG_SUC'
  const [form, setForm] = useState<Partial<Content>>({
    code: editing?.code ?? '',
    title: editing?.title ?? '',
    body: editing?.body ?? '',
    script: editing?.script ?? '',
    file_content_url: editing?.file_content_url ?? '',
    voice_url: editing?.voice_url ?? '',
    content_line_id: editing?.content_line_id ?? presetContentLineId ?? '',
    classification_id: editing?.classification_id ?? '',
  })
  const [market, setMarket] = useState<string>(editing?.market ?? defaultMarket)
  const voicePickerRef = useRef<VoicePickerHandle>(null)

  const { data: contentLines } = useQuery({ queryKey: ['task-auto', 'content-lines'], queryFn: getContentLines })
  const { data: contentClassifications } = useQuery({ queryKey: ['task-auto', 'content-classifications'], queryFn: getContentClassifications })

  const createMut = useMutation({
    mutationFn: async () => createEditorContent(userId, {
      code: form.code?.trim() || null,
      title: form.title,
      body: form.body,
      script: form.script,
      file_content_url: form.file_content_url,
      voice_url: await voicePickerRef.current!.resolvePending(form.voice_url ?? ''),
      content_line_id: form.content_line_id || null,
      classification_id: form.classification_id || null,
      brand_type: brandType,
      market: market as any,
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] })
      toast.success('Đã thêm content')
      onSuccess()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể thêm content'),
  })

  const updateMut = useMutation({
    mutationFn: async () => updateEditorContent(userId, editing!.id, {
      code: form.code?.trim() || null,
      title: form.title,
      body: form.body,
      script: form.script,
      file_content_url: form.file_content_url,
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

  const saving = createMut.isPending || updateMut.isPending

  const handleSubmit = () => {
    if (!form.title?.trim()) return toast.error('Tiêu đề content là bắt buộc')
    isEdit ? updateMut.mutate() : createMut.mutate()
  }

  return (
    <DarkModal
      open
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa content' : 'Thêm content vào kho cá nhân'}
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
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
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
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              label="Tuyến nội dung"
              value={form.content_line_id ?? ''}
              onChange={v => setForm(f => ({ ...f, content_line_id: v }))}
              options={[{ value: '', label: '-- Không chọn --' }, ...(contentLines?.map(l => ({ value: l.id, label: l.name })) ?? [])]}
              searchable
            />
            <CreatableSelect
              label="Phân loại nội dung"
              value={form.classification_id ?? ''}
              onChange={v => setForm(f => ({ ...f, classification_id: v }))}
              options={contentClassifications?.map(c => ({ value: c.id, label: c.name })) ?? []}
              createLabel="Thêm phân loại nội dung"
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
            Nội dung văn bản
          </p>
          <DarkTextarea
            label="Nội dung / Script"
            rows={4}
            placeholder="Nhập nội dung hoặc kịch bản..."
            value={form.body ?? ''}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          />
          <ContentFilePicker
            value={form.file_content_url ?? ''}
            onChange={url => setForm(f => ({ ...f, file_content_url: url }))}
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
  const [month, setMonth] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [presetLineId, setPresetLineId] = useState<string | undefined>(undefined)
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

  const openCreate = () => { setEditing(null); setPresetLineId(undefined); setShowModal(true) }
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
          {!readOnly && (
            <>
              <button
                onClick={() => setShowImport(true)}
                className="bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl px-4 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" /> Lấy từ kho
              </button>
              <button
                onClick={openCreate}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
              >
                <Plus className="w-5 h-5" /> Thêm content
              </button>
            </>
          )}
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
        readOnly={readOnly}
        pendingContentIds={pendingContentIds}
        onSelect={openDetail}
        onEdit={openEdit}
        onPush={setPushItem}
        onDelete={c => setDeletingId(c.id)}
        onAdd={contentLineId => { setPresetLineId(contentLineId); setEditing(null); setShowModal(true) }}
      />

      {showModal && (
        <PersonalContentModal
          editing={editing}
          userId={userId}
          defaultBrandType={brandType}
          defaultMarket={teamMarket}
          presetContentLineId={presetLineId}
          onClose={() => { setShowModal(false); setPresetLineId(undefined) }}
          onSuccess={() => { setShowModal(false); setPresetLineId(undefined) }}
        />
      )}

      {showImport && (
        <ImportModal
          userId={userId}
          brandType={brandType}
          teamMarket={teamMarket}
          onImported={() => setShowImport(false)}
          onClose={() => setShowImport(false)}
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
