'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Loader2, FileText, Search, Download,
  ChevronLeft, ChevronRight, SendHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ContentStatusBadge } from '@/components/task-auto/StatusBadge'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import {
  parseMarkets, MarketPicker, VoicePicker,
} from '@/components/task-auto/ContentFormModal'
import { DarkInput, DarkTextarea } from '@/components/task-auto/DarkInput'
import {
  getContents, createContent, updateContent, deleteContent,
  getContentLines, pushContentToTeam, getTeams,
} from '@/lib/api/task-auto'
import { Content, ContentUsageStatus } from '@/types/task-auto'

const MarketBadge = ({ market }: { market: string }) => (
  <span className={cn(
    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
    market === 'GLOBAL' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700',
  )}>
    {market === 'VIETNAM' ? 'VN' : market}
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
  const myTeam = teams?.find(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))
  const push = useMutation({
    mutationFn: () => pushContentToTeam(content.id, myTeam!.id),
    onSuccess: () => { toast.success('Đã đẩy sang kho team'); qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] }); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể đẩy sang team'),
  })
  return (
    <DarkModal open onClose={onClose} title="Đẩy sang kho team" size="sm"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button disabled={!myTeam || push.isPending} onClick={() => push.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {push.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Đẩy sang team
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Content <strong className="text-slate-800">{content.title || '(không tiêu đề)'}</strong> sẽ được thêm vào kho của team.
        </p>
        {myTeam ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <span className="font-semibold">{myTeam.name}</span>
          </div>
        ) : (
          <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Bạn chưa thuộc team nào
          </div>
        )}
      </div>
    </DarkModal>
  )
}

// ── Import from catalog modal ─────────────────────────────────────────────────

function ImportModal({
  userId,
  brandType,
  onImported,
  onClose,
}: {
  userId: string
  brandType: 'DO_DA' | 'TRANG_SUC'
  onImported: () => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'global' | 'team'>('global')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  const myTeam = teams?.find(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))
  const { data: myContents } = useQuery({
    queryKey: ['task-auto', 'my-contents-titles', userId],
    queryFn: () => getContents({ user_id: userId, owner: 'personal', limit: 500 }),
  })
  const myTitleSet = new Set(
    myContents?.data?.map(c => c.title?.trim().toLowerCase()).filter(Boolean) ?? []
  )

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'import-contents', scope, myTeam?.id, brandType, search, page],
    queryFn: () => getContents({
      brand_type: brandType,
      owner: scope === 'global' ? 'global' : undefined,
      ...(scope === 'team' && myTeam ? { team_id: myTeam.id } : {}),
      search: search || undefined,
      page, limit: 10,
    }),
    enabled: scope === 'global' || !!myTeam,
  })

  const copyMut = useMutation({
    mutationFn: (c: Content) => createContent({
      brand_type: brandType,
      title: c.title ?? undefined,
      body: c.body ?? undefined,
      script: c.script ?? undefined,
      file_content_url: c.file_content_url ?? undefined,
      voice_url: c.voice_url ?? undefined,
      content_line_id: c.content_line_id ?? undefined,
      market: (c.market ?? 'VIETNAM') as any,
      user_id: userId,
    } as any),
    onSuccess: () => {
      toast.success('Đã thêm vào kho cá nhân')
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] })
      onImported()
    },
    onError: () => toast.error('Không thể thêm content'),
  })

  return (
    <DarkModal open onClose={onClose} title="Lấy từ kho danh mục" size="lg"
      subtitle="Chọn content để sao chép vào kho cá nhân"
      footer={<button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold">Đóng</button>}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['global', 'team'] as const).map(s => (
            <button key={s} onClick={() => { setScope(s); setPage(1) }}
              className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                scope === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200')}>
              {s === 'global' ? 'Kho chung' : 'Kho team'}
            </button>
          ))}
        </div>
        {scope === 'team' && (
          myTeam ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700">
              <span className="font-semibold">{myTeam.name}</span>
              <span className="text-indigo-400 text-xs">— kho team của bạn</span>
            </div>
          ) : (
            <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              Bạn chưa thuộc team nào
            </div>
          )
        )}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm tiêu đề content..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="space-y-2 min-h-[200px]">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải...
            </div>
          )}
          {!isLoading && !data?.data?.length && (
            <p className="text-center py-12 text-slate-400 text-sm">Không tìm thấy content</p>
          )}
          {data?.data.map(c => {
            const alreadyOwned = !!c.title && myTitleSet.has(c.title.trim().toLowerCase())
            return (
            <div key={c.id} className={cn('flex items-start gap-3 p-3 rounded-xl border transition-colors',
              alreadyOwned ? 'border-gray-100 bg-gray-50' : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30')}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {c.title || <span className="italic text-slate-400">Không tiêu đề</span>}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {parseMarkets(c.market).map(m => <MarketBadge key={m} market={m} />)}
                  {c.content_line?.name && <span className="text-xs text-slate-400">{c.content_line.name}</span>}
                </div>
              </div>
              {alreadyOwned ? (
                <span className="shrink-0 px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-lg">Đã có</span>
              ) : (
                <button
                  disabled={copyMut.isPending}
                  onClick={() => copyMut.mutate(c)}
                  className="shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {copyMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Thêm vào kho'}
                </button>
              )}
            </div>
            )
          })}
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-500 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-500">Trang {page} / {data.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-500 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </DarkModal>
  )
}

