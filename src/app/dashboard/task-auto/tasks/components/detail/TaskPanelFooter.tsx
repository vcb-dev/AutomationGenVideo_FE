'use client'

import { Loader2, Play, Upload, CheckCircle2, XCircle, RotateCcw, Ban, Check, CalendarClock } from 'lucide-react'
import type { Task } from '@/types/task-auto'

interface Props {
  task: Task
  editMode: boolean
  isAssignee: boolean
  canApproveReject: boolean
  canCancel: boolean
  canStart: boolean
  canSchedulePost: boolean
  isPendingStart: boolean
  isPendingApprove: boolean
  isPendingCancel: boolean
  isPendingUpdate: boolean
  onClose: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onStart: () => void
  onSubmit: () => void
  onApprove: () => void
  onReject: () => void
  onCancel: () => void
  onResubmit: () => void
  onSchedulePost: () => void
}

export function TaskPanelFooter({
  task, editMode,
  isAssignee, canApproveReject, canCancel, canStart, canSchedulePost,
  isPendingStart, isPendingApprove, isPendingCancel, isPendingUpdate,
  onClose, onCancelEdit, onSaveEdit,
  onStart, onSubmit, onApprove, onReject, onCancel, onResubmit, onSchedulePost,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white border-t border-gray-200 shrink-0">
      {editMode ? (
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onCancelEdit}
            className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={onSaveEdit}
            disabled={isPendingUpdate}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            {isPendingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Lưu thay đổi
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Đóng
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            {canStart && (
              <button onClick={onStart} disabled={isPendingStart}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                {isPendingStart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Bắt đầu làm
              </button>
            )}
            {(task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && isAssignee && (
              <button onClick={onSubmit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4" /> Nộp task
              </button>
            )}
            {task.status === 'SUBMITTED' && canApproveReject && (
              <>
                <button onClick={onApprove} disabled={isPendingApprove}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                  {isPendingApprove ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Duyệt
                </button>
                <button onClick={onReject}
                  className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                  <XCircle className="w-4 h-4" /> Từ chối
                </button>
              </>
            )}
            {task.status === 'REJECTED' && isAssignee && (
              <button onClick={onResubmit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                <RotateCcw className="w-4 h-4" /> Nộp lại
              </button>
            )}
            {canSchedulePost && (
              <button onClick={onSchedulePost}
                className="border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                <CalendarClock className="w-4 h-4" /> Lên lịch đăng bài
              </button>
            )}
            {!['APPROVED', 'REJECTED', 'CANCELLED'].includes(task.status) && canCancel && (
              <button
                onClick={() => { if (confirm('Bạn có chắc muốn huỷ task này?')) onCancel() }}
                disabled={isPendingCancel}
                className="border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                {isPendingCancel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Huỷ task
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
