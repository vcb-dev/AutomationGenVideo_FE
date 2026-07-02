'use client'

import { Edit2, FileText, Package, StickyNote, User } from 'lucide-react'
import type { TeamKpi } from '@/types/task-auto'
import { AllocCardSection } from './KpiAllocationCard'

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
                items={content.map(a => ({ value: a.percent, content_line: a.content_line }))}
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
                items={product.map(a => ({ value: a.percent, product_line: a.product_line }))}
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
