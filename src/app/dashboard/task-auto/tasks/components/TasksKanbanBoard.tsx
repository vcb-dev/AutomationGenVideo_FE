'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { formatDateTime, isOverdue } from '@/components/task-auto/helpers'
import { getTasks, updateTask, approveTask } from '@/lib/api/task-auto'
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

interface ColumnDef {
  status: TaskStatus
  label: string
  accent: string
  countBadge: string
  iconBg: string
  cardBar: string
  icon: LucideIcon
}

// 4 cột khớp đúng bộ trạng thái đã hiển thị trong dropdown lọc "Trạng thái" trước đây
// (STATUS_OPTIONS ở TaskFilters.tsx) — PENDING/REJECTED/CANCELLED vốn cũng chưa từng lọc được
// ở đó nên không có cột riêng, vẫn xem đủ qua "Tất cả trạng thái" nếu quay lại view khác.
const COLUMNS: ColumnDef[] = [
  { status: 'ASSIGNED',    label: 'Đã giao',  accent: 'border-t-blue-400',    countBadge: 'bg-blue-50 text-blue-700',    iconBg: 'bg-blue-100 text-blue-600',    cardBar: 'border-l-blue-400',    icon: Send },
  { status: 'IN_PROGRESS', label: 'Đang làm', accent: 'border-t-amber-400',   countBadge: 'bg-amber-50 text-amber-700',  iconBg: 'bg-amber-100 text-amber-600',  cardBar: 'border-l-amber-400',   icon: Play },
  { status: 'SUBMITTED',   label: 'Đã nộp',   accent: 'border-t-purple-400',  countBadge: 'bg-purple-50 text-purple-700', iconBg: 'bg-purple-100 text-purple-600', cardBar: 'border-l-purple-400',  icon: Upload },
  { status: 'APPROVED',    label: 'Đã duyệt', accent: 'border-t-emerald-400', countBadge: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-600', cardBar: 'border-l-emerald-400', icon: CheckCircle2 },
]

const PAGE_SIZE = 12

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
const DRAG_TRANSITIONS: Partial<Record<TaskStatus, { to: TaskStatus; action: 'move' | 'approve' }>> = {
  ASSIGNED:    { to: 'IN_PROGRESS', action: 'move' },
  IN_PROGRESS: { to: 'ASSIGNED',    action: 'move' },
  SUBMITTED:   { to: 'APPROVED',    action: 'approve' },
}

function TaskCardBody({ task, onOpenPreview }: { task: Task; onOpenPreview?: () => void }) {
  const title = resolveContentTitle(task)
  const productName = resolveProductName(task)
  const productImage = driveImageUrl(resolveProductImage(task), 120)
  const overdue = isOverdue(task.deadline) && !['APPROVED', 'CANCELLED'].includes(task.status)
  const missingLink = task.status === 'APPROVED' && !task.published_links?.length
  // Cùng convention với TaskDetailPanel: link Drive mở preview trong app (popup), link khác mở tab mới
  const isDriveUrl = task.result_url?.includes('drive.google.com')

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

      <div className="flex items-center justify-between mt-3 gap-2">
        {task.assignee ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <AvatarInitials name={task.assignee.full_name} size="xs" />
            <span className="text-xs font-medium text-gray-600 truncate max-w-[100px]">{task.assignee.full_name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-300 italic">Chưa giao</span>
        )}
        {task.team && (
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0 truncate max-w-[90px]">
            {task.team.name}
          </span>
        )}
      </div>

      {(task.deadline || missingLink || task.result_url) && (
        <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
          {task.deadline && (
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold',
              overdue ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500',
            )}>
              {overdue ? <AlertTriangle className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0" />}
              {formatDateTime(task.deadline)}
            </span>
          )}
          {missingLink && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">
              <AlertTriangle className="w-3 h-3 shrink-0" /> Thiếu link
            </span>
          )}
          {task.result_url && (
            isDriveUrl ? (
              onOpenPreview && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onOpenPreview() }}
                  onPointerDown={e => e.stopPropagation()}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2 transition-colors"
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
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2 transition-colors"
              >
                <ExternalLink className="w-3 h-3 shrink-0" /> Xem kết quả
              </a>
            )
          )}
        </div>
      )}
    </>
  )
}

