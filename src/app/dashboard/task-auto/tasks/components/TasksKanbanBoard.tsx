'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Send, Play, Upload, CheckCircle2, XCircle, AlertTriangle, ChevronDown, Loader2, Inbox, Clock, GripVertical, ExternalLink, Globe, Link2, Eye, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { formatDate, formatDateTime } from '@/components/task-auto/helpers'
import { getTasks, updateTask, approveTask } from '@/lib/api/task-auto'
import { useLoadMoreScroll } from '@/hooks/useLoadMoreScroll'
import { RejectModal } from './RejectModal'
import { VideoPreviewOverlay } from './detail/VideoPreviewOverlay'
import { PublishedLinksSection, formatCount, getPlatformMeta } from './detail/PublishedLinksSection'
import { contentLineCode } from './detail/PublishedPostPicker'
import { resolveContentTitle, resolveProductName, resolveProductImage } from './TasksTable'
import type { Task, TaskStatus } from '@/types/task-auto'

interface Filters {
  teamId?: string
  search?: string
  deadlineFrom?: string
  deadlineTo?: string
  taskType?: 'auto' | 'manual' | ''
  assigneeId?: string
  contentLineId?: string
  productLineId?: string
}

interface Props extends Filters {
  currentUserId?: string
  canApproveReject?: boolean
  onViewTask: (id: string, column: ColumnKey) => void
  // Cho empty state cột gợi ý bỏ lọc ngày — mặc định trang lọc "Hôm nay" nên cột trống
  // rất hay do bộ lọc ngày che khuất chứ không phải thật sự hết task.
  onClearDateFilter?: () => void
}

// Thao tác nhanh ngay trên thẻ — cùng điều kiện quyền với TaskDetailPanel.tsx (canStart/canApproveReject)
// để không phải mở panel chi tiết (hoặc biết trước tính năng kéo-thả) mới làm được các bước phổ biến nhất.
interface CardActions {
  currentUserId?: string
  canApproveReject?: boolean
  startingId: string | null
  approvingId: string | null
  onStart: (id: string) => void
  onApprove: (id: string) => void
  onReject: (task: Task) => void
}

type ColumnKey = TaskStatus | 'PUBLISHED'
type CardVariant = 'assigned' | 'in_progress' | 'submitted' | 'approved' | 'published'

interface ColumnDef {
  key: ColumnKey
  status: TaskStatus
  // Gộp thêm task các status khác vào cùng cột này — BE chỉ lọc được 1 status/lần (xem
  // fetchCombinedStatusTasks) nên phải query riêng từng status rồi merge ở FE. Hiện chỉ cột
  // SUBMITTED dùng để gộp REJECTED (task bị từ chối cần nộp lại nên vẫn thuộc vòng "đã nộp").
  combineStatuses?: TaskStatus[]
  variant: CardVariant
  label: string
  accent: string
  countBadge: string
  iconBg: string
  cardBar: string
  icon: LucideIcon
}

