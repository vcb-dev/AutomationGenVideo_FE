'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Archive,
  CheckCircle2,
  Clock3,
  Edit3,
  FileQuestion,
  Loader2,
  Plus,
  Search,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react'
import {
  archivePerformanceGoal,
  createPerformanceGoal,
  getPerformanceGoalHistory,
  getPerformanceGoals,
  getTeams,
  PerformanceGoalPayload,
  updatePerformanceGoal,
} from '@/lib/api/task-auto'
import {
  PerformanceGoal,
  PerformanceGoalDirection,
  PerformanceGoalMetricType,
  PerformanceGoalStatus,
  PerformanceGoalType,
  Team,
  UserBasic,
} from '@/types/task-auto'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/simple-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  month: string
  canEdit: boolean
  isLeader?: boolean
  userId?: string
  selectedTeamId?: string
  onTeamChange?: (id: string) => void
  fixedType?: PerformanceGoalType
}

interface GoalForm {
  team_id: string
  user_id: string
  type: PerformanceGoalType
  title: string
  description: string
  metric_type: PerformanceGoalMetricType
  unit: string
  direction: PerformanceGoalDirection
  target_value: string
  actual_manual: string
  status: Exclude<PerformanceGoalStatus, 'ARCHIVED'>
  change_reason: string
}

const emptyForm = (teamId = '', type: PerformanceGoalType = 'KPI'): GoalForm => ({
  team_id: teamId,
  user_id: '',
  type,
  title: '',
  description: '',
  metric_type: 'NUMBER',
  unit: '',
  direction: 'AT_LEAST',
  target_value: '',
  actual_manual: '',
  status: 'PUBLISHED',
  change_reason: '',
})

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

function dedupeUsers(team?: Team): UserBasic[] {
  if (!team) return []
  const users = new Map<string, UserBasic>()
  if (team.leader) users.set(team.leader.id, team.leader)
  for (const member of team.members ?? []) {
    if (member.user) users.set(member.user.id, member.user)
  }
  return [...users.values()].sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))
}

function ProgressBadge({ goal }: { goal: PerformanceGoal }) {
  if (goal.actual_final === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" /> Chưa nhập
      </span>
    )
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
      goal.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
    )}>
      {goal.passed
        ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
      {goal.progress_pct === null ? '—' : `${number.format(goal.progress_pct)}%`}
    </span>
  )
}

