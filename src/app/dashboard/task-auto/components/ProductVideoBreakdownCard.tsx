'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import { DashboardCard, SegmentedControl } from './DashboardUI'
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
// cảm giác 2 card tách rời cho cùng 1 chỉ số. Dùng chung cho Global (toàn hệ thống), Team và Personal
// — cùng shape dữ liệu, chỉ khác where ở BE.

function ProductRow({ p, max }: { p: ProductVideoItem; max: number }) {
  const pct = max > 0 ? Math.max(6, Math.round((p.video_count / max) * 100)) : 0
  return (
    <li className="px-5 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate" title={p.name}>{p.name}</p>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {p.sku ?? '—'}{p.category ? <span className="font-sans"> · {p.category}</span> : null}
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-slate-500">
          <span className="font-bold text-slate-900">{p.video_count}</span> video
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className={`h-full rounded-full ${CATEGORY.product.bar} opacity-70`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}

function ProductListView({ items }: { items: ProductVideoItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
        <Package className="w-8 h-8 mb-2 opacity-40" aria-hidden />
        <p className="text-sm text-slate-500">Chưa có sản phẩm nào được làm video trong kỳ này</p>
      </div>
    )
  }
  const max = Math.max(...items.map(p => p.video_count))
  return (
    <div className="relative flex-1 min-h-0">
      <ul
        tabIndex={0}
        aria-label={`Danh sách ${items.length} sản phẩm có video trong kỳ`}
        className="custom-scrollbar max-h-[288px] overflow-y-auto py-1 divide-y divide-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300"
      >
        {items.map(p => <ProductRow key={p.id} p={p} max={max} />)}
      </ul>
      {items.length > 5 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
      )}
    </div>
  )
}

export function ProductVideoBreakdownCard({ byLine, byProduct, total, scopeLabel, title = 'Sản phẩm được làm video' }: {
  byLine: { category: string; count: number }[]
  byProduct: ProductVideoItem[]
  total: number
  scopeLabel: string
  title?: string
}) {
  const [mode, setMode] = useState<'product' | 'line'>('product')

  return (
    <DashboardCard
      title={title}
      subtitle={`${total} sản phẩm riêng biệt · ${scopeLabel}`}
      right={(
        <SegmentedControl
          size="sm"
          ariaLabel="Cách xem sản phẩm"
          value={mode}
          onChange={setMode}
          options={[{ value: 'product', label: 'Sản phẩm' }, { value: 'line', label: 'Theo dòng' }]}
        />
      )}
      className="flex flex-col"
    >
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
