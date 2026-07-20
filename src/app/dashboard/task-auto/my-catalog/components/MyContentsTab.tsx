'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Loader2, FileText, Search, Download,
  ChevronLeft, ChevronRight, SendHorizontal, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { CustomSelect, CreatableSelect } from '@/components/task-auto/DarkInput'
import { ContentStatusBadge } from '@/components/task-auto/StatusBadge'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { HeaderFilterDropdown } from '@/components/task-auto/HeaderFilterDropdown'
import {
  parseMarkets, MarketPicker, VoicePicker, ContentFilePicker,
} from '@/components/task-auto/ContentFormModal'
import type { VoicePickerHandle } from '@/components/task-auto/ContentFormModal'
import { DarkInput, DarkTextarea } from '@/components/task-auto/DarkInput'
import {
  getContents, getTeamContents,
  getEditorContents, createEditorContent, updateEditorContent, deleteEditorContent, pushEditorContentToTeam,
  getContentLines, getContentClassifications, createContentClassification, getTeams, getMyPushRequests,
} from '@/lib/api/task-auto'
import { Content, TeamContent, ContentUsageStatus } from '@/types/task-auto'
import { ContentViewModal } from '@/components/task-auto/ContentViewModal'

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

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>{Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
        ))}</tr>
      ))}
    </>
  )
}

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
  onClose,
  onSuccess,
}: {
  editing?: Content | null
  userId: string
  defaultBrandType?: 'DO_DA' | 'TRANG_SUC'
  defaultMarket?: string
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
    content_line_id: editing?.content_line_id ?? '',
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
            onClick={() => { isEdit ? updateMut.mutate() : createMut.mutate() }}
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
              label="Tiêu đề content"
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
  const [contentLineFilter, setContentLineFilter] = useState('')
  const [classificationFilter, setClassificationFilter] = useState('')
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Content | null>(null)
  const [detailItem, setDetailItem] = useState<Content | null>(null)
  const [pushItem, setPushItem] = useState<Content | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: contentLines } = useQuery({ queryKey: ['task-auto', 'content-lines'], queryFn: getContentLines })
  const { data: contentClassifications } = useQuery({ queryKey: ['task-auto', 'content-classifications'], queryFn: getContentClassifications })

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'my-contents', userId, brandType, teamMarket, search, statusFilter, contentLineFilter, classificationFilter, month, page],
    queryFn: () => getEditorContents(userId, {
      brand_type: brandType,
      market: teamMarket,
      search: search || undefined,
      status: statusFilter || undefined,
      content_line_id: contentLineFilter || undefined,
      classification_id: classificationFilter || undefined,
      month: month || undefined,
      page, limit: 20,
    }),
  })

  const { data: myPushRequests } = useQuery({
    queryKey: ['task-auto', 'my-push-requests', userId],
    queryFn: () => getMyPushRequests(userId, 'PENDING'),
  })
  const pendingContentIds = new Set((myPushRequests ?? []).map(r => r.editor_content_id).filter(Boolean))

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEditorContent(userId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] }); toast.success('Đã xóa content'); setDeletingId(null) },
    onError: () => { toast.error('Không thể xóa content'); setDeletingId(null) },
  })

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit = (c: Content) => { setEditing(c); setShowModal(true) }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm mã, tiêu đề content..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={v => { setStatusFilter(v as ContentUsageStatus | ''); setPage(1) }}
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
            onChange={e => { setMonth(e.target.value); setPage(1) }}
            className="px-3 py-3.5 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

      {data && data.total > 0 && (
        <p className="text-sm text-slate-500 px-1">
          <span className="font-bold text-slate-700">{data.total}</span> content cá nhân
        </p>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-gray-200">
                <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Mã</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide w-[35%]">Tiêu đề</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">
                  <HeaderFilterDropdown
                    label="Tuyến ND"
                    value={contentLineFilter}
                    onChange={v => { setContentLineFilter(v); setPage(1) }}
                    options={(contentLines ?? []).map(l => ({ value: l.id, label: l.name }))}
                  />
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">
                  <HeaderFilterDropdown
                    label="Phân loại"
                    value={classificationFilter}
                    onChange={v => { setClassificationFilter(v); setPage(1) }}
                    options={(contentClassifications ?? []).map(c => ({ value: c.id, label: c.name }))}
                  />
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Thị trường</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Trạng thái</th>
                {/* <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Người thêm</th> */}
                <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Ngày thêm</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <LoadingRows cols={9} />}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={9}><EmptyState icon={FileText} title="Chưa có content cá nhân nào" /></td></tr>
              )}
              {data?.data.map(c => (
                <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors group cursor-pointer" onClick={() => setDetailItem(c)}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="inline-block bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg">
                      {c.code || <span className="text-slate-300">—</span>}
                    </span>
                  </td>
                  <td className="px-5 py-4 max-w-0">
                    <span className="text-base font-semibold text-slate-800 truncate block hover:text-indigo-600 transition-colors" title={c.title ?? ''}>
                      {c.title || <span className="text-slate-400 italic font-normal text-sm">Chưa đặt tên</span>}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {c.content_line?.name
                      ? <span className="text-sm font-medium text-slate-700">{c.content_line.name}</span>
                      : <span className="text-slate-300 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {c.classification?.name
                      ? <span className="text-sm font-medium text-slate-700">{c.classification.name}</span>
                      : <span className="text-slate-300 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex gap-1.5">
                      {parseMarkets(c.market).map(m => <MarketBadge key={m} market={m} />)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <ContentStatusBadge status={c.status} />
                  </td>
                  {/* <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-500">
                      {c.added_by?.full_name ?? <span className="text-slate-300">—</span>}
                    </span>
                  </td> */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-500">
                      {(c as any).added_at ? new Date((c as any).added_at).toLocaleDateString('vi-VN') : <span className="text-slate-300">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {readOnly ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : (
                        <>
                          {pendingContentIds.has(c.id) ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap" title="Đang chờ leader duyệt vào kho team">
                              Chờ duyệt
                            </span>
                          ) : (
                            <button
                              onClick={() => setPushItem(c)}
                              title="Đẩy sang kho team"
                              className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <SendHorizontal className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(c)}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {c.status !== 'IN_TASK' ? (
                            <button
                              onClick={() => setDeletingId(c.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button disabled title="Đang dùng trong task" className="p-2 rounded-xl text-slate-200 cursor-not-allowed">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-slate-500">Trang <span className="font-semibold">{page}</span> / {data.totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <PersonalContentModal
          editing={editing}
          userId={userId}
          defaultBrandType={brandType}
          defaultMarket={teamMarket}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
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
