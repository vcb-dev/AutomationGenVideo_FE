'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, FileQuestion, Loader2, Plus, Target, Trash2, Undo2, XCircle } from 'lucide-react'
import {
  archivePerformanceGoal,
  createPerformanceKpiGroup,
  createPerformanceGoal,
  getPerformanceKpiGroups,
  getPerformanceGoals,
  updatePerformanceGoal,
} from '@/lib/api/task-auto'
import {
  PerformanceGoal,
  PerformanceGoalDirection,
  PerformanceGoalStatus,
  PerformanceGoalType,
} from '@/types/task-auto'
import { cn } from '@/lib/utils'

/**
 * KPI linh hoạt (bảng performance_goals) gắn theo khóa (nhân sự, team, tháng) và nhóm KPI.
 * OKR được quản lý ở tab riêng để không trộn với các card KPI cố định.
 */
export const assigneeGoalsQueryKey = (month: string, teamId: string, userId: string) =>
  ['task-auto', 'performance-goals', 'assignee', month, teamId, userId] as const

/** Một đầu mục đang soạn trong modal. Số giữ dạng chuỗi để ô nhập để trống được. */
export interface GoalDraft {
  key: string
  id?: string
  revision?: number
  status?: PerformanceGoalStatus
  /** Giá trị lúc tải về — dùng để chỉ gửi field thật sự đổi. Không có = đầu mục mới. */
  original?: GoalFields
  type: PerformanceGoalType
  kpi_group_id: string
  title: string
  description: string
  unit: string
  direction: PerformanceGoalDirection
  target_value: string
  actual_manual: string
  /** Đầu mục đã lưu bị bấm xóa: chỉ lưu trữ thật khi bấm Lưu, trước đó còn hoàn tác được. */
  removed: boolean
  /** Lỗi server của lần lưu gần nhất. */
  error?: string
}

type GoalFields = Pick<
  GoalDraft,
  'type' | 'kpi_group_id' | 'title' | 'description' | 'unit' | 'direction' | 'target_value' | 'actual_manual'
>

type GoalUpdateBody = Omit<Parameters<typeof updatePerformanceGoal>[1], 'expected_revision'>

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

const toNumberOrNull = (value: string) => (value.trim() === '' ? null : Number(value))

export function goalToDraft(goal: PerformanceGoal): GoalDraft {
  const fields: GoalFields = {
    type: goal.type,
    kpi_group_id: goal.kpi_group_id ?? '',
    title: goal.title,
    description: goal.description ?? '',
    unit: goal.unit ?? '',
    direction: goal.direction,
    target_value: String(goal.target_value),
    actual_manual: goal.actual_manual === null ? '' : String(goal.actual_manual),
  }
  return { key: goal.id, id: goal.id, revision: goal.revision, status: goal.status, original: fields, ...fields, removed: false }
}

let draftSeq = 0
function newGoalDraft(groupId = ''): GoalDraft {
  draftSeq += 1
  return {
    key: `new-${Date.now()}-${draftSeq}`,
    type: 'KPI',
    kpi_group_id: groupId,
    title: '',
    description: '',
    unit: '',
    direction: 'AT_LEAST',
    target_value: '',
    actual_manual: '',
    removed: false,
  }
}

/** Chỉ các field đã đổi — BE bắt nhập lý do hễ body CÓ key target/actual/direction, kể cả khi giá trị không đổi. */
function changedFields(draft: GoalDraft): GoalUpdateBody {
  const original = draft.original
  if (!original) return {}
  const changes: GoalUpdateBody = {}
  if (draft.type !== original.type) changes.type = draft.type
  if (draft.kpi_group_id !== original.kpi_group_id) changes.kpi_group_id = draft.kpi_group_id
  if (draft.title.trim() !== original.title.trim()) changes.title = draft.title.trim()
  if (draft.description.trim() !== original.description.trim()) changes.description = draft.description.trim()
  if (draft.unit.trim() !== original.unit.trim()) changes.unit = draft.unit.trim()
  if (draft.direction !== original.direction) changes.direction = draft.direction
  if (Number(draft.target_value) !== Number(original.target_value)) changes.target_value = Number(draft.target_value)
  const actual = toNumberOrNull(draft.actual_manual)
  if (actual !== toNumberOrNull(original.actual_manual)) changes.actual_manual = actual
  return changes
}

