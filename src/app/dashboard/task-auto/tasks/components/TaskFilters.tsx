'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Plus, Search, RotateCcw, ChevronDown } from 'lucide-react'
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

// const TASK_TYPE_OPTIONS = [
//   { value: '', label: 'Tất cả loại' },
//   { value: 'auto', label: 'Auto' },
// ]

function todayString() {
  return dateString(new Date())
}

function dateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return dateString(d)
}

function monthStart(d = new Date()) {
  return dateString(new Date(d.getFullYear(), d.getMonth(), 1))
}

interface DatePreset {
  label: string
  range: () => [string, string]
}

const DATE_PRESETS: DatePreset[] = [
  { label: 'Hôm nay', range: () => [todayString(), todayString()] },
  { label: '7 ngày qua', range: () => [addDays(todayString(), -6), todayString()] },
  { label: '30 ngày qua', range: () => [addDays(todayString(), -29), todayString()] },
  { label: 'Tháng này', range: () => [monthStart(), todayString()] },
]

type TaskTypeFilter = 'auto' | 'manual' | ''

interface AssigneeOption { id: string; name: string }

interface Props {
  statusFilter: TaskStatus | ''
  teamFilter: string
  searchFilter: string
  dateFromFilter: string
  dateToFilter: string
  taskTypeFilter: TaskTypeFilter
  assigneeFilter: string
  assigneeOptions: AssigneeOption[]
  teams: Team[]
  canCreate: boolean
  isMember?: boolean
  hideTeamFilter?: boolean
  hideStatusFilter?: boolean
  hideDateFilter?: boolean
  /** Nhãn hiển thị trước dấu ":" của bộ lọc ngày — đổi theo tab vì ý nghĩa cột lọc khác nhau
   * (vd "Ngày" = hạn chót/ngày tạo, "Ngày duyệt" = reviewed_at ở tab "Video đã nộp"). */
  dateFilterLabel?: string
  dateFilterTooltip?: string
  /** Trạng thái "mặc định/chưa lọc" của bộ lọc ngày cho tab đang xem — quyết định khi nào badge
   * "đang lọc" bật lên và nút "Xoá lọc" trả về đâu. 'today': mặc định là hôm nay (Danh sách task/
   * Video chờ duyệt). 'all': mặc định là không giới hạn ngày (Video đã nộp — duyệt xong rồi thì
   * lọc theo "hôm nay" không còn ý nghĩa mặc định như task đang xử lý). */
  dateFilterDefaultPreset?: 'today' | 'all'
  onStatusChange: (v: TaskStatus | '') => void
  onTeamChange: (v: string) => void
  onSearchChange: (v: string) => void
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onTaskTypeChange: (v: TaskTypeFilter) => void
  onAssigneeChange: (v: string) => void
  onCreateClick: () => void
}