export function PerformanceGoalsTab({
  month,
  canEdit,
  isLeader,
  userId,
  selectedTeamId,
  onTeamChange,
  fixedType,
}: Props) {
  const qc = useQueryClient()
  const [teamFilter, setTeamFilter] = useState(selectedTeamId ?? '')
  const [typeFilter, setTypeFilter] = useState<'ALL' | PerformanceGoalType>(fixedType ?? 'ALL')
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PerformanceGoal | null>(null)
  const [form, setForm] = useState<GoalForm>(() => emptyForm(selectedTeamId, fixedType))
  const [archiving, setArchiving] = useState<PerformanceGoal | null>(null)
  const [archiveReason, setArchiveReason] = useState('')
  const [historyGoal, setHistoryGoal] = useState<PerformanceGoal | null>(null)

  const { data: teams = [] } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const visibleTeams = useMemo(() => {
    if (isLeader) return teams.filter(team => team.leader_id === userId)
    if (canEdit) return teams
    return teams.filter(team => team.leader_id === userId || team.members?.some(member => member.user_id === userId))
  }, [teams, isLeader, canEdit, userId])

  useEffect(() => {
    if (selectedTeamId !== undefined) setTeamFilter(selectedTeamId)
  }, [selectedTeamId])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['task-auto', 'performance-goals', month, teamFilter, showArchived],
    queryFn: () => getPerformanceGoals({
      month,
      team_id: teamFilter || undefined,
      type: fixedType,
      include_archived: showArchived || undefined,
    }),
  })

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['task-auto', 'performance-goal-history', historyGoal?.id],
    queryFn: () => getPerformanceGoalHistory(historyGoal!.id),
    enabled: !!historyGoal,
  })

  const records = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi')
    return (data?.records ?? []).filter(goal => {
      if (typeFilter !== 'ALL' && goal.type !== typeFilter) return false
      if (!term) return true
      return [goal.title, goal.description, goal.user.full_name, goal.team.name]
        .filter(Boolean)
        .some(value => String(value).toLocaleLowerCase('vi').includes(term))
    })
  }, [data?.records, search, typeFilter])

  const selectedFormTeam = teams.find(team => team.id === form.team_id)
  const assignees = dedupeUsers(selectedFormTeam)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const base: PerformanceGoalPayload = {
        team_id: form.team_id,
        user_id: form.user_id,
        month,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        metric_type: form.metric_type,
        unit: form.unit.trim() || undefined,
        direction: form.direction,
        target_value: Number(form.target_value),
        actual_manual: form.actual_manual === '' ? null : Number(form.actual_manual),
        status: form.status,
      }
      if (!editing) return createPerformanceGoal(base)
      const { user_id: _user, team_id: _team, month: _month, ...changes } = base
      return updatePerformanceGoal(editing.id, {
        ...changes,
        expected_revision: editing.revision,
        change_reason: form.change_reason.trim() || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'performance-goals'] })
      toast.success(editing ? 'Đã cập nhật KPI/OKR' : 'Đã giao KPI/OKR')
      setDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Không thể lưu KPI/OKR')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: () => archivePerformanceGoal(archiving!.id, archiving!.revision, archiveReason.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'performance-goals'] })
      toast.success('Đã lưu trữ KPI/OKR')
      setArchiving(null)
      setArchiveReason('')
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Không thể lưu trữ KPI/OKR'),
  })

  const openCreate = () => {
    const initialTeam = teamFilter || visibleTeams[0]?.id || ''
    setEditing(null)
    setForm(emptyForm(initialTeam, fixedType))
    setDialogOpen(true)
  }

  const openEdit = (goal: PerformanceGoal) => {
    setEditing(goal)
    setForm({
      team_id: goal.team_id,
      user_id: goal.user_id,
      type: goal.type,
      title: goal.title,
      description: goal.description ?? '',
      metric_type: goal.metric_type,
      unit: goal.unit ?? '',
      direction: goal.direction,
      target_value: String(goal.target_value),
      actual_manual: goal.actual_manual === null ? '' : String(goal.actual_manual),
      status: goal.status === 'ARCHIVED' ? 'DRAFT' : goal.status,
      change_reason: '',
    })
    setDialogOpen(true)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.team_id || !form.user_id || !form.title.trim() || Number(form.target_value) <= 0) {
      toast.error('Vui lòng nhập đủ team, nhân sự, tên và mục tiêu lớn hơn 0')
      return
    }
    if (editing && !form.change_reason.trim()) {
      toast.error('Vui lòng nhập lý do cập nhật để lưu lịch sử')
      return
    }
    saveMutation.mutate()
  }

  const summary = data?.summary
  const sectionName = fixedType === 'OKR' ? 'OKR' : 'KPI/OKR'

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Đầu mục đang áp dụng" value={summary?.total_items ?? 0} icon={Target} tone="blue" />
        <SummaryCard label="Đã đạt ngưỡng" value={summary?.passed_items ?? 0} icon={CheckCircle2} tone="green" />
        <SummaryCard
          label={`Tiến độ ${sectionName}`}
          value={summary?.overall_progress_pct === null || summary?.overall_progress_pct === undefined
            ? '—'
            : `${number.format(summary.overall_progress_pct)}%`}
          hint="Mỗi đầu mục ngang nhau, cap 100%"
          icon={Trophy}
          tone={summary?.overall_passed ? 'green' : 'amber'}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="performance-team-filter">Lọc theo team</label>
            <Select
              id="performance-team-filter"
              value={teamFilter}
              onChange={event => {
                setTeamFilter(event.target.value)
                onTeamChange?.(event.target.value)
              }}
              className="h-11 min-w-52"
            >
              <option value="">Tất cả team</option>
              {visibleTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
            </Select>
            {!fixedType && (
              <>
                <label className="sr-only" htmlFor="performance-type-filter">Lọc loại mục tiêu</label>
                <Select
                  id="performance-type-filter"
                  value={typeFilter}
                  onChange={event => setTypeFilter(event.target.value as typeof typeFilter)}
                  className="h-11 min-w-40"
                >
                  <option value="ALL">Tất cả loại</option>
                  <option value="KPI">KPI bổ sung</option>
                  <option value="OKR">OKR</option>
                </Select>
              </>
            )}
            {canEdit && (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={event => setShowArchived(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Hiện lưu trữ
              </label>
            )}
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <label className="sr-only" htmlFor="performance-search">Tìm KPI/OKR hoặc nhân sự</label>
              <input
                id="performance-search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Tìm đầu mục hoặc nhân sự…"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
              />
            </div>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="min-h-11 shrink-0 gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> Thêm {fixedType ?? 'KPI/OKR'}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Đang tải {sectionName}…
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-rose-700">Không thể tải KPI/OKR. Vui lòng thử lại.</div>
        ) : records.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
            <Target className="h-9 w-9 text-slate-300" aria-hidden="true" />
            <p className="font-semibold text-slate-700">Chưa có {sectionName} trong tháng này</p>
            <p className="max-w-md text-sm text-slate-500">Thêm đầu mục tại đây khi cần giao mục tiêu riêng cho nhân sự hoặc leader.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden lg:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nhân sự</th>
                    <th className="px-4 py-3">Đầu mục</th>
                    <th className="px-4 py-3 text-right">Mục tiêu</th>
                    <th className="px-4 py-3 text-right">Thực đạt</th>
                    <th className="px-4 py-3">Kết quả</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(goal => (
                    <tr key={goal.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{goal.user.full_name}</p>
                        <p className="text-xs text-slate-500">{goal.team.name}</p>
                      </td>
                      <td className="max-w-sm px-4 py-3">
                        <div className="flex items-start gap-2">
                          <TypeBadge type={goal.type} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800" title={goal.title}>{goal.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {goal.status === 'DRAFT' ? 'Bản nháp' : goal.status === 'ARCHIVED' ? 'Đã lưu trữ' : `Phiên bản ${goal.revision}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{number.format(goal.target_value)} {goal.unit}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{goal.actual_final === null ? '—' : `${number.format(goal.actual_final)} ${goal.unit ?? ''}`}</td>
                      <td className="px-4 py-3"><ProgressBadge goal={goal} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IconAction label="Xem lịch sử" onClick={() => setHistoryGoal(goal)} icon={Clock3} />
                          {canEdit && goal.status !== 'ARCHIVED' && <IconAction label="Chỉnh sửa" onClick={() => openEdit(goal)} icon={Edit3} />}
                          {canEdit && goal.status !== 'ARCHIVED' && <IconAction label="Lưu trữ" onClick={() => setArchiving(goal)} icon={Archive} danger />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {records.map(goal => (
                <article key={goal.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2"><TypeBadge type={goal.type} /><span className="text-xs text-slate-500">{goal.team.name}</span></div>
                      <h3 className="font-semibold text-slate-900">{goal.title}</h3>
                      <p className="text-sm text-slate-500">{goal.user.full_name}</p>
                    </div>
                    <ProgressBadge goal={goal} />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                    <div><dt className="text-xs text-slate-500">Mục tiêu</dt><dd className="font-semibold">{number.format(goal.target_value)} {goal.unit}</dd></div>
                    <div><dt className="text-xs text-slate-500">Thực đạt</dt><dd className="font-semibold">{goal.actual_final === null ? '—' : number.format(goal.actual_final)}</dd></div>
                  </dl>
                  <div className="flex justify-end gap-2">
                    <IconAction label="Lịch sử" onClick={() => setHistoryGoal(goal)} icon={Clock3} withText />
                    {canEdit && goal.status !== 'ARCHIVED' && <IconAction label="Sửa" onClick={() => openEdit(goal)} icon={Edit3} withText />}
                    {canEdit && goal.status !== 'ARCHIVED' && <IconAction label="Lưu trữ" onClick={() => setArchiving(goal)} icon={Archive} danger withText />}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={open => !saveMutation.isPending && setDialogOpen(open)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <form onSubmit={submit}>
            <DialogHeader className="border-b border-slate-200 px-6 py-5">
              <DialogTitle>{editing ? `Cập nhật ${sectionName}` : `Giao ${sectionName} mới`}</DialogTitle>
              <DialogDescription>Mỗi đầu mục được tính ngang nhau trong tiến độ tổng; phần đóng góp được giới hạn tối đa 100%.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Team" htmlFor="goal-team" required>
                <Select
                  id="goal-team"
                  value={form.team_id}
                  disabled={!!editing}
                  onChange={event => setForm(current => ({ ...current, team_id: event.target.value, user_id: '' }))}
                  className="h-11"
                >
                  <option value="">Chọn team</option>
                  {visibleTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </Select>
              </Field>
              <Field label="Nhân sự" htmlFor="goal-user" required>
                <Select
                  id="goal-user"
                  value={form.user_id}
                  disabled={!!editing || !form.team_id}
                  onChange={event => setForm(current => ({ ...current, user_id: event.target.value }))}
                  className="h-11"
                >
                  <option value="">Chọn nhân sự hoặc leader</option>
                  {assignees.map(person => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                </Select>
              </Field>
              {!fixedType && (
                <Field label="Loại đầu mục" htmlFor="goal-type" required>
                  <Select id="goal-type" value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as PerformanceGoalType }))} className="h-11">
                    <option value="KPI">KPI bổ sung</option>
                    <option value="OKR">OKR</option>
                  </Select>
                </Field>
              )}
              <Field label="Trạng thái" htmlFor="goal-status" required>
                <Select id="goal-status" value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as GoalForm['status'] }))} className="h-11">
                  <option value="PUBLISHED">Đang áp dụng</option>
                  <option value="DRAFT">Bản nháp</option>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Input id="goal-title" label={`Tên ${sectionName} *`} value={form.title} maxLength={160} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Phát triển 10 concept mới" />
              </div>
              <div className="md:col-span-2">
                <Field label="Mô tả và tiêu chí nghiệm thu" htmlFor="goal-description">
                  <Textarea id="goal-description" value={form.description} maxLength={2000} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Mô tả rõ kết quả được xem là hợp lệ…" />
                </Field>
              </div>
              <Field label="Mục tiêu" htmlFor="goal-target" required>
                <Input id="goal-target" type="number" min="0.0001" step="any" value={form.target_value} onChange={event => setForm(current => ({ ...current, target_value: event.target.value }))} placeholder="0" />
              </Field>
              <Field label="Đơn vị" htmlFor="goal-unit">
                <Input id="goal-unit" value={form.unit} maxLength={40} onChange={event => setForm(current => ({ ...current, unit: event.target.value }))} placeholder="video, concept, %, điểm…" />
              </Field>
              <Field label="Số thực đạt" htmlFor="goal-actual" hint="Để trống nếu chưa có kết quả">
                <Input id="goal-actual" type="number" min="0" step="any" value={form.actual_manual} onChange={event => setForm(current => ({ ...current, actual_manual: event.target.value }))} placeholder="Chưa nhập" />
              </Field>
              <Field label="Chiều đánh giá" htmlFor="goal-direction">
                <Select id="goal-direction" value={form.direction} onChange={event => setForm(current => ({ ...current, direction: event.target.value as PerformanceGoalDirection }))} className="h-11">
                  <option value="AT_LEAST">Càng cao càng tốt</option>
                  <option value="AT_MOST">Càng thấp càng tốt</option>
                </Select>
              </Field>
              <div className="flex items-center rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 md:col-span-2">
                Đầu mục đạt khi hoàn thành từ <strong className="mx-1">80%</strong>. Mức thưởng được cấu hình riêng trong phần mềm tính lương.
              </div>
              {editing && (
                <div className="md:col-span-2">
                  <Field label="Lý do cập nhật" htmlFor="goal-reason" required hint="Được lưu trong lịch sử để đối soát lương">
                    <Textarea id="goal-reason" value={form.change_reason} maxLength={500} onChange={event => setForm(current => ({ ...current, change_reason: event.target.value }))} placeholder="Ví dụ: Điều chỉnh mục tiêu theo kế hoạch tháng mới…" />
                  </Field>
                </div>
              )}
            </div>
            <DialogFooter className="border-t border-slate-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>Hủy</Button>
              <Button type="submit" isLoading={saveMutation.isPending}>{editing ? 'Lưu cập nhật' : 'Giao mục tiêu'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiving} onOpenChange={open => !archiveMutation.isPending && !open && setArchiving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lưu trữ KPI/OKR</DialogTitle>
            <DialogDescription>Đầu mục sẽ không còn tham gia tính tiến độ và payroll, nhưng toàn bộ lịch sử vẫn được giữ.</DialogDescription>
          </DialogHeader>
          <Field label="Lý do lưu trữ" htmlFor="archive-reason" required>
            <Textarea id="archive-reason" value={archiveReason} onChange={event => setArchiveReason(event.target.value)} placeholder="Nhập lý do…" autoFocus />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiving(null)} disabled={archiveMutation.isPending}>Hủy</Button>
            <Button variant="danger" disabled={archiveReason.trim().length < 2} isLoading={archiveMutation.isPending} onClick={() => archiveMutation.mutate()}>Lưu trữ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyGoal} onOpenChange={open => !open && setHistoryGoal(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lịch sử thay đổi</DialogTitle>
            <DialogDescription>{historyGoal?.title}</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
          ) : (
            <ol className="space-y-3">
              {history.map(entry => (
                <li key={entry.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">Phiên bản {entry.revision} · {entry.action === 'CREATE' ? 'Khởi tạo' : entry.action === 'ARCHIVE' ? 'Lưu trữ' : 'Cập nhật'}</p>
                    <time className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString('vi-VN')}</time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{entry.changed_by?.full_name ?? 'Tài khoản đã xóa'}</p>
                  {entry.change_reason && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{entry.change_reason}</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <HistoryValue label="Mục tiêu" value={entry.next_data.target_value} />
                    <HistoryValue label="Thực đạt" value={entry.next_data.actual_manual} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, htmlFor, required, hint, children }: { label: string; htmlFor: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">{label}{required && <span className="ml-1 text-rose-600">*</span>}</label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function TypeBadge({ type }: { type: PerformanceGoalType }) {
  return <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold', type === 'KPI' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700')}>{type}</span>
}

function IconAction({ label, onClick, icon: Icon, danger, withText }: { label: string; onClick: () => void; icon: typeof Edit3; danger?: boolean; withText?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />{withText && label}
    </button>
  )
}

function SummaryCard({ label, value, hint, icon: Icon, tone }: { label: string; value: string | number; hint?: string; icon: typeof Target; tone: 'blue' | 'green' | 'amber' | 'violet' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>
        <span className={cn('rounded-xl p-2.5', tones[tone])}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      </div>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function HistoryValue({ label, value }: { label: string; value: unknown }) {
  const numeric = value === null || value === undefined ? null : Number(value)
  return <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">{label}</p><p className="mt-0.5 font-semibold text-slate-800">{numeric === null ? '—' : number.format(numeric)}</p></div>
}
