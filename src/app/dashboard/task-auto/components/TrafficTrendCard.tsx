'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer,
} from 'recharts'
import { ChevronRight, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTrafficTrend, type TrafficTrend, type TrafficTrendDay } from '@/lib/api/task-auto'
import { DashboardCard } from './DashboardUI'
import { TONE } from './tokens'

// Biểu đồ "Tổng traffic từ đầu tháng" — dựng từ lịch sử báo cáo traffic nhập tay (traffic_reports), xem
// GET /task-auto/traffic-trend. Số người dùng nhập là LUỸ KẾ TỪ ĐẦU THÁNG nên biểu đồ vẽ thẳng số đó;
// phần "tăng thêm" từng ngày (chênh luỹ kế, BE đã tính) chỉ còn ở số tóm tắt, tooltip và bảng.

/** 1 series duy nhất → 1 màu brand; ngày có báo cáo bù phân biệt bằng HÌNH (vòng rỗng), không bằng màu. */
const LINE = TONE.brand.hex
const SURFACE = '#ffffff'

/** Đánh dấu vòng rỗng khi phần lớn mức tăng của ngày là báo cáo bù — nhiều người nộp cách ngày nên
 * gần như ngày nào cũng có chút bù; đánh dấu hết thì dấu hiệu mất nghĩa. Tooltip vẫn ghi mọi phần bù. */
const isMostlyCatchUp = (d: TrafficTrendDay) => d.catch_up > 0 && d.catch_up * 2 >= (d.daily ?? 0)

const compactFmt = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })
const compact = (n: number) => compactFmt.format(n)
const full = (n: number) => n.toLocaleString('vi-VN')

function toLocalDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
// Ngày lịch theo giờ máy — không dùng toISOString() (đổi sang UTC sẽ lùi 1 ngày ở VN).
const shiftDay = (iso: string, delta: number) => {
  const d = toLocalDate(iso)
  d.setDate(d.getDate() + delta)
  return d.toLocaleDateString('en-CA')
}
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const longDate = (iso: string) => {
  const s = toLocalDate(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

// Tra điểm theo NGÀY (label) chứ không theo payload: Recharts bỏ series có giá trị null khỏi payload,
// nên rê vào ngày chưa ai báo cáo sẽ không có gì để hiện.
function TrendTooltip({ active, label, days }: any) {
  const d = active ? (days as TrafficTrendDay[]).find(p => p.date === label) : undefined
  if (!d) return null
  return (
    <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg shadow-slate-900/10">
      <p className="text-xs font-semibold text-slate-800">{longDate(d.date)}</p>
      {d.reporters === 0 ? (
        <p className="mt-1 text-xs text-slate-500">Chưa có ai báo cáo ngày này</p>
      ) : (
        <>
          <p className="mt-1.5 flex items-center gap-2">
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: LINE }} aria-hidden />
            <span className="text-sm font-bold text-slate-900 tabular-nums">{full(d.cumulative ?? 0)}</span>
            <span className="text-xs text-slate-500">tổng từ đầu tháng</span>
          </p>
          <p className="mt-0.5 pl-5 text-xs text-slate-500 tabular-nums">Tăng thêm trong ngày: {full(d.daily ?? 0)}</p>
          {d.catch_up > 0 && (
            <p className="mt-1 pl-5 text-[11px] leading-4 text-slate-600">
              ○ Trong đó <span className="font-semibold tabular-nums">{full(d.catch_up)}</span> là báo cáo bù cho những ngày trước
            </p>
          )}
          <p className="mt-1 pl-5 text-[11px] text-slate-500">{d.reporters} người đã báo cáo</p>
        </>
      )}
    </div>
  )
}

// ─── Sparkline (cột tách theo team / thành viên) ──────────────────────────────