export function TaskFilters({
  statusFilter,
  teamFilter,
  searchFilter,
  dateFromFilter,
  dateToFilter,
  taskTypeFilter,
  assigneeFilter,
  assigneeOptions,
  teams,
  canCreate,
  isMember = false,
  hideTeamFilter = false,
  hideStatusFilter = false,
  hideDateFilter = false,
  dateFilterLabel = 'Ngày',
  dateFilterTooltip = 'Lọc theo hạn chót của task — task chưa đặt hạn thì tính theo ngày tạo',
  dateFilterDefaultPreset = 'today',
  onStatusChange,
  onTeamChange,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onTaskTypeChange,
  onAssigneeChange,
  onCreateClick,
}: Props) {
  const isToday = dateFromFilter === todayString() && dateToFilter === todayString()
  const isSingleDay = !!dateFromFilter && dateFromFilter === dateToFilter
  const isAtDefault = dateFilterDefaultPreset === 'today' ? isToday : (!dateFromFilter && !dateToFilter)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!datePickerOpen) return
    function onClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setDatePickerOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [datePickerOpen])

  function applyPreset(preset: DatePreset) {
    const [from, to] = preset.range()
    onDateFromChange(from)
    onDateToChange(to)
    setDatePickerOpen(false)
  }

  function clearDateFilter() {
    onDateFromChange('')
    onDateToChange('')
  }

  function resetDateToDefault() {
    if (dateFilterDefaultPreset === 'today') applyPreset(DATE_PRESETS[0])
    else clearDateFilter()
  }

  // Hiển thị dd/MM thay vì yyyy-mm-dd thô, kèm nhãn (vd "Ngày:") để người dùng hiểu ngay đây là
  // bộ lọc thời gian — mặc định trang lọc "Hôm nay" nên nếu không nói rõ, người dùng dễ
  // tưởng mất task trong khi chỉ là bị bộ lọc ngày che. Nhãn phải trung tính (không ghi "Hạn:")
  // vì với bộ lọc hạn chót, BE lọc theo hạn chót NHƯNG task chưa đặt hạn thì tính theo ngày tạo
  // thay thế (tasks.service.ts findAll).
  const formatShortDate = (s: string) => {
    const [, m, d] = s.split('-')
    return m && d ? `${d}/${m}` : s
  }
  const dateFilterText = !dateFromFilter && !dateToFilter
    ? `${dateFilterLabel}: Tất cả`
    : isToday
      ? `${dateFilterLabel}: Hôm nay`
      : isSingleDay
        ? `${dateFilterLabel}: ${formatShortDate(dateFromFilter)}`
        : `${dateFilterLabel}: ${dateFromFilter ? formatShortDate(dateFromFilter) : '…'} → ${dateToFilter ? formatShortDate(dateToFilter) : '…'}`

  // Gõ tìm kiếm phản hồi tức thì trên input, nhưng chỉ bắn query lên cha sau khi
  // ngừng gõ ~300ms — tránh gọi lại getTasks mỗi phím gõ (giật/nháy danh sách).
  const [localSearch, setLocalSearch] = useState(searchFilter)
  useEffect(() => { setLocalSearch(searchFilter) }, [searchFilter])
  useEffect(() => {
    if (localSearch === searchFilter) return
    const t = setTimeout(() => onSearchChange(localSearch), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch])

  const hasStatus   = !hideStatusFilter && !!statusFilter
  const hasTeam      = !isMember && !hideTeamFilter && !!teamFilter
  const hasAssignee  = !isMember && assigneeOptions.length > 0 && !!assigneeFilter
  const hasSearch    = !!searchFilter
  const hasCustomDate = !hideDateFilter && !isAtDefault
  const activeFilterCount = [hasStatus, hasTeam, hasAssignee, hasSearch, hasCustomDate].filter(Boolean).length

  function resetAllFilters() {
    if (hasStatus) onStatusChange('')
    if (hasTeam) onTeamChange('')
    if (hasAssignee) onAssigneeChange('')
    if (hasSearch) { setLocalSearch(''); onSearchChange('') }
    if (hasCustomDate) resetDateToDefault()
  }

  return (
    <div className="flex flex-wrap gap-2.5 items-center flex-1">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors"
          placeholder="Tìm kiếm theo tiêu đề..."
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
        />
      </div>

      {/* Status */}
      {!hideStatusFilter && (
        <CustomSelect
          value={statusFilter}
          onChange={v => onStatusChange(v as TaskStatus | '')}
          options={STATUS_OPTIONS}
          className="min-w-[165px]"
          compact
        />
      )}

      {/* Task type */}
      {/* <CustomSelect
        value={taskTypeFilter}
        onChange={v => onTaskTypeChange(v as TaskTypeFilter)}
        options={TASK_TYPE_OPTIONS}
        className="min-w-[135px]"
        compact
      /> */}

      {/* Team — hidden for MEMBER and LEADER */}
      {!isMember && !hideTeamFilter && (
        <CustomSelect
          value={teamFilter}
          onChange={onTeamChange}
          options={[
            { value: '', label: 'Tất cả team' },
            ...teams.map(t => ({ value: t.id, label: t.name })),
          ]}
          className="min-w-[155px]"
          searchable
          compact
        />
      )}

      {/* Người làm — ẩn ở view "của tôi" vì assignee đã khóa cứng về chính user đó */}
      {!isMember && assigneeOptions.length > 0 && (
        <CustomSelect
          value={assigneeFilter}
          onChange={onAssigneeChange}
          options={[
            { value: '', label: 'Tất cả người làm' },
            ...assigneeOptions.map(a => ({ value: a.id, label: a.name })),
          ]}
          className="min-w-[165px]"
          searchable
          compact
        />
      )}

      {/* Date range picker — bộ lọc ngày dùng chung, ý nghĩa cột đổi theo tab (xem dateFilterLabel/dateFilterTooltip) */}
      {!hideDateFilter && (
      <div className="relative" ref={datePickerRef}>
        <button
          type="button"
          onClick={() => setDatePickerOpen(o => !o)}
          title={dateFilterTooltip}
          className={cn(
            'flex items-center gap-2 pl-3.5 pr-2.5 py-3 bg-gray-50 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors',
            isToday
              ? 'border-amber-300 ring-1 ring-amber-100 text-amber-700'
              : dateFromFilter || dateToFilter
                ? 'border-indigo-400 ring-1 ring-indigo-100 text-indigo-700'
                : 'border-gray-200 text-slate-500'
          )}
        >
          <CalendarDays className={cn(
            'w-4 h-4 flex-shrink-0',
            isToday ? 'text-amber-500' : (dateFromFilter || dateToFilter) ? 'text-indigo-500' : 'text-slate-400'
          )} />
          <span className="whitespace-nowrap">{dateFilterText}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        </button>

        {datePickerOpen && (
          <div className="absolute z-20 top-full mt-1.5 left-0 w-[290px] bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-indigo-500 hover:text-white text-slate-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { clearDateFilter(); setDatePickerOpen(false) }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-slate-500 hover:text-white text-slate-600 transition-colors"
              >
                Tất cả ngày
              </button>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={dateFromFilter}
                  max={dateToFilter || undefined}
                  onChange={e => onDateFromChange(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={dateToFilter}
                  min={dateFromFilter || undefined}
                  onChange={e => onDateToChange(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Xoá lọc — chỉ hiện khi có filter khác mặc định đang bật */}
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={resetAllFilters}
          className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-gray-100 transition-colors flex-shrink-0 ml-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Xoá lọc
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
            {activeFilterCount}
          </span>
        </button>
      )}

      {/* Create button */}
      {canCreate && (
        <button
          onClick={onCreateClick}
          className={cn(
            'bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3 text-sm font-semibold flex items-center gap-2 transition-colors flex-shrink-0 shadow-sm',
            activeFilterCount === 0 && 'ml-auto'
          )}
        >
          <Plus className="w-4 h-4" />
          Tạo task
        </button>
      )}
    </div>
  )
}
