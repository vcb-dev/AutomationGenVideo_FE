'use client'

import { useQuery } from '@tanstack/react-query'
import { FileText, Languages, Video, TrendingUp, ExternalLink, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getContentCreatorKpiReport, getContentCreatorKpis } from '@/lib/api/task-auto'
import { StatCard } from './StatCard'
import { DashboardCard } from './DashboardUI'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `Tháng ${m}/${y}`
}

function TargetBar({ label, value, target, color }: { label: string; value: number; target: number; color: 'emerald' | 'violet' }) {
  const tones = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    violet:  { bg: 'bg-violet-50',  border: 'border-violet-100',  text: 'text-violet-700',  bar: 'bg-violet-500' },
  }[color]

  if (!target) {
    return (
      <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3.5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
        <p className="text-2xl font-black text-slate-500">{value}</p>
        <p className="text-xs text-slate-300 mt-1">Chưa có target tháng này</p>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div className={cn('rounded-xl border px-4 py-3.5', tones.bg, tones.border)}>
      <p className={cn('text-xs font-semibold uppercase tracking-wide mb-1.5', tones.text)}>{label}</p>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className={cn('text-2xl font-black', tones.text)}>{value}</span>
        <span className="text-xs text-slate-400">/ {target} mục tiêu</span>
      </div>
      <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', tones.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Tổng quan cho content creator (thành viên Content Team) — thay thế PersonalDashboard cho nhóm này. */
export function ContentCreatorDashboard({ userId, from, to, teamName }: { userId: string; from: string; to: string; teamName?: string }) {
  const month = currentMonth()
  const monthFrom = `${month}-01`

  const { data: periodReport, isLoading } = useQuery({
    queryKey: ['task-auto', 'content-creator-report', 'me', userId, from, to],
    queryFn: () => getContentCreatorKpiReport({ user_id: userId, from, to }),
  })
  const { data: monthReport } = useQuery({
    queryKey: ['task-auto', 'content-creator-report', 'me', userId, 'month', month],
    queryFn: () => getContentCreatorKpiReport({ user_id: userId, from: monthFrom, to }),
  })
  const { data: kpis } = useQuery({
    queryKey: ['task-auto', 'content-creator-kpis', 'me', userId, month],
    queryFn: () => getContentCreatorKpis(month, userId),
  })

  const period = periodReport?.[0]
  const monthRow = monthReport?.[0]
  const target = kpis?.[0]
  const videos = period?.videos ?? []

  const totalViews = videos.reduce(
    (sum, v) => sum + (v.published_links ?? []).reduce((s, l) => s + (l.stats?.views ?? 0), 0),
    0,
  )

  return (
    <div className="space-y-5">
      {/* Greeting banner */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl px-6 py-5 text-white">
        <p className="text-sm font-medium text-violet-100">Content Creator{teamName ? ` — ${teamName}` : ''}</p>
        <p className="text-lg font-bold mt-0.5">Theo dõi content bạn sưu tầm, bản dịch và video được làm từ đó</p>
      </div>

      {/* Quick stats — theo kỳ đã chọn ở bộ lọc ngày */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Content sưu tầm" value={period?.content_collected ?? 0} icon={FileText} iconBg="bg-emerald-50 text-emerald-600" accent="bg-emerald-400" />
        <StatCard label="Bản dịch" value={period?.translations_count ?? 0} icon={Languages} iconBg="bg-violet-50 text-violet-600" accent="bg-violet-400" />
        <StatCard label="Video được làm" value={period?.videos_made ?? 0} icon={Video} iconBg="bg-indigo-50 text-indigo-600" accent="bg-indigo-400" />
        <StatCard label="Lượt xem (Facebook)" value={totalViews} icon={TrendingUp} iconBg="bg-sky-50 text-sky-600" accent="bg-sky-400" />
      </div>

      {/* Target tháng — độc lập với bộ lọc ngày, luôn theo tháng hiện tại */}
      <DashboardCard
        icon={Target} iconColor="text-indigo-600" iconBg="bg-indigo-50"
        title={`Target ${formatMonth(month)}`}
        action={{ href: '/dashboard/task-auto/kpi', label: 'Xem KPI' }}
      >
        <div className="px-5 py-4 grid sm:grid-cols-2 gap-3">
          <TargetBar label="Content sưu tầm" value={monthRow?.content_collected ?? 0} target={target?.content_target ?? 0} color="emerald" />
          <TargetBar label="Bản dịch" value={monthRow?.translations_count ?? 0} target={target?.translation_target ?? 0} color="violet" />
        </div>
      </DashboardCard>

      {/* Drill-down: video làm từ content của mình */}
      <DashboardCard
        icon={Video} iconColor="text-indigo-600" iconBg="bg-indigo-50"
        title="Video được làm từ content của bạn"
        subtitle={!isLoading ? `${videos.length} video trong kỳ đã chọn` : undefined}
      >
        {isLoading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Đang tải...</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <Video className="w-8 h-8 mx-auto mb-2 opacity-20" />
            Chưa có video nào được làm từ content của bạn trong kỳ này
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {videos.map(v => (
              <div key={v.task_id} className="flex items-center gap-3 px-5 py-3 flex-wrap hover:bg-slate-50/60 transition-colors">
                <span className="text-sm font-semibold text-slate-700 truncate max-w-[220px]" title={v.content_title ?? undefined}>
                  {v.content_title || v.content_code || 'Content'}
                </span>
                <span className="text-xs text-slate-300">→</span>
                <span className="text-sm text-slate-500">{v.editor?.full_name ?? '—'}</span>
                <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                  {(v.published_links ?? []).length === 0 && <span className="text-xs text-slate-300">Chưa có link</span>}
                  {(v.published_links ?? []).map(l => (
                    <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:underline whitespace-nowrap">
                      {l.platform}{l.stats ? ` · ${l.stats.views} views` : ''} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  )
}
