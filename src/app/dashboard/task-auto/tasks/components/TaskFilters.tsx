'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, RotateCcw, AlertTriangle, SlidersHorizontal, X } from 'lucide-react'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { DateRangeFilter, todayString } from '@/components/task-auto/DateRangeFilter'
import { cn } from '@/lib/utils'
import { TaskStatus, Team } from '@/types/task-auto'

const STATUS_OPTIONS: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'ASSIGNED', label: 'Đã giao' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'SUBMITTED', label: 'Đã nộp' },
  { value: 'APPROVED', label: 'Đã duyệt' },
]

// const TASK_TYPE_OPTIONS = [
//   { value: '', label: 'Tất cả loại' },
//   { value: 'auto', label: 'Auto' },
// ]

type TaskTypeFilter = 'auto' | 'manual' | ''

interface AssigneeOption { id: string; name: string }
interface LineOption { id: string; name: string }

// Bảng chọn "Bộ lọc" — rộng cố định, co lại theo màn hình hẹp
const MORE_PANEL_WIDTH = 340

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
  isMember?: boolean
  hideTeamFilter?: boolean
  hideStatusFilter?: boolean
  hideDateFilter?: boolean
  /** Bộ lọc "Quá hạn" (ảo, không phải 1 status) — chỉ có ý nghĩa ở layout Danh sách (bảng phẳng);
   * Kanban hiện task quá hạn ngay trong cột trạng thái kèm badge cảnh báo nên không cần bộ lọc này. */
  showOverdueFilter?: boolean
  overdueFilter?: boolean
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
  onOverdueChange?: (v: boolean) => void
  /** Lọc theo tuyến nội dung / dòng sản phẩm của task — không truyền onContentLineChange/
   * onProductLineChange thì nhóm tương ứng trong bảng "Bộ lọc" ẩn. */
  contentLineFilter?: string
  productLineFilter?: string
  contentLineOptions?: LineOption[]
  productLineOptions?: LineOption[]
  onContentLineChange?: (v: string) => void
  onProductLineChange?: (v: string) => void
  /** Ô tìm kiếm tìm trong gì — đổi theo tab (tiêu đề task / caption bài đăng) */
  searchPlaceholder?: string
  /** Có giá trị = bộ lọc dòng SP không áp dụng ở tab đang xem (vẫn giữ giá trị, chỉ làm mờ + giải thích) */
  productLineDisabledReason?: string
}

/**
 * Thanh lọc chung của màn Nhiệm vụ, chia 2 tầng:
 * - Luôn hiện: Tìm kiếm · Team · Người làm · Ngày.
 * - Gom vào nút "Bộ lọc": Trạng thái, Quá hạn, Tuyến, Dòng SP — đang lọc theo nhóm này thì hiện chip
 * dưới thanh để không bị "lọc ngầm".
 */
