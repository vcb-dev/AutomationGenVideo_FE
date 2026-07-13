'use client'

import { useQuery } from '@tanstack/react-query'
import { FileText, Package, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getContentLines, getProductLines } from '@/lib/api/task-auto'
import type { KpiAllocationType } from '@/types/task-auto'

export interface AllocationDraft {
  type: KpiAllocationType
  content_line_id: string
  product_line_id: string
  value: number
}

// ── Allocation section (bảng cho một loại phân bổ) ──────────────────────────

function AllocationSection({
  title, icon, accentColor, progressColor, unit, target,
  lines, draftsByLineId, onUpdate,
}: {
  title: string
  icon: React.ReactNode
  accentColor: string
  progressColor: string
  unit: 'percent' | 'count'
  target: number
  lines: { id: string; name: string }[]
  draftsByLineId: Record<string, number>
  onUpdate: (lineId: string, value: number) => void
}) {
  const total   = Object.values(draftsByLineId).reduce((s, p) => s + (Number(p) || 0), 0)
  const isValid = unit === 'percent' ? (total === 0 || total === 100) : (total === 0 || total === target)
  const pct     = unit === 'percent' ? Math.min(total, 100) : (target > 0 ? Math.min((total / target) * 100, 100) : 0)
  const label   = unit === 'percent' ? `${total}%` : `${total}/${target || 0}`
  const suffix  = unit === 'percent' ? '%' : 'video'

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
            {label}
          </span>
        </div>
      </div>

      {total > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-300', progressColor)} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_120px] bg-gray-50 border-b border-gray-100 px-2 py-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase text-center">#</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Tên</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase text-right pr-2">{unit === 'percent' ? '%' : 'SL'}</span>
        </div>

        {lines.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-400 italic">Chưa có dữ liệu</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {lines.map((l, i) => (
              <div key={l.id} className="grid grid-cols-[28px_1fr_120px] items-center px-2 py-1.5 hover:bg-gray-50 transition-colors">
                <span className="text-xs text-slate-400 text-center font-mono select-none">{i + 1}</span>
                <span className="px-2 text-sm text-slate-700 truncate">{l.name}</span>
                <div className="flex items-center gap-1 pr-1">
                  <input
                    type="number"
                    value={draftsByLineId[l.id] || ''}
                    onChange={e => onUpdate(l.id, Number(e.target.value))}
                    placeholder="0"
                    min={0} max={unit === 'percent' ? 100 : undefined}
                    className="w-0 flex-1 min-w-[48px] text-right text-sm font-semibold text-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded-lg px-2 py-1.5 border border-transparent hover:border-gray-200 focus:border-indigo-400 focus:bg-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-slate-400 shrink-0">{suffix}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {total > 0 && !isValid && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {unit === 'percent'
            ? `Tổng cần bằng 100% (còn thiếu ${100 - total}%)`
            : `Tổng cần bằng ${target} video (${total > target ? `thừa ${total - target}` : `còn thiếu ${target - total}`})`}
        </p>
      )}
    </div>
  )
}

// ── Allocation Form (2 sections side by side) ────────────────────────────────

interface Props {
  allocations: AllocationDraft[]
  onChange: (a: AllocationDraft[]) => void
  /** 'percent' (mặc định, dùng cho TeamKpi) hoặc 'count' (số video cụ thể, dùng cho EditorKpi) */
  mode?: 'percent' | 'count'
  /** Tổng số video sản xuất — mục tiêu cho tuyến nội dung khi mode='count' */
  contentTarget?: number
  /** Tổng số SP đẩy video theo kế hoạch — mục tiêu cho dòng sản phẩm khi mode='count' */
  productTarget?: number
}

export function TeamKpiAllocationForm({ allocations, onChange, mode = 'percent', contentTarget = 0, productTarget = 0 }: Props) {
  const { data: contentLines = [] } = useQuery({ queryKey: ['task-auto', 'content-lines'], queryFn: getContentLines })
  const { data: productLines = [] } = useQuery({ queryKey: ['task-auto', 'product-lines'], queryFn: () => getProductLines() })

  const contentMap: Record<string, number> = {}
  allocations.filter(a => a.type === 'CONTENT_LINE' && a.content_line_id).forEach(a => { contentMap[a.content_line_id] = a.value })

  const productMap: Record<string, number> = {}
  allocations.filter(a => a.type === 'PRODUCT_LINE' && a.product_line_id).forEach(a => { productMap[a.product_line_id] = a.value })

  const updateContent = (lineId: string, value: number) => {
    const exists = allocations.some(a => a.type === 'CONTENT_LINE' && a.content_line_id === lineId)
    onChange(exists
      ? allocations.map(a => (a.type === 'CONTENT_LINE' && a.content_line_id === lineId) ? { ...a, value } : a)
      : [...allocations, { type: 'CONTENT_LINE', content_line_id: lineId, product_line_id: '', value }])
  }

  const updateProduct = (lineId: string, value: number) => {
    const exists = allocations.some(a => a.type === 'PRODUCT_LINE' && a.product_line_id === lineId)
    onChange(exists
      ? allocations.map(a => (a.type === 'PRODUCT_LINE' && a.product_line_id === lineId) ? { ...a, value } : a)
      : [...allocations, { type: 'PRODUCT_LINE', content_line_id: '', product_line_id: lineId, value }])
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AllocationSection
        title="Tuyến nội dung"
        icon={<FileText className="w-4 h-4" />}
        accentColor="text-indigo-500"
        progressColor="bg-indigo-500"
        unit={mode === 'percent' ? 'percent' : 'count'}
        target={contentTarget}
        lines={contentLines}
        draftsByLineId={contentMap}
        onUpdate={updateContent}
      />
      <AllocationSection
        title="Dòng sản phẩm"
        icon={<Package className="w-4 h-4" />}
        accentColor="text-teal-500"
        progressColor="bg-teal-500"
        unit={mode === 'percent' ? 'percent' : 'count'}
        target={productTarget}
        lines={productLines}
        draftsByLineId={productMap}
        onUpdate={updateProduct}
      />
    </div>
  )
}
