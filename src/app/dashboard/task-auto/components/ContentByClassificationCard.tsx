'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { FileText } from 'lucide-react'
import {
  CLASSIFICATION_PALETTE,
  UNCLASSIFIED_COLOR,
  UNCLASSIFIED_LABEL,
} from '@/components/dashboard/a5/shared/classification-colors'
import { DashboardCard, PeriodBadge } from './DashboardUI'
import { CATEGORY } from './tokens'

interface ClassificationDatum { classification: string; count: number }

// Số lát tối đa vẽ riêng — vượt quá thì gộp phần còn lại vào "Khác" để donut không rối
// (part-to-whole đọc kém khi > 6 lát). "Chưa phân loại" luôn là 1 lát riêng, xám, xuống cuối.
const MAX_SLICES = 6
const OTHER_LABEL = 'Khác'
const OTHER_COLOR = '#cbd5e1' // slate-300

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0
}

function ClsTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg shadow-slate-900/10">
      <p className="text-xs font-semibold text-slate-800">{d.name}</p>
      <p className="text-xs text-slate-500">{d.value} task · {pct(Number(d.value), total)}%</p>
    </div>
  )
}

/**
 * "Content theo phân loại" — số task có deadline trong kỳ, gộp theo ContentClassification hiện tại
 * của content gắn vào task (BE: getContentByClassification, đã sort count giảm dần + "Chưa phân loại"
 * cuối). Donut + chú thích liệt kê số/% (không dùng nhãn ngoài vành — tên phân loại do người dùng tự
 * đặt, dài ngắn tuỳ ý). Song song với biểu đồ cùng tên ở dashboard admin/leader, chỉ khác `where` ở BE.
 */
export function ContentByClassificationCard({
  data, periodLabel, subtitle = 'Của tôi',
}: {
  data?: ClassificationDatum[]
  periodLabel?: string
  subtitle?: string
}) {
  const rows = (data ?? []).filter(d => d.count > 0)
  const total = rows.reduce((s, d) => s + d.count, 0)

  // Tách "Chưa phân loại" ra, cap các lát còn lại, gộp phần dư vào "Khác".
  const unclassified = rows.find(d => d.classification === UNCLASSIFIED_LABEL)
  const named = rows.filter(d => d.classification !== UNCLASSIFIED_LABEL)
  const head = named.slice(0, MAX_SLICES)
  const tail = named.slice(MAX_SLICES)
  const tailSum = tail.reduce((s, d) => s + d.count, 0)

  const chartData = [
    ...head.map((d, i) => ({
      name: d.classification,
      value: d.count,
      color: CLASSIFICATION_PALETTE[i % CLASSIFICATION_PALETTE.length],
    })),
    ...(tailSum > 0
      ? [{ name: `${OTHER_LABEL} (${tail.length})`, value: tailSum, color: OTHER_COLOR }]
      : []),
    ...(unclassified
      ? [{ name: UNCLASSIFIED_LABEL, value: unclassified.count, color: UNCLASSIFIED_COLOR }]
      : []),
  ]

  const a11yLabel =
    total === 0
      ? 'Chưa có task nào trong kỳ'
      : `Phân bổ ${total} task theo phân loại content: ` +
        chartData.map(d => `${d.name} ${d.value} (${pct(d.value, total)}%)`).join(', ')

  return (
    <DashboardCard
      icon={FileText} iconColor={CATEGORY.content.text} iconBg={CATEGORY.content.bg}
      title="Content theo phân loại"
      subtitle={subtitle}
      right={periodLabel ? <PeriodBadge label={periodLabel} /> : undefined}
      className="flex flex-col"
    >
      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
          <FileText className="w-8 h-8 mb-2 opacity-20" aria-hidden />
          <p className="text-sm">Chưa có task nào trong kỳ này</p>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-5 flex-1 flex flex-col">
          <div
            className="relative mx-auto h-40 w-40 shrink-0"
            role="img"
            aria-label={a11yLabel}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={48} outerRadius={72}
                  paddingAngle={1} dataKey="value"
                  stroke="#fff" strokeWidth={2}
                  startAngle={90} endAngle={-270}
                >
                  {chartData.map(entry => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ClsTooltip total={total} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold leading-none text-slate-900 tabular-nums">{total}</span>
              <span className="text-[11px] text-slate-400">task</span>
            </div>
          </div>

          <ul className="mt-4 flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
            {chartData.map(d => (
              <li key={d.name} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="flex-1 min-w-0 truncate text-slate-600">{d.name}</span>
                <span className="shrink-0 font-bold tabular-nums text-slate-700">{d.value}</span>
                <span className="shrink-0 text-xs tabular-nums text-slate-500">{pct(d.value, total)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  )
}
