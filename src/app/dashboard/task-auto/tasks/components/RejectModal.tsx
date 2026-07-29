'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkTextarea } from '@/components/task-auto/DarkInput'
import { rejectTask } from '@/lib/api/task-auto'
import type { Task } from '@/types/task-auto'

interface Props {
  task: Task
  onClose: () => void
  onSuccess: () => void
}

export function RejectModal({ task, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => rejectTask(task.id, reason),
    onSuccess: () => {
      toast.success('Đã từ chối task')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', task.id] })
      onSuccess()
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  return (
    <DarkModal
      open
      onClose={onClose}
      title="Từ chối task"
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !reason.trim()}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            {mutation.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </button>
        </>
      }
    >
      <DarkTextarea
        label="Lý do từ chối *"
        rows={3}
        placeholder="Nhập lý do từ chối..."
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
    </DarkModal>
  )
}
