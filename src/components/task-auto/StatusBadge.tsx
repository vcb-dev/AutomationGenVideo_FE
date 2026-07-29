import { cn } from '@/lib/utils'
import type { TaskStatus, ApprovalStatus, ContentUsageStatus } from '@/types/task-auto'

const TASK_COLORS: Record<TaskStatus, string> = {
  PENDING:     'bg-slate-100 text-slate-600',
  ASSIGNED:    'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  SUBMITTED:   'bg-purple-100 text-purple-700',
  APPROVED:    'bg-emerald-100 text-emerald-700',
  REJECTED:    'bg-red-100 text-red-700',
  CANCELLED:   'bg-gray-100 text-gray-500',
}

const TASK_LABELS: Record<TaskStatus, string> = {
  PENDING:     'Chờ xử lý',
  ASSIGNED:    'Đã giao',
  IN_PROGRESS: 'Đang làm',
  SUBMITTED:   'Đã nộp',
  APPROVED:    'Đã duyệt',
  REJECTED:    'Từ chối',
  CANCELLED:   'Đã hủy',
}

const APPROVAL_COLORS: Record<ApprovalStatus, string> = {
  PENDING:  'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  PENDING:  'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

const CONTENT_COLORS: Record<ContentUsageStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  IN_TASK:   'bg-blue-100 text-blue-700',
  USED:      'bg-gray-100 text-gray-500',
  ARCHIVED:  'bg-slate-100 text-slate-500',
}

const CONTENT_LABELS: Record<ContentUsageStatus, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_TASK:   'Đang dùng',
  USED:      'Đã dùng',
  ARCHIVED:  'Lưu trữ',
}

const baseClass = 'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold'

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={cn(baseClass, TASK_COLORS[status])}>{TASK_LABELS[status]}</span>
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return <span className={cn(baseClass, APPROVAL_COLORS[status])}>{APPROVAL_LABELS[status]}</span>
}

export function ContentStatusBadge({ status }: { status: ContentUsageStatus }) {
  return <span className={cn(baseClass, CONTENT_COLORS[status])}>{CONTENT_LABELS[status]}</span>
}

const RUN_STATUS_COLORS: Record<string, string> = {
  RUNNING:   'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED:    'bg-red-100 text-red-700',
}

const RUN_STATUS_LABELS: Record<string, string> = {
  RUNNING: 'Đang chạy', COMPLETED: 'Hoàn thành', FAILED: 'Thất bại',
}

export function RunStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(baseClass, RUN_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600')}>
      {RUN_STATUS_LABELS[status] ?? status}
    </span>
  )
}