/** Thay đổi ảnh hưởng số liệu lương (mục tiêu, thực đạt, chiều đánh giá, lưu trữ) phải kèm lý do. */
function goalNeedsReason(draft: GoalDraft) {
  if (!draft.id) return false
  if (draft.removed) return true
  const changes = changedFields(draft)
  return 'type' in changes || 'kpi_group_id' in changes || 'target_value' in changes || 'actual_manual' in changes || 'direction' in changes
}

interface GoalDraftErrors {
  group?: string
  title?: string
  target?: string
  actual?: string
}

function goalDraftErrors(draft: GoalDraft): GoalDraftErrors {
  if (draft.removed) return {}
  const errors: GoalDraftErrors = {}
  if (draft.type === 'KPI' && !draft.kpi_group_id) errors.group = 'Chọn nhóm KPI'
  if (draft.title.trim().length < 2) errors.title = 'Nhập tên đầu mục (ít nhất 2 ký tự)'
  const target = Number(draft.target_value)
  if (draft.target_value.trim() === '' || !Number.isFinite(target) || target <= 0) {
    errors.target = 'Mục tiêu phải lớn hơn 0'
  }
  const actual = toNumberOrNull(draft.actual_manual)
  if (actual !== null && (!Number.isFinite(actual) || actual < 0)) errors.actual = 'Thực đạt không được âm'
  return errors
}

const REASON_FIELD_ID = 'goal-change-reason'
const fieldId = (draft: GoalDraft, field: string) => `goal-${draft.key}-${field}`

/** id ô nhập lỗi đầu tiên (để chuyển focus tới đó khi bấm Lưu), null nếu mọi đầu mục hợp lệ. */
export function firstInvalidGoalField(drafts: GoalDraft[], reason: string): string | null {
  for (const draft of drafts) {
    const errors = goalDraftErrors(draft)
    if (errors.group) return fieldId(draft, 'group')
    if (errors.title) return fieldId(draft, 'title')
    if (errors.target) return fieldId(draft, 'target')
    if (errors.actual) return fieldId(draft, 'actual')
  }
  if (drafts.some(goalNeedsReason) && reason.trim().length < 2) return REASON_FIELD_ID
  return null
}

function apiErrorMessage(error: any) {
  const message = error?.response?.data?.message
  if (Array.isArray(message)) return message.join('; ')
  return message ?? 'Không thể lưu đầu mục này'
}

/**
 * Ghi các đầu mục đã soạn. Chạy tuần tự để mỗi đầu mục có kết quả riêng: cái nào lỗi được giữ lại
 * trong modal kèm thông báo, bấm Lưu lần nữa chỉ gửi lại phần chưa lưu.
 */
export async function saveGoalDrafts(
  drafts: GoalDraft[],
  ctx: { user_id: string; team_id: string; month: string; reason: string },
): Promise<{ drafts: GoalDraft[]; failed: number }> {
  const next: GoalDraft[] = []
  let failed = 0
  const reason = ctx.reason.trim()

  for (const draft of drafts) {
    try {
      if (draft.removed) {
        if (draft.id) await archivePerformanceGoal(draft.id, draft.revision!, reason)
        continue
      }
      if (!draft.id) {
        const created = await createPerformanceGoal({
          user_id: ctx.user_id,
          team_id: ctx.team_id,
          month: ctx.month,
          type: draft.type,
          kpi_group_id: draft.type === 'KPI' ? draft.kpi_group_id : null,
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          metric_type: 'NUMBER',
          unit: draft.unit.trim() || undefined,
          direction: draft.direction,
          target_value: Number(draft.target_value),
          actual_manual: toNumberOrNull(draft.actual_manual),
          status: 'PUBLISHED',
        })
        next.push(goalToDraft(created))
        continue
      }
      const changes = changedFields(draft)
      if (Object.keys(changes).length === 0) {
        next.push({ ...draft, error: undefined })
        continue
      }
      const updated = await updatePerformanceGoal(draft.id, {
        ...changes,
        expected_revision: draft.revision!,
        change_reason: reason || undefined,
      })
      next.push(goalToDraft(updated))
    } catch (error) {
      failed += 1
      next.push({ ...draft, error: apiErrorMessage(error) })
    }
  }
  return { drafts: next, failed }
}

