'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Send, Play, Upload, CheckCircle2, XCircle, AlertTriangle, ChevronDown, Loader2, Inbox, Clock, GripVertical, ExternalLink } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { formatDate, formatDateTime } from '@/components/task-auto/helpers'
import { getTasks, updateTask, approveTask } from '@/lib/api/task-auto'
import { useLoadMoreScroll } from '@/hooks/useLoadMoreScroll'
import { RejectModal } from './RejectModal'
import { VideoPreviewOverlay } from './detail/VideoPreviewOverlay'
import { resolveContentTitle, resolveProductName, resolveProductImage } from './TasksTable'
import type { Task, TaskStatus } from '@/types/task-auto'

interface Filters {
  teamId?: string
  search?: string
  deadlineFrom?: string
  deadlineTo?: string
  taskType?: 'auto' | 'manual' | ''
  assigneeId?: string
}

interface Props extends Filters {
  currentUserId?: string
  canApproveReject?: boolean
  onViewTask: (id: string) => void
  // Cho empty state cột gợi ý bỏ lọc ngày — mặc định trang lọc "Hôm nay" nên cột trống
  // rất hay do bộ lọc ngày che khuất chứ không phải thật sự hết task.
  onClearDateFilter?: () => void
  // Bấm số "Quá hạn" trên KanbanStatsBar → chuyển sang layout Danh sách (bảng phẳng) đã lọc sẵn
  // overdue=true, vì Kanban gom theo 4 cột trạng thái nên không có 1 view liệt kê phẳng tại đây.
  onShowOverdueList?: () => void
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

type ColumnKey = TaskStatus
type CardVariant = 'assigned' | 'in_progress' | 'submitted' | 'approved'

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
// cam/vàng ngay trên thẻ (xem isTaskOverdue/overdueBorderClass) và gộp vào ô đếm "Quá hạn" ở
// KanbanStatsBar — bấm vào đó để xem đầy đủ (chuyển sang layout Danh sách đã lọc overdue=true).
const COLUMNS: ColumnDef[] = [
  { key: 'ASSIGNED',    status: 'ASSIGNED',    variant: 'assigned',    label: 'Đã giao',  accent: 'border-t-blue-400',    countBadge: 'bg-blue-50 text-blue-700',    iconBg: 'bg-blue-100 text-blue-600',    cardBar: 'border-l-blue-400',    icon: Send },
  { key: 'IN_PROGRESS', status: 'IN_PROGRESS', variant: 'in_progress', label: 'Đang làm', accent: 'border-t-amber-400',   countBadge: 'bg-amber-50 text-amber-700',  iconBg: 'bg-amber-100 text-amber-600',  cardBar: 'border-l-amber-400',   icon: Play },
  { key: 'SUBMITTED',   status: 'SUBMITTED',   combineStatuses: ['REJECTED'], variant: 'submitted',   label: 'Đã nộp',   accent: 'border-t-purple-400',  countBadge: 'bg-purple-50 text-purple-700', iconBg: 'bg-purple-100 text-purple-600', cardBar: 'border-l-purple-400',  icon: Upload },
  { key: 'APPROVED',    status: 'APPROVED',    variant: 'approved',    label: 'Đã duyệt', accent: 'border-t-emerald-400', countBadge: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-600', cardBar: 'border-l-emerald-400', icon: CheckCircle2 },
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

function CategoryTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      {name}
    </span>
  )
}

function TaskCardBody({ task, variant, onOpenPreview }: { task: Task; variant: CardVariant; onOpenPreview?: () => void }) {
  const title = resolveContentTitle(task)
  const productName = resolveProductName(task)
  const productImage = driveImageUrl(resolveProductImage(task), 120)
  // Tag phân loại lấy theo tuyến nội dung (content_line) của content gắn trên task.
  const categoryTag = task.content_line?.name ?? null
  const missingLink = task.status === 'APPROVED' && !task.published_links?.length
  // Task bị từ chối được gộp vào cột "Đã nộp" (xem COLUMNS) — dựa vào task.status thật (không
  // phải variant của cột) để không lẫn với task đang chờ duyệt bình thường.
  const isRejected = task.status === 'REJECTED'
  const overdue = isTaskOverdue(task)
  const overdueDays = overdue && task.deadline ? daysOverdue(task.deadline) : 0
  // Cùng convention với TaskDetailPanel: link Drive mở preview trong app (popup), link khác mở tab mới
  const isDriveUrl = task.result_url?.includes('drive.google.com')

  const resultLink = task.result_url && (
    isDriveUrl ? (
      onOpenPreview && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onOpenPreview() }}
          onPointerDown={e => e.stopPropagation()}
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2 transition-colors shrink-0"
        >
          <Play className="w-3 h-3 shrink-0" /> Xem kết quả
        </button>
      )
    ) : (
      <a
        href={task.result_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2 transition-colors shrink-0"
      >
        <ExternalLink className="w-3 h-3 shrink-0" /> Xem kết quả
      </a>
    )
  )

  const assigneeRow = (
    <div className="flex items-center justify-between gap-2">
      {task.assignee ? (
        <div className="flex items-center gap-1.5 min-w-0">
          <AvatarInitials name={task.assignee.full_name} size="xs" />
          <span className="text-xs font-medium text-gray-600 truncate max-w-[110px]">{task.assignee.full_name}</span>
        </div>
      ) : (
        <span className="text-xs text-gray-300 italic">Chưa giao</span>
      )}
      {task.team && (
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0 truncate max-w-[100px]">
          {task.team.name}
        </span>
      )}
    </div>
  )

  // Card cột "Đã duyệt": giữ tiêu đề + tuyến nội dung, lược ảnh/tên SP + badge hạn/nộp cho nhẹ.
  if (variant === 'approved') {
    return (
      <>
        <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 line-clamp-2 leading-snug transition-colors">
          {title ?? <span className="text-gray-400 italic font-normal">Không có tiêu đề</span>}
        </p>

        <div className="mt-3">{assigneeRow}</div>

        <div className="flex items-center flex-wrap gap-2 mt-2.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 shrink-0">
            <Clock className="w-3 h-3 shrink-0" />
            {formatDateTime(task.reviewed_at ?? task.updated_at)}
          </span>
          {categoryTag && <CategoryTag name={categoryTag} />}
          {missingLink && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">
              <AlertTriangle className="w-3 h-3 shrink-0" /> Thiếu link
            </span>
          )}
          {resultLink}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex items-start gap-2.5">
        {productImage && (
          <img
            src={productImage}
            alt={productName ?? ''}
            className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 line-clamp-2 leading-snug transition-colors">
              {title ?? <span className="text-gray-400 italic font-normal">Không có tiêu đề</span>}
            </p>
            <span className={cn(
              'shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              task.task_type === 'AUTO' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700',
            )}>
              {task.task_type === 'AUTO' ? 'Auto' : 'ST'}
            </span>
          </div>
          {productName && <p className="text-xs text-gray-400 mt-0.5 truncate">{productName}</p>}
        </div>
      </div>

      <div className="mt-3">{assigneeRow}</div>

      <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
        {overdue && task.deadline && (
          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold', overdueBadgeClass(overdueDays))}>
            <AlertTriangle className="w-3 h-3 shrink-0" /> Quá hạn {overdueDays} ngày
          </span>
        )}

        {variant === 'submitted' && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-500">
            <Send className="w-3 h-3 shrink-0" /> Nộp: {formatDateTime(task.submitted_at ?? task.updated_at)}
          </span>
        )}

        {(variant === 'assigned' || variant === 'in_progress') && task.deadline && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-500">
            <Clock className="w-3 h-3 shrink-0" /> Hạn: {formatDate(task.deadline)}
          </span>
        )}

        {categoryTag && <CategoryTag name={categoryTag} />}

        {variant === 'submitted' && (
          isRejected ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
              <XCircle className="w-3 h-3 shrink-0" /> Bị từ chối
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
              Chờ duyệt
            </span>
          )
        )}

        {resultLink}
      </div>

      {isRejected && task.reject_reason && (
        <p className="mt-2 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 line-clamp-2">
          <span className="font-semibold">Lý do từ chối: </span>{task.reject_reason}
        </p>
      )}
    </>
  )
}

