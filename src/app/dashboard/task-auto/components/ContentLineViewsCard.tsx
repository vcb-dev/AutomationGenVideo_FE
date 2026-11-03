'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { facebookService } from '@/services/facebookService'
import type { ContentLineViews } from '@/types/facebook'
import { DashboardCard } from './DashboardUI'

const compactFmt = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })
const compact = (n: number) => compactFmt.format(n)
const full = (n: number) => n.toLocaleString('vi-VN')

interface ContentLineViewsCardProps {
  from: string
  to: string
  teamId?: string
  ownerId?: string
  className?: string
}

export function ContentLineViewsCard({ from, to, teamId, ownerId, className }: ContentLineViewsCardProps) {
  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ['task-auto', 'content-line-views', from, to, teamId ?? '', ownerId ?? ''],
    queryFn: () => facebookService.getContentLineViews({ date_from: from, date_to: to, team_id: teamId, owner_id: ownerId }),
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
  })

  return (
    <DashboardCard
      title="Lượt xem theo tuyến nội dung"
      subtitle="Video Facebook đăng trong kỳ, xếp tuyến theo hashtag #A1–#A5 trong caption"
      className={cn('flex flex-col', className)}
    >
      {isError && !data ? (
        <EmptyState title="Không tải được lượt xem theo tuyến" hint="Thử tải lại trang sau ít phút" />
      ) : isLoading || !data ? (
        <div className="flex-1 p-5" aria-busy="true" aria-label="Đang tải lượt xem theo tuyến">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse motion-reduce:animate-none" />)}
          </div>
          <div className="mt-4 h-[220px] rounded-xl bg-slate-50 animate-pulse motion-reduce:animate-none" />
        </div>
      ) : (
        <div
          aria-busy={isPlaceholderData}
          className={cn('flex flex-1 flex-col transition-opacity duration-200', isPlaceholderData && 'opacity-60')}
        >
          <ViewsBody data={data} />
        </div>
      )}
    </DashboardCard>
  )
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-5 py-14 text-center">
      <Eye className="mb-1 h-8 w-8 text-slate-300" aria-hidden />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  )
}

function ViewsBody({ data }: { data: ContentLineViews }) {
  if (data.page_count === 0) {
    return (
      <EmptyState
        title="Chưa có page Facebook nào thuộc phạm vi này"
        hint="Page được tính cho team/người cầm kênh theo Quản lý kênh"
      />
    )
  }
  if (data.total.videos === 0) {
    return <EmptyState title="Chưa có video Facebook nào đăng trong kỳ" hint="Video mới thường được cập nhật mỗi sáng" />
  }

  const { total, untagged } = data
  const rows = [
    ...data.lines.map(l => ({ key: l.line, label: l.line, ...l, untagged: false })),
    ...(untagged.videos > 0 ? [{ key: 'none', label: 'Chưa gắn tuyến', ...untagged, untagged: true }] : []),
  ]
  const maxViews = Math.max(1, ...rows.map(r => r.views))
  const top = data.lines.reduce<ContentLineViews['lines'][number] | null>(
    (best, l) => (l.views > 0 && (!best || l.views > best.views) ? l : best), null,
  )
  const share = (views: number) => (total.views > 0 ? Math.round((views / total.views) * 100) : 0)
  const hasOverlap = data.lines.reduce((s, l) => s + l.videos, 0) + untagged.videos > total.videos

  const stats = [
    { label: 'Tổng lượt xem', value: compact(total.views), title: full(total.views), sub: `${full(total.videos)} video đã đăng` },
    { label: 'Trung bình mỗi video', value: compact(Math.round(total.views / total.videos)), sub: 'Lượt xem / video trong kỳ' },
    {
      label: 'Tuyến dẫn đầu',
      value: top?.line ?? '—',
      sub: top ? `${share(top.views)}% tổng lượt xem` : 'Chưa video nào có lượt xem',
    },
  ]

  return (
    <>
      <dl className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        {stats.map(s => (
          <div key={s.label} className="min-w-0 px-4 py-3 first:pl-5">
            <dt className="line-clamp-2 text-xs font-semibold leading-4 text-slate-500">{s.label}</dt>
            <dd className="mt-1 text-xl font-bold leading-none tracking-tight tabular-nums text-slate-900" title={s.title}>{s.value}</dd>
            <dd className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{s.sub}</dd>
          </div>
        ))}
      </dl>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Lượt xem, số video và lượt xem trung bình của từng tuyến nội dung</caption>
          <thead>
            <tr className="text-xs text-slate-500">
              <th scope="col" className="w-[1%] whitespace-nowrap py-2 pl-5 pr-3 text-left font-semibold">Tuyến</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Lượt xem · tỷ trọng</th>
              <th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Video</th>
              <th scope="col" className="hidden py-2 pl-3 pr-5 text-right font-semibold sm:table-cell">TB / video</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const avg = r.videos > 0 ? Math.round(r.views / r.videos) : null
              const isTop = !r.untagged && top?.line === r.key
              return (
                <tr key={r.key} className="border-t border-slate-100">
                  <th
                    scope="row"
                    className={cn(
                      'whitespace-nowrap py-2.5 pl-5 pr-3 text-left',
                      r.untagged ? 'text-xs font-medium text-slate-500' : 'font-semibold text-slate-800',
                    )}
                  >
                    {r.label}
                  </th>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 min-w-[64px] flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                        <div
                          className={cn(
                            'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                            r.untagged ? 'bg-slate-300' : isTop ? 'bg-indigo-500' : 'bg-indigo-300',
                          )}
                          style={{ width: `${(r.views / maxViews) * 100}%` }}
                        />
                      </div>
                      <span className="w-[92px] shrink-0 text-right tabular-nums">
                        <span className="font-bold text-slate-900" title={full(r.views)}>{compact(r.views)}</span>
                        <span className="ml-1.5 text-xs text-slate-500">{share(r.views)}%</span>
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 tabular-nums sm:hidden">
                      {full(r.videos)} video{avg != null && ` · TB ${compact(avg)}/video`}
                    </p>
                  </td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-slate-700 sm:table-cell">{full(r.videos)}</td>
                  <td className="hidden py-2.5 pl-3 pr-5 text-right tabular-nums text-slate-700 sm:table-cell" title={avg != null ? full(avg) : undefined}>
                    {avg != null ? compact(avg) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-slate-100 px-5 py-2.5 text-[11px] leading-4 text-slate-500">
        Lượt xem tính tới lần cập nhật gần nhất.
        {hasOverlap && ' Video gắn nhiều tuyến được tính ở mỗi tuyến, nên tỷ trọng cộng lại có thể hơn 100%.'}
      </p>
    </>
  )
}
