'use client'

import { Edit2, FileText, Package, AlertCircle, CheckCircle2, StickyNote, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TeamKpi, TeamKpiAllocation } from '@/types/task-auto'

// ── Allocation display card section ──────────────────────────────────────────

function AllocCardSection({
  items, label, icon,
  barColor, bgColor, borderColor, labelColor, totalColor,
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
  const total   = items.reduce((s, a) => s + a.percent, 0)
  const isValid = total === 100

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', bgColor, borderColor)}>
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

// ── KPI Team Card ─────────────────────────────────────────────────────────────

interface Props {
  kpi: TeamKpi
  canEdit: boolean
  onEdit: () => void
}

export function TeamKpiCard({ kpi, canEdit, onEdit }: Props) {
  const content  = (kpi.allocations ?? []).filter(a => a.type === 'CONTENT_LINE')
  const product  = (kpi.allocations ?? []).filter(a => a.type === 'PRODUCT_LINE')
  const hasAlloc = content.length > 0 || product.length > 0

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
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

      {kpi.note && (
        <div className="flex items-start gap-2 px-5 py-3 border-b border-gray-100 bg-amber-50/40">
          <StickyNote className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600">{kpi.note}</p>
        </div>
      )}

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