// ── Personal content form modal ───────────────────────────────────────────────

function PersonalContentModal({
  editing,
  userId,
  defaultBrandType = 'DO_DA',
  onClose,
  onSuccess,
}: {
  editing?: Content | null
  userId: string
  defaultBrandType?: 'DO_DA' | 'TRANG_SUC'
  onClose: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [brandType, setBrandType] = useState<'DO_DA' | 'TRANG_SUC'>(
    (editing?.brand_type as 'DO_DA' | 'TRANG_SUC') ?? defaultBrandType
  )
  const [form, setForm] = useState<Partial<Content>>({
    title: editing?.title ?? '',
    body: editing?.body ?? '',
    script: editing?.script ?? '',
    file_content_url: editing?.file_content_url ?? '',
    voice_url: editing?.voice_url ?? '',
    content_line_id: editing?.content_line_id ?? '',
  })
  const [markets, setMarkets] = useState<string[]>(parseMarkets(editing?.market) || ['VIETNAM'])

  const { data: contentLines } = useQuery({ queryKey: ['task-auto', 'content-lines'], queryFn: getContentLines })

  const createMut = useMutation({
    mutationFn: () => createContent({
      title: form.title,
      body: form.body,
      script: form.script,
      file_content_url: form.file_content_url,
      voice_url: form.voice_url,
      content_line_id: form.content_line_id || null,
      brand_type: brandType,
      market: markets.join(',') as any,
      user_id: userId,
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] })
      toast.success('Đã thêm content')
      onSuccess()
    },
    onError: () => toast.error('Không thể thêm content'),
  })

  const updateMut = useMutation({
    mutationFn: () => updateContent(editing!.id, {
      title: form.title,
      body: form.body,
      script: form.script,
      file_content_url: form.file_content_url,
      voice_url: form.voice_url,
      content_line_id: form.content_line_id || null,
      market: markets.join(',') as any,
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-contents'] })
      toast.success('Đã cập nhật content')
      onSuccess()
    },
    onError: () => toast.error('Không thể cập nhật content'),
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
            onClick={() => { if (markets.length === 0) return toast.error('Chọn ít nhất một thị trường'); isEdit ? updateMut.mutate() : createMut.mutate() }}
            disabled={saving || markets.length === 0}
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
          <DarkInput
            label="Tiêu đề content"
            placeholder="Nhập tiêu đề..."
            value={form.title ?? ''}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              label="Tuyến nội dung"
              value={form.content_line_id ?? ''}
              onChange={v => setForm(f => ({ ...f, content_line_id: v }))}
              options={[{ value: '', label: '-- Không chọn --' }, ...(contentLines?.map(l => ({ value: l.id, label: l.name })) ?? [])]}
              searchable
            />
            <MarketPicker label="Thị trường" value={markets} onChange={setMarkets} />
          </div>
          <CustomSelect
            label="Nhóm sản phẩm *"
            value={brandType}
            onChange={v => setBrandType(v as 'DO_DA' | 'TRANG_SUC')}
            options={[{ value: 'DO_DA', label: 'Đồ da' }, { value: 'TRANG_SUC', label: 'Trang sức' }]}
          />
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
          <DarkInput
            label="URL file content"
            placeholder="https://drive.google.com/..."
            value={form.file_content_url ?? ''}
            onChange={e => setForm(f => ({ ...f, file_content_url: e.target.value }))}
          />
        </div>
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            File đính kèm
          </p>
          <VoicePicker value={form.voice_url ?? ''} onChange={url => setForm(f => ({ ...f, voice_url: url }))} />
        </div>
      </div>
    </DarkModal>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

interface Props { userId: string; brandType: 'DO_DA' | 'TRANG_SUC' }

export function MyContentsTab({ userId, brandType }: Props) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContentUsageStatus | ''>('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Content | null>(null)
  const [pushItem, setPushItem] = useState<Content | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'my-contents', userId, brandType, search, statusFilter, page],
    queryFn: () => getContents({
      user_id: userId, owner: 'personal', brand_type: brandType,
      search: search || undefined,
      status: statusFilter || undefined,
      page, limit: 20,
    }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteContent,
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
              placeholder="Tìm tiêu đề content..."
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
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide w-[40%]">Tiêu đề</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Tuyến ND</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Thị trường</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Trạng thái</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <LoadingRows cols={5} />}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={5}><EmptyState icon={FileText} title="Chưa có content cá nhân nào" /></td></tr>
              )}
              {data?.data.map(c => (
                <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="px-5 py-4 max-w-0">
                    <span className="text-base font-semibold text-slate-800 truncate block" title={c.title ?? ''}>
                      {c.title || <span className="text-slate-400 italic font-normal text-sm">Chưa đặt tên</span>}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {c.content_line?.name
                      ? <span className="text-sm font-medium text-slate-700">{c.content_line.name}</span>
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
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPushItem(c)}
                        title="Đẩy sang kho team"
                        className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <SendHorizontal className="w-4 h-4" />
                      </button>
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
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}

      {showImport && (
        <ImportModal
          userId={userId}
          brandType={brandType}
          onImported={() => setShowImport(false)}
          onClose={() => setShowImport(false)}
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
