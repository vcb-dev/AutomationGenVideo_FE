'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Loader2, Users, Eye, FileText, Package, Video } from 'lucide-react'
import { DarkModal, DarkInput, EmptyState, CustomSelect, ServerSearchSelect } from '@/components/task-auto'
import {
  getEditorKpis, createEditorKpi, updateEditorKpi, deleteEditorKpi,
  getApprovals, getTeams,
} from '@/lib/api/task-auto'
import { EditorKpi } from '@/types/task-auto'
import { cn } from '@/lib/utils'

// ── Form state ────────────────────────────────────────────────────────────────

type KpiFormState = Omit<EditorKpi, 'id' | 'set_by_id' | 'created_at' | 'updated_at' | 'user' | 'set_by'>

const defaultForm = (): KpiFormState => ({
  user_id: '', month: '',
  total_target: 0, video_win: 0, video_fail: 0,
  ratio_a1: 0, ratio_a2: 0, ratio_a3: 0, ratio_a4: 0, ratio_a5: 0,
  kpi_extra: 0, content_new: 0, content_collected: 0, content_win_cover: 0,
  product_planned: 0, product_win_collect: 0,
  video_traffic: 0, video_gmv: 0, video_profit: 0,
})

// ── KPI row configs ───────────────────────────────────────────────────────────

const VIDEO_ROWS: { key: keyof KpiFormState; label: string; bold?: boolean }[] = [
  { key: 'total_target',  label: 'Tổng video sản xuất', bold: true },
  { key: 'video_win',     label: 'Video win (≥10k views)' },
  { key: 'video_fail',    label: 'Video fail' },
  { key: 'ratio_a1',      label: 'A1 — Kéo traffic' },
  { key: 'ratio_a2',      label: 'A2 — Tạo chuyên gia' },
  { key: 'ratio_a3',      label: 'A3 — Tạo trust' },
  { key: 'ratio_a4',      label: 'A4 — Chuyển đổi' },
  { key: 'ratio_a5',      label: 'A5 — Nhân bản & scale' },
]

const CONTENT_ROWS: { key: keyof KpiFormState; label: string; bold?: boolean }[] = [
  { key: 'content_new',       label: 'Content mới được làm' },
  { key: 'content_collected', label: 'Content sưu tầm về kho team' },
  { key: 'content_win_cover', label: 'Content win được cover lại' },
]

const PRODUCT_ROWS: { key: keyof KpiFormState; label: string }[] = [
  { key: 'product_planned',    label: 'SP đẩy video theo kế hoạch' },
  { key: 'product_win_collect',label: 'SP sưu tầm và test video win' },
  { key: 'video_traffic',      label: 'Video SP dòng Traffic' },
  { key: 'video_gmv',          label: 'Video SP dòng GMV' },
  { key: 'video_profit',       label: 'Video SP dòng Profit' },
]

// ── Detail modal ──────────────────────────────────────────────────────────────