// 4 cột khớp bộ trạng thái đã hiển thị trong dropdown lọc "Trạng thái" trước đây (STATUS_OPTIONS
// ở TaskFilters.tsx) — PENDING/CANCELLED vốn cũng chưa từng lọc được ở đó nên không có cột riêng,
// vẫn xem đủ qua "Tất cả trạng thái" nếu quay lại view khác.
// Riêng REJECTED được gộp vào cột "Đã nộp" (combineStatuses) thay vì có cột riêng: task bị từ
// chối cần nộp lại chứ không "chết", tách hẳn ra sẽ dễ bị quên — hiện chung với badge/viền đỏ
// riêng (xem isRejected trong TaskCard/TaskCardBody) để vẫn phân biệt được với task chờ duyệt.
// Task trễ hạn KHÔNG có cột riêng: nó vẫn nằm đúng cột trạng thái hiện tại của nó (Kanban phản
// ánh giai đoạn xử lý, không phải mức độ khẩn cấp), chỉ được đánh dấu bằng badge + viền trái đỏ/
// cam/vàng ngay trên thẻ (xem isTaskOverdue/overdueBorderClass); danh sách đầy đủ task quá hạn xem ở
// layout Danh sách với bộ lọc "Quá hạn".
const COLUMNS: ColumnDef[] = [
  { key: 'ASSIGNED',    status: 'ASSIGNED',    variant: 'assigned',    label: 'Đã giao',  accent: 'border-t-blue-400',    countBadge: 'bg-blue-50 text-blue-700',    iconBg: 'bg-blue-100 text-blue-600',    cardBar: 'border-l-blue-400',    icon: Send },
  { key: 'IN_PROGRESS', status: 'IN_PROGRESS', variant: 'in_progress', label: 'Đang làm', accent: 'border-t-amber-400',   countBadge: 'bg-amber-50 text-amber-700',  iconBg: 'bg-amber-100 text-amber-600',  cardBar: 'border-l-amber-400',   icon: Play },
  { key: 'SUBMITTED',   status: 'SUBMITTED',   combineStatuses: ['REJECTED'], variant: 'submitted',   label: 'Đã nộp',   accent: 'border-t-purple-400',  countBadge: 'bg-purple-50 text-purple-700', iconBg: 'bg-purple-100 text-purple-600', cardBar: 'border-l-purple-400',  icon: Upload },
  { key: 'APPROVED',    status: 'APPROVED',    variant: 'approved',    label: 'Đã duyệt', accent: 'border-t-emerald-400', countBadge: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-600', cardBar: 'border-l-emerald-400', icon: CheckCircle2 },
  // "Đã đăng" không phải trạng thái riêng: liệt kê lại task đã duyệt, kèm phần link bài đăng.
  { key: 'PUBLISHED',   status: 'APPROVED',    variant: 'published',   label: 'Đã đăng',  accent: 'border-t-cyan-400',    countBadge: 'bg-cyan-50 text-cyan-700',    iconBg: 'bg-cyan-100 text-cyan-600',    cardBar: 'border-l-cyan-400',    icon: Globe },
]

const PAGE_SIZE = 12
// Giới hạn cho danh sách quá hạn dùng để bù vào từng cột khi đang lọc theo ngày (xem
// TasksKanbanBoard: overdueData) — đủ lớn cho quy mô 1 team nội bộ, không phân trang riêng vì
// luôn gộp trọn vẹn vào cột tương ứng thay vì tải thêm dần như các task khác.
const OVERDUE_FETCH_LIMIT = 500

// Kéo-thả chỉ cho phép đúng các dịch chuyển vừa hợp lệ ở BE (xem allowedTransition() trong
// tasks.service.ts) vừa KHÔNG làm mất dữ liệu bắt buộc đi kèm bước đó:
// - ASSIGNED ⇄ IN_PROGRESS: tương đương nút "Bắt đầu làm"/hoàn tác, không cần thêm dữ liệu gì.
//   Cho phép kéo ngược lại (IN_PROGRESS → ASSIGNED) vì kéo nhầm cột rất dễ xảy ra và người
//   dùng cần cách sửa nhanh mà không phải mở panel chi tiết.
// - SUBMITTED → APPROVED: gọi thẳng approveTask() (endpoint review) chứ KHÔNG dùng update()
//   thường vì review() còn tự động đẩy pending video lên Drive — update() thường thì không.
//   Chiều ngược lại (đã duyệt → đã nộp) không hợp lệ ở BE vì approve có side-effect khó hoàn tác
//   nên không thêm kéo-thả cho chiều này.
// Nộp bài (…→ SUBMITTED) cần result_url và từ chối cần lý do nên vẫn bắt buộc qua modal riêng
// (TaskSubmitModal/RejectModal), không cho kéo-thả 2 trường hợp này.
export const DRAG_TRANSITIONS: Partial<Record<TaskStatus, { to: TaskStatus; action: 'move' | 'approve' }>> = {
  ASSIGNED:    { to: 'IN_PROGRESS', action: 'move' },
  IN_PROGRESS: { to: 'ASSIGNED',    action: 'move' },
  SUBMITTED:   { to: 'APPROVED',    action: 'approve' },
}

function statusToVariant(status: TaskStatus): CardVariant {
  switch (status) {
    case 'IN_PROGRESS': return 'in_progress'
    case 'SUBMITTED':   return 'submitted'
    case 'APPROVED':    return 'approved'
    default:             return 'assigned'
  }
}

// Cùng công thức "trễ hạn" với BE (tasks.service.ts findAll doneStatuses) — task đã duyệt/huỷ
// không còn tính trễ hạn dù deadline ở quá khứ.
function isTaskOverdue(task: Task): boolean {
  if (!task.deadline) return false
  if (task.status === 'APPROVED' || task.status === 'CANCELLED') return false
  return new Date(task.deadline).getTime() < Date.now()
}

function daysOverdue(deadline: string): number {
  const ms = Date.now() - new Date(deadline).getTime()
  return Math.max(1, Math.ceil(ms / 86_400_000))
}

// Hạn chót rơi đúng ngày hôm nay (theo lịch, không theo mốc 24h) — tách riêng khỏi isTaskOverdue
// vì 1 task hạn hôm nay lúc 15h vẫn CHƯA quá hạn lúc 10h sáng, nhưng vẫn cần nổi lên ưu tiên nhất
// (xem taskSortTier).
function isDueToday(task: Task): boolean {
  if (!task.deadline) return false
  const d = new Date(task.deadline)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// Thứ tự ưu tiên trong cột: hạn hôm nay (0) lên đầu — cần làm ngay trong ngày — rồi tới các task
// khác (1), quá hạn (2) đẩy xuống cuối vì đã có badge/viền cảnh báo riêng, không cần chiếm vị trí
// đầu cột nữa. Số nhỏ hơn = ưu tiên cao hơn, dùng trực tiếp làm hiệu số so sánh khi sort.
function taskSortTier(task: Task): number {
  if (isTaskOverdue(task)) return 2
  if (isDueToday(task)) return 0
  return 1
}

// Cùng cách tính khoảng ngày với BE (tasks.service.ts findAll: rangeStart/rangeEnd theo giờ VN)
// — dùng để biết 1 task quá hạn có bị bộ lọc ngày hiện tại của cột loại ra hay không.
function isWithinDeadlineRange(deadline: string, from?: string, to?: string): boolean {
  const t = new Date(deadline).getTime()
  if (from && t < new Date(`${from}T00:00:00+07:00`).getTime()) return false
  if (to && t > new Date(`${to}T23:59:59.999+07:00`).getTime()) return false
  return true
}

// Mức độ trễ càng nặng, màu càng gắt — giúp phân biệt nhanh task cần xử lý gấp nhất trong cột.
function overdueBadgeClass(days: number): string {
  if (days <= 1) return 'bg-amber-50 text-amber-600'
  if (days === 2) return 'bg-orange-50 text-orange-600'
  return 'bg-red-50 text-red-600'
}

// Viền trái đổi màu theo mức trễ, đồng bộ ngưỡng với overdueBadgeClass — cho phép nhận ra task
// quá hạn ngay cả khi lướt nhanh qua board mà không cần đọc chữ trên badge.
function overdueBorderClass(days: number): string {
  if (days <= 1) return 'border-l-amber-500'
  if (days === 2) return 'border-l-orange-500'
  return 'border-l-red-500'
}

function CategoryTag({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-emerald-700', className)} title={name}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
      <span className="truncate">{name}</span>
    </span>
  )
}

function ResultLink({ task, onOpenPreview, label = 'Xem kết quả', className }: { task: Task; onOpenPreview?: () => void; label?: string; className?: string }) {
  if (!task.result_url) return null
  const cls = cn(
    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
    className,
  )
  // Cùng convention với TaskDetailPanel: link Drive mở preview trong app (popup), link khác mở tab mới
  if (task.result_url.includes('drive.google.com')) {
    if (!onOpenPreview) return null
    return (
      <button
        type="button"
        title="Xem kết quả"
        aria-label="Xem kết quả"
        onClick={e => { e.stopPropagation(); onOpenPreview() }}
        onPointerDown={e => e.stopPropagation()}
        className={cls}
      >
        <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {label}
      </button>
    )
  }
  return (
    <a
      href={task.result_url}
      target="_blank"
      rel="noopener noreferrer"
      title="Xem kết quả"
      aria-label="Xem kết quả"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      className={cls}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {label}
    </a>
  )
}

function TaskCardBody({ task, variant, onOpenPreview, onManageLinks, hideResultLink }: { task: Task; variant: CardVariant; onOpenPreview?: () => void; onManageLinks?: () => void; hideResultLink?: boolean }) {
  const title = resolveContentTitle(task)
  const productName = resolveProductName(task)
  const productImage = driveImageUrl(resolveProductImage(task), 120)
  const isCompactSubmitted = variant === 'submitted'
  const isCompactPublished = variant === 'published'
  const isCompactCard = isCompactSubmitted || isCompactPublished
  // Tag phân loại lấy theo tuyến nội dung (content_line) của content gắn trên task.
  const categoryTag = task.content_line?.name ?? null
  const links = task.published_links ?? []
  // Task bị từ chối được gộp vào cột "Đã nộp" (xem COLUMNS) — dựa vào task.status thật (không
  // phải variant của cột) để không lẫn với task đang chờ duyệt bình thường.
  const isRejected = task.status === 'REJECTED'
  const overdue = isTaskOverdue(task)
  const overdueDays = overdue && task.deadline ? daysOverdue(task.deadline) : 0
  const showSubmittedMetaRow = isCompactSubmitted && (isRejected || (!hideResultLink && !!task.result_url))

  const resultLink = (
    <ResultLink
      task={task}
      onOpenPreview={onOpenPreview}
      className={cn(
        'ml-auto px-2 text-[11px] text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900',
        isCompactCard ? 'min-h-7' : 'min-h-8',
      )}
    />
  )

  const assigneeRow = (
    <div className="flex min-w-0 items-center justify-between gap-3">
      {task.assignee ? (
        <div className="flex min-w-0 items-center gap-2">
          <AvatarInitials name={task.assignee.full_name} size="xs" />
          <span className="truncate text-xs font-medium text-slate-700" title={task.assignee.full_name}>{task.assignee.full_name}</span>
        </div>
      ) : (
        <span className="text-xs italic text-slate-400">Chưa giao</span>
      )}
      {task.team && (
        <span className="max-w-[112px] shrink-0 truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600" title={task.team.name}>
          {task.team.name}
        </span>
      )}
    </div>
  )

  // Card cột "Đã duyệt": giữ tiêu đề + tuyến nội dung, lược ảnh/tên SP + badge hạn/nộp cho nhẹ.
  if (variant === 'approved' || variant === 'published') {
    return (
      <>
        <p
          className="line-clamp-2 pr-4 text-sm font-semibold leading-5 text-slate-900 transition-colors group-hover:text-indigo-700 motion-reduce:transition-none"
          title={title ?? undefined}
        >
          {title ?? <span className="text-gray-400 italic font-normal">{task.task_type === 'AUTO' ? 'Chưa chọn content' : 'Không có tiêu đề'}</span>}
        </p>

        <div className={cn(
          isCompactPublished ? 'mt-2.5' : 'mt-3 border-y border-slate-100 py-2.5',
        )}>
          {assigneeRow}
        </div>

        <div className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2',
          isCompactPublished ? 'mt-1.5' : 'mt-2',
        )}>
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-500"
              title={formatDateTime(task.reviewed_at ?? task.updated_at)}
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate">{formatDateTime(task.reviewed_at ?? task.updated_at)}</span>
            </span>
            {categoryTag && <CategoryTag name={categoryTag} className="shrink-0" />}
          </div>
          {resultLink}
        </div>

        {variant === 'published' && links.length === 0 && !onManageLinks && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
            Thiếu link bài đăng
          </div>
        )}

        {variant === 'published' && (links.length > 0 || onManageLinks) && (
          <div
            className="mt-2 space-y-1.5 border-t border-slate-100 pt-2"
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            {links.map(link => {
              const meta = getPlatformMeta(link.platform)
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.url}
                  className="flex min-h-8 items-center gap-2 rounded-lg bg-slate-50 px-2 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 [&>svg]:w-3 [&>svg]:h-3"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>
                  <span className="sr-only">{meta.label}: </span>
                  <span className="truncate">{link.url.replace(/^https?:\/\/(www\.)?/i, '')}</span>
                  {link.stats?.status === 'success' && (
                    <span className="ml-auto inline-flex items-center gap-1 shrink-0 text-[11px] font-semibold text-gray-500">
                      <Eye className="w-3 h-3" aria-hidden="true" /> {formatCount(link.stats.views)}
                    </span>
                  )}
                </a>
              )
            })}
            {onManageLinks && links.length > 0 && (
              <button
                type="button"
                onClick={onManageLinks}
                className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-300 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                Thêm / sửa link
              </button>
            )}
            {onManageLinks && links.length === 0 && (
              <button
                type="button"
                onClick={onManageLinks}
                className="group/link flex min-h-9 w-full items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 pl-2.5 pr-1.5 text-left text-xs font-semibold text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <span className="truncate">Thiếu link bài đăng</span>
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-[11px] font-bold text-amber-950 transition-colors group-hover/link:bg-amber-500 motion-reduce:transition-none">
                  Gắn ngay
                  <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                </span>
              </button>
            )}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className={cn('flex items-start pr-3', isCompactSubmitted ? 'gap-2.5' : 'gap-3')}>
        {productImage && (
          <img
            src={productImage}
            alt={productName ? `Sản phẩm ${productName}` : 'Ảnh sản phẩm'}
            width={44}
            height={44}
            loading="lazy"
            className={cn(
              'shrink-0 border border-slate-200 object-cover',
              isCompactSubmitted ? 'h-9 w-9 rounded-lg' : 'h-11 w-11 rounded-xl',
            )}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900 transition-colors group-hover:text-indigo-700 motion-reduce:transition-none"
              title={title ?? undefined}
            >
              {title ?? <span className="text-gray-400 italic font-normal">{task.task_type === 'AUTO' ? 'Chưa chọn content' : 'Không có tiêu đề'}</span>}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {isCompactSubmitted && overdue && (
                <span
                  className={cn(
                    'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[10px] font-bold',
                    overdueBadgeClass(overdueDays),
                  )}
                  title={`Quá hạn ${overdueDays} ngày`}
                  aria-label={`Quá hạn ${overdueDays} ngày`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {overdueDays} ngày
                </span>
              )}
              <span className={cn(
                'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                task.task_type === 'AUTO' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700',
              )}>
                {task.task_type === 'AUTO' ? 'Auto' : 'ST'}
              </span>
            </div>
          </div>
          {(productName || (isCompactSubmitted && categoryTag)) && (
            <div className={cn('flex min-w-0 items-center gap-2 text-xs text-slate-500', isCompactSubmitted ? 'mt-0.5' : 'mt-1')}>
              {productName && <span className="truncate" title={productName}>{productName}</span>}
              {isCompactSubmitted && categoryTag && <CategoryTag name={categoryTag} className="max-w-[45%] shrink-0" />}
            </div>
          )}
        </div>
      </div>

      <div className={cn(
        isCompactSubmitted ? 'mt-2.5' : 'mt-3 border-y border-slate-100 py-2.5',
      )}>
        {assigneeRow}
      </div>

      {(!isCompactSubmitted || showSubmittedMetaRow) && (
        <div className={cn(
          'flex flex-wrap items-center',
          isCompactSubmitted ? 'mt-1.5 gap-x-2.5 gap-y-1' : 'mt-2.5 gap-x-3 gap-y-2',
        )}>
          {isCompactSubmitted && isRejected && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
              <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Bị từ chối
            </span>
          )}

          {!isCompactSubmitted && overdue && task.deadline && (
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold',
              overdueBadgeClass(overdueDays),
            )}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Quá hạn {overdueDays} ngày
            </span>
          )}

          {(variant === 'assigned' || variant === 'in_progress') && task.deadline && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" /> Hạn {formatDate(task.deadline)}
            </span>
          )}

          {!isCompactSubmitted && categoryTag && <CategoryTag name={categoryTag} />}
          {isCompactSubmitted && !hideResultLink && resultLink}
        </div>
      )}

      {isRejected && task.reject_reason && (
        <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5">
          <p className="line-clamp-2 text-[11px] leading-4 text-red-700">
            <span className="font-semibold">Lý do từ chối: </span>{task.reject_reason}
          </p>
        </div>
      )}
    </>
  )
}

