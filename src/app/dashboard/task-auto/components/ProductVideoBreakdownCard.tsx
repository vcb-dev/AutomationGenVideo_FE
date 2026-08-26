'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardCard, PeriodBadge } from './DashboardUI'
import { LineBarChart } from './VideoByLineCard'
import { CATEGORY } from './tokens'

export interface ProductVideoItem {
  id: string
  name: string
  sku: string | null
  category: string | null
  video_count: number
}

// ─── Product video breakdown — "Sản phẩm được làm video" ─────────────────────
// Toggle giữa 2 cách xem cùng 1 số liệu (sản phẩm riêng biệt có video trong kỳ): liệt kê từng sản
// phẩm một (mặc định), hoặc gộp theo dòng sản phẩm — dùng chung 1 DashboardCard để 2 view không tạo
// cảm giác 2 card tách rời cho cùng 1 chỉ số. Dùng chung cho Global (toàn hệ thống) và Personal
// (chỉ số của riêng editor đó) — cùng shape dữ liệu, chỉ khác where ở BE.

function ProductRow({ p }: { p: ProductVideoItem }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{p.sku ?? '—'}</p>
      </div>
      <span className="text-sm font-bold text-slate-700 tabular-nums shrink-0">{p.video_count}</span>
    </div>
  )
}

function ProductListView({ items }: { items: ProductVideoItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
        <Package className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm">Chưa có sản phẩm nào được làm video trong kỳ này</p>
      </div>
    )
  }
  return (
    <div className="flex-1 max-h-[280px] overflow-y-auto">
      {items.map(p => <ProductRow key={p.id} p={p} />)}
    </div>
  )
}

export function ProductVideoBreakdownCard({ byLine, byProduct, total, periodLabel, scopeLabel, title = 'Sản phẩm được làm video' }: {
  byLine: { category: string; count: number }[]
  byProduct: ProductVideoItem[]
  total: number
  periodLabel: string
  scopeLabel: string
  title?: string
}) {
  const [mode, setMode] = useState<'product' | 'line'>('product')

  return (
    <DashboardCard
      icon={Package} iconColor={CATEGORY.product.text} iconBg={CATEGORY.product.bg}
      title={title}
      subtitle={`${total} sản phẩm riêng biệt trong kỳ · ${scopeLabel}`}
      right={<PeriodBadge label={periodLabel} />}
      className="flex flex-col"
    >
      <div className="px-5 pt-3">
        <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('product')}
            className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
              mode === 'product' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            Theo sản phẩm
          </button>
          <button
            onClick={() => setMode('line')}
            className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
              mode === 'line' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            Theo dòng
          </button>
        </div>
      </div>

      {mode === 'product' ? (
        <ProductListView items={byProduct} />
      ) : (
        <LineBarChart
          data={byLine.map(l => ({ line: l.category, count: l.count }))}
          icon={Package}
          itemLabel="Dòng" unitLabel="sản phẩm"
          emptyLabel="Chưa có sản phẩm nào được làm video theo dòng"
        />
      )}
    </DashboardCard>
  )
}
