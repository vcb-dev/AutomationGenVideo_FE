'use client'

import { useState, useRef, useEffect } from 'react'
import { Eye, Zap, Target, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { TaskStatusBadge } from '@/components/task-auto/StatusBadge'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { formatDateTime, isOverdue } from '@/components/task-auto/helpers'
import { Task } from '@/types/task-auto'

interface Props {
  tasks: Task[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  onViewTask: (id: string) => void
  onPageChange: (page: number) => void
}

// Lấy tiêu đề content: personal → team (own→FK) → global (own→team FK→editor FK)
export function resolveContentTitle(task: Task): string | null {
  const g_tc = task.content?.source_team_content
  return (
    task.editor_content?.title ??
    task.team_content?.title ??
    task.team_content?.source_editor_content?.title ??
    task.content?.title ??
    g_tc?.title ??
    g_tc?.source_editor_content?.title ??
    null
  )
}

// Lấy tên sản phẩm: personal → team (own→FK) → global (own→team FK→editor FK)
export function resolveProductName(task: Task): string | null {
  const g_tp = task.product?.source_team_product
  return (
    task.editor_product?.name ??
    task.team_product?.name ??
    task.team_product?.source_editor_product?.name ??
    task.product?.name ??
    g_tp?.name ??
    g_tp?.source_editor_product?.name ??
    null
  )
}

// Lấy ảnh sản phẩm liên kết: personal → team (own→FK) → global (own→team FK→editor FK)
export function resolveProductImage(task: Task): string | null {
  const g_tp = task.product?.source_team_product
  return (
    task.editor_product?.image_url ??
    task.team_product?.image_url ??
    task.team_product?.source_editor_product?.image_url ??
    task.product?.image_url ??
    g_tp?.image_url ??
    g_tp?.source_editor_product?.image_url ??
    null
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-5 bg-gray-100 rounded animate-pulse" style={{ width: j === 1 ? '80%' : j === 0 ? '36px' : j >= 6 ? '24px' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function TasksTable({
  tasks,
  total,
  page,
  totalPages,
  isLoading,
  onViewTask,
  onPageChange,
}: Props) {
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [showAssigneeDrop, setShowAssigneeDrop] = useState(false)
  const assigneeDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeDropRef.current && !assigneeDropRef.current.contains(e.target as Node))
        setShowAssigneeDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const assigneeCountMap = new Map<string, { id: string; name: string; count: number }>()
  for (const t of tasks) {
    if (t.assignee_id && t.assignee) {
      const e = assigneeCountMap.get(t.assignee_id)
      if (e) e.count++
      else assigneeCountMap.set(t.assignee_id, { id: t.assignee_id, name: t.assignee.full_name, count: 1 })
    }
  }
  const assigneeOptions = Array.from(assigneeCountMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))

  const filteredTasks = assigneeFilter ? tasks.filter(t => t.assignee_id === assigneeFilter) : tasks

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-gray-200">
              <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-14">STT</th>
              <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Task</th>
              <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Team</th>
              <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">
                <div className="relative" ref={assigneeDropRef}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowAssigneeDrop(v => !v) }}
                    className={cn(
                      'flex items-center gap-1.5 text-sm font-black tracking-wide transition-colors whitespace-nowrap',
                      assigneeFilter ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-600',
                    )}
                  >
                    {assigneeFilter
                      ? (assigneeOptions.find(o => o.id === assigneeFilter)?.name ?? 'Người làm')
                      : 'Người làm'}
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAssigneeDrop && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {showAssigneeDrop && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 z-30 overflow-hidden py-1.5"
                      >
                        <button
                          onClick={() => { setAssigneeFilter(''); setShowAssigneeDrop(false) }}
                          className={cn(
                            'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold transition-colors',
                            !assigneeFilter ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50',
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                            Tất cả
                          </span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-bold',
                            !assigneeFilter ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400',
                          )}>
                            {tasks.length}
                          </span>
                        </button>

                        {assigneeOptions.map(opt => {
                          const active = assigneeFilter === opt.id
                          return (
                            <button
                              key={opt.id}
                              onClick={() => { setAssigneeFilter(opt.id); setShowAssigneeDrop(false) }}
                              className={cn(
                                'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold transition-colors',
                                active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50',
                              )}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <AvatarInitials name={opt.name} size="sm" />
                                <span className="truncate">{opt.name}</span>
                              </span>
                              <span className={cn(
                                'text-xs px-2 py-0.5 rounded-full font-bold shrink-0',
                                active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400',
                              )}>
                                {opt.count}
                              </span>
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </th>
              <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Trạng thái</th>
              <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Deadline</th>
              {/* <th className="text-center px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-32">Loại</th> */}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <SkeletonRows />
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState title="Không có task nào" description="Thử thay đổi bộ lọc hoặc tạo task mới" />
                </td>
              </tr>
            ) : (
              filteredTasks.map((task, idx) => {
                const contentTitle = resolveContentTitle(task)
                const productName = resolveProductName(task)
                return (
                  <tr
                    key={task.id}
                    className="text-slate-700 hover:bg-indigo-50/60 transition-colors cursor-pointer group border-b border-gray-100 last:border-0"
                    onClick={() => onViewTask(task.id)}
                  >
                    <td className="px-5 py-4 text-slate-400 font-mono text-sm whitespace-nowrap">
                      {(page - 1) * 20 + idx + 1}
                    </td>
                    <td className="px-5 py-4 max-w-[300px]">
                      <p className="font-semibold text-slate-800 truncate text-base group-hover:text-indigo-700 transition-colors">
                        {contentTitle ?? <span className="text-slate-400 italic">Không có tiêu đề</span>}
                      </p>
                      {productName && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{productName}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {task.team ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 whitespace-nowrap">
                          {task.team.name}
                        </span>
                      ) : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {task.assignee ? (
                        <div className="flex items-center gap-2.5">
                          <AvatarInitials name={task.assignee.full_name} size="sm" />
                          <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">
                            {task.assignee.full_name}
                          </span>
                        </div>
                      ) : <span className="text-slate-300 text-sm italic">Chưa giao</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <TaskStatusBadge status={task.status} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {task.deadline ? (
                        <span className={cn(
                          'text-sm font-medium',
                          isOverdue(task.deadline) && !['APPROVED', 'CANCELLED'].includes(task.status)
                            ? 'text-red-600 font-semibold' : 'text-slate-600'
                        )}>
                          {formatDateTime(task.deadline)}
                        </span>
                      ) : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    {/* <td className="px-5 py-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {task.is_auto && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            <Zap className="w-3 h-3" /> Auto
                          </span>
                        )}
                        {task.is_planned && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <Target className="w-3 h-3" /> SP KH
                          </span>
                        )}
                      </div>
                    </td> */}
                    <td className="pr-4 py-4 text-right w-10">
                      <Eye className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <span className="text-sm text-slate-500">
            Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
            {' '}·{' '}
            <span className="font-semibold text-slate-700">{total}</span> task
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7
                ? i + 1
                : page <= 4
                  ? i + 1
                  : page >= totalPages - 3
                    ? totalPages - 6 + i
                    : page - 3 + i
              return (
                <button
                  key={pg}
                  onClick={() => onPageChange(pg)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                    pg === page
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-gray-200 text-slate-600'
                  )}
                >
                  {pg}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}