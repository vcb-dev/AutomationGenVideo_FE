'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'
import { Clapperboard, TrendingUp } from 'lucide-react'
import { DashboardCard, PeriodBadge } from './DashboardUI'

// Thang màu indigo → violet đậm dần theo tuyến A1→A5, thể hiện thứ tự tuyến (không chỉ để phân biệt
// màu — nhãn trục X và số trên đỉnh cột đã đủ để đọc dữ liệu không cần màu).
const LINE_COLORS = ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4338ca']

interface VideoByLineDatum { line: string; count: number }

function LineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg shadow-slate-900/10">
      <p className="text-xs font-semibold text-slate-800">Tuyến {d.payload.line}</p>
      <p className="text-xs text-slate-500">{d.value} video đã duyệt</p>
    </div>
  )
}

export function VideoByLineCard({ data, periodLabel, title = 'Video theo tuyến nội dung', subtitle }: {
  data?: VideoByLineDatum[]
  periodLabel?: string
  title?: string
  subtitle?: string
}) {
  const chartData = data ?? []
  const total = chartData.reduce((s, d) => s + d.count, 0)
  const top = chartData.reduce<VideoByLineDatum | null>(
    (best, d) => (d.count > 0 && (!best || d.count > best.count) ? d : best), null,
  )

  return (
    <DashboardCard
      icon={Clapperboard} iconColor="text-teal-600" iconBg="bg-teal-50"
      title={title} subtitle={subtitle}
      right={periodLabel ? <PeriodBadge label={periodLabel} /> : undefined}
      className="flex flex-col"
    >
      {chartData.length === 0 || total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
          <Clapperboard className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm">Chưa có video nào được duyệt theo tuyến</p>
        </div>
      ) : (
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
                <Tooltip content={<LineTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" radius={[8, 8, 4, 4]} maxBarSize={52}>
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fontSize: 13, fontWeight: 800, fill: '#334155' }}
                  />
                  {chartData.map((d, i) => (
                    <Cell key={d.line} fill={LINE_COLORS[i % LINE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <span className="text-xs text-slate-400">
              Tổng <span className="font-bold text-slate-700">{total}</span> video đã duyệt
            </span>
            {top && (
              <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" /> Tuyến {top.line} dẫn đầu
              </span>
            )}
          </div>
        </div>
      )}
    </DashboardCard>
  )
}
