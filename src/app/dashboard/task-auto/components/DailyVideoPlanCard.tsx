'use client'

import { Award, CalendarDays, Target } from 'lucide-react'
import { buildDailyVideoPlan, CONTENT_LINES, type DailyLineTargets } from '@/lib/task-auto/daily-video-plan'
import { cn } from '@/lib/utils'
import { DashboardCard } from './DashboardUI'

function currentVietnamMonth(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const year = parts.find(part => part.type === 'year')?.value ?? String(now.getFullYear())
  const month = parts.find(part => part.type === 'month')?.value ?? String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function toLineTargets(allocations?: { name: string; weight: number }[]): Partial<DailyLineTargets> {
  const targets: Partial<DailyLineTargets> = {}
  for (const allocation of allocations ?? []) {
    const name = allocation.name.toUpperCase()
    if (!CONTENT_LINES.some(line => line === name)) continue
    const line = name as keyof DailyLineTargets
    targets[line] = (targets[line] ?? 0) + Math.max(0, allocation.weight ?? 0)
  }
  return targets
}

function SummaryItem({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 text-center">
      <p className={cn('text-lg font-black tabular-nums', accent ? 'text-indigo-600' : 'text-slate-800')}>{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">{label}</p>
    </div>
  )
}

export function DailyVideoPlanCard({
  month,
  monthlyTarget,
  completed,
  contentAllocations,
}: {
  month?: string
  monthlyTarget: number
  completed: number
  contentAllocations?: { name: string; weight: number }[]
}) {
  const now = new Date()
  const resolvedMonth = month || currentVietnamMonth(now)
  const plan = buildDailyVideoPlan({
    month: resolvedMonth,
    monthlyTarget,
    completed,
    contentLineTargets: toLineTargets(contentAllocations),
    now,
  })
  const [year, monthNumber] = resolvedMonth.split('-')

  return (
    <DashboardCard
      title="Kế hoạch từng ngày"
      subtitle={`Tháng ${monthNumber}/${year} · Chủ nhật nghỉ`}
      right={(
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {plan.workingDays} ngày
        </span>
      )}
    >
      <div className="grid grid-cols-2 gap-2 border-b border-slate-100 px-4 py-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <SummaryItem value={monthlyTarget} label="KPI tháng" />
        <SummaryItem value={completed} label="Đã duyệt" />
        <SummaryItem value={plan.remaining} label="Còn lại" />
        <SummaryItem
          value={plan.workingDays > 0 ? plan.averagePerDay.toFixed(1) : '—'}
          label="Video / ngày"
          accent={plan.remaining > 0}
        />
      </div>

      {monthlyTarget <= 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <Target className="h-8 w-8 text-slate-300" aria-hidden />
          <p className="text-sm font-bold text-slate-500">Chưa có KPI tháng này</p>
          <p className="text-xs text-slate-400">Liên hệ Leader để thiết lập KPI trước khi lập kế hoạch.</p>
        </div>
      ) : plan.remaining === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <Award className="h-6 w-6 text-emerald-500" aria-hidden />
          </div>
          <p className="text-sm font-bold text-emerald-700">Bạn đã đạt KPI tháng này!</p>
          <p className="text-xs text-slate-400">Không còn video phải phân bổ cho các ngày còn lại.</p>
        </div>
      ) : plan.items.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-amber-400" aria-hidden />
          <p className="text-sm font-bold text-amber-700">Không còn ngày làm việc trong tháng</p>
          <p className="text-xs text-slate-400">Còn {plan.remaining} video chưa hoàn thành KPI.</p>
        </div>
      ) : (
        <div>
          <div className="custom-scrollbar max-h-[430px] overflow-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Ngày</th>
                  {CONTENT_LINES.map(line => (
                    <th key={line} className="px-2 py-3 text-center text-xs font-bold text-slate-600">{line}</th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-bold text-indigo-600">Tổng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan.items.map(item => (
                  <tr
                    key={item.date}
                    className={cn(
                      'transition-colors',
                      item.isRestDay ? 'bg-slate-50/80 text-slate-400' : item.isToday ? 'bg-indigo-50/70' : 'hover:bg-slate-50/50',
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold tabular-nums text-slate-700">
                      {String(item.day).padStart(2, '0')}/{monthNumber}
                      {item.isToday && (
                        <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-indigo-600">Hôm nay</span>
                      )}
                    </td>
                    {CONTENT_LINES.map(line => (
                      <td key={line} className="px-2 py-2.5 text-center font-semibold tabular-nums">
                        {item.isRestDay ? '—' : item.lineTargets[line]}
                      </td>
                    ))}
                    <td className={cn(
                      'px-4 py-2.5 text-center font-black tabular-nums',
                      item.isRestDay ? 'text-slate-400' : 'text-indigo-600',
                    )}>
                      {item.isRestDay ? 'Nghỉ' : item.target}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-indigo-50 shadow-[0_-1px_0_0_#c7d2fe]">
                <tr>
                  <td className="px-4 py-3 text-xs font-black uppercase text-indigo-700">Còn lại</td>
                  {CONTENT_LINES.map(line => (
                    <td key={line} className="px-2 py-3 text-center text-xs font-black tabular-nums text-indigo-700">
                      {plan.lineTotals[line]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-sm font-black tabular-nums text-indigo-700">{plan.remaining}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="border-t border-slate-100 px-4 py-3 text-[10px] leading-relaxed text-slate-400">
            Tổng video còn thiếu được chia đều theo ngày và phân bổ A1–A5 theo tỷ trọng KPI tháng; phần dư ưu tiên ngày gần nhất.
          </p>
        </div>
      )}
    </DashboardCard>
  )
}
