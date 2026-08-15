'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, FileText, Languages, Video, BarChart3 } from 'lucide-react'
import { getContentCreatorKpiReport } from '@/lib/api/task-auto'
import type { Team, ContentCreatorReportRow } from '@/types/task-auto'
import { DashboardCard, MetricStat, PeriodBadge } from './DashboardUI'

/** Tổng quan cho leader Content Team — thay thế TeamDashboard cho team_kind=CONTENT. */
export function ContentTeamLeaderDashboard({ teams, from, to, periodLabel }: { teams: Team[]; from: string; to: string; periodLabel: string }) {
  const teamIds = teams.map(t => t.id)

  const { data: reports, isLoading } = useQuery({
    queryKey: ['task-auto', 'content-creator-report', 'led', teamIds, from, to],
    queryFn: async () => {
      // 1 leader hiếm khi lead nhiều Content Team, nhưng gộp cho an toàn nếu có
      const all = await Promise.all(teamIds.map(id => getContentCreatorKpiReport({ team_id: id, from, to })))
      return all.flat()
    },
    enabled: teamIds.length > 0,
  })
  const byUser = new Map((reports ?? []).map(r => [r.user_id, r]))

  // Luôn liệt kê đủ thành viên (kể cả người chưa có hoạt động trong kỳ) — khớp cách TeamDashboard hiện bảng thành viên.
  const rows: (ContentCreatorReportRow | { user_id: string; user: any; content_collected: number; translations_count: number; videos_made: number })[] =
    teams.flatMap(t => t.members ?? []).map(m => byUser.get(m.user_id) ?? {
      user_id: m.user_id,
      user: m.user ? { id: m.user.id, full_name: m.user.full_name } : null,
      content_collected: 0,
      translations_count: 0,
      videos_made: 0,
    })

  const totalContent = rows.reduce((s, r) => s + r.content_collected, 0)
  const totalTranslations = rows.reduce((s, r) => s + r.translations_count, 0)
  const totalVideos = rows.reduce((s, r) => s + r.videos_made, 0)

  return (
    <div className="space-y-5">
      <DashboardCard
        icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-50"
        title={teams.length === 1 ? `Hiệu suất ${teams[0].name}` : 'Hiệu suất Content Team'}
        right={<PeriodBadge label={periodLabel} />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-slate-100 sm:divide-y-0">
          <MetricStat icon={FileText} label="Content sưu tầm" value={totalContent} tone="emerald" />
          <MetricStat icon={Languages} label="Bản dịch" value={totalTranslations} tone="violet" />
          <MetricStat icon={Video} label="Video được làm" value={totalVideos} tone="indigo" />
          <MetricStat icon={Users} label="Content creator" value={rows.length} tone="slate" />
        </div>
      </DashboardCard>

      <DashboardCard
        icon={Users} iconColor="text-indigo-600" iconBg="bg-indigo-50"
        title={`Thành viên (${rows.length})`}
        action={{ href: '/dashboard/task-auto/kpi', label: 'Đặt target' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Content Creator</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Content</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-violet-600 uppercase tracking-wide">Bản dịch</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-indigo-600 uppercase tracking-wide">Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400 text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Chưa có thành viên
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.user_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm ring-2 ring-white">
                        {r.user?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">{r.user?.full_name ?? r.user_id}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-center font-bold text-emerald-700">{r.content_collected}</td>
                  <td className="px-3 py-3.5 text-center font-bold text-violet-700">{r.translations_count}</td>
                  <td className="px-3 py-3.5 text-center font-bold text-indigo-700">{r.videos_made}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  )
}