function TaskCard({ task, cardBar, actions, onViewTask }: {
  task: Task
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
        'relative w-full text-left bg-white border border-gray-200 border-l-4 rounded-xl p-3.5 shadow-sm cursor-pointer',
        'hover:border-indigo-300 hover:shadow-lg hover:shadow-slate-200/70 hover:-translate-y-0.5 transition-all group',
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30',
        cardBar,
      )}
    >
      {draggable && (
        <GripVertical className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <TaskCardBody task={task} onOpenPreview={() => setShowPreview(true)} />

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

function KanbanColumn({
  column, filters, isDropDisabled, isValidTarget, actions, hasDateFilter, onClearDateFilter, onViewTask,
}: {
  column: ColumnDef
  filters: Filters
  isDropDisabled: boolean
  isValidTarget: boolean
  actions: CardActions
  hasDateFilter: boolean
  onClearDateFilter?: () => void
  onViewTask: (id: string) => void
}) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.status, disabled: isDropDisabled })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['task-auto', 'tasks', 'kanban', column.status, filters, limit],
    queryFn: () => getTasks({
      status: column.status,
      team_id: filters.teamId,
      search: filters.search,
      deadline_from: filters.deadlineFrom,
      deadline_to: filters.deadlineTo,
      task_type: filters.taskType || undefined,
      assignee_id: filters.assigneeId,
      page: 1,
      limit,
      // Task vừa được kéo sang cột này cần nổi lên đầu chứ không kẹt theo created_at gốc
      sort: 'updated_at',
    }),
    refetchOnWindowFocus: true,
  })

  const tasks = data?.data ?? []
  const total = data?.total ?? 0
  const hasMore = tasks.length < total
  const Icon = column.icon

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

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2.5 max-h-[calc(100vh-360px)] min-h-[140px]">
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
            {tasks.map(task => <TaskCard key={task.id} task={task} cardBar={column.cardBar} actions={actions} onViewTask={onViewTask} />)}
            {hasMore && (
              <button
                type="button"
                onClick={() => setLimit(l => l + PAGE_SIZE)}
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

export function TasksKanbanBoard({
  teamId, search, deadlineFrom, deadlineTo, taskType, assigneeId,
  currentUserId, canApproveReject, onViewTask, onClearDateFilter,
}: Props) {
  const filters: Filters = { teamId, search, deadlineFrom, deadlineTo, taskType, assigneeId }
  const queryClient = useQueryClient()
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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
      <div className="space-y-2">
        {/* Gợi ý thao tác — kéo-thả vốn khó tự phát hiện nếu không nói ra */}
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <GripVertical className="w-3.5 h-3.5 shrink-0" />
          Bấm thẻ để xem chi tiết · kéo thẻ sang cột bên để chuyển nhanh trạng thái
          (Đã giao ⇄ Đang làm{canApproveReject ? ', Đã nộp → Đã duyệt' : ''})
        </p>

        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 items-start">
          {COLUMNS.map(col => {
            const isValidTarget = activeTransition?.to === col.status
            return (
              <KanbanColumn
                key={col.status}
                column={col}
                filters={filters}
                isValidTarget={isValidTarget}
                isDropDisabled={!!draggingStatus && !isValidTarget}
                actions={cardActions}
                hasDateFilter={hasDateFilter}
                onClearDateFilter={onClearDateFilter}
                onViewTask={onViewTask}
              />
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {draggingTask && (
          <div className={cn(
            'w-[260px] bg-white border border-indigo-300 border-l-4 rounded-xl p-3.5 shadow-2xl rotate-2 cursor-grabbing',
            COLUMNS.find(c => c.status === draggingTask.status)?.cardBar,
          )}>
            <TaskCardBody task={draggingTask} />
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
