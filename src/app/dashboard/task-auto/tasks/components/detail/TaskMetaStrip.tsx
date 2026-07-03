import { User, CalendarDays, Users2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { formatDateTime, isOverdue } from '@/components/task-auto/helpers'
import type { Task, UserBasic } from '@/types/task-auto'

interface AssigneeEditProps {
  value: string
  onChange: (id: string) => void
  options: UserBasic[]
}

export function TaskMetaStrip({ task, assigneeEdit }: { task: Task; assigneeEdit?: AssigneeEditProps }) {
  const overdue = isOverdue(task.deadline) && !['APPROVED', 'CANCELLED'].includes(task.status)
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <User className="w-3 h-3 text-gray-400" />
            <p className="text-xs font-medium text-gray-400">Người thực hiện</p>
          </div>
          {assigneeEdit ? (
            <CustomSelect
              value={assigneeEdit.value}
              onChange={assigneeEdit.onChange}
              compact
              options={[
                { value: '', label: '— Chưa giao —' },
                ...assigneeEdit.options.map(u => ({ value: u.id, label: u.full_name })),
              ]}
            />
          ) : task.assignee ? (
            <div className="flex items-center gap-2 min-w-0">
              <AvatarInitials name={task.assignee.full_name} size="xs" />
              <span className="text-sm font-semibold text-gray-800 truncate">{task.assignee.full_name}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Chưa giao</p>
          )}
        </div>

        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarDays className={cn('w-3 h-3', overdue ? 'text-red-400' : 'text-gray-400')} />
            <p className={cn('text-xs font-medium', overdue ? 'text-red-400' : 'text-gray-400')}>Deadline</p>
          </div>
          <div className="flex items-center gap-1.5">
            {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
            <p className={cn('text-sm font-semibold', overdue ? 'text-red-600' : 'text-gray-800')}>
              {formatDateTime(task.deadline) || '—'}
            </p>
          </div>
        </div>

        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Users2 className="w-3 h-3 text-gray-400" />
            <p className="text-xs font-medium text-gray-400">Đội nhóm</p>
          </div>
          <p className="text-sm font-semibold text-gray-800">{task.team?.name || '—'}</p>
        </div>
      </div>
    </div>
  )
}
