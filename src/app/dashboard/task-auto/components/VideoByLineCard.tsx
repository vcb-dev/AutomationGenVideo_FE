'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'
import { Clapperboard, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ElementType } from 'react'
import { DashboardCard, PeriodBadge } from './DashboardUI'
import { TONE } from './tokens'

// Chỉ tô đậm cột dẫn đầu (brand color), các cột còn lại dùng 1 màu xám nhạt trung tính — nhãn trục X
// và số trên đỉnh cột đã đủ để đọc dữ liệu từng cột, màu chỉ dùng để mắt bắt ngay cột cao nhất.
const BAR_COLOR_LEADER = TONE.brand.hex
const BAR_COLOR_DEFAULT = '#cbd5e1' // slate-300

interface VideoByLineDatum { line: string; count: number }

function LineTooltip({ active, payload, itemLabel, unitLabel }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg shadow-slate-900/10">
      <p className="text-xs font-semibold text-slate-800">{itemLabel} {d.payload.line}</p>
      <p className="text-xs text-slate-500">{d.value} {unitLabel}</p>
    </div>
  )
}

interface LineBarChartProps {
  data?: VideoByLineDatum[]
  icon?: ElementType
  itemLabel?: string
  unitLabel?: string
  emptyLabel?: string
  leaderSuffix?: string
}

/**
 * Nội dung bar chart "N theo tuyến/dòng" — KHÔNG bọc DashboardCard, để tái dùng được cả trong
 * VideoByLineCard (card riêng) lẫn bên trong 1 card khác đã có toggle nhiều chế độ xem (vd
 * ProductVideoBreakdownCard: "Theo sản phẩm" | "Theo dòng").
 */
export function LineBarChart({
  data, icon: Icon = Clapperboard,
  itemLabel = 'Tuyến', unitLabel = 'video đã duyệt',
  emptyLabel = 'Chưa có video nào được duyệt theo tuyến',
  leaderSuffix = 'dẫn đầu',
}: LineBarChartProps) {
  const chartData = data ?? []
  const total = chartData.reduce((s, d) => s + d.count, 0)
  const top = chartData.reduce<VideoByLineDatum | null>(
    (best, d) => (d.count > 0 && (!best || d.count > best.count) ? d : best), null,
  )

  if (chartData.length === 0 || total === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
        <Icon className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-4 pb-5 flex-1 flex flex-col">
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
            <XAxis
              dataKey="line"
              tickLine={false}
              axisLine={{ stroke: '#f1f5f9' }}
              tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }}
            />
            <YAxis hide domain={[0, (max: number) => Math.ceil(max * 1.25) || 1]} />
            <Tooltip content={<LineTooltip itemLabel={itemLabel} unitLabel={unitLabel} />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="count" radius={[8, 8, 4, 4]} maxBarSize={52}>
              <LabelList
                dataKey="count"
                position="top"
                style={{ fontSize: 13, fontWeight: 800, fill: '#334155' }}
              />
              {chartData.map(d => (
                <Cell key={d.line} fill={top && d.line === top.line ? BAR_COLOR_LEADER : BAR_COLOR_DEFAULT} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
        <span className="text-xs text-slate-400">
          Tổng <span className="font-bold text-slate-700">{total}</span> {unitLabel}
        </span>
        {top && (
          <span className={cn('flex items-center gap-1 text-xs font-semibold', TONE.brand.text)}>
            <TrendingUp className="w-3.5 h-3.5" /> {itemLabel} {top.line} {leaderSuffix}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Card đầy đủ (DashboardCard + LineBarChart) — mặc định hiển thị "video theo tuyến nội dung" (call
 * site gốc), nhưng có thể tái dùng cho các breakdown khác (vd "video theo dòng sản phẩm") qua
 * icon/itemLabel/unitLabel — chỉ cần map dữ liệu về đúng shape { line, count }.
 */
export function VideoByLineCard({
  data, periodLabel, title = 'Video theo tuyến nội dung', subtitle,
  icon = Clapperboard, iconColor = 'text-teal-600', iconBg = 'bg-teal-50',
  itemLabel = 'Tuyến', unitLabel = 'video đã duyệt',
  emptyLabel = 'Chưa có video nào được duyệt theo tuyến',
  leaderSuffix = 'dẫn đầu',
}: {
  data?: VideoByLineDatum[]
  periodLabel?: string
  title?: string
  subtitle?: string
  icon?: ElementType
  iconColor?: string
  iconBg?: string
  itemLabel?: string
  unitLabel?: string
  emptyLabel?: string
  leaderSuffix?: string
}) {
  return (
    <DashboardCard
      icon={icon} iconColor={iconColor} iconBg={iconBg}
      title={title} subtitle={subtitle}
      right={periodLabel ? <PeriodBadge label={periodLabel} /> : undefined}
      className="flex flex-col"
    >
      <LineBarChart data={data} icon={icon} itemLabel={itemLabel} unitLabel={unitLabel} emptyLabel={emptyLabel} leaderSuffix={leaderSuffix} />
    </DashboardCard>
  )
}
