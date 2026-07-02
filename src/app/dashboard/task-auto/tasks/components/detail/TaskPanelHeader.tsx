'use client'

import { X, Edit2, Zap, Target, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskStatusBadge } from '@/components/task-auto/StatusBadge'
import type { Task } from '@/types/task-auto'

interface Props {
  task: Task | undefined
  editMode: boolean
  contentTitle?: string | null
  productName?: string | null
  productSku?: string | null
  onToggleEdit: () => void
  onClose: () => void
}

export function TaskPanelHeader({
  task, editMode, contentTitle, productName, productSku,
  onToggleEdit, onClose,
}: Props) {
  return (
    <div className="flex items-start gap-4 px-6 py-4 bg-white border-b border-gray-100 shrink-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-2">
            {contentTitle || 'Chi tiết Task'}
          </h2>
          {task && <TaskStatusBadge status={task.status} />}
          {task && (task.task_type === 'AUTO' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              <Target className="w-3 h-3" /> Auto
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
              <Zap className="w-3 h-3" /> Sáng tạo
            </span>
          ))}
        </div>
        {productName && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
            <ShoppingBag className="w-3 h-3 shrink-0" />
            <span className="truncate">{productName}</span>
            {productSku && <span className="font-mono text-gray-300 shrink-0">· {productSku}</span>}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {task && task.task_type === 'EXTRA' && (
          <button
            onClick={onToggleEdit}
            title={editMode ? 'Thoát chỉnh sửa' : 'Chỉnh sửa task'}
            className={cn(
              'px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5',
              editMode
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            )}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {editMode ? 'Đang sửa' : 'Sửa'}
          </button>
        )}
        <button onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