function TaskCard({ task, variant, cardBar, actions, onViewTask, onManageLinks }: {
  task: Task
  variant: CardVariant
  cardBar: string
  actions: CardActions
  onViewTask: (id: string) => void
  onManageLinks?: (id: string) => void
}) {
  const draggable = !!DRAG_TRANSITIONS[task.status]
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: variant === 'published' ? `published:${task.id}` : task.id,
    data: { task },
    disabled: !draggable,
  })

  const canStartTask  = task.status === 'ASSIGNED' && !!actions.currentUserId && task.assignee_id === actions.currentUserId
  const canReviewTask = task.status === 'SUBMITTED' && !!actions.canApproveReject
  const isStarting    = actions.startingId === task.id
  const isApproving   = actions.approvingId === task.id
  const isRejected    = task.status === 'REJECTED'
  const overdue        = isTaskOverdue(task)
  const isCompactSubmitted = variant === 'submitted'
  const isCompactCard = isCompactSubmitted || variant === 'published'
  const hasSubmittedResultAction = isCompactSubmitted && !!task.result_url
  const canEditLinks   = !!actions.canApproveReject || (!!actions.currentUserId && task.assignee_id === actions.currentUserId)

  const [showPreview, setShowPreview] = useState(false)

  return (
    // div role="button" thay vì <button> vì bên trong có nút thao tác nhanh — không được lồng button trong button
    <div
      ref={setNodeRef}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      role="button"
      tabIndex={0}
      onClick={() => onViewTask(task.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewTask(task.id) } }}
      style={transform ? { transform: CSS.Translate.toString(transform), touchAction: 'none' } : undefined}
      className={cn(
        'group relative w-full cursor-pointer rounded-[14px] border border-l-[3px] text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none transition-[border-color,box-shadow,background-color] duration-200 motion-reduce:transition-none',
        'hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        isCompactCard ? 'p-3' : 'p-4',
        // Ưu tiên hiển thị: bị từ chối > quá hạn > màu cardBar mặc định của cột — không kết hợp
        // nhiều bộ class border cùng lúc vì các utility Tailwind cùng cấp độ ưu tiên, đứng sau
        // trong HTML không chắc thắng theo thứ tự CSS sinh ra.
        isRejected
          ? 'border-red-200 border-l-red-500 bg-white hover:border-red-300'
          : overdue
            ? cn('border-slate-200 bg-white hover:border-red-300', overdueBorderClass(daysOverdue(task.deadline!)))
            : cn('border-slate-200 bg-white hover:border-slate-300', cardBar),
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      {draggable && (
        <GripVertical
          className="absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        />
      )}
      <TaskCardBody
        task={task}
        variant={variant}
        onOpenPreview={() => setShowPreview(true)}
        onManageLinks={onManageLinks && canEditLinks ? () => onManageLinks(task.id) : undefined}
        hideResultLink={isCompactSubmitted || canReviewTask}
      />

      {showPreview && task.result_url && createPortal(
        // Portal ra document.body để overlay không bị giới hạn bởi stacking/containing context của card.
        // stopPropagation để bấm backdrop đóng overlay không lọt lên onClick mở panel chi tiết của card.
        <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          <VideoPreviewOverlay resultUrl={task.result_url} onClose={() => setShowPreview(false)} />
        </div>,
        document.body,
      )}

      {(canStartTask || canReviewTask || hasSubmittedResultAction) && (
        // Chặn cả click lẫn pointerdown để bấm nút không mở panel chi tiết và không kích hoạt kéo-thả
        <div
          className={cn(
            'mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3',
          )}
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          {canStartTask && (
            <button
              type="button"
              onClick={() => actions.onStart(task.id)}
              disabled={isStarting}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60',
                isCompactSubmitted ? 'min-h-9 px-2.5' : 'min-h-10 px-3',
              )}
            >
              {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
              Bắt đầu làm
            </button>
          )}
          {canReviewTask && (
            <>
              <button
                type="button"
                onClick={() => actions.onApprove(task.id)}
                disabled={isApproving}
                aria-busy={isApproving}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 transition-[background-color,border-color,color,transform] hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none',
                  isCompactSubmitted ? 'min-h-9 px-2.5' : 'min-h-10 px-3',
                )}
              >
                {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                Duyệt
              </button>
              <button
                type="button"
                onClick={() => actions.onReject(task)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-600 transition-[background-color,border-color,color,transform] hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 motion-reduce:transform-none motion-reduce:transition-none',
                  isCompactSubmitted ? 'min-h-9 px-2.5' : 'min-h-10 px-3',
                )}
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Từ chối
              </button>
            </>
          )}
          {hasSubmittedResultAction && (
            <ResultLink
              task={task}
              onOpenPreview={() => setShowPreview(true)}
              label="Kết quả"
              className="ml-auto min-h-9 justify-center border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-indigo-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[background-color,border-color,color,box-shadow,transform] hover:border-indigo-200 hover:bg-indigo-50 active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none"
            />
          )}
        </div>
      )}
    </div>
  )
}

