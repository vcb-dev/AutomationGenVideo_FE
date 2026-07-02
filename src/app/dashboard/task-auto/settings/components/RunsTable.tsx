'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RunStatusBadge } from '@/components/task-auto/StatusBadge'
import { formatDateTime, calcDuration } from '@/components/task-auto/helpers'
import { getAssignmentRuns } from '@/lib/api/task-auto'

export function RunsTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: runs, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['task-auto', 'assignment-runs'],
    queryFn: () => getAssignmentRuns(50),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      return data.some(r => r.status === 'RUNNING') ? 10_000 : false
    },
  })

  const hasRunning = runs?.some(r => r.status === 'RUNNING')
  const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id))

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between px-7 py-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-xl">Lịch sử phân công</h2>
            <p className="text-sm text-slate-500 mt-0.5">50 lần chạy gần nhất</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasRunning && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang cập nhật tự động...
            </span>
          )}
          {dataUpdatedAt > 0 && (
            <span className="text-sm text-slate-400">Cập nhật: {new Date(dataUpdatedAt).toLocaleTimeString('vi-VN')}</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian chạy</th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
              <th className="text-right px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã phân công</th>
              <th className="text-right px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bỏ qua</th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hoàn thành lúc</th>
              <th className="text-right px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && (!runs || runs.length === 0) && (
              <tr>
                <td colSpan={7}>
                  <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-sm">Chưa có lần chạy nào</p>
                  </div>
                </td>
              </tr>
            )}
            {runs?.map(run => (
              <>
                <tr key={run.id} className={cn('hover:bg-gray-50/70 transition-colors', run.status === 'RUNNING' && 'bg-amber-50/30')}>
                  <td className="px-5 py-4 text-slate-500 text-sm">{formatDateTime(run.run_at)}</td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <RunStatusBadge status={run.status} />
                      {run.status === 'FAILED' && run.error_msg && (
                        <p className="text-sm text-red-500 max-w-48 truncate" title={run.error_msg}>{run.error_msg}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-600">{run.total_assigned}</td>
                  <td className="px-5 py-4 text-right text-sm text-slate-500">{run.total_skipped}</td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{formatDateTime(run.finished_at)}</td>
                  <td className="px-5 py-4 text-right font-mono text-sm text-slate-400">{calcDuration(run.run_at, run.finished_at)}</td>
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