function Sparkline({ values, width = 72, height = 24 }: { values: (number | null)[]; width?: number; height?: number }) {
  const max = Math.max(0, ...values.map(v => v ?? 0))
  if (values.length < 2 || max === 0) return <span className="block" style={{ width, height }} aria-hidden />
  const step = width / (values.length - 1)
  const y = (v: number) => height - 2 - (v / max) * (height - 4)
  // Ngày không báo cáo nối thẳng qua — cùng quy ước với biểu đồ lớn.
  const pts = values.flatMap((v, i) => (v == null ? [] : [[i * step, y(v)] as const]))
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block shrink-0 overflow-visible" aria-hidden>
      {pts.length === 1 ? (
        <circle cx={pts[0][0]} cy={pts[0][1]} r={1.75} fill="#818cf8" />
      ) : (
        <polyline
          points={pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ')}
          fill="none" stroke="#818cf8" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
        />
      )}
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface TrafficDrillTarget {
  kind: 'team' | 'member'
  id: string
}

interface TrafficTrendCardProps {
  /** Bộ lọc ngày của trang ("YYYY-MM-DD"). Chọn đúng 1 ngày → vẽ 7 ngày tới ngày đó, đánh dấu ngày chọn. */
  from: string
  to: string
  /** Khoan sâu — chỉ ADMIN/MANAGER (team + thành viên) và LEADER (thành viên) có tác dụng, BE tự khoá theo role. */
  teamId?: string
  assigneeId?: string
  /** Bấm 1 dòng trong cột "Theo team / Theo thành viên" → đổi bộ lọc trang về team/người đó. */
  onDrill?: (target: TrafficDrillTarget) => void
  className?: string
}

export function TrafficTrendCard({ from, to, teamId, assigneeId, onDrill, className }: TrafficTrendCardProps) {
  // 1 điểm thì không thành đường — chọn 1 ngày thì lấy thêm 6 ngày trước làm bối cảnh.
  const focusDay = from === to ? to : null
  const queryFrom = focusDay ? shiftDay(to, -6) : from

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['task-auto', 'traffic-trend', queryFrom, to, teamId ?? '', assigneeId ?? ''],
    queryFn: () => getTrafficTrend({ date_from: queryFrom, date_to: to, team_id: teamId || undefined, assignee_id: assigneeId || undefined }),
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
  })

  const subtitle = focusDay
    ? `Mỗi điểm là tổng traffic từ ngày 1 tới ngày đó · 7 ngày tới ${dayMonth(focusDay)}`
    : 'Mỗi điểm là tổng traffic từ ngày 1 tới ngày đó, theo báo cáo hằng ngày'

  return (
    <DashboardCard
      title="Tổng traffic từ đầu tháng"
      subtitle={subtitle}
      className={cn('flex flex-col', className)}
    >
      {isLoading || !data ? (
        <div className="flex-1 p-5" aria-busy="true" aria-label="Đang tải traffic">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse motion-reduce:animate-none" />)}
          </div>
          <div className="mt-4 h-[240px] rounded-xl bg-slate-50 animate-pulse motion-reduce:animate-none" />
        </div>
      ) : (
        <div
          aria-busy={isPlaceholderData}
          className={cn('flex flex-1 flex-col transition-opacity duration-200', isPlaceholderData && 'opacity-60')}
        >
          <TrendBody data={data} focusDay={focusDay} onDrill={onDrill} />
        </div>
      )}
    </DashboardCard>
  )
}