// BE chỉ lọc được 1 status/lần (xem tasks.service.ts findAll: `where.status = q.status`) nên cột
// gộp nhiều status (hiện chỉ "Đã nộp" gộp REJECTED) phải query riêng từng status rồi merge ở FE,
// sort theo updated_at giống sort mặc định của BE rồi cắt về đúng `limit` như 1 trang bình thường.
async function fetchCombinedStatusTasks(statuses: TaskStatus[], filters: Filters, limit: number) {
  const base = {
    team_id: filters.teamId,
    search: filters.search,
    deadline_from: filters.deadlineFrom,
    deadline_to: filters.deadlineTo,
    task_type: filters.taskType || undefined,
    assignee_id: filters.assigneeId,
    content_line_id: filters.contentLineId,
    product_line_id: filters.productLineId,
    page: 1,
    limit,
    sort: 'updated_at' as const,
  }
  const results = await Promise.all(statuses.map(status => getTasks({ ...base, status })))
  const data = results
    .flatMap(r => r.data)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit)
  const total = results.reduce((sum, r) => sum + r.total, 0)
  return { data, total, page: 1, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

function KanbanColumn({
  column, filters, isDropDisabled, isValidTarget, actions, hasDateFilter, overdueTasks, onClearDateFilter, onViewTask,
}: {
  column: ColumnDef
  filters: Filters
  isDropDisabled: boolean
  isValidTarget: boolean
  actions: CardActions
  hasDateFilter: boolean
  // Toàn bộ task quá hạn khớp team/search/loại/người làm hiện tại (KHÔNG lọc theo ngày/status) —
  // dùng để bù những task quá hạn bị bộ lọc ngày của cột loại ra, xem `missingOverdue` bên dưới.
  overdueTasks: Task[]
  onClearDateFilter?: () => void
  onViewTask: (id: string, column: ColumnKey) => void
}) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [linkTaskId, setLinkTaskId] = useState<string | null>(null)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.key, disabled: isDropDisabled })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['task-auto', 'tasks', 'kanban', column.status, filters, limit],
    queryFn: () => column.combineStatuses?.length
      ? fetchCombinedStatusTasks([column.status, ...column.combineStatuses], filters, limit)
      : getTasks({
        status: column.status,
        team_id: filters.teamId,
        search: filters.search,
        deadline_from: filters.deadlineFrom,
        deadline_to: filters.deadlineTo,
        task_type: filters.taskType || undefined,
        assignee_id: filters.assigneeId,
        content_line_id: filters.contentLineId,
        product_line_id: filters.productLineId,
        page: 1,
        limit,
        // Cột "Đã duyệt" sắp theo ngày tạo; các cột khác theo updated_at.
        sort: column.status === 'APPROVED' ? 'created_at' : 'updated_at',
      }),
    refetchOnWindowFocus: true,
    // Giữ thẻ cũ khi "Xem thêm" đổi queryKey — nếu không, cột chớp skeleton và scroll nhảy về đầu.
    placeholderData: keepPreviousData,
  })

  const rawTasks = data?.data ?? []

  // Bộ lọc ngày (mặc định "Hôm nay") lọc theo deadline nên tự loại luôn các task quá hạn từ
  // trước đó — quá hạn là tín hiệu cần xử lý NGAY nên không nên bị 1 khung ngày che khuất. Bù
  // lại đúng phần bị thiếu (deadline nằm ngoài khoảng đang lọc) từ overdueTasks (không lọc ngày).
  const missingOverdue = useMemo(() => {
    if (!hasDateFilter) return []
    const statuses = new Set<TaskStatus>([column.status, ...(column.combineStatuses ?? [])])
    return overdueTasks.filter(t =>
      statuses.has(t.status) && !isWithinDeadlineRange(t.deadline!, filters.deadlineFrom, filters.deadlineTo),
    )
  }, [overdueTasks, hasDateFilter, column.status, column.combineStatuses, filters.deadlineFrom, filters.deadlineTo])

  // Ưu tiên hạn hôm nay lên đầu (việc cần làm trong ngày), quá hạn đẩy xuống cuối (đã có badge/
  // viền cảnh báo riêng nên không cần chiếm chỗ đầu cột nữa) — xem taskSortTier.
  const tasks = useMemo(() => {
    const map = new Map<string, Task>()
    for (const t of rawTasks) map.set(t.id, t)
    for (const t of missingOverdue) map.set(t.id, t)
    const merged = Array.from(map.values())
    // Cột "Đã duyệt" giữ thứ tự BE (created_at giảm dần), không áp taskSortTier.
    if (column.status === 'APPROVED') return merged
    return merged.sort((a, b) => taskSortTier(a) - taskSortTier(b))
  }, [rawTasks, missingOverdue, column.status])
  // missingOverdue luôn được gộp trọn vẹn (không phân trang) nên cộng thẳng vào total — phép tính
  // "Xem thêm" bên dưới vẫn đúng vì cả tasks.length lẫn total đều cộng thêm đúng 1 lượng như nhau.
  const total = (data?.total ?? 0) + missingOverdue.length
  const hasMore = tasks.length < total
  const Icon = column.icon
  const linkTask = linkTaskId ? tasks.find(t => t.id === linkTaskId) : undefined

  const { listRef, markLoadMore } = useLoadMoreScroll(tasks.map(t => t.id), isFetching)

  return (
    <div
      ref={setDropRef}
      className={cn(
        'flex min-w-[300px] flex-1 flex-col rounded-2xl border border-t-[3px] shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors xl:min-w-[320px]',
        column.accent,
        // Khi đang kéo: cột hợp lệ được tô sáng ngay (không cần hover tới) để biết thả vào đâu
        isValidTarget
          ? isOver
            ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400'
            : 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200'
          : 'border-slate-200 bg-slate-50/80',
        isDropDisabled && 'opacity-50',
      )}
    >
      <div className="flex shrink-0 items-center gap-2.5 px-3.5 py-3">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', column.iconBg)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold text-slate-800">{column.label}</h3>
        <span className={cn(
          'ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-bold tabular-nums',
          column.countBadge,
        )}>
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : total}
        </span>
      </div>

      <div
        ref={listRef}
        className={cn(
          'custom-scrollbar max-h-[calc(100vh-290px)] min-h-[160px] flex-1 overflow-y-auto px-2.5 pb-2.5',
          column.variant === 'submitted' || column.variant === 'published' ? 'space-y-2' : 'space-y-3',
        )}
      >
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'animate-pulse space-y-3 rounded-[14px] border border-slate-200 bg-white',
                column.variant === 'submitted' || column.variant === 'published' ? 'p-3' : 'p-4',
              )}
            >
              <div className="h-4 w-3/4 rounded bg-slate-100" />
              <div className="h-9 rounded-lg bg-slate-50" />
              <div className="h-3 w-2/3 rounded bg-slate-100" />
            </div>
          ))
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-10 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <Inbox className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </span>
            <p className="text-xs text-slate-500">
              {hasDateFilter ? 'Không có task trong khoảng ngày đang lọc' : 'Không có task'}
            </p>
            {hasDateFilter && onClearDateFilter && (
              <button
                type="button"
                onClick={onClearDateFilter}
                className="min-h-8 rounded-lg px-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Xem tất cả ngày
              </button>
            )}
          </div>
        ) : (
          <>
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                variant={column.variant}
                cardBar={column.cardBar}
                actions={actions}
                onViewTask={id => onViewTask(id, column.key)}
                onManageLinks={column.variant === 'published' ? setLinkTaskId : undefined}
              />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={() => { markLoadMore(); setLimit(l => l + PAGE_SIZE) }}
                disabled={isFetching}
                className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
              >
                {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
                Xem thêm {Math.min(PAGE_SIZE, total - tasks.length)}
              </button>
            )}
          </>
        )}
      </div>

      {linkTask && (
        <Dialog open onOpenChange={open => { if (!open) setLinkTaskId(null) }}>
          <DialogContent className="flex max-h-[min(90vh,720px)] w-[calc(100vw-24px)] max-w-xl flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl sm:rounded-2xl">
            <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 pr-14">
              <DialogTitle className="text-base font-bold leading-snug text-slate-900 line-clamp-2">
                {resolveContentTitle(linkTask) ?? 'Không có tiêu đề'}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                {linkTask.assignee?.full_name ?? 'Chưa giao'} · Duyệt lúc {formatDateTime(linkTask.reviewed_at ?? linkTask.updated_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto p-4">
              <PublishedLinksSection
                taskId={linkTask.id}
                publishedLinks={linkTask.published_links}
                canEdit
                taskTitle={resolveContentTitle(linkTask)}
                anchorDate={linkTask.submitted_at ?? linkTask.reviewed_at ?? linkTask.deadline}
                owner={linkTask.assignee ? { id: linkTask.assignee.id, name: linkTask.assignee.full_name } : null}
                team={linkTask.team ? { id: linkTask.team.id, name: linkTask.team.name } : null}
                contentLine={contentLineCode(linkTask.content_line)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export function TasksKanbanBoard({
  teamId, search, deadlineFrom, deadlineTo, taskType, assigneeId, contentLineId, productLineId,
  currentUserId, canApproveReject, onViewTask, onClearDateFilter,
}: Props) {
  const filters: Filters = { teamId, search, deadlineFrom, deadlineTo, taskType, assigneeId, contentLineId, productLineId }
  const queryClient = useQueryClient()
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Toàn bộ task quá hạn khớp team/search/loại/người làm hiện tại — bù vào từng cột khi bộ lọc
  // ngày (vd mặc định "Hôm nay") đang loại chúng ra
  // (xem missingOverdue trong KanbanColumn). BE bỏ qua status/deadline_from/to khi overdue=true
  // (tasks.service.ts findAll q.overdue) nên 1 query duy nhất là đủ cho mọi cột.
  const { data: overdueData } = useQuery({
    queryKey: ['task-auto', 'tasks', 'kanban-overdue', filters],
    queryFn: () => getTasks({
      overdue: true,
      team_id: filters.teamId,
      search: filters.search,
      task_type: filters.taskType || undefined,
      assignee_id: filters.assigneeId,
      content_line_id: filters.contentLineId,
      product_line_id: filters.productLineId,
      page: 1,
      limit: OVERDUE_FETCH_LIMIT,
      sort: 'updated_at',
    }),
    refetchOnWindowFocus: true,
  })
  const overdueTasks = overdueData?.data ?? []

  function invalidateTasks() {
    queryClient.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
  }

  // Dùng chung cho nút "Bắt đầu làm" lẫn kéo-thả (cả 2 chiều ASSIGNED ⇄ IN_PROGRESS) — cùng
  // gọi update() thường, chỉ khác trạng thái đích nên gộp 1 mutation nhận kèm { id, to }.
  const moveMutation = useMutation({
    mutationFn: ({ id, to }: { id: string; to: TaskStatus }) => updateTask(id, { status: to }),
    onSuccess: (_data, { to }) => {
      invalidateTasks()
      toast.success(`Đã chuyển sang "${COLUMNS.find(c => c.status === to)?.label ?? to}"`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể chuyển trạng thái task này'),
  })
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveTask(id),
    onSuccess: () => { invalidateTasks(); toast.success('Đã duyệt task') },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể duyệt task này'),
  })

  function handleDragStart(event: DragStartEvent) {
    setDraggingTask((event.active.data.current?.task as Task) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingTask(null)
    const { active, over } = event
    if (!over) return
    const task = active.data.current?.task as Task | undefined
    if (!task) return
    const toStatus = over.id as TaskStatus
    const transition = DRAG_TRANSITIONS[task.status]
    if (!transition || transition.to !== toStatus) return
    if (transition.action === 'approve') approveMutation.mutate(task.id)
    else moveMutation.mutate({ id: task.id, to: transition.to })
  }

  const draggingStatus = draggingTask?.status ?? null
  const activeTransition = draggingStatus ? DRAG_TRANSITIONS[draggingStatus] : undefined

  const cardActions: CardActions = {
    currentUserId,
    canApproveReject,
    startingId:  moveMutation.isPending   ? moveMutation.variables?.id ?? null : null,
    approvingId: approveMutation.isPending ? approveMutation.variables ?? null : null,
    onStart:   id => moveMutation.mutate({ id, to: 'IN_PROGRESS' }),
    onApprove: id => approveMutation.mutate(id),
    onReject:  task => setRejectingTask(task),
  }

  const hasDateFilter = !!(deadlineFrom || deadlineTo)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingTask(null)}
    >
      <div className="space-y-3">
        <div className="space-y-3">
          {/* Gợi ý thao tác — kéo-thả vốn khó tự phát hiện nếu không nói ra */}
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-500">
            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <p>
              Bấm thẻ để xem chi tiết; kéo sang cột bên để đổi trạng thái
              (Đã giao ⇄ Đang làm{canApproveReject ? ', Đã nộp → Đã duyệt' : ''}). Thẻ quá hạn luôn có
              nhãn cảnh báo; cột Đã đăng dùng để quản lý link bài đăng.
            </p>
          </div>

          <div className="custom-scrollbar flex items-start gap-3 overflow-x-auto pb-2">
            {COLUMNS.map(col => {
              const isValidTarget = activeTransition?.to === col.key
              return (
                <KanbanColumn
                  key={col.key}
                  column={col}
                  filters={filters}
                  isValidTarget={isValidTarget}
                  isDropDisabled={!!draggingStatus && !isValidTarget}
                  actions={cardActions}
                  hasDateFilter={hasDateFilter}
                  overdueTasks={overdueTasks}
                  onClearDateFilter={onClearDateFilter}
                  onViewTask={onViewTask}
                />
              )
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggingTask && (
          <div className={cn(
            'w-[300px] cursor-grabbing rounded-[14px] border border-l-[3px] border-indigo-300 bg-white p-4 shadow-2xl',
            isTaskOverdue(draggingTask)
              ? overdueBorderClass(daysOverdue(draggingTask.deadline!))
              : COLUMNS.find(c => c.status === draggingTask.status)?.cardBar,
          )}>
            <TaskCardBody task={draggingTask} variant={statusToVariant(draggingTask.status)} />
          </div>
        )}
      </DragOverlay>

      {rejectingTask && (
        <RejectModal
          task={rejectingTask}
          onClose={() => setRejectingTask(null)}
          onSuccess={() => setRejectingTask(null)}
        />
      )}
    </DndContext>
  )
}
