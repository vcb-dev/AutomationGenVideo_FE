'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, Loader2, FileText, Package, AlertCircle, CheckCircle2, StickyNote, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal, DarkInput, EmptyState, CustomSelect } from '@/components/task-auto'
import {
  getTeamKpis, createTeamKpi, updateTeamKpi,
  getTeams, getContentLines, getProductLines,
} from '@/lib/api/task-auto'
import { KpiAllocationType, TeamKpi, TeamKpiAllocation } from '@/types/task-auto'

interface AllocationDraft {
  type: KpiAllocationType
  content_line_id: string
  product_line_id: string
  percent: number
}

// ── Allocation Section (một bảng cho một loại phân bổ) ──────────────────────

interface AllocSectionProps {
  title: string
  icon: React.ReactNode
  accentColor: string
  progressColor: string
  type: KpiAllocationType
  allocations: AllocationDraft[]
  lines: { id: string; name: string }[]
  onAdd: () => void
  onRemove: (localIdx: number) => void
  onUpdate: (localIdx: number, patch: Partial<AllocationDraft>) => void
}

function AllocationSection({
  title, icon, accentColor, progressColor,
  lines, draftsByLineId, onUpdate,
}: {
  title: string
  icon: React.ReactNode
  accentColor: string
  progressColor: string
  lines: { id: string; name: string }[]
  draftsByLineId: Record<string, number>
  onUpdate: (lineId: string, percent: number) => void
}) {
  const total = Object.values(draftsByLineId).reduce((s, p) => s + (Number(p) || 0), 0)
  const isValid = total === 0 || total === 100
  const pct = Math.min(total, 100)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={accentColor}>{icon}</span>
          <h4 className="text-sm font-bold text-slate-800">{title}</h4>
          <span className="text-xs text-slate-400">({lines.length} mục)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {total > 0 && (
            isValid
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span className={cn(
            'text-xs font-bold px-2.5 py-1 rounded-full',
            total === 0
              ? 'bg-gray-100 text-slate-400'
              : isValid
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-600'
          )}>
            {total}%
          </span>
        </div>
      </div>

      {total > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-300', progressColor)} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_80px] bg-gray-50 border-b border-gray-100 px-2 py-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase text-center">#</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Tên</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase text-right pr-2">%</span>
        </div>

        {lines.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-400 italic">Chưa có dữ liệu</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {lines.map((l, i) => (
              <div key={l.id} className="grid grid-cols-[28px_1fr_80px] items-center px-2 py-1.5 hover:bg-gray-50 transition-colors">
                <span className="text-xs text-slate-400 text-center font-mono select-none">{i + 1}</span>
                <span className="px-2 text-sm text-slate-700 truncate">{l.name}</span>
                <div className="flex items-center gap-0.5 pr-1">
                  <input
                    type="number"
                    value={draftsByLineId[l.id] || ''}
                    onChange={e => onUpdate(l.id, Number(e.target.value))}
                    placeholder="0"
                    min={0} max={100}
                    className="w-full text-right text-sm font-semibold text-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded-lg px-2 py-1.5 border border-transparent hover:border-gray-200 focus:border-indigo-400 focus:bg-white transition-colors"
                  />
                  <span className="text-xs text-slate-400 shrink-0">%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {total > 0 && !isValid && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Tổng cần bằng 100% (còn thiếu {100 - total}%)
        </p>
      )}
    </div>
  )
}

// ── Allocation Form (2 sections side by side) ────────────────────────────────

function AllocationForm({ allocations, onChange }: { allocations: AllocationDraft[]; onChange: (a: AllocationDraft[]) => void }) {
  const { data: contentLines = [] } = useQuery({ queryKey: ['task-auto', 'content-lines'], queryFn: getContentLines })
  const { data: productLines = [] } = useQuery({ queryKey: ['task-auto', 'product-lines'], queryFn: () => getProductLines() })

  const contentMap: Record<string, number> = {}
  allocations.filter(a => a.type === 'CONTENT_LINE' && a.content_line_id).forEach(a => { contentMap[a.content_line_id] = a.percent })

  const productMap: Record<string, number> = {}
  allocations.filter(a => a.type === 'PRODUCT_LINE' && a.product_line_id).forEach(a => { productMap[a.product_line_id] = a.percent })

  const updateContent = (lineId: string, percent: number) => {
    const exists = allocations.some(a => a.type === 'CONTENT_LINE' && a.content_line_id === lineId)
    onChange(exists
      ? allocations.map(a => (a.type === 'CONTENT_LINE' && a.content_line_id === lineId) ? { ...a, percent } : a)
      : [...allocations, { type: 'CONTENT_LINE', content_line_id: lineId, product_line_id: '', percent }])
  }

  const updateProduct = (lineId: string, percent: number) => {
    const exists = allocations.some(a => a.type === 'PRODUCT_LINE' && a.product_line_id === lineId)
    onChange(exists
      ? allocations.map(a => (a.type === 'PRODUCT_LINE' && a.product_line_id === lineId) ? { ...a, percent } : a)
      : [...allocations, { type: 'PRODUCT_LINE', content_line_id: '', product_line_id: lineId, percent }])
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AllocationSection
        title="Tuyến nội dung"
        icon={<FileText className="w-4 h-4" />}
        accentColor="text-indigo-500"
        progressColor="bg-indigo-500"
        lines={contentLines}
        draftsByLineId={contentMap}
        onUpdate={updateContent}
      />
      <AllocationSection
        title="Dòng sản phẩm"
        icon={<Package className="w-4 h-4" />}
        accentColor="text-teal-500"
        progressColor="bg-teal-500"
        lines={productLines}
        draftsByLineId={productMap}
        onUpdate={updateProduct}
      />
    </div>
  )
}
// ── Allocation display card section ─────────────────────────────────────────

function AllocCardSection({
  items,
  label,
  icon,
  barColor,
  bgColor,
  borderColor,
  labelColor,
  totalColor,
}: {
  items: TeamKpiAllocation[]
  label: string
  icon: React.ReactNode
  barColor: string
  bgColor: string
  borderColor: string
  labelColor: string
  totalColor: string
}) {
  const total = items.reduce((s, a) => s + a.percent, 0)
  const isValid = total === 100

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', bgColor, borderColor)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={labelColor}>{icon}</span>
          <span className={cn('text-xs font-bold uppercase tracking-wider', labelColor)}>{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isValid
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          }
          <span className={cn(
            'text-xs font-black px-2 py-0.5 rounded-full',
            isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          )}>
            {total}%
          </span>
        </div>
      </div>

      {/* Allocation rows */}
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-2">Chưa có phân bổ</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((a, i) => {
            const name = a.content_line?.name ?? a.product_line?.name ?? '—'
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700 truncate">{name}</span>
                  <span className={cn('text-sm font-black shrink-0', totalColor)}>{a.percent}%</span>
                </div>
                <div className="h-2 bg-white/70 rounded-full overflow-hidden border border-black/5">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${a.percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── KPI Team Card ────────────────────────────────────────────────────────────

function TeamKpiCard({ kpi, canEdit, onEdit }: { kpi: TeamKpi; canEdit: boolean; onEdit: () => void }) {
  const content = (kpi.allocations ?? []).filter(a => a.type === 'CONTENT_LINE')
  const product = (kpi.allocations ?? []).filter(a => a.type === 'PRODUCT_LINE')
  const hasAlloc = content.length > 0 || product.length > 0

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-black text-indigo-700">
              {kpi.team?.name?.charAt(0)?.toUpperCase() ?? 'T'}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-base leading-tight">{kpi.team?.name ?? '—'}</p>
            {kpi.created_by && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                {kpi.created_by.full_name}
              </p>
            )}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={onEdit}
            className="p-2 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Chỉnh sửa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Note */}
      {kpi.note && (
        <div className="flex items-start gap-2 px-5 py-3 border-b border-gray-100 bg-amber-50/40">
          <StickyNote className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600">{kpi.note}</p>
        </div>
      )}

      {/* Allocation sections */}
      <div className="p-4">
        {!hasAlloc ? (
          <div className="py-4 text-center">
            <p className="text-sm text-slate-400 italic">Chưa có phân bổ KPI</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {content.length > 0 && (
              <AllocCardSection
                items={content}
                label="Tuyến nội dung"
                icon={<FileText className="w-3.5 h-3.5" />}
                barColor="bg-indigo-500"
                bgColor="bg-indigo-50/50"
                borderColor="border-indigo-100"
                labelColor="text-indigo-600"
                totalColor="text-indigo-700"
              />
            )}
            {product.length > 0 && (
              <AllocCardSection
                items={product}
                label="Dòng sản phẩm"
                icon={<Package className="w-3.5 h-3.5" />}
                barColor="bg-teal-500"
                bgColor="bg-teal-50/50"
                borderColor="border-teal-100"
                labelColor="text-teal-600"
                totalColor="text-teal-700"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Loading skeleton cards ───────────────────────────────────────────────────

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

interface Props {
  month: string
  canEdit: boolean
  userId?: string
  isAdminOrManager?: boolean
  selectedTeamId: string
  onTeamChange: (id: string) => void
}

export function TeamKpiTab({ month, canEdit, userId, isAdminOrManager, selectedTeamId, onTeamChange }: Props) {
  const qc = useQueryClient()
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [editing, setEditing] = useState<TeamKpi | null>(null)
  const [form, setForm] = useState({ team_id: '', month, note: '' })
  const [allocations, setAllocations] = useState<AllocationDraft[]>([])

  const { data: teamKpis, isLoading } = useQuery({
    queryKey: ['task-auto', 'team-kpis', month],
    queryFn: () => getTeamKpis(month),
  })
  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  // For non-admin/manager: auto-detect own team and report upward
  const myTeam = !isAdminOrManager && userId
    ? teams?.find(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))
    : undefined

  useEffect(() => {
    if (myTeam?.id && !isAdminOrManager) {
      onTeamChange(myTeam.id)
    }
  }, [myTeam?.id, isAdminOrManager])

  // Filter KPIs to show only selected/own team
  const effectiveTeamId = isAdminOrManager ? selectedTeamId : (myTeam?.id ?? '')
  const visibleKpis = effectiveTeamId
    ? (teamKpis ?? []).filter(k => k.team_id === effectiveTeamId)
    : []

  const createMut = useMutation({
    mutationFn: createTeamKpi,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'team-kpis'] }); toast.success('Đã thêm KPI team'); setModal(null) },
    onError: () => toast.error('Không thể thêm KPI team'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<TeamKpi> }) => updateTeamKpi(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'team-kpis'] }); toast.success('Đã cập nhật KPI team'); setModal(null) },
    onError: () => toast.error('Không thể cập nhật KPI team'),
  })

  const openCreate = () => { setForm({ team_id: '', month, note: '' }); setAllocations([]); setEditing(null); setModal('create') }
  const openEdit = (kpi: TeamKpi) => {
    setForm({ team_id: kpi.team_id, month: kpi.month, note: kpi.note ?? '' })
    setAllocations((kpi.allocations ?? []).map(a => ({
      type: a.type,
      content_line_id: a.content_line_id ?? '',
      product_line_id: a.product_line_id ?? '',
      percent: a.percent,
    })))
    setEditing(kpi)
    setModal('edit')
  }

  const handleSubmit = () => {
    if (!form.team_id) return toast.error('Chọn team')
    if (!form.month) return toast.error('Chọn tháng')
    const contentAllocs = allocations.filter(a => a.type === 'CONTENT_LINE')
    const productAllocs = allocations.filter(a => a.type === 'PRODUCT_LINE')
    const contentTotal = contentAllocs.reduce((s, a) => s + (Number(a.percent) || 0), 0)
    const productTotal = productAllocs.reduce((s, a) => s + (Number(a.percent) || 0), 0)
    if (contentAllocs.length > 0 && contentTotal !== 100) return toast.error(`Tuyến nội dung tổng phải bằng 100% (hiện ${contentTotal}%)`)
    if (productAllocs.length > 0 && productTotal !== 100) return toast.error(`Dòng sản phẩm tổng phải bằng 100% (hiện ${productTotal}%)`)
    const body = {
      ...form,
      note: form.note || null,
      allocations: allocations
      .filter(a => Number(a.percent) > 0)
      .map(a => ({
        type: a.type,
        content_line_id: a.type === 'CONTENT_LINE' ? (a.content_line_id || null) : null,
        product_line_id: a.type === 'PRODUCT_LINE' ? (a.product_line_id || null) : null,
        percent: Number(a.percent),
      })),
    }
    if (modal === 'create') createMut.mutate(body as Partial<TeamKpi>)
    else if (editing) updateMut.mutate({ id: editing.id, body: body as Partial<TeamKpi> })
  }

  const saving = createMut.isPending || updateMut.isPending
  const formatMonth = (yyyymm: string) => { const [y, m] = yyyymm.split('-'); return `Tháng ${m}/${y}` }

  return (
    <div>
      {/* Toolbar: team selector (admin/manager) + add button */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {isAdminOrManager && (
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
            <CustomSelect
              value={selectedTeamId}
              onChange={onTeamChange}
              options={[
                { value: '', label: 'Chọn team để xem KPI' },
                ...(teams?.map(t => ({ value: t.id, label: t.name })) ?? []),
              ]}
              className="min-w-[220px]"
              searchable
            />
          </div>
        )}
        {!isAdminOrManager && myTeam && (
          <p className="text-sm text-slate-500">
            KPI team <span className="font-semibold text-slate-700">{myTeam.name}</span>
          </p>
        )}
        {canEdit && effectiveTeamId && (
          <button
            onClick={openCreate}
            className="ml-auto flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm KPI Team
          </button>
        )}
      </div>

      {/* No team selected yet (admin/manager) */}
      {isAdminOrManager && !effectiveTeamId ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <EmptyState title="Chọn một team để xem KPI" />
        </div>
      ) : isLoading ? (
        <LoadingCards />
      ) : visibleKpis.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <EmptyState title={`Không có KPI team nào trong ${formatMonth(month)}`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleKpis.map(kpi => (
            <TeamKpiCard
              key={kpi.id}
              kpi={kpi}
              canEdit={canEdit}
              onEdit={() => openEdit(kpi)}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <DarkModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Thêm KPI Team' : 'Chỉnh sửa KPI Team'}
        size="xl"
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {modal === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div className="space-y-6">

          {/* ── Team + Tháng ── */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Thông tin chung
            </p>
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                label="Team *"
                value={form.team_id}
                onChange={v => setForm(f => ({ ...f, team_id: v }))}
                options={[
                  { value: '', label: '-- Chọn team --' },
                  ...(teams?.map(t => ({ value: t.id, label: t.name })) ?? []),
                ]}
                searchable
              />
              <DarkInput
                label="Tháng *"
                type="month"
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Ghi chú</label>
              <textarea
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                rows={2}
                placeholder="Nhập ghi chú (tuỳ chọn)..."
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
              />
            </div>
          </div>

          {/* ── Phân bổ ── */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Phân bổ KPI
              <span className="text-gray-300 font-normal normal-case tracking-normal">(mỗi nhóm độc lập = 100%)</span>
            </p>
            <AllocationForm allocations={allocations} onChange={setAllocations} />
          </div>

        </div>
      </DarkModal>
    </div>
  )
}