export function TaskFilters({
  statusFilter,
  teamFilter,
  searchFilter,
  dateFromFilter,
  dateToFilter,
  assigneeFilter,
  assigneeOptions,
  teams,
  isMember = false,
  hideTeamFilter = false,
  hideStatusFilter = false,
  hideDateFilter = false,
  showOverdueFilter = false,
  overdueFilter = false,
  dateFilterLabel = 'Ngày',
  dateFilterTooltip = 'Lọc theo hạn chót của task — task chưa đặt hạn thì tính theo ngày tạo',
  dateFilterDefaultPreset = 'today',
  onStatusChange,
  onTeamChange,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onAssigneeChange,
  onOverdueChange,
  contentLineFilter = '',
  productLineFilter = '',
  contentLineOptions = [],
  productLineOptions = [],
  onContentLineChange,
  onProductLineChange,
  searchPlaceholder = 'Tìm kiếm theo tiêu đề...',
  productLineDisabledReason,
}: Props) {
  const isToday = dateFromFilter === todayString() && dateToFilter === todayString()
  const isAtDefault = dateFilterDefaultPreset === 'today' ? isToday : (!dateFromFilter && !dateToFilter)

  function resetDateToDefault() {
    const v = dateFilterDefaultPreset === 'today' ? todayString() : ''
    onDateFromChange(v)
    onDateToChange(v)
  }

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

  // Bật "Quá hạn" thì BE bỏ qua status/deadline_from/to hoàn toàn (xem tasks.service.ts findAll
  // q.overdue) — 2 bộ lọc đó coi như không áp dụng, disable trên UI để khỏi gây hiểu nhầm.
  const hasOverdue  = showOverdueFilter && overdueFilter
  const hasStatus   = !hideStatusFilter && !hasOverdue && !!statusFilter
  const hasTeam      = !isMember && !hideTeamFilter && !!teamFilter
  const hasAssignee  = !isMember && assigneeOptions.length > 0 && !!assigneeFilter
  const hasSearch    = !!searchFilter
  const hasCustomDate = !hideDateFilter && !hasOverdue && !isAtDefault
  const hasContentLine = !!onContentLineChange && !!contentLineFilter
  const hasProductLine = !!onProductLineChange && !!productLineFilter
  const activeFilterCount = [hasStatus, hasTeam, hasAssignee, hasSearch, hasCustomDate, hasOverdue, hasContentLine, hasProductLine].filter(Boolean).length
  // Số bộ lọc đang bật trong bảng "Bộ lọc" — hiện trên nút để biết đang lọc ngầm bao nhiêu thứ
  const moreFilterCount = [hasStatus, hasOverdue, hasContentLine, hasProductLine].filter(Boolean).length
  const hasMoreFilters = !hideStatusFilter || showOverdueFilter || !!onContentLineChange || !!onProductLineChange

  function resetAllFilters() {
    if (hasOverdue) onOverdueChange?.(false)
    if (hasStatus) onStatusChange('')
    if (hasTeam) onTeamChange('')
    if (hasAssignee) onAssigneeChange('')
    if (hasSearch) { setLocalSearch(''); onSearchChange('') }
    if (hasCustomDate) resetDateToDefault()
    if (hasContentLine) onContentLineChange?.('')
    if (hasProductLine) onProductLineChange?.('')
  }

  const contentLineName = contentLineOptions.find(l => l.id === contentLineFilter)?.name ?? '…'
  const productLineName = productLineOptions.find(l => l.id === productLineFilter)?.name ?? '…'
  const statusName = STATUS_OPTIONS.find(o => o.value === statusFilter)?.label ?? statusFilter

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2.5 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            aria-label={searchPlaceholder}
            className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
          />
        </div>

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

        {/* Date range picker — bộ lọc ngày dùng chung, ý nghĩa cột đổi theo tab (xem dateFilterLabel/dateFilterTooltip)
            — disable khi đang lọc "Quá hạn" vì BE bỏ qua deadline_from/to trong trường hợp đó */}
        {!hideDateFilter && (
        <div
          className={cn(hasOverdue && 'opacity-40 pointer-events-none')}
          title={hasOverdue ? 'Không áp dụng khi đang lọc Quá hạn' : undefined}
        >
          <DateRangeFilter
            from={dateFromFilter}
            to={dateToFilter}
            onFromChange={onDateFromChange}
            onToChange={onDateToChange}
            label={dateFilterLabel}
            tooltip={dateFilterTooltip}
          />
        </div>
        )}

        {hasMoreFilters && (
          <MoreFiltersButton count={moreFilterCount}>
            {!hideStatusFilter && (
              <PillGroup
                label="Trạng thái"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={v => onStatusChange(v as TaskStatus | '')}
                disabledReason={hasOverdue ? 'Không áp dụng khi đang lọc Quá hạn' : undefined}
              />
            )}

            {/* Quá hạn — bộ lọc ảo (không phải 1 status thật): task đang xử lý (chưa duyệt/huỷ) có
                deadline đã qua thời điểm hiện tại. Bật lên thì bỏ qua Trạng thái + bộ lọc ngày. */}
            {showOverdueFilter && (
              <button
                type="button"
                aria-pressed={overdueFilter}
                onClick={() => onOverdueChange?.(!overdueFilter)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                  overdueFilter
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-gray-200 text-slate-600 hover:border-red-200 hover:bg-red-50/60',
                )}
              >
                <AlertTriangle className={cn('w-4 h-4 shrink-0', overdueFilter ? 'text-red-500' : 'text-slate-400')} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Chỉ task quá hạn</span>
                  <span className="block text-xs text-slate-500">Task đang xử lý đã qua hạn chót — bỏ qua Trạng thái và Ngày</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative w-9 h-5 rounded-full shrink-0 transition-colors',
                    overdueFilter ? 'bg-red-500' : 'bg-gray-300',
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none',
                    overdueFilter && 'translate-x-4',
                  )} />
                </span>
              </button>
            )}

            {onContentLineChange && (
              <PillGroup
                label="Tuyến nội dung"
                value={contentLineFilter}
                options={[{ value: '', label: 'Tất cả' }, ...contentLineOptions.map(l => ({ value: l.id, label: l.name }))]}
                onChange={onContentLineChange}
              />
            )}

            {onProductLineChange && (
              <PillGroup
                label="Dòng sản phẩm"
                value={productLineFilter}
                options={[{ value: '', label: 'Tất cả' }, ...productLineOptions.map(l => ({ value: l.id, label: l.name }))]}
                onChange={onProductLineChange}
                disabledReason={productLineDisabledReason}
              />
            )}
          </MoreFiltersButton>
        )}

        {/* Xoá lọc — chỉ hiện khi có filter khác mặc định đang bật */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Xoá lọc
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>

      {/* Chip các bộ lọc đang bật trong bảng "Bộ lọc" — các ô luôn hiện ở trên đã tự hiện giá trị */}
      {moreFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Bộ lọc đang bật">
          {hasOverdue && (
            <FilterChip tone="danger" label="Quá hạn" onRemove={() => onOverdueChange?.(false)} />
          )}
          {hasStatus && (
            <FilterChip label={`Trạng thái: ${statusName}`} onRemove={() => onStatusChange('')} />
          )}
          {hasContentLine && (
            <FilterChip label={`Tuyến ${contentLineName}`} onRemove={() => onContentLineChange?.('')} />
          )}
          {hasProductLine && (
            <FilterChip
              label={`Dòng SP: ${productLineName}`}
              muted={!!productLineDisabledReason}
              title={productLineDisabledReason}
              onRemove={() => onProductLineChange?.('')}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Nút "Bộ lọc" + bảng chọn thả xuống chứa các nhóm lọc phụ. Bảng neo theo mép phải nút, tự dịch
 * vào trong khi nút nằm sát mép trái màn hình hẹp (thanh lọc xuống dòng trên mobile). */
function MoreFiltersButton({ count, children }: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [offsetLeft, setOffsetLeft] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onEscape, true)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onEscape, true)
    }
  }, [open])

  function toggle() {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) {
      const width = Math.min(MORE_PANEL_WIDTH, window.innerWidth - 16)
      const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8)
      setOffsetLeft(left - r.left)
    }
    setOpen(o => !o)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'flex items-center gap-2 px-3.5 py-3 rounded-xl text-sm font-semibold border transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          count > 0
            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
            : 'bg-gray-50 border-gray-200 text-slate-600 hover:bg-gray-100',
        )}
      >
        <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        Bộ lọc
        {count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Bộ lọc thêm"
          style={{ left: offsetLeft, width: `min(${MORE_PANEL_WIDTH}px, calc(100vw - 16px))` }}
          className="absolute z-30 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-4"
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** Một nhóm lựa chọn dạng nút bấm (ít lựa chọn nên bấm 1 lần là xong, không cần mở thêm dropdown). */
function PillGroup({
  label, value, options, onChange, disabledReason,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  disabledReason?: string
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-xs font-semibold text-slate-500 mb-1.5">{label}</p>
      <div className={cn('flex flex-wrap gap-1.5', disabledReason && 'opacity-40')}>
        {options.map(o => {
          const active = value === o.value
          return (
            <button
              key={o.value || '__all'}
              type="button"
              aria-pressed={active}
              disabled={!!disabledReason}
              onClick={() => onChange(o.value)}
              className={cn(
                'h-9 px-3 rounded-lg border text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed',
                active
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {disabledReason && <p className="mt-1.5 text-xs text-slate-500">{disabledReason}</p>}
    </div>
  )
}

function FilterChip({
  label, onRemove, tone = 'default', muted = false, title,
}: {
  label: string
  onRemove: () => void
  tone?: 'default' | 'danger'
  muted?: boolean
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full text-xs font-semibold',
        tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700',
        muted && 'opacity-50',
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Bỏ lọc ${label}`}
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          tone === 'danger' ? 'hover:bg-red-100' : 'hover:bg-indigo-100',
        )}
      >
        <X className="w-3 h-3" aria-hidden="true" />
      </button>
    </span>
  )
}
