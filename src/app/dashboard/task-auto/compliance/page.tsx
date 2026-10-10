'use client'

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardX,
  Clock3,
  ExternalLink,
  Loader2,
  ShieldAlert,
  XCircle,
} from 'lucide-react'

import { NumberedPagination } from '@/components/ui/NumberedPagination'
import { getComplianceDay, getComplianceHistory, getTeams } from '@/lib/api/task-auto'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { UserRole } from '@/types/auth'
import {
  TASK_STATUS_LABELS,
  type ComplianceDayGroup,
  type ComplianceDayLine,
  type ComplianceDayTask,
  type DailyTaskComplianceSource,
} from '@/types/task-auto'
import { getComplianceVisibleTeams } from './compliance-access'

function localDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayHeading(value: string): string {
  const label = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatDeadline(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

function CompliancePageContent() {
  const searchParams = useSearchParams()
  const requestedDate = searchParams.get('date')
  const validRequestedDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : null
  const today = localDate(new Date())
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

  const [from, setFrom] = useState(validRequestedDate ?? localDate(thirtyDaysAgo))
  const [to, setTo] = useState(validRequestedDate ?? today)
  const [teamId, setTeamId] = useState('')
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const { user } = useAuthStore()
  const roles = user?.roles ?? []
  const canViewTeamScope = roles.some(role =>
    [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER].includes(role),
  )
  // Leader không cần chọn team: API lịch sử tự khóa theo team.leader_id của JWT.
  // Chỉ Admin/Manager cần dropdown để chuyển giữa các team.
  const canChooseTeam = roles.some(role =>
    role === UserRole.ADMIN || role === UserRole.MANAGER,
  )
  const effectiveTeamId = canChooseTeam ? teamId : ''

  const { data: teams = [] } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
    enabled: !!user?.id && canViewTeamScope,
  })
  const visibleTeams = useMemo(
    () => getComplianceVisibleTeams(teams, roles, user?.id),
    [teams, roles, user?.id],
  )
  const members = useMemo(() => {
    const source = effectiveTeamId
      ? visibleTeams.filter(team => team.id === effectiveTeamId)
      : visibleTeams
    const byId = new Map<string, { id: string; name: string }>()
    for (const team of source) {
      for (const member of team.members ?? []) {
        byId.set(member.user_id, {
          id: member.user_id,
          name: member.user?.full_name || member.user_id,
        })
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [visibleTeams, effectiveTeamId])

  const query = useQuery({
    queryKey: ['task-auto', 'compliance-history', user?.id, from, to, effectiveTeamId, userId, page],
    queryFn: () => getComplianceHistory({
      from,
      to,
      team_id: effectiveTeamId || undefined,
      user_id: userId || undefined,
      page,
      limit: 20,
    }),
    enabled: !!user?.id && !!from && !!to,
  })
  const groups = query.data?.data ?? []

  // Các dòng của trang đã sắp theo ngày giảm dần — gom liên tiếp để chèn tiêu đề ngày.
  const days = useMemo(() => {
    const result: { date: string; groups: ComplianceDayGroup[] }[] = []
    for (const group of groups) {
      const last = result[result.length - 1]
      if (last?.date === group.work_date) last.groups.push(group)
      else result.push({ date: group.work_date, groups: [group] })
    }
    return result
  }, [groups])

  // Mở từ thông báo (?date=) mà ngày đó chỉ có một dòng → mở sẵn chi tiết.
  const autoExpanded = useRef(false)
  useEffect(() => {
    if (autoExpanded.current || !validRequestedDate || !query.data) return
    autoExpanded.current = true
    if (query.data.data.length === 1) setExpanded(new Set([query.data.data[0].key]))
  }, [query.data, validRequestedDate])

  const updateFilter = (fn: () => void) => {
    fn()
    setPage(1)
    setExpanded(new Set())
  }
  const changePage = (next: number) => {
    setPage(next)
    setExpanded(new Set())
  }
  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-red-600 text-sm font-bold mb-1.5">
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            Theo dõi tuân thủ kế hoạch ngày
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Theo dõi nhiệm vụ còn thiếu</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Ghi nhận sau hạn chót theo số task đã nộp đúng hạn. A4 lấy từ task tự động; các tuyến khác lấy từ chỉ tiêu kế hoạch ngày.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            Từ ngày
            <input
              type="date"
              value={from}
              max={to}
              onChange={event => updateFilter(() => setFrom(event.target.value))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            Đến ngày
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={event => updateFilter(() => setTo(event.target.value))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </label>
          {canChooseTeam && (
            <SelectFilter
              label="Team"
              value={teamId}
              onChange={value => updateFilter(() => { setTeamId(value); setUserId('') })}
              options={visibleTeams.map(team => ({ value: team.id, label: team.name }))}
              placeholder="Tất cả team"
            />
          )}
          {canViewTeamScope && (
            <SelectFilter
              label="Thành viên"
              value={userId}
              onChange={value => updateFilter(() => setUserId(value))}
              options={members.map(member => ({ value: member.id, label: member.name }))}
              placeholder="Tất cả thành viên"
            />
          )}
        </div>
      </header>

      {query.isError && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          Không tải được lịch sử nhiệm vụ còn thiếu. Vui lòng thử lại.
          <button onClick={() => query.refetch()} className="ml-auto underline underline-offset-2">Thử lại</button>
        </div>
      )}

      <section aria-label="Tổng hợp nhiệm vụ còn thiếu" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={AlertTriangle}
          label="Tổng nhiệm vụ còn thiếu"
          value={query.data?.summary.missing ?? 0}
          tone="red"
        />
        <SummaryCard
          icon={ClipboardX}
          label="Lượt người × ngày bị thiếu"
          value={query.data?.summary.person_days ?? 0}
          tone="amber"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Đã nộp / Phải làm"
          value={`${query.data?.summary.completed ?? 0}/${query.data?.summary.expected ?? 0}`}
          tone="indigo"
        />
      </section>

      <section aria-labelledby="history-title" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
          <div>
            <h2 id="history-title" className="font-black text-slate-900">Theo từng người, từng ngày</h2>
            <p className="text-xs text-slate-500 mt-0.5">Bấm vào một người để xem hôm đó thiếu tuyến nào, task nào.</p>
          </div>
          {query.isFetching && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" aria-label="Đang tải" />}
        </div>

        {query.isLoading ? (
          <div className="p-5 space-y-3" aria-busy="true" aria-label="Đang tải lịch sử">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : !groups.length ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="font-bold text-slate-700">Không có nhiệm vụ nào bị thiếu trong khoảng đã chọn</p>
            <p className="text-sm text-slate-400 mt-1">Kết quả chỉ xuất hiện sau khi ngày làm việc đã kết thúc.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-3 font-bold">Thành viên</th>
                    <th className="text-left px-4 py-3 font-bold">Team</th>
                    <th className="text-left px-4 py-3 font-bold">Tuyến bị thiếu</th>
                    <th className="text-center px-4 py-3 font-bold">Đúng hạn</th>
                    <th className="text-center px-4 py-3 font-bold">Còn thiếu</th>
                    <th className="w-12 px-4 py-3"><span className="sr-only">Chi tiết</span></th>
                  </tr>
                </thead>
                {days.map(day => (
                  <tbody key={day.date} className="divide-y divide-slate-100 border-b border-slate-100 last:border-b-0">
                    <tr>
                      <th colSpan={6} scope="colgroup" className="bg-slate-50 px-6 py-2 text-left text-xs font-black text-slate-600">
                        {formatDayHeading(day.date)}
                      </th>
                    </tr>
                    {day.groups.map(group => {
                      const isOpen = expanded.has(group.key)
                      const detailId = `compliance-day-${group.key}`
                      return (
                        <Fragment key={group.key}>
                          <tr
                            onClick={() => toggle(group.key)}
                            className={cn('cursor-pointer transition-colors', isOpen ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70')}
                          >
                            <td className="px-6 py-3.5">
                              <button
                                type="button"
                                aria-expanded={isOpen}
                                aria-controls={detailId}
                                onClick={event => { event.stopPropagation(); toggle(group.key) }}
                                className="text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
                              >
                                <span className="block font-bold text-slate-800">{group.user.full_name}</span>
                                <span className="block text-xs text-slate-400">{group.user.email}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-medium">{group.teams.map(team => team.name).join(', ')}</td>
                            <td className="px-4 py-3.5"><LineChips group={group} /></td>
                            <td className="px-4 py-3.5 text-center font-black text-slate-700">{group.completed_count}/{group.expected_count}</td>
                            <td className="px-4 py-3.5 text-center"><MissingBadge value={group.missing_count} /></td>
                            <td className="px-4 py-3.5 text-right">
                              <ChevronDown
                                className={cn('w-5 h-5 text-slate-400 transition-transform duration-200 inline-block', isOpen && 'rotate-180 text-indigo-500')}
                                aria-hidden="true"
                              />
                            </td>
                          </tr>
                          {isOpen && (
                            <tr id={detailId}>
                              <td colSpan={6} className="bg-slate-50/70 px-6 py-5 border-t border-indigo-100">
                                <DayDetail group={group} teamId={effectiveTeamId} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                ))}
              </table>
            </div>

            <div className="lg:hidden">
              {days.map(day => (
                <div key={day.date}>
                  <h3 className="bg-slate-50 px-5 py-2 text-xs font-black text-slate-600 border-y border-slate-100">
                    {formatDayHeading(day.date)}
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {day.groups.map(group => {
                      const isOpen = expanded.has(group.key)
                      const detailId = `compliance-day-m-${group.key}`
                      return (
                        <article key={group.key} className={cn(isOpen && 'bg-indigo-50/40')}>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={detailId}
                            onClick={() => toggle(group.key)}
                            className="w-full text-left p-5 space-y-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block font-black text-slate-900">{group.user.full_name}</span>
                                <span className="block text-xs text-slate-500">
                                  {group.teams.map(team => team.name).join(', ')} · đúng hạn {group.completed_count}/{group.expected_count}
                                </span>
                              </span>
                              <span className="flex items-center gap-2 shrink-0">
                                <MissingBadge value={group.missing_count} />
                                <ChevronDown
                                  className={cn('w-5 h-5 text-slate-400 transition-transform duration-200', isOpen && 'rotate-180 text-indigo-500')}
                                  aria-hidden="true"
                                />
                              </span>
                            </span>
                            <LineChips group={group} />
                          </button>
                          {isOpen && (
                            <div id={detailId} className="px-4 pb-5">
                              <DayDetail group={group} teamId={effectiveTeamId} />
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!!query.data?.totalPages && query.data.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100">
            <NumberedPagination page={page} totalPages={query.data.totalPages} onPageChange={changePage} />
          </div>
        )}
      </section>
    </div>
  )
}

/** Chi tiết một người trong một ngày — chỉ tải khi mở. */
function DayDetail({ group, teamId }: { group: ComplianceDayGroup; teamId: string }) {
  const query = useQuery({
    queryKey: ['task-auto', 'compliance-day', group.user.id, group.work_date, teamId],
    queryFn: () => getComplianceDay({
      date: group.work_date,
      user_id: group.user.id,
      team_id: teamId || undefined,
    }),
    staleTime: 60_000,
  })

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-busy="true" aria-label="Đang tải chi tiết">
        {Array.from({ length: Math.min(group.lines.length, 2) || 1 }).map((_, i) => (
          <div key={i} className="h-36 rounded-xl bg-white border border-slate-200 animate-pulse" />
        ))}
      </div>
    )
  }
  if (query.isError || !query.data) {
    return (
      <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
        Không tải được chi tiết ngày này.
        <button type="button" onClick={() => query.refetch()} className="ml-auto underline underline-offset-2">Thử lại</button>
      </div>
    )
  }

  const { summary, lines } = query.data
  const multiTeam = new Set(lines.map(line => line.team.id)).size > 1
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-bold text-slate-700">
          Cả ngày: đúng hạn {summary.completed}/{summary.expected} task · <span className="text-red-600">thiếu {summary.missing}</span>
        </span>
        <span className="text-slate-400">Số thiếu chốt lúc hết hạn; trạng thái task là hiện tại.</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {lines.map(line => <LineDetailCard key={line.id} line={line} showTeam={multiTeam} />)}
      </div>
    </div>
  )
}

function LineDetailCard({ line, showTeam }: { line: ComplianceDayLine; showTeam: boolean }) {
  const isShort = line.missing_count > 0
  return (
    <div className={cn('rounded-xl border bg-white', isShort ? 'border-slate-200' : 'border-emerald-100')}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 space-y-1.5">
          <LineBadge name={line.content_line.name} source={line.source} />
          <p className="text-xs text-slate-500">
            {showTeam && <>{line.team.name} · </>}
            Đúng hạn <span className="font-bold text-slate-700">{line.completed_count}/{line.expected_count}</span>
            {' · '}Hạn {formatDeadline(line.deadline)}
          </p>
        </div>
        {isShort ? (
          <MissingBadge value={line.missing_count} />
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Đủ
          </span>
        )}
      </div>

      {isShort && (
        <ul className="border-t border-slate-100 p-1.5 space-y-0.5">
          {line.tasks.map(task => <TaskRow key={task.id} task={task} />)}
          {line.untracked_missing > 0 && (
            <li className="flex items-center gap-3 rounded-lg border border-dashed border-red-200 bg-red-50/50 px-3 py-2.5 m-1">
              <CircleDashed className="w-4 h-4 text-red-500 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-red-700">
                {line.source === 'DAILY_PLAN'
                  ? `Chưa tạo ${line.untracked_missing} task cho tuyến này`
                  : `${line.untracked_missing} task đã bị huỷ hoặc xoá sau khi giao`}
              </span>
            </li>
          )}
          {!line.tasks.length && !line.untracked_missing && (
            <li className="px-3 py-2.5 text-sm text-slate-400">Không còn task nào của tuyến này trong ngày.</li>
          )}
        </ul>
      )}
    </div>
  )
}

const RED_STATE = { tone: 'bg-red-50 text-red-700', iconTone: 'text-red-500' }

function taskState(task: ComplianceDayTask): { label: string; tone: string; iconTone: string; icon: typeof CheckCircle2 } {
  if (task.on_time) {
    return { label: 'Đúng hạn', tone: 'bg-emerald-50 text-emerald-700', iconTone: 'text-emerald-500', icon: CheckCircle2 }
  }
  if ((task.status === 'SUBMITTED' || task.status === 'APPROVED') && task.submitted_at) {
    return {
      label: `Nộp trễ · ${formatDeadline(task.submitted_at)}`,
      tone: 'bg-amber-50 text-amber-700',
      iconTone: 'text-amber-500',
      icon: Clock3,
    }
  }
  if (task.status === 'REJECTED') return { label: 'Bị từ chối', ...RED_STATE, icon: XCircle }
  return { label: `Chưa nộp · ${TASK_STATUS_LABELS[task.status]}`, ...RED_STATE, icon: CircleDashed }
}

function TaskRow({ task }: { task: ComplianceDayTask }) {
  const state = taskState(task)
  const Icon = state.icon
  const primary = task.title ?? task.product_name ?? 'Task chưa gắn content'
  const secondary = task.title
    ? task.product_name && `SP: ${task.product_name}`
    : task.product_name && 'Chưa chọn content'
  return (
    <li>
      <Link
        href={`/dashboard/task-auto/tasks?taskId=${task.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
          task.on_time && 'opacity-70',
        )}
      >
        <Icon className={cn('w-4 h-4 shrink-0', state.iconTone)} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800 truncate">{primary}</span>
          {secondary && <span className="block text-xs text-slate-500 truncate">{secondary}</span>}
          {/* Màn hẹp: nhãn xuống dòng dưới tên để tên task không bị ép mất */}
          <span className={cn('sm:hidden inline-flex mt-1 rounded-md px-2 py-0.5 text-[11px] font-bold whitespace-nowrap', state.tone)}>
            {state.label}
          </span>
        </span>
        <span className={cn('hidden sm:inline-flex shrink-0 rounded-md px-2 py-1 text-[11px] font-bold whitespace-nowrap', state.tone)}>
          {state.label}
        </span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden="true" />
        <span className="sr-only">(mở task ở tab mới)</span>
      </Link>
    </li>
  )
}

function LineChips({ group }: { group: ComplianceDayGroup }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {group.lines.map(line => (
        <span
          key={line.id}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-xs font-bold text-red-700 whitespace-nowrap"
        >
          <span className="font-black text-slate-900">{line.content_line.name}</span>
          thiếu {line.missing_count}
        </span>
      ))}
    </span>
  )
}

function SelectFilter({ label, value, onChange, options, placeholder }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-slate-500">
      {label}
      <span className="relative">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="appearance-none h-10 min-w-[150px] max-w-[210px] rounded-xl border border-slate-200 pl-3 pr-8 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">{placeholder}</option>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
      </span>
    </label>
  )
}

const TONES = {
  red: 'bg-red-50 text-red-600 border-red-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
}

function SummaryCard({ icon: Icon, label, value, tone }: {
  icon: typeof AlertTriangle
  label: string
  value: number | string
  tone: keyof typeof TONES
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className={cn('w-11 h-11 rounded-xl border flex items-center justify-center', TONES[tone])}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function LineBadge({ name, source }: { name: string; source: DailyTaskComplianceSource }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex rounded-lg bg-slate-900 text-white px-2 py-1 text-xs font-black">{name}</span>
      <span className={cn(
        'inline-flex rounded-lg px-2 py-1 text-[11px] font-bold',
        source === 'AUTO_A4' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700',
      )}>
        {source === 'AUTO_A4' ? 'Task A4 tự động' : 'Kế hoạch tuyến'}
      </span>
    </div>
  )
}

function MissingBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2.5 py-1 text-xs font-black text-red-700 whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Thiếu {value}
    </span>
  )
}

export default function CompliancePage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>}>
      <CompliancePageContent />
    </Suspense>
  )
}