function TrendBody({ data, focusDay, onDrill }: {
  data: TrafficTrend; focusDay: string | null; onDrill?: (t: TrafficDrillTarget) => void
}) {
  const days = data.days
  if (data.summary.reported_days === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 py-14 text-center">
        <TrendingUp className="mb-1 h-8 w-8 text-slate-300" aria-hidden />
        <p className="text-sm font-semibold text-slate-600">Chưa có báo cáo traffic nào trong khoảng ngày này</p>
        <p className="text-xs text-slate-500">Số của mỗi ngày thường được báo cáo vào sáng hôm sau</p>
      </div>
    )
  }

  const reported = days.filter(d => d.reporters > 0)
  const lastReported = reported[reported.length - 1]
  const hasCatchUp = days.some(isMostlyCatchUp)
  const hasGaps = days.some(d => d.reporters === 0)
  // Sang tháng mới luỹ kế về 0 — đánh dấu để đường tụt xuống không bị đọc thành traffic giảm.
  const monthStart = days.find((d, i) => i > 0 && d.date.endsWith('-01'))?.date
  const focusIdx = focusDay ? days.findIndex(d => d.date === focusDay) : -1
  const focus = focusIdx >= 0 ? days[focusIdx] : null
  const rangeLabel = `${dayMonth(days[0].date)}–${dayMonth(days[days.length - 1].date)}`
  const avgPerDay = Math.round(data.summary.daily_sum / data.summary.reported_days)
  const avgSub = `Tính trên ${reported.length}/${days.length} ngày có người báo cáo`
  const cumulativeSub = lastReported ? `Tính tới hết ngày ${dayMonth(lastReported.date)}` : undefined

  const stats = focusDay
    ? [
        // Ngày chọn chưa ai báo cáo (thường là hôm nay) → vẫn hiện luỹ kế của lần báo cáo gần nhất.
        { label: 'Tổng từ đầu tháng', value: focus?.cumulative ?? lastReported?.cumulative, sub: cumulativeSub },
        {
          label: `Tăng thêm ngày ${dayMonth(focusDay)}`,
          value: focus?.daily,
          sub: focus?.reporters ? `${focus.reporters} người đã báo cáo` : 'Chưa có ai báo cáo',
        },
        { label: 'Trung bình mỗi ngày (7 ngày qua)', value: avgPerDay, sub: avgSub },
      ]
    : [
        { label: 'Tổng từ đầu tháng', value: data.summary.latest_cumulative, sub: cumulativeSub },
        { label: `Tăng thêm ${rangeLabel}`, value: data.summary.daily_sum, sub: `${data.summary.reporters} người đã báo cáo` },
        { label: 'Trung bình mỗi ngày', value: avgPerDay, sub: avgSub },
      ]

  const a11ySummary =
    `Tổng traffic từ đầu tháng, từ ngày ${dayMonth(days[0].date)} đến ${dayMonth(days[days.length - 1].date)}` +
    (lastReported ? `, mới nhất ${full(lastReported.cumulative ?? 0)} ngày ${dayMonth(lastReported.date)}` : '') +
    `. Xem bảng số liệu bên dưới để đọc từng ngày.`

  const breakdown = data.breakdown_kind ? data.breakdown : []

  return (
    <div className={cn('grid flex-1 grid-cols-1', breakdown.length > 0 && 'lg:grid-cols-3')}>
      <div className={cn('flex min-w-0 flex-col', breakdown.length > 0 && 'lg:col-span-2')}>
        {/* ── Số tóm tắt ── */}
        <dl className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          {stats.map(s => (
            <div key={s.label} className="min-w-0 px-4 py-3 first:pl-5">
              <dt className="line-clamp-2 text-xs font-semibold leading-4 text-slate-500">{s.label}</dt>
              <dd
                className="mt-1 text-xl font-bold leading-none tracking-tight text-slate-900"
                title={s.value != null ? full(s.value) : undefined}
              >
                {s.value != null ? compact(s.value) : '—'}
              </dd>
              {s.sub && <dd className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{s.sub}</dd>}
            </div>
          ))}
        </dl>

        {/* ── Biểu đồ ── */}
        <div className="px-3 pt-4 sm:px-4">
          <div className="h-[240px]" role="img" aria-label={a11ySummary}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={days} margin={{ top: 20, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={dayMonth}
                  minTickGap={18}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  // Ngày đang chọn tô đậm ngay trên trục — nhãn chữ cạnh đường mốc bị cắt khi ngày đó nằm sát mép phải.
                  tick={focusDay
                    ? (t: any) => {
                        const on = t.payload.value === focusDay
                        return (
                          <text x={t.x} y={t.y} dy="0.71em" textAnchor="middle" fontSize={11} fontWeight={on ? 700 : 400} fill={on ? '#4338ca' : '#64748b'}>
                            {dayMonth(t.payload.value)}
                          </text>
                        )
                      }
                    : { fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickFormatter={compact}
                  width={52}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <Tooltip content={<TrendTooltip days={days} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                {monthStart && <ReferenceLine x={monthStart} stroke="#cbd5e1" strokeDasharray="3 3" />}
                {focusDay && <ReferenceLine x={focusDay} stroke="#a5b4fc" />}
                {/* Ngày chưa ai báo cáo: luỹ kế vẫn giữ số cũ nên nối thẳng qua thay vì để đứt. */}
                <Area
                  dataKey="cumulative" type="linear" stroke="none" fill={LINE} fillOpacity={0.08}
                  connectNulls isAnimationActive={false} activeDot={false}
                />
                <Line
                  dataKey="cumulative" type="linear" stroke={LINE} strokeWidth={2}
                  strokeLinejoin="round" strokeLinecap="round"
                  connectNulls isAnimationActive={false}
                  dot={(p: any) => {
                    const pt = p.payload as TrafficTrendDay
                    if (p.cx == null || p.cy == null || pt.cumulative == null) return <g key={`d-${p.index}`} />
                    if (isMostlyCatchUp(pt))
                      return <circle key={`d-${p.index}`} cx={p.cx} cy={p.cy} r={4} fill={SURFACE} stroke={LINE} strokeWidth={2} />
                    // Cả kỳ chỉ 1 ngày có số thì không có đường để nối — vẽ chấm để còn thấy.
                    if (reported.length === 1)
                      return <circle key={`d-${p.index}`} cx={p.cx} cy={p.cy} r={4} fill={LINE} stroke={SURFACE} strokeWidth={2} />
                    return <g key={`d-${p.index}`} />
                  }}
                  activeDot={{ r: 5, fill: LINE, stroke: SURFACE, strokeWidth: 2 }}
                />
                {/* Chỉ ghi số ở ngày báo cáo gần nhất (khớp ô "Tổng từ đầu tháng") — ngày khác đọc qua trục, tooltip và bảng. */}
                {lastReported?.cumulative != null && (
                  <ReferenceDot
                    x={lastReported.date} y={lastReported.cumulative} r={0}
                    label={{ value: compact(lastReported.cumulative), position: 'top', fontSize: 11, fontWeight: 700, fill: '#334155' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {(hasCatchUp || hasGaps || monthStart) && (
          <ul className="space-y-0.5 px-5 pt-2 text-[11px] leading-4 text-slate-500">
            {hasCatchUp && (
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-white" style={{ borderColor: LINE }} aria-hidden />
                Có người báo cáo bù: số của những ngày trước được tính hết vào ngày này.
              </li>
            )}
            {monthStart && (
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 h-2.5 w-0 shrink-0 border-l border-dashed border-slate-400" aria-hidden />
                <span className="pl-1">Sang tháng mới ({dayMonth(monthStart)}), tổng tính lại từ 0.</span>
              </li>
            )}
            {hasGaps && (
              <li className="flex items-start gap-1.5">
                <span className="mt-[7px] h-px w-2.5 shrink-0 bg-slate-300" aria-hidden />
                Ngày chưa có ai báo cáo thì đường nối thẳng qua. Số của mỗi ngày thường được báo cáo vào sáng hôm sau.
              </li>
            )}
          </ul>
        )}

        <TrendTable days={days} />
      </div>

      {breakdown.length > 0 && (
        <BreakdownList
          kind={data.breakdown_kind!}
          rows={breakdown}
          dayCount={days.length}
          focusIdx={focusIdx}
          valueLabel={focusDay ? `Tăng thêm ngày ${dayMonth(focusDay)}` : `Tăng thêm ${rangeLabel}`}
          onDrill={onDrill}
        />
      )}
    </div>
  )
}

// ─── Bảng số liệu (bản đọc được không cần di chuột / cho trình đọc màn hình) ────

function TrendTable({ days }: { days: TrafficTrendDay[] }) {
  return (
    <details className="group mt-3 border-t border-slate-100">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
        Xem số liệu từng ngày
      </summary>
      <div className="max-h-64 overflow-auto px-5 pb-4">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-slate-100 text-slate-500">
              <th scope="col" className="py-2 pr-3 text-left font-semibold">Ngày</th>
              <th scope="col" className="py-2 px-3 text-right font-semibold">Tổng từ đầu tháng</th>
              <th scope="col" className="py-2 px-3 text-right font-semibold">Tăng thêm</th>
              <th scope="col" className="py-2 px-3 text-right font-semibold">Trong đó báo cáo bù</th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">Số người báo cáo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 tabular-nums">
            {[...days].reverse().map(d => (
              <tr key={d.date} className={d.reporters === 0 ? 'text-slate-400' : 'text-slate-700'}>
                <th scope="row" className="py-1.5 pr-3 text-left font-medium">{dayMonth(d.date)}/{d.date.slice(0, 4)}</th>
                <td className="py-1.5 px-3 text-right font-semibold">{d.cumulative != null ? full(d.cumulative) : '—'}</td>
                <td className="py-1.5 px-3 text-right">{d.daily != null ? full(d.daily) : '—'}</td>
                <td className="py-1.5 px-3 text-right">{d.catch_up > 0 ? full(d.catch_up) : '—'}</td>
                <td className="py-1.5 pl-3 text-right">{d.reporters || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

// ─── Tách theo team / thành viên ──────────────────────────────────────────────

function BreakdownList({ kind, rows, dayCount, focusIdx, valueLabel, onDrill }: {
  kind: 'team' | 'member'
  rows: TrafficTrend['breakdown']
  dayCount: number
  /** Đang xem 1 ngày → số của dòng là mức tăng ngày đó, không phải tổng 7 ngày bối cảnh. */
  focusIdx: number
  valueLabel: string
  onDrill?: (t: TrafficDrillTarget) => void
}) {
  const valueOf = (r: TrafficTrend['breakdown'][number]) => (focusIdx >= 0 ? r.daily[focusIdx] : r.daily_sum)
  const sorted = focusIdx >= 0 ? [...rows].sort((a, b) => (valueOf(b) ?? -1) - (valueOf(a) ?? -1)) : rows

  return (
    <div className="flex min-w-0 flex-col border-t border-slate-100 lg:border-l lg:border-t-0">
      <div className="flex items-baseline justify-between gap-2 px-5 pt-4 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {kind === 'team' ? 'Theo team' : 'Theo thành viên'}
        </h4>
        <span className="text-[11px] text-slate-500">{valueLabel}</span>
      </div>
      <ul className="custom-scrollbar max-h-[360px] flex-1 overflow-y-auto px-2 pb-3">
        {sorted.map(r => {
          const value = valueOf(r)
          const clickable = !!onDrill && !!r.id
          const body = (
            <>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">{r.label}</span>
                <span className="block text-[11px] text-slate-500">
                  {focusIdx >= 0
                    ? value == null ? 'Chưa báo cáo ngày này' : `Tổng từ đầu tháng ${compact(r.latest_cumulative)}`
                    : `Báo cáo ${r.reported_days}/${dayCount} ngày`}
                </span>
              </span>
              {/* `?? []`: BE cũ chưa trả cumulative thì chỉ mất đường nhỏ, không vỡ card. */}
              <Sparkline values={r.cumulative ?? []} />
              <span className="w-16 text-right text-sm font-bold tabular-nums text-slate-900" title={value != null ? full(value) : undefined}>
                {value != null ? compact(value) : '—'}
              </span>
              {clickable && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-indigo-400" aria-hidden />
                  <span className="sr-only">— bấm để lọc cả trang theo {kind === 'team' ? 'team' : 'thành viên'} này</span>
                </>
              )}
            </>
          )
          const rowCls = 'group grid w-full grid-cols-[minmax(0,1fr)_72px_auto_auto] items-center gap-3 rounded-lg px-3 py-2 text-left'
          return (
            <li key={`${r.id ?? r.label}`}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onDrill!({ kind, id: r.id! })}
                  className={cn(rowCls, 'transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400')}
                >
                  {body}
                </button>
              ) : (
                <div className={rowCls}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
