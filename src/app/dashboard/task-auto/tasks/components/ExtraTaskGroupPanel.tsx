'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useScrollLock } from '@/hooks/useScrollLock'
import toast from 'react-hot-toast'
import {
  X, Zap, Play, Upload, Loader2, CheckCircle2, CheckCircle, XCircle, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskStatusBadge } from '@/components/task-auto/StatusBadge'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { isOverdue } from '@/components/task-auto/helpers'
import { SubmitModal, RejectModal } from './TaskModals'
import { Task } from '@/types/task-auto'
import { approveTask, getTasks, startTask } from '@/lib/api/task-auto'

interface Props {
  assigneeId: string
  deadlineDate: string
  onClose: () => void
  userRoles: string[]
  currentUserId?: string
}

export function ExtraTaskGroupPanel({ assigneeId, deadlineDate, onClose, userRoles, currentUserId }: Props) {
  useScrollLock()
  const qc = useQueryClient()
  const [submitTask, setSubmitTask]   = useState<Task | null>(null)
  const [rejectTask, setRejectTask]   = useState<Task | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'tasks', { task_type: 'extra', assignee_id: assigneeId, deadline_date: deadlineDate }],
    queryFn: () => getTasks({ task_type: 'extra', assignee_id: assigneeId, deadline_date: deadlineDate, limit: 100 }),
    enabled: !!assigneeId,
    refetchOnWindowFocus: true,
  })
  const tasks = data?.data ?? []

  const editor   = tasks[0]?.assignee
  const team     = tasks[0]?.team
  const deadline = tasks[0]?.deadline
  const total    = tasks.length
  const submitted = tasks.filter(t => ['SUBMITTED', 'APPROVED'].includes(t.status)).length
  const approved  = tasks.filter(t => t.status === 'APPROVED').length

  const isAssignee       = tasks.some(t => t.assignee_id === currentUserId)
  const canApproveReject = userRoles.some(r => ['ADMIN', 'MANAGER', 'LEADER'].includes(r))

  const startMut = useMutation({
    mutationFn: (taskId: string) => startTask(taskId),
    onSuccess: () => {
      toast.success('Task đã bắt đầu!')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  const approveMut = useMutation({
    mutationFn: (taskId: string) => approveTask(taskId),
    onSuccess: () => {
      toast.success('Đã duyệt task!')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  return (
    <>
      <div className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-2xl max-h-[88vh] bg-gray-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/8">

          {/* Header */}
          <div className="flex items-start gap-4 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-violet-100 text-violet-700">
                  <Zap className="w-3.5 h-3.5" /> Task sáng tạo
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {isLoading ? '...' : `${total} task thêm`}
                {editor && <span className="text-gray-500 font-normal"> — {editor.full_name}</span>}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                {team && <span>{team.name}</span>}
                {deadlineDate && (
                  <>
                    {team && <span>·</span>}
                    <span className={cn('font-medium', isOverdue(deadline ?? deadlineDate) ? 'text-red-600' : 'text-gray-600')}>
                      Ngày: {new Date(deadlineDate + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          {!isLoading && total > 0 && (
            <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">Tiến độ</span>
                <span className="font-semibold text-gray-800">
                  {submitted}/{total} đã nộp
                  {approved > 0 && <span className="text-emerald-600 ml-2">· {approved} đã duyệt</span>}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${(submitted / total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Task list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Không tìm thấy task sáng tạo</p>
            ) : (
              tasks.map((task, idx) => (
                <div key={task.id}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-start gap-4">

                  {/* Number */}
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-violet-700">{idx + 1}</span>
                  </div>

                  {/* Status + result url */}
                  <div className="flex-1 min-w-0">
                    <TaskStatusBadge status={task.status} />
                    {task.result_url && (
                      <a href={task.result_url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1.5 text-xs text-violet-600 hover:underline truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" /> {task.result_url}
                      </a>
                    )}
                    {task.reject_reason && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium">
                        Lý do từ chối: {task.reject_reason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Editor actions */}
                    {task.status === 'ASSIGNED' && isAssignee && (
                      <button
                        onClick={() => startMut.mutate(task.id)}
                        disabled={startMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white transition-colors">
                        {startMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Bắt đầu
                      </button>
                    )}
                    {(task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && isAssignee && (
                      <button
                        onClick={() => setSubmitTask(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                        <Upload className="w-3 h-3" /> Nộp
                      </button>
                    )}

                    {/* Leader/Admin/Manager approve actions */}
                    {task.status === 'SUBMITTED' && canApproveReject && (
                      <>
                        <button
                          onClick={() => approveMut.mutate(task.id)}
                          disabled={approveMut.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white transition-colors">
                          {approveMut.isPending
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCircle className="w-3 h-3" />}
                          Duyệt
                        </button>
                        <button
                          onClick={() => setRejectTask(task)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                          <XCircle className="w-3 h-3" /> Từ chối
                        </button>
                      </>
                    )}

                    {task.status === 'APPROVED' && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center px-6 py-4 bg-white border-t border-gray-200 shrink-0">
            {editor && (
              <div className="flex items-center gap-2.5">
                <AvatarInitials name={editor.full_name} size="sm" />
                <span className="text-sm font-semibold text-gray-700">{editor.full_name}</span>
              </div>
            )}
            <button onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors ml-auto">
              Đóng
            </button>
          </div>
        </div>
      </div>

      {submitTask && (
        <SubmitModal
          task={submitTask}
          onClose={() => setSubmitTask(null)}
          onSuccess={() => setSubmitTask(null)}
        />
      )}
      {rejectTask && (
        <RejectModal
          task={rejectTask}
          onClose={() => setRejectTask(null)}
          onSuccess={() => setRejectTask(null)}
        />
      )}
    </>
  )
}
