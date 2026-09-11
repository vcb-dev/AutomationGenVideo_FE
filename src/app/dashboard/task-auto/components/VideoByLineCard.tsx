'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer, Rectangle } from 'recharts'
import { Clapperboard, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ElementType } from 'react'
import { DashboardCard, PeriodBadge } from './DashboardUI'
import { TONE } from './tokens'

// Mọi cột đều tô cùng tông brand (indigo) — cột dẫn đầu đậm nhất để mắt vẫn bắt được ngay, các cột
// còn lại dùng tint nhạt hơn của CHÍNH tông đó (không rơi về xám trung tính như trước) vì đây là 1
// series duy nhất (số video đã duyệt) trải theo tuyến, không phải nhiều nhóm cần phân biệt danh tính.
const BAR_COLOR_LEADER = TONE.brand.hex // indigo-500
const BAR_COLOR_DEFAULT = '#a5b4fc' // indigo-300
// Cột mờ phía sau (mục tiêu KPI) — cùng tông brand nhưng nhạt hẳn, để cột đậm (số liệu hiện tại)
// đứng trước tự nhiên nổi lên như đang "lấp đầy" cột mờ.
const TRACK_COLOR_LEADER = '#e0e7ff' // indigo-100
const TRACK_COLOR_DEFAULT = '#eef2ff' // indigo-50
// Số mục tiêu in ngay trên đỉnh cột mờ — đậm hơn màu cột mờ để đọc được nhưng vẫn rõ ràng là "phụ"
// so với số liệu hiện tại (đậm, in trên đỉnh cột chính).
const TRACK_LABEL_COLOR = '#818cf8' // indigo-400

// Dùng prop `background` (chuẩn của Recharts, xem BarChartHasBackground example) để vẽ 1 cột mờ
// đứng sau mỗi cột chính, cao theo đúng tỉ lệ `target` trên cùng thang đo với cột chính (domainMax) —
// nhờ vậy 2 cột luôn cùng 1 hệ quy chiếu, không cần tự tính lại scale. Cột chính (Bar dataKey="count")
// tự Recharts vẽ đè lên trên, không cần custom shape riêng. Số target in trên đỉnh cột mờ này luôn
// cao hơn đỉnh cột chính (vì target >= count ở đa số trường hợp) nên không bị cột chính che mất dù
// nằm cùng lớp "background" (thấp hơn z-index cột chính).
function TargetTrack(props: any) {
  const { x, y, width, height, payload, domainMax, isLeader } = props
  const target = payload?.target ?? 0
  if (!target || !domainMax) return null
  const trackHeight = (height * target) / domainMax
  const trackY = y + height - trackHeight
  return (
    <>
      <Rectangle
        x={x} y={trackY} width={width} height={trackHeight}
        radius={[8, 8, 4, 4]}
        fill={isLeader ? TRACK_COLOR_LEADER : TRACK_COLOR_DEFAULT}
      />
      <text
        x={x + width / 2} y={trackY - 6}
        textAnchor="middle"
        style={{ fontSize: 11, fontWeight: 700, fill: TRACK_LABEL_COLOR }}
      >
        {target}
      </text>
    </>
  )
}

interface VideoByLineDatum { line: string; count: number; /** Mục tiêu KPI theo tuyến (0/absent = không hiển thị mẫu số). */ target?: number }

function LineTooltip({ active, payload, itemLabel, unitLabel }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  const { line, count, target } = d.payload as VideoByLineDatum
  const hasTarget = (target ?? 0) > 0
  const pct = hasTarget ? Math.round((count / (target as number)) * 100) : null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg shadow-slate-900/10">
      <p className="text-xs font-semibold text-slate-800">{itemLabel} {line}</p>
      {hasTarget ? (
        <p className="text-xs text-slate-500">
          Đã duyệt <span className="font-semibold text-slate-700">{count}</span> / Mục tiêu{' '}
          <span className="font-semibold text-slate-700">{target}</span>
          <span className="ml-1 text-slate-400">({pct}%)</span>
        </p>
      ) : (
        <p className="text-xs text-slate-500">{count} {unitLabel}</p>
      )}
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
  const rawData = data ?? []
  // Có tuyến nào được phân bổ mục tiêu KPI không → vẽ thêm cột mờ (target) phía sau cột chính
  // (count) thay vì nhãn "đã duyệt/mục tiêu" dạng chữ. Không có mục tiêu ở đâu (vd màn Admin) →
  // giữ nguyên 1 cột + nhãn số như cũ.
  const hasTarget = rawData.some((d) => (d.target ?? 0) > 0)
  const chartData = rawData.map((d) => ({ ...d, barLabel: `${d.count}` }))
  const total = chartData.reduce((s, d) => s + d.count, 0)
  const totalTarget = chartData.reduce((s, d) => s + (d.target ?? 0), 0)
  const top = chartData.reduce<VideoByLineDatum | null>(
    (best, d) => (d.count > 0 && (!best || d.count > best.count) ? d : best), null,
  )
  // Domain cố định (không để Recharts tự suy ra từ mỗi Bar) — phải bao trọn cả target lẫn count vì
  // cột mờ (target) không phải 1 Bar/dataKey riêng, chỉ vẽ qua `background` của cột count nên
  // Recharts không tự tính nó vào domain.
  const domainMax = hasTarget
    ? Math.max(1, ...chartData.map(d => Math.max(d.count, d.target ?? 0))) * 1.15
    : undefined

  // Còn mục tiêu thì vẫn vẽ chart (để thấy các cột 0/target); chỉ báo rỗng khi không có dữ liệu lẫn mục tiêu.
  if (chartData.length === 0 || (total === 0 && totalTarget === 0)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
        <Icon className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-4 pb-5 flex-1 flex flex-col">
      {/* Cao tối thiểu 200px; nở thêm khi card bị kéo cao (grid items-stretch) để lấp hết chiều cao. */}
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
            <XAxis
              dataKey="line"
              tickLine={false}
              axisLine={{ stroke: '#f1f5f9' }}
              tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }}
            />
            <YAxis hide domain={hasTarget ? [0, domainMax as number] : [0, (max: number) => Math.ceil(max * 1.25) || 1]} />
            <Tooltip content={<LineTooltip itemLabel={itemLabel} unitLabel={unitLabel} />} cursor={{ fill: '#f8fafc' }} />
            <Bar
              dataKey="count" radius={[8, 8, 4, 4]} maxBarSize={52}
              background={hasTarget ? (props: any) => (
                <TargetTrack {...props} domainMax={domainMax} isLeader={!!top && props.payload?.line === top.line} />
              ) : undefined}
            >
              <LabelList
                dataKey="barLabel"
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
          Tổng <span className="font-bold text-slate-700">{total}</span>
          {hasTarget && totalTarget > 0 && (
            <span className="text-slate-400">/{totalTarget} mục tiêu</span>
          )}{' '}
          {unitLabel}
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