// ── Soạn đầu mục trong modal "Đặt KPI/OKR" ──────────────────────────────────

interface EditorProps {
  drafts: GoalDraft[]
  onChange: (drafts: GoalDraft[]) => void
  reason: string
  onReasonChange: (reason: string) => void
  /** Hiện lỗi từng ô — bật sau lần bấm Lưu đầu tiên. */
  showErrors: boolean
  /** Chưa đủ editor/nhóm/tháng thì chưa biết tải đầu mục của ai. */
  assigneeReady: boolean
  loading: boolean
  loadError: boolean
  onRetryLoad: () => void
  focusKey: string | null
  onAdded: (key: string) => void
  teamId: string
}

const inputClass = 'h-11 w-full rounded-xl border bg-white px-3 text-base text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 sm:text-sm'
const inputOk = 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500'
const inputBad = 'border-rose-400 focus:border-rose-500 focus:ring-rose-400'
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600'

function groupHeaderTone(color: string) {
  return ({
    ORANGE: 'border-orange-200 bg-orange-100 text-orange-900',
    GREEN: 'border-emerald-200 bg-emerald-100 text-emerald-900',
    PURPLE: 'border-violet-200 bg-violet-100 text-violet-900',
    BLUE: 'border-blue-200 bg-blue-100 text-blue-900',
    AMBER: 'border-amber-200 bg-amber-100 text-amber-900',
    ROSE: 'border-rose-200 bg-rose-100 text-rose-900',
    SLATE: 'border-slate-200 bg-slate-100 text-slate-800',
  } as Record<string, string>)[color] ?? 'border-slate-200 bg-slate-100 text-slate-800'
}