function KpiDetailModal({ kpi, onClose }: { kpi: EditorKpi; onClose: () => void }) {
  const monthLabel = kpi.month.replace(/(\d{4})-(\d{2})/, 'Tháng $2/$1')
  return (
    <DarkModal
      open
      onClose={onClose}
      title={`Chi tiết KPI — ${kpi.user?.full_name ?? ''}`}
      subtitle={`${monthLabel} · Người đặt: ${kpi.set_by?.full_name ?? '—'}`}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Summary chips */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Tổng video',   value: kpi.total_target,    color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            { label: 'Video win',    value: kpi.video_win,        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Video fail',   value: kpi.video_fail,       color: 'bg-red-50 text-red-600 border-red-200' },
            { label: 'Content mới',  value: kpi.content_new,      color: 'bg-sky-50 text-sky-700 border-sky-200' },
            { label: 'SP kế hoạch',  value: kpi.product_planned,  color: 'bg-violet-50 text-violet-700 border-violet-200' },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn('flex items-center gap-3 px-5 py-3 rounded-2xl border font-semibold', color)}>
              <span className="text-sm font-medium opacity-70">{label}</span>
              <span className="text-2xl font-black">{value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Video */}
          <div className="rounded-2xl overflow-hidden border border-orange-200">
            <div className="bg-orange-400 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
              <Video className="w-4 h-4" /> Số video sản xuất đạt tiêu chuẩn
            </div>
            <div className="divide-y divide-orange-100">
              {VIDEO_ROWS.map(r => (
                <div key={r.key} className="flex items-center justify-between px-4 py-3 bg-white">
                  <span className={cn('text-sm text-slate-600', r.bold && 'font-semibold text-slate-800')}>{r.label}</span>
                  <span className={cn('font-bold', r.bold ? 'text-indigo-700 text-lg' : 'text-slate-900 text-base')}>{kpi[r.key] as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="rounded-2xl overflow-hidden border border-green-200">
            <div className="bg-green-500 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Content
            </div>
            <div className="divide-y divide-green-100">
              {CONTENT_ROWS.map(r => (
                <div key={r.key} className="flex items-center justify-between px-4 py-3 bg-white">
                  <span className={cn('text-sm text-slate-600', r.bold && 'font-semibold text-slate-800')}>{r.label}</span>
                  <span className={cn('font-bold', r.bold ? 'text-green-700 text-lg' : 'text-slate-900 text-base')}>{kpi[r.key] as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="rounded-2xl overflow-hidden border border-purple-200">
            <div className="bg-purple-500 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> Product
            </div>
            <div className="divide-y divide-purple-100">
              {PRODUCT_ROWS.map(r => (
                <div key={r.key} className="flex items-center justify-between px-4 py-3 bg-white">
                  <span className="text-sm text-slate-600">{r.label}</span>
                  <span className="text-base font-bold text-slate-900">{kpi[r.key] as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DarkModal>
  )
}

// ── Table row ─────────────────────────────────────────────────────────────────

function KpiTableRow({
  kpi, canEdit, onEdit, onDelete, onViewDetail,
}: {
  kpi: EditorKpi
  canEdit: boolean
  onEdit: (k: EditorKpi) => void
  onDelete: (id: string) => void
  onViewDetail: (k: EditorKpi) => void
}) {
  const monthLabel = kpi.month.replace(/(\d{4})-(\d{2})/, 'T$2/$1')

  return (
    <tr
      className="hover:bg-indigo-50/20 transition-colors cursor-pointer"
      onClick={() => onViewDetail(kpi)}
    >
      <td className="px-5 py-4">
        <p className="font-semibold text-slate-900 text-sm">{kpi.user?.full_name ?? '-'}</p>
        <p className="text-xs text-slate-400">{kpi.user?.email ?? ''}</p>
      </td>
      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{monthLabel}</td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="font-bold text-indigo-600 text-base">{kpi.total_target}</span>
        <span className="text-xs text-slate-400 ml-1">video</span>
      </td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="font-semibold text-emerald-600">{kpi.video_win}</span>
        <span className="text-xs text-slate-400 ml-1">win</span>
      </td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="font-semibold text-sky-600">{kpi.content_new}</span>
        <span className="text-xs text-slate-400 ml-1">content</span>
      </td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="font-semibold text-violet-600">{kpi.product_planned}</span>
        <span className="text-xs text-slate-400 ml-1">SP</span>
      </td>
      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{kpi.set_by?.full_name ?? '-'}</td>
      <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={e => { e.stopPropagation(); onViewDetail(kpi) }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onEdit(kpi) }}
                className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-colors"
                title="Sửa KPI"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(kpi.id) }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                title="Xóa KPI"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  month: string
  canEdit: boolean
  isLeader?: boolean
  userId?: string
  selectedTeamId?: string
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function EditorKpiTab({ month, canEdit, isLeader, userId, selectedTeamId }: Props) {
  const qc = useQueryClient()
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [editing, setEditing] = useState<EditorKpi | null>(null)
  const [viewingKpi, setViewingKpi] = useState<EditorKpi | null>(null)
  const [form, setForm] = useState<KpiFormState>(defaultForm())
  const [teamFilter, setTeamFilter] = useState(selectedTeamId ?? '')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editorSearch, setEditorSearch] = useState('')

  // Sync when parent changes selected team (e.g. switching from KPI Team tab)
  useEffect(() => {
    if (selectedTeamId !== undefined) setTeamFilter(selectedTeamId)
  }, [selectedTeamId])

  const isManagerOrAdmin = canEdit && !isLeader

  const { data: editorKpis, isLoading } = useQuery({
    queryKey: ['task-auto', 'editor-kpis', month],
    queryFn: () => getEditorKpis(month),
  })

  const { data: approvedEditors } = useQuery({
    queryKey: ['task-auto', 'approvals', 'APPROVED'],
    queryFn: () => getApprovals('APPROVED'),
    enabled: modal !== null,
  })

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
    enabled: isManagerOrAdmin || !!isLeader,
  })

  const leaderTeam = isLeader && userId ? teams?.find(t => t.leader_id === userId) : undefined
  const leaderTeamMemberIds = new Set(leaderTeam?.members?.map(m => m.user_id) ?? [])
  const filteredTeamMemberIds = teamFilter
    ? new Set(teams?.find(t => t.id === teamFilter)?.members?.map(m => m.user_id) ?? [])
    : null

  const allApproved = approvedEditors ?? []
  const selectableEditors = isLeader
    ? allApproved.filter(a => leaderTeamMemberIds.has(a.user_id))
    : allApproved

  const upsertMut = useMutation({
    mutationFn: (body: KpiFormState) =>
      editing
        ? updateEditorKpi(editing.id, body as any)
        : createEditorKpi(body as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'editor-kpis'] })
      toast.success(editing ? 'Đã cập nhật KPI' : 'Đã thêm KPI editor')
      setModal(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể lưu KPI'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteEditorKpi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'editor-kpis'] })
      toast.success('Đã xóa KPI')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Không thể xóa KPI')
      setDeletingId(null)
    },
  })

  const openCreate = () => {
    setForm({ ...defaultForm(), month })
    setEditing(null)
    setModal('create')
  }

  const openEdit = (kpi: EditorKpi) => {
    setEditing(kpi)
    setForm({
      user_id: kpi.user_id, month: kpi.month,
      total_target: kpi.total_target, video_win: kpi.video_win, video_fail: kpi.video_fail,
      ratio_a1: kpi.ratio_a1, ratio_a2: kpi.ratio_a2, ratio_a3: kpi.ratio_a3,
      ratio_a4: kpi.ratio_a4, ratio_a5: kpi.ratio_a5,
      kpi_extra: kpi.kpi_extra, content_new: kpi.content_new,
      content_collected: kpi.content_collected, content_win_cover: kpi.content_win_cover,
      product_planned: kpi.product_planned, product_win_collect: kpi.product_win_collect,
      video_traffic: kpi.video_traffic, video_gmv: kpi.video_gmv, video_profit: kpi.video_profit,
    })
    setModal('edit')
  }

  const setField = (key: keyof KpiFormState, val: number) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = () => {
    if (!form.user_id) return toast.error('Chọn editor')
    if (!form.month) return toast.error('Chọn tháng')
    upsertMut.mutate(form)
  }

  let visibleKpis = editorKpis ?? []
  if (isLeader && leaderTeamMemberIds.size > 0)
    visibleKpis = visibleKpis.filter(k => leaderTeamMemberIds.has(k.user_id))
  else if (filteredTeamMemberIds)
    visibleKpis = visibleKpis.filter(k => filteredTeamMemberIds.has(k.user_id))

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {isManagerOrAdmin && (
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
            <CustomSelect
              value={teamFilter}
              onChange={setTeamFilter}
              options={[
                { value: '', label: 'Tất cả nhóm' },
                ...(teams?.map(t => ({ value: t.id, label: t.name })) ?? []),
              ]}
              className="min-w-[200px]"
              searchable
            />
          </div>
        )}
        {isLeader && leaderTeam && (
          <p className="text-sm text-slate-500">
            Đặt KPI cho editor trong team{' '}
            <span className="font-semibold text-slate-700">{leaderTeam.name}</span>
          </p>
        )}
        {canEdit && (
          <button
            onClick={openCreate}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" /> Thêm KPI Editor
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Editor</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tháng</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tổng video</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Video win</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Content mới</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">SP kế hoạch</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Người đặt</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <LoadingRows />}
              {!isLoading && visibleKpis.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title={`Không có KPI editor${teamFilter ? ' trong nhóm này' : ''}`}
                    />
                  </td>
                </tr>
              )}
              {visibleKpis.map(kpi => (
                <KpiTableRow
                  key={kpi.id}
                  kpi={kpi}
                  canEdit={canEdit}
                  onEdit={openEdit}
                  onDelete={setDeletingId}
                  onViewDetail={setViewingKpi}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      <DarkModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Thêm KPI Editor' : `Sửa KPI — ${editing?.user?.full_name ?? ''}`}
        size="2xl"
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-3 text-base font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={upsertMut.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              {upsertMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {modal === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Editor + month */}
          <div className="grid grid-cols-2 gap-4">
            <ServerSearchSelect
              label="Editor *"
              value={form.user_id}
              onChange={v => setForm(f => ({ ...f, user_id: v }))}
              items={selectableEditors.map(a => ({
                value: a.user_id,
                label: a.user?.full_name ?? a.user_id,
                sublabel: a.user?.email ?? '',
              }))}
              searchValue={editorSearch}
              onSearchChange={setEditorSearch}
              placeholder={
                selectableEditors.length === 0
                  ? (isLeader ? 'Chưa có editor trong team' : 'Chưa có editor được phê duyệt')
                  : '-- Chọn editor --'
              }
              searchPlaceholder="Tìm tên hoặc email..."
              clearLabel="-- Bỏ chọn --"
            />
            <DarkInput
              label="Tháng *"
              type="month"
              value={form.month}
              onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
            />
          </div>

          {/* KPI input — same 3-card layout as detail view */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Video */}
            <div className="rounded-2xl overflow-hidden border border-orange-200">
              <div className="bg-orange-400 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
                <Video className="w-4 h-4" /> Số video sản xuất đạt tiêu chuẩn
              </div>
              <div className="divide-y divide-orange-100">
                {VIDEO_ROWS.map(row => (
                  <div key={row.key} className={cn('flex items-center justify-between gap-3 px-4 py-2.5', row.bold ? 'bg-orange-50/60' : 'bg-white')}>
                    <span className={cn('text-sm text-slate-600 flex-1 leading-snug', row.bold && 'font-semibold text-slate-800')}>{row.label}</span>
                    <input
                      type="number" min={0}
                      value={form[row.key] as number}
                      onChange={e => setField(row.key, Math.max(0, Number(e.target.value)))}
                      className={cn(
                        'w-20 shrink-0 border rounded-lg px-2 py-1 text-right font-bold focus:outline-none focus:ring-2 transition-colors',
                        row.bold
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-indigo-400'
                          : 'bg-white border-gray-200 text-slate-800 focus:ring-indigo-300',
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="rounded-2xl overflow-hidden border border-green-200">
              <div className="bg-green-500 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Content
              </div>
              <div className="divide-y divide-green-100">
                {CONTENT_ROWS.map(row => (
                  <div key={row.key} className={cn('flex items-center justify-between gap-3 px-4 py-2.5', row.bold ? 'bg-green-50/60' : 'bg-white')}>
                    <span className={cn('text-sm text-slate-600 flex-1 leading-snug', row.bold && 'font-semibold text-slate-800')}>{row.label}</span>
                    <input
                      type="number" min={0}
                      value={form[row.key] as number}
                      onChange={e => setField(row.key, Math.max(0, Number(e.target.value)))}
                      className={cn(
                        'w-20 shrink-0 border rounded-lg px-2 py-1 text-right font-bold focus:outline-none focus:ring-2 transition-colors',
                        row.bold
                          ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-400'
                          : 'bg-white border-gray-200 text-slate-800 focus:ring-green-400',
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Product */}
            <div className="rounded-2xl overflow-hidden border border-purple-200">
              <div className="bg-purple-500 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
                <Package className="w-4 h-4" /> Product
              </div>
              <div className="divide-y divide-purple-100">
                {PRODUCT_ROWS.map(row => (
                  <div key={row.key} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white">
                    <span className="text-sm text-slate-600 flex-1 leading-snug">{row.label}</span>
                    <input
                      type="number" min={0}
                      value={form[row.key] as number}
                      onChange={e => setField(row.key, Math.max(0, Number(e.target.value)))}
                      className="w-20 shrink-0 border border-gray-200 rounded-lg px-2 py-1 text-right font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
            <strong>Tổng video sản xuất</strong> được dùng làm chỉ tiêu auto-assign task hàng ngày.
            KPI sáng tạo chỉ thông báo, không tạo task tự động.
          </p>
        </div>
      </DarkModal>

      {/* Confirm delete */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Xóa KPI Editor</h3>
            <p className="text-sm text-slate-500">KPI này sẽ bị xóa vĩnh viễn. Bạn có chắc không?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deletingId)}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-60"
              >
                {deleteMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {viewingKpi && (
        <KpiDetailModal kpi={viewingKpi} onClose={() => setViewingKpi(null)} />
      )}
    </div>
  )
}
