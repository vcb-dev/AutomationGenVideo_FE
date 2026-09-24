'use client'

import { FileText, Package, Video } from 'lucide-react'
import { DarkModal } from '@/components/task-auto'
import { cn } from '@/lib/utils'
import { EditorKpi } from '@/types/task-auto'
import { AllocCardSection } from './KpiAllocationCard'
import { PerformanceGoalsReadonly } from './PerformanceGoalsEditor'

/** Các field số THỰC ĐẠT do BE tự tính — không nằm trong form nhập target. */
type KpiActualKey =
  | 'total_actual'
  | 'content_new_actual'
  | 'paast_analyzed_actual'
  | 'content_win_cover_actual'
  | 'product_gmv_actual'
  | 'product_traffic_actual'
  | 'product_profit_actual'
  | 'product_collect_test_win_actual'

export type KpiFormState = Omit<
  EditorKpi,
  'id' | 'set_by_id' | 'created_at' | 'updated_at' | 'user' | 'set_by' | 'team' | 'allocations' | KpiActualKey
>

/** Mỗi dòng chỉ tiêu: `key` = cột target nhập tay, `actualKey` = cột số thực đạt BE tính kèm. */
interface KpiRow {
  key: keyof KpiFormState
  actualKey: KpiActualKey
  label: string
  bold?: boolean
}

export const VIDEO_ROWS: KpiRow[] = [
  { key: 'total_target', actualKey: 'total_actual', label: 'Tổng video sản xuất', bold: true },
]

export const CONTENT_ROWS: KpiRow[] = [
  { key: 'content_new',            actualKey: 'content_new_actual',       label: 'Content mới làm được' },
  { key: 'content_paast_analyzed', actualKey: 'paast_analyzed_actual',    label: 'Content phân tích theo PAAST' },
  { key: 'content_win_cover',      actualKey: 'content_win_cover_actual', label: 'Content win được team cover lại' },
]

export const PRODUCT_ROWS: KpiRow[] = [
  { key: 'product_gmv',     actualKey: 'product_gmv_actual',     label: 'Số sản phẩm GMV' },
  { key: 'product_traffic', actualKey: 'product_traffic_actual', label: 'Số sản phẩm Traffic' },
  { key: 'product_profit',  actualKey: 'product_profit_actual',  label: 'Số sản phẩm Profit' },
  { key: 'product_collect_test_win', actualKey: 'product_collect_test_win_actual', label: 'Số sản phẩm sưu tầm và test win' },
]

/** `actual` undefined = response cũ chưa có field → chỉ hiện mục tiêu, không hiện "0 /". */
function KpiProgress({
  actual,
  target,
  targetClassName,
}: {
  actual?: number
  target: number
  targetClassName: string
}) {
  if (actual === undefined)
    return <span className={cn('font-bold', targetClassName)}>{target}</span>

  const reached = target > 0 && actual >= target
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className={cn('text-lg font-black tabular-nums', reached ? 'text-emerald-600' : 'text-slate-900')}>
        {actual}
      </span>
      <span className="text-sm font-semibold text-slate-400 tabular-nums">/ {target}</span>
      <span className="sr-only">{reached ? 'đã đạt mục tiêu' : 'chưa đạt mục tiêu'}</span>
    </span>
  )
}

interface Props {
  kpi: EditorKpi
  onClose: () => void
}

export function EditorKpiDetailModal({ kpi, onClose }: Props) {
  const monthLabel = kpi.month.replace(/(\d{4})-(\d{2})/, 'Tháng $2/$1')

  const sections: {
    title: string
    icon: typeof Video
    rows: KpiRow[]
    headerColor: string
    borderColor: string
    dividerColor: string
    boldValueClassName: string
  }[] = [
    {
      title: 'Số video sản xuất đạt tiêu chuẩn',
      icon: Video,
      rows: VIDEO_ROWS,
      headerColor: 'bg-orange-400',
      borderColor: 'border-orange-200',
      dividerColor: 'divide-orange-100',
      boldValueClassName: 'text-indigo-700 text-lg',
    },
    {
      title: 'Content',
      icon: FileText,
      rows: CONTENT_ROWS,
      headerColor: 'bg-green-500',
      borderColor: 'border-green-200',
      dividerColor: 'divide-green-100',
      boldValueClassName: 'text-green-700 text-lg',
    },
    {
      title: 'Product',
      icon: Package,
      rows: PRODUCT_ROWS,
      headerColor: 'bg-purple-500',
      borderColor: 'border-purple-200',
      dividerColor: 'divide-purple-100',
      boldValueClassName: 'text-purple-700 text-lg',
    },
  ]

  return (
    <DarkModal
      open
      onClose={onClose}
      title={`Chi tiết KPI — ${kpi.user?.full_name ?? ''}`}
      subtitle={`${monthLabel} · Người đặt: ${kpi.set_by?.full_name ?? '—'}`}
      size="2xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Tổng video',  actual: kpi.total_actual,       target: kpi.total_target, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            { label: 'Content mới', actual: kpi.content_new_actual, target: kpi.content_new,  color: 'bg-sky-50 text-sky-700 border-sky-200' },
            { label: 'SP GMV',      actual: kpi.product_gmv_actual, target: kpi.product_gmv,  color: 'bg-violet-50 text-violet-700 border-violet-200' },
          ].map(({ label, actual, target, color }) => (
            <div key={label} className={cn('flex items-center gap-3 px-5 py-3 rounded-2xl border font-semibold', color)}>
              <span className="text-sm font-medium opacity-70">{label}</span>
              {actual === undefined ? (
                <span className="text-2xl font-black tabular-nums">{target}</span>
              ) : (
                <span className="flex items-baseline gap-1">
                  <span className="text-2xl font-black tabular-nums">{actual}</span>
                  <span className="text-base font-bold tabular-nums opacity-50">/ {target}</span>
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5">
          Mỗi dòng hiển thị <strong className="text-slate-700">số thực đạt / mục tiêu</strong> của tháng.
          Số thực đạt tự tính từ task: video &amp; sản phẩm tính theo task đã duyệt, content tính theo phân
          loại content gắn vào task.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sections.map(section => (
            <div key={section.title} className={cn('rounded-2xl overflow-hidden border', section.borderColor)}>
              <div className={cn('text-white text-sm font-bold px-4 py-3 flex items-center gap-2', section.headerColor)}>
                <section.icon className="w-4 h-4" /> {section.title}
              </div>
              <div className={cn('divide-y', section.dividerColor)}>
                {section.rows.map(r => (
                  <div key={r.key as string} className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                    <span className={cn('text-sm text-slate-600 min-w-0', r.bold && 'font-semibold text-slate-800')}>
                      {r.label}
                    </span>
                    <KpiProgress
                      actual={kpi[r.actualKey]}
                      target={kpi[r.key] as number}
                      targetClassName={r.bold ? section.boldValueClassName : 'text-slate-900 text-base'}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <AllocCardSection
          items={(kpi.allocations ?? []).filter(a => a.type === 'CONTENT_LINE').map(a => ({ value: a.quantity, content_line: a.content_line }))}
          label="Tuyến nội dung"
          icon={<FileText className="w-3.5 h-3.5" />}
          barColor="bg-indigo-500"
          bgColor="bg-indigo-50/50"
          borderColor="border-indigo-100"
          labelColor="text-indigo-600"
          totalColor="text-indigo-700"
          mode="count"
          target={kpi.total_target}
        />

        {kpi.team_id && <PerformanceGoalsReadonly userId={kpi.user_id} teamId={kpi.team_id} month={kpi.month} />}
      </div>
    </DarkModal>
  )
}