export function PerformanceGoalsEditor({
  drafts,
  onChange,
  reason,
  onReasonChange,
  showErrors,
  assigneeReady,
  loading,
  loadError,
  onRetryLoad,
  focusKey,
  onAdded,
  teamId,
}: EditorProps) {
  const qc = useQueryClient()
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['task-auto', 'performance-kpi-groups', teamId],
    queryFn: () => getPerformanceKpiGroups({ team_id: teamId }),
    enabled: !!teamId,
  })
  const patch = (key: string, changes: Partial<GoalDraft>) =>
    onChange(drafts.map(draft => (draft.key === key ? { ...draft, ...changes, error: undefined } : draft)))

  const add = () => {
    const draft = newGoalDraft()
    onChange([...drafts, draft])
    onAdded(draft.key)
  }

  const remove = (draft: GoalDraft) =>
    draft.id ? patch(draft.key, { removed: true }) : onChange(drafts.filter(item => item.key !== draft.key))

  const activeCount = drafts.filter(draft => !draft.removed).length
  const needsReason = drafts.some(goalNeedsReason)
  const reasonError = showErrors && needsReason && reason.trim().length < 2
  const groupSections = [
    ...groups.map(group => ({ id: group.id, name: group.name, color: group.color, drafts: drafts.filter(draft => draft.kpi_group_id === group.id) })),
    { id: '', name: 'Chưa chọn nhóm', color: 'SLATE' as const, drafts: drafts.filter(draft => !draft.kpi_group_id) },
  ].filter(section => section.drafts.length > 0)

  const addGroup = async () => {
    if (!teamId || newGroupName.trim().length < 2) return
    setCreatingGroup(true)
    try {
      const group = await createPerformanceKpiGroup({ team_id: teamId, name: newGroupName.trim() })
      await qc.invalidateQueries({ queryKey: ['task-auto', 'performance-kpi-groups', teamId] })
      setNewGroupName('')
      toast.success(`Đã tạo nhóm “${group.name}”`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không thể tạo nhóm KPI')
    } finally {
      setCreatingGroup(false)
    }
  }

  return (
    <section aria-labelledby="kpi-okr-items-heading" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3
          id="kpi-okr-items-heading"
          className="flex flex-1 items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 after:h-px after:flex-1 after:bg-gray-100 after:content-['']"
        >
          KPI linh hoạt theo nhóm
          {activeCount > 0 && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold tracking-normal text-indigo-700">
              {activeCount}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={add}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Thêm đầu mục KPI
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Mục tiêu riêng ngoài KPI cố định. Chọn một trong ba nhóm chuẩn hoặc nhóm do team tự tạo; mỗi đầu mục đạt khi hoàn thành từ 80%.
      </p>

      {!!teamId && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">
            Tạo nhóm KPI mới cho team
            <input
              value={newGroupName}
              maxLength={100}
              onChange={event => setNewGroupName(event.target.value)}
              placeholder="Ví dụ: Chất lượng & kỷ luật"
              className={cn(inputClass, inputOk, 'mt-1.5')}
            />
          </label>
          <button
            type="button"
            onClick={addGroup}
            disabled={creatingGroup || newGroupName.trim().length < 2}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Tạo nhóm
          </button>
        </div>
      )}

      {loading && (
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Đang tải các đầu mục đã giao…
        </p>
      )}

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Không tải được các đầu mục đã giao cho nhân sự này.
          <button
            type="button"
            onClick={onRetryLoad}
            className="min-h-11 cursor-pointer rounded-lg px-3 font-semibold underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && drafts.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center">
          <Target className="h-7 w-7 text-slate-300" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-600">Chưa có đầu mục KPI linh hoạt</p>
          <p className="text-xs text-slate-500">
            {assigneeReady
              ? 'Bấm "Thêm đầu mục KPI" khi cần giao mục tiêu riêng cho nhân sự này.'
              : 'Chọn editor, nhóm và tháng để xem các đầu mục đã giao.'}
          </p>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-4">
          {groupSections.map(section => (
            <section key={section.id || 'unassigned'} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className={cn('flex items-center justify-between border-b px-4 py-3', groupHeaderTone(section.color))}>
                <h4 className="text-sm font-bold">{section.name}</h4>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold tabular-nums">{section.drafts.filter(draft => !draft.removed).length}</span>
              </div>
              <ol className="space-y-3 p-3">
                {section.drafts.map(draft => (
                  <GoalDraftCard
                    key={draft.key}
                    draft={draft}
                    index={drafts.indexOf(draft) + 1}
                    errors={showErrors ? goalDraftErrors(draft) : {}}
                    autoFocus={draft.key === focusKey}
                    groups={groups}
                    groupsLoading={groupsLoading}
                    onPatch={changes => patch(draft.key, changes)}
                    onRemove={() => remove(draft)}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {needsReason && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <label htmlFor={REASON_FIELD_ID} className="mb-1.5 block text-sm font-semibold text-slate-700">
            Lý do điều chỉnh KPI/OKR <span className="text-rose-600">*</span>
          </label>
          <textarea
            id={REASON_FIELD_ID}
            value={reason}
            maxLength={500}
            rows={2}
            onChange={event => onReasonChange(event.target.value)}
            aria-invalid={reasonError || undefined}
            aria-describedby={`${REASON_FIELD_ID}-hint`}
            placeholder="Ví dụ: Điều chỉnh mục tiêu theo kế hoạch tháng…"
            className={cn('w-full rounded-xl border bg-white px-3 py-2.5 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 sm:text-sm', reasonError ? inputBad : inputOk)}
          />
          <p id={`${REASON_FIELD_ID}-hint`} className={cn('mt-1 text-xs', reasonError ? 'text-rose-600' : 'text-slate-500')}>
            {reasonError
              ? 'Nhập lý do (ít nhất 2 ký tự) — bắt buộc khi đổi nhóm, mục tiêu, thực đạt, cách đánh giá hoặc xóa đầu mục đã lưu'
              : 'Lưu vào lịch sử để đối soát lương.'}
          </p>
        </div>
      )}
    </section>
  )
}

function GoalDraftCard({
  draft,
  index,
  errors,
  autoFocus,
  groups,
  groupsLoading,
  onPatch,
  onRemove,
}: {
  draft: GoalDraft
  index: number
  errors: GoalDraftErrors
  autoFocus: boolean
  groups: Awaited<ReturnType<typeof getPerformanceKpiGroups>>
  groupsLoading: boolean
  onPatch: (changes: Partial<GoalDraft>) => void
  onRemove: () => void
}) {
  const id = (field: string) => fieldId(draft, field)

  if (draft.removed) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-500 line-through">{draft.original?.title ?? draft.title}</p>
          <p className="text-xs text-rose-700">Sẽ lưu trữ khi bấm Lưu — lịch sử vẫn được giữ.</p>
        </div>
        <button
          type="button"
          onClick={() => onPatch({ removed: false })}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" /> Hoàn tác
        </button>
      </li>
    )
  }

  const isNew = !draft.id
  const isEdited = !isNew && Object.keys(changedFields(draft)).length > 0
  const describedBy = (field: string, hasError?: string) => (hasError ? `${id(field)}-error` : undefined)

  return (
    <li className={cn('rounded-2xl border bg-white p-4 shadow-sm', draft.error ? 'border-rose-300' : 'border-slate-200')}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">Đầu mục {index}</span>
          {isNew && <StatusChip className="bg-emerald-50 text-emerald-700">Mới</StatusChip>}
          {isEdited && <StatusChip className="bg-amber-50 text-amber-700">Đã sửa</StatusChip>}
          {draft.status === 'DRAFT' && <StatusChip className="bg-slate-100 text-slate-600">Bản nháp</StatusChip>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Xóa đầu mục ${index}`}
          title="Xóa đầu mục"
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={id('group')} className={labelClass}>Nhóm KPI <span className="text-rose-600">*</span></label>
          <select
            id={id('group')}
            value={draft.kpi_group_id}
            disabled={groupsLoading}
            onChange={event => onPatch({ kpi_group_id: event.target.value, type: 'KPI' })}
            aria-invalid={!!errors.group || undefined}
            aria-describedby={errors.group ? `${id('group')}-error` : undefined}
            className={cn(inputClass, errors.group ? inputBad : inputOk, 'cursor-pointer')}
          >
            <option value="">{groupsLoading ? 'Đang tải nhóm…' : 'Chọn nhóm KPI'}</option>
            {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <FieldError id={`${id('group')}-error`} message={errors.group} />
        </div>
        <div>
          <label htmlFor={id('title')} className={labelClass}>Tên đầu mục <span className="text-rose-600">*</span></label>
          <input
            id={id('title')}
            value={draft.title}
            maxLength={160}
            autoFocus={autoFocus}
            onChange={event => onPatch({ title: event.target.value })}
            aria-invalid={!!errors.title || undefined}
            aria-describedby={describedBy('title', errors.title)}
            placeholder="Ví dụ: Phát triển 10 concept mới"
            className={cn(inputClass, errors.title ? inputBad : inputOk)}
          />
          <FieldError id={`${id('title')}-error`} message={errors.title} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label htmlFor={id('target')} className={labelClass}>Mục tiêu <span className="text-rose-600">*</span></label>
          <input
            id={id('target')}
            type="number"
            inputMode="decimal"
            min="0.0001"
            step="any"
            value={draft.target_value}
            onChange={event => onPatch({ target_value: event.target.value })}
            aria-invalid={!!errors.target || undefined}
            aria-describedby={describedBy('target', errors.target)}
            placeholder="0"
            className={cn(inputClass, 'text-right font-bold tabular-nums', errors.target ? inputBad : inputOk)}
          />
          <FieldError id={`${id('target')}-error`} message={errors.target} />
        </div>
        <div>
          <label htmlFor={id('unit')} className={labelClass}>Đơn vị</label>
          <input
            id={id('unit')}
            value={draft.unit}
            maxLength={40}
            onChange={event => onPatch({ unit: event.target.value })}
            placeholder="video, concept, %…"
            className={cn(inputClass, inputOk)}
          />
        </div>
        <div>
          <label htmlFor={id('direction')} className={labelClass}>Cách đánh giá</label>
          <select
            id={id('direction')}
            value={draft.direction}
            onChange={event => onPatch({ direction: event.target.value as PerformanceGoalDirection })}
            className={cn(inputClass, inputOk, 'cursor-pointer')}
          >
            <option value="AT_LEAST">Càng cao càng tốt</option>
            <option value="AT_MOST">Càng thấp càng tốt</option>
          </select>
        </div>
        <div>
          <label htmlFor={id('actual')} className={labelClass}>Thực đạt</label>
          <input
            id={id('actual')}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={draft.actual_manual}
            onChange={event => onPatch({ actual_manual: event.target.value })}
            aria-invalid={!!errors.actual || undefined}
            aria-describedby={errors.actual ? `${id('actual')}-error` : `${id('actual')}-hint`}
            placeholder="Chưa nhập"
            className={cn(inputClass, 'text-right tabular-nums', errors.actual ? inputBad : inputOk)}
          />
          {errors.actual
            ? <FieldError id={`${id('actual')}-error`} message={errors.actual} />
            : <p id={`${id('actual')}-hint`} className="mt-1 text-xs text-slate-500">Để trống nếu chưa có kết quả</p>}
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor={id('description')} className={labelClass}>Tiêu chí nghiệm thu</label>
        <input
          id={id('description')}
          value={draft.description}
          maxLength={2000}
          onChange={event => onPatch({ description: event.target.value })}
          placeholder="Kết quả thế nào được tính là hợp lệ (không bắt buộc)"
          className={cn(inputClass, inputOk)}
        />
      </div>

      {draft.error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {draft.error}
        </p>
      )}
    </li>
  )
}

function StatusChip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', className)}>{children}</span>
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p id={id} role="alert" className="mt-1 text-xs font-medium text-rose-600">{message}</p>
}

// ── Xem (chỉ đọc) trong modal chi tiết KPI ──────────────────────────────────

export function PerformanceGoalsReadonly({ userId, teamId, month }: { userId: string; teamId: string; month: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: assigneeGoalsQueryKey(month, teamId, userId),
    queryFn: () => getPerformanceGoals({ month, team_id: teamId, user_id: userId, type: 'KPI' }),
  })
  const goals = data?.records ?? []
  const summary = data?.summary
  const groupedGoals = goals.reduce<Array<{ id: string; name: string; color: string; goals: PerformanceGoal[] }>>((result, goal) => {
    const id = goal.kpi_group?.id ?? 'legacy'
    const current = result.find(group => group.id === id)
    if (current) current.goals.push(goal)
    else result.push({ id, name: goal.kpi_group?.name ?? 'KPI bổ sung', color: goal.kpi_group?.color ?? 'BLUE', goals: [goal] })
    return result
  }, [])

  if (!isLoading && !isError && goals.length === 0) return null

  return (
    <section aria-labelledby="kpi-okr-readonly-heading" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3
          id="kpi-okr-readonly-heading"
          className="flex flex-1 items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 after:h-px after:flex-1 after:bg-gray-100 after:content-['']"
        >
          KPI linh hoạt theo nhóm
        </h3>
        {summary && summary.overall_progress_pct !== null && (
          <span className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            summary.overall_passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
          )}>
            Tiến độ chung {number.format(summary.overall_progress_pct)}% · đạt {summary.passed_items}/{summary.total_items}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Đang tải KPI linh hoạt…
        </p>
      ) : isError ? (
        <p className="text-sm text-rose-700" role="alert">Không tải được KPI linh hoạt.</p>
      ) : (
        <div className="space-y-3">
          {groupedGoals.map(group => (
            <section key={group.id} className="overflow-hidden rounded-2xl border border-slate-200">
              <h4 className={cn('border-b px-4 py-2.5 text-sm font-bold', groupHeaderTone(group.color))}>{group.name}</h4>
              <ul className="divide-y divide-slate-100">
                {group.goals.map(goal => (
                  <li key={goal.id} className="flex flex-wrap items-center gap-3 bg-white px-4 py-3">
                    <GoalTypeBadge type={goal.type} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">
                        {goal.title}
                        {goal.status === 'DRAFT' && <span className="ml-2 text-xs font-medium text-slate-500">(bản nháp)</span>}
                      </p>
                      {goal.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{goal.description}</p>}
                    </div>
                    <span className="flex items-baseline gap-1 whitespace-nowrap tabular-nums">
                      <span className="text-lg font-black text-slate-900">
                        {goal.actual_final === null ? '—' : number.format(goal.actual_final)}
                      </span>
                      <span className="text-sm font-semibold text-slate-400">
                        / {number.format(goal.target_value)}{goal.unit ? ` ${goal.unit}` : ''}
                      </span>
                    </span>
                    <GoalProgressBadge goal={goal} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

function GoalTypeBadge({ type }: { type: PerformanceGoalType }) {
  return (
    <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold', type === 'KPI' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700')}>
      {type}
    </span>
  )
}

function GoalProgressBadge({ goal }: { goal: PerformanceGoal }) {
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
      <span className="sr-only">{goal.passed ? 'đã đạt' : 'chưa đạt'}</span>
    </span>
  )
}
