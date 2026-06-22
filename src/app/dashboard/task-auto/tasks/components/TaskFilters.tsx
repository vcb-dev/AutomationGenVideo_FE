'use client'

import { CalendarDays, Info, Plus, Search, X } from 'lucide-react'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { cn } from '@/lib/utils'
import { TaskStatus, Team } from '@/types/task-auto'

const STATUS_OPTIONS: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ASSIGNED', label: 'Đã giao' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'SUBMITTED', label: 'Đã nộp' },
  { value: 'APPROVED', label: 'Đã duyệt' },
]

const TASK_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'auto', label: 'Auto' },
]

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type TaskTypeFilter = 'auto' | 'manual' | ''

interface Props {
  statusFilter: TaskStatus | ''
  teamFilter: string
  searchFilter: string
  deadlineDateFilter: string
  taskTypeFilter: TaskTypeFilter
  teams: Team[]
  canCreate: boolean
  isMember?: boolean
  hideTeamFilter?: boolean
  onStatusChange: (v: TaskStatus | '') => void
  onTeamChange: (v: string) => void
  onSearchChange: (v: string) => void
  onDeadlineDateChange: (v: string) => void
  onTaskTypeChange: (v: TaskTypeFilter) => void
  onCreateClick: () => void
}

export function TaskFilters({
  statusFilter,
  teamFilter,
  searchFilter,
  deadlineDateFilter,
  taskTypeFilter,
  teams,
  canCreate,
  isMember = false,
  hideTeamFilter = false,
  onStatusChange,
  onTeamChange,
  onSearchChange,
  onDeadlineDateChange,
  onTaskTypeChange,
  onCreateClick,
}: Props) {
  const isToday = deadlineDateFilter === todayString()

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      {isMember && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3.5 mb-4">
          <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <p className="text-base font-semibold text-indigo-700">Đang xem task của bạn</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Tìm kiếm theo tiêu đề..."
            value={searchFilter}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        {/* Status */}
        <CustomSelect
          value={statusFilter}
          onChange={v => onStatusChange(v as TaskStatus | '')}
          options={STATUS_OPTIONS}
          className="min-w-[190px]"
        />

        {/* Task type */}
        <CustomSelect
          value={taskTypeFilter}
          onChange={v => onTaskTypeChange(v as TaskTypeFilter)}
          options={TASK_TYPE_OPTIONS}
          className="min-w-[155px]"
        />

        {/* Team — hidden for MEMBER and LEADER */}
        {!isMember && !hideTeamFilter && (
          <CustomSelect
            value={teamFilter}
            onChange={onTeamChange}
            options={[
              { value: '', label: 'Tất cả team' },
              ...teams.map(t => ({ value: t.id, label: t.name })),
            ]}
            className="min-w-[175px]"
            searchable
          />
        )}

        {/* Deadline date picker */}
        <div className="relative">
          <CalendarDays className={cn(
            'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
            isToday ? 'text-amber-500' : deadlineDateFilter ? 'text-indigo-500' : 'text-slate-400'
          )} />
          <input
            type="date"
            value={deadlineDateFilter}
            onChange={e => onDeadlineDateChange(e.target.value)}
            className={cn(
              'pl-10 py-3.5 bg-white border rounded-xl text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors',
              deadlineDateFilter ? 'pr-8 min-w-[165px]' : 'pr-4 min-w-[165px]',
              isToday
                ? 'border-amber-300 ring-1 ring-amber-100'
                : deadlineDateFilter
                  ? 'border-indigo-400 ring-1 ring-indigo-200'
                  : 'border-gray-200'
            )}
            title="Lọc theo ngày hết hạn"
          />
          {deadlineDateFilter && (
            <button
              onClick={() => onDeadlineDateChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isToday && (
            <span className="absolute -top-2 left-3 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full leading-none">
              Hôm nay
            </span>
          )}
        </div>

        {/* Create button */}
        {canCreate && (
          <button
            onClick={onCreateClick}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors flex-shrink-0 ml-auto"
          >
            <Plus className="w-5 h-5" />
            Tạo task
          </button>
        )}
      </div>
    </div>
  )
}
