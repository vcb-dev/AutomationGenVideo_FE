'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, Globe, Users, Loader2, Trophy, TrendingUp } from 'lucide-react'
import { getTeamMemberSourceStats } from '@/lib/api/task-auto'
import { cn } from '@/lib/utils'

interface TeamStatsTabProps {
  teamId: string
}

function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function TeamStatsTab({ teamId }: TeamStatsTabProps) {
  const [month, setMonth] = useState(getCurrentMonth())

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['task-auto', 'member-source-stats', teamId, month],
    queryFn: () => getTeamMemberSourceStats(teamId, month),
    enabled: !!teamId,
  })

  const maxTotal = Math.max(...stats.map(s => s.total), 1)

  const [year, mo] = month.split('-')
  const monthLabel = new Date(Number(year), Number(mo) - 1, 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header + month picker */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            <span className="text-base font-bold text-slate-800">Thống kê source theo thành viên</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-500">Tháng:</span>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Tổng source đã thêm</p>
            <p className="text-3xl font-black text-indigo-600">{stats.reduce((s, m) => s + m.total, 0)}</p>
            <p className="text-xs text-slate-400 mt-1">{monthLabel}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Kho chung (catalog)</p>
            <p className="text-3xl font-black text-teal-600">{stats.reduce((s, m) => s + m.global_sources, 0)}</p>
            <p className="text-xs text-slate-400 mt-1">{monthLabel}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Kho các team</p>
            <p className="text-3xl font-black text-violet-600">{stats.reduce((s, m) => s + m.team_sources, 0)}</p>
            <p className="text-xs text-slate-400 mt-1">{monthLabel}</p>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-slate-800 text-base">Bảng xếp hạng — {monthLabel}</h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          </div>
        ) : stats.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <BarChart2 className="w-10 h-10" />
            <p className="text-base">Chưa có dữ liệu cho tháng này</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.map((member, idx) => (
              <div key={member.user_id} className="px-6 py-4 flex items-center gap-4 hover:bg-indigo-50/30 transition-colors">
                {/* Rank */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0',
                  idx === 0 ? 'bg-amber-100 text-amber-600' :
                  idx === 1 ? 'bg-slate-100 text-slate-600' :
                  idx === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-50 text-slate-400'
                )}>
                  {idx + 1}
                </div>

                {/* Avatar */}
                {member.image_url ? (
                  <img src={member.image_url} alt={member.full_name}
                    className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold shrink-0">
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{member.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{member.email}</p>
                </div>

                {/* Progress bar */}
                <div className="flex-1 max-w-[200px] hidden sm:block">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        idx === 0 ? 'bg-amber-400' :
                        idx === 1 ? 'bg-slate-400' :
                        idx === 2 ? 'bg-orange-400' :
                        'bg-indigo-300'
                      )}
                      style={{ width: `${Math.round((member.total / maxTotal) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Kho chung</p>
                    <p className="text-base font-bold text-teal-600">{member.global_sources}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Kho các team</p>
                    <p className="text-base font-bold text-violet-600">{member.team_sources}</p>
                  </div>
                  <div className="text-center min-w-[52px]">
                    <p className="text-xs text-slate-400">Tổng</p>
                    <p className={cn(
                      'text-lg font-black',
                      idx === 0 ? 'text-amber-500' : 'text-indigo-600'
                    )}>{member.total}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <span>Tính tất cả source thành viên đã thêm vào kho chung và kho của bất kỳ team nào — không tính kho cá nhân</span>
        </div>
      </div>
    </div>
  )
}