function TaskCard({ task, variant, cardBar, actions, onViewTask }: {
  task: Task
  variant: CardVariant
  cardBar: string
  actions: CardActions
  onViewTask: (id: string) => void
}) {
  const draggable = !!DRAG_TRANSITIONS[task.status]
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !draggable,
  })

  const canStartTask  = task.status === 'ASSIGNED' && !!actions.currentUserId && task.assignee_id === actions.currentUserId
  const canReviewTask = task.status === 'SUBMITTED' && !!actions.canApproveReject
  const isStarting    = actions.startingId === task.id
  const isApproving   = actions.approvingId === task.id
  const isRejected    = task.status === 'REJECTED'
  const overdue        = isTaskOverdue(task)

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
        'relative w-full text-left border border-l-4 rounded-xl p-3.5 shadow-sm cursor-pointer transition-all group',
        'hover:shadow-lg hover:shadow-slate-200/70 hover:-translate-y-0.5',
        // Ưu tiên hiển thị: bị từ chối > quá hạn > màu cardBar mặc định của cột — không kết hợp
        // nhiều bộ class border cùng lúc vì các utility Tailwind cùng cấp độ ưu tiên, đứng sau
        // trong HTML không chắc thắng theo thứ tự CSS sinh ra.
        isRejected
          ? 'bg-red-50/70 border-red-300 border-l-red-500 ring-1 ring-red-200 hover:border-red-400'
          : overdue
            ? cn('bg-white border-gray-200 hover:border-red-300', overdueBorderClass(daysOverdue(task.deadline!)))
            : cn('bg-white border-gray-200 hover:border-indigo-300', cardBar),
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      {draggable && (
        <GripVertical className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <TaskCardBody task={task} variant={variant} onOpenPreview={() => setShowPreview(true)} />

      {showPreview && task.result_url && createPortal(
        // Portal ra document.body: card có hover:-translate-y-0.5 (transform khi hover) làm ancestor
        // trở thành containing block cho position:fixed, khiến overlay bị "giam" trong card và
        // nháy liên tục theo trạng thái hover thay vì hiện full màn hình như mong đợi.
        // stopPropagation để bấm backdrop đóng overlay không lọt lên onClick mở panel chi tiết của card.
        <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          <VideoPreviewOverlay resultUrl={task.result_url} onClose={() => setShowPreview(false)} />
        </div>,
        document.body,
      )}

      {(canStartTask || canReviewTask) && (
        // Chặn cả click lẫn pointerdown để bấm nút không mở panel chi tiết và không kích hoạt kéo-thả
        <div
          className="flex gap-1.5 mt-3"
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          {canStartTask && (
            <button
              type="button"
              onClick={() => actions.onStart(task.id)}
              disabled={isStarting}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-60"
            >
              {isStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Bắt đầu làm
            </button>
          )}
          {canReviewTask && (
            <>
              <button
                type="button"
                onClick={() => actions.onApprove(task.id)}
                disabled={isApproving}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors disabled:opacity-60"
              >
                {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Duyệt
              </button>
              <button
                type="button"
                onClick={() => actions.onReject(task)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Từ chối
              </button>
            </>
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
  column, filters, isDropDisabled, isValidTarget, actions, hasDateFilter, overdueTasks, onClearDateFilter, onViewTask, onTotalChange,
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
  onViewTask: (id: string) => void
  onTotalChange: (key: ColumnKey, total: number) => void
}) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.key, disabled: isDropDisabled })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['task-auto', 'tasks', 'kanban', column.key, filters, limit],
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
        page: 1,
        limit,
        // Cột "Đã duyệt" sắp theo ngày TẠO task (mới nhất lên đầu) theo yêu cầu; 3 cột còn lại
        // vẫn theo updated_at để việc vừa động tới nổi lên trên.
        sort: column.status === 'APPROVED' ? 'created_at' : 'updated_at',
      }),
    refetchOnWindowFocus: true,
    // Bấm "Xem thêm" chỉ tăng `limit` → queryKey đổi. Không giữ data cũ thì useQuery trả về
    // isLoading=true, cả cột bị thay bằng skeleton, chiều cao co lại và scroll của cột nhảy về
    // đầu. keepPreviousData giữ nguyên các thẻ đang hiển thị (key theo task.id), chỉ nối thêm
    // thẻ mới xuống dưới nên vị trí cuộn không đổi.
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
    // Cột "Đã duyệt": giữ nguyên thứ tự BE trả về (created_at giảm dần — task tạo mới nhất lên
    // đầu) theo yêu cầu, không áp mức khẩn taskSortTier như các cột khác.
    if (column.status === 'APPROVED') return merged
    return merged.sort((a, b) => taskSortTier(a) - taskSortTier(b))
  }, [rawTasks, missingOverdue, column.status])
  // missingOverdue luôn được gộp trọn vẹn (không phân trang) nên cộng thẳng vào total — phép tính
  // "Xem thêm" bên dưới vẫn đúng vì cả tasks.length lẫn total đều cộng thêm đúng 1 lượng như nhau.
  const total = (data?.total ?? 0) + missingOverdue.length
  const hasMore = tasks.length < total
  const Icon = column.icon

  const { listRef, markLoadMore } = useLoadMoreScroll(tasks.map(t => t.id), isFetching)

  useEffect(() => {
    if (!isLoading) onTotalChange(column.key, total)
  }, [column.key, total, isLoading, onTotalChange])

  return (
    <div
      ref={setDropRef}
      className={cn(
        'flex flex-col rounded-2xl border border-t-4 flex-1 min-w-[260px] shadow-sm shadow-slate-200/50 transition-colors',
        column.accent,
        // Khi đang kéo: cột hợp lệ được tô sáng ngay (không cần hover tới) để biết thả vào đâu
        isValidTarget
          ? isOver
            ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400'
            : 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200'
          : 'bg-gray-50/70 border-gray-200',
        isDropDisabled && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-3.5 shrink-0">
        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', column.iconBg)}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <h3 className="text-sm font-bold text-gray-700">{column.label}</h3>
        <span className={cn(
          'ml-auto inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold',
          column.countBadge,
        )}>
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : total}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2.5 max-h-[calc(100vh-290px)] min-h-[140px]">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-2 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-10 px-3 text-center border border-dashed border-gray-200 rounded-xl bg-white/40">
            <Inbox className="w-6 h-6 text-gray-300" />
            <p className="text-xs text-gray-400">
              {hasDateFilter ? 'Không có task trong khoảng ngày đang lọc' : 'Không có task'}
            </p>
            {hasDateFilter && onClearDateFilter && (
              <button
                type="button"
                onClick={onClearDateFilter}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Xem tất cả ngày
              </button>
            )}
          </div>
        ) : (
          <>
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} variant={column.variant} cardBar={column.cardBar} actions={actions} onViewTask={onViewTask} />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={() => { markLoadMore(); setLimit(l => l + PAGE_SIZE) }}
                disabled={isFetching}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Xem thêm {Math.min(PAGE_SIZE, total - tasks.length)}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatItem({ label, value, valueClass }: { label: string; value: number; valueClass: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className={cn('text-2xl font-black', valueClass)}>{value}</span>
    </div>
  )
}

// Ô "Quá hạn" là nút bấm (không phải StatItem tĩnh): số liệu này gộp task quá hạn từ CẢ 4 cột
// trạng thái (không có cột riêng nữa), nên cần lối đi nhanh để xem đầy đủ danh sách đó — chuyển
// sang layout Danh sách đã lọc sẵn overdue=true (xem onShowOverdueList ở TasksKanbanBoard).
function OverdueStatButton({ value, onClick }: { value: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={onClick ? 'Xem danh sách đầy đủ task quá hạn' : undefined}
      className={cn(
        'flex flex-col gap-1 text-left rounded-lg -mx-1.5 -my-1 px-1.5 py-1 transition-colors',
        onClick && 'hover:bg-red-50 cursor-pointer',
      )}
    >
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" /> Quá hạn
      </span>
      <span className="text-2xl font-black text-red-600">{value}</span>
    </button>
  )
}

function KanbanStatsBar({ totals, overdueTotal, onShowOverdueList }: {
  totals: Partial<Record<ColumnKey, number>>
  overdueTotal: number
  onShowOverdueList?: () => void
}) {
  const grandTotal = COLUMNS.reduce((sum, c) => sum + (totals[c.key] ?? 0), 0)
  const approvedTotal = totals.APPROVED ?? 0
  const progressPct = grandTotal > 0 ? Math.round((approvedTotal / grandTotal) * 100) : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-3.5">
      <StatItem label="Tổng công việc" value={grandTotal} valueClass="text-slate-900" />
      <StatItem label="Đã giao" value={totals.ASSIGNED ?? 0} valueClass="text-blue-600" />
      <StatItem label="Đang làm" value={totals.IN_PROGRESS ?? 0} valueClass="text-amber-600" />
      <StatItem label="Đã nộp" value={totals.SUBMITTED ?? 0} valueClass="text-purple-600" />
      <StatItem label="Đã duyệt" value={totals.APPROVED ?? 0} valueClass="text-emerald-600" />
      <OverdueStatButton value={overdueTotal} onClick={onShowOverdueList} />
      <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex flex-col gap-1 lg:border-l lg:border-gray-100 lg:pl-5">
        <span className="text-xs font-medium text-slate-400">Tiến độ chung</span>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl font-black text-emerald-600 shrink-0">{progressPct}%</span>
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TasksKanbanBoard({
  teamId, search, deadlineFrom, deadlineTo, taskType, assigneeId,
  currentUserId, canApproveReject, onViewTask, onClearDateFilter, onShowOverdueList,
}: Props) {
  const filters: Filters = { teamId, search, deadlineFrom, deadlineTo, taskType, assigneeId }
  const queryClient = useQueryClient()
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null)
  const [columnTotals, setColumnTotals] = useState<Partial<Record<ColumnKey, number>>>({})

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Toàn bộ task quá hạn khớp team/search/loại/người làm hiện tại — dùng cho cả tổng số ở
  // KanbanStatsBar lẫn bù vào từng cột khi bộ lọc ngày (vd mặc định "Hôm nay") đang loại chúng ra
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
      page: 1,
      limit: OVERDUE_FETCH_LIMIT,
      sort: 'updated_at',
    }),
    refetchOnWindowFocus: true,
  })
  const overdueTotal = overdueData?.total ?? 0
  const overdueTasks = overdueData?.data ?? []

  function invalidateTasks() {
    queryClient.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
  }

  const handleTotalChange = useCallback((key: ColumnKey, total: number) => {
    setColumnTotals(prev => (prev[key] === total ? prev : { ...prev, [key]: total }))
  }, [])

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
        <KanbanStatsBar totals={columnTotals} overdueTotal={overdueTotal} onShowOverdueList={onShowOverdueList} />

        <div className="space-y-2">
          {/* Gợi ý thao tác — kéo-thả vốn khó tự phát hiện nếu không nói ra */}
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <GripVertical className="w-3.5 h-3.5 shrink-0" />
            Bấm thẻ để xem chi tiết · kéo thẻ sang cột bên để chuyển nhanh trạng thái
            (Đã giao ⇄ Đang làm{canApproveReject ? ', Đã nộp → Đã duyệt' : ''}) · task quá hạn có
            viền đỏ/cam/vàng kèm nhãn cảnh báo ngay trên thẻ
          </p>

          <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 items-start">
            {COLUMNS.map(col => {
              const isValidTarget = activeTransition?.to === col.status
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
                  onTotalChange={handleTotalChange}
                />
              )
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggingTask && (
          <div className={cn(
            'w-[260px] bg-white border border-indigo-300 border-l-4 rounded-xl p-3.5 shadow-2xl rotate-2 cursor-grabbing',
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
