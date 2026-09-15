'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Play, CheckCircle2, XCircle, Loader2, Info } from 'lucide-react'
import { driveImageUrl } from '@/lib/utils'
import { TaskStatusBadge } from '@/components/task-auto/StatusBadge'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { NumberedPagination } from '@/components/task-auto/NumberedPagination'
import { formatDateTime } from '@/components/task-auto/helpers'
import { getTasks, approveTask } from '@/lib/api/task-auto'
import { RejectModal } from './RejectModal'
import { VideoPreviewOverlay } from './detail/VideoPreviewOverlay'
import { resolveContentTitle, resolveProductName, resolveProductImage } from './TasksTable'
import type { Task } from '@/types/task-auto'

interface Props {
  teamId?: string
  search?: string
  deadlineFrom?: string
  deadlineTo?: string
  // Lọc người nộp giờ dùng chung dropdown "Người làm" ở thanh lọc chính (TaskFilters) —
  // trước đây tab này có dropdown riêng, trùng chức năng và gây hiểu nhầm bộ lọc chính không tác dụng.
  assigneeId?: string
  page: number
  onPageChange: (page: number) => void
  onViewTask: (id: string) => void
  canApproveReject: boolean
}

const LIMIT = 24

function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="aspect-[4/5] bg-gray-100 animate-pulse" />
          <div className="p-3 space-y-1.5">
            <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-3.5 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </>
  )
}

// Ảnh đại diện video: thumbnail Drive thật → ảnh sản phẩm liên kết → icon placeholder.
// Google Drive thumbnail có thể lỗi nếu file chưa share công khai nên cần fallback qua onError.
function VideoThumbnail({ resultUrl, productImage, alt }: { resultUrl: string | null; productImage: string | null; alt: string }) {
  const candidates = [driveImageUrl(resultUrl), productImage].filter((u): u is string => !!u)
  const [idx, setIdx] = useState(0)
  const src = candidates[idx]

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <Play className="w-10 h-10 text-slate-300" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
      onError={() => setIdx(i => i + 1)}
    />
  )
}

export function SubmittedVideosGrid({ teamId, search, deadlineFrom, deadlineTo, assigneeId, page, onPageChange, onViewTask, canApproveReject }: Props) {
  const qc = useQueryClient()
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'tasks', 'submitted', { teamId, search, deadlineFrom, deadlineTo, assigneeId, page }],
    queryFn: () => getTasks({
      status: 'SUBMITTED',
      team_id: teamId,
      search: search || undefined,
      deadline_from: deadlineFrom || undefined,
      deadline_to: deadlineTo || undefined,
      assignee_id: assigneeId,
      page,
      limit: LIMIT,
    }),
    refetchOnWindowFocus: true,
  })

  const approveMut = useMutation({
    mutationFn: (taskId: string) => approveTask(taskId),
    onSuccess: (_data, taskId) => {
      toast.success('Đã duyệt task')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', taskId] })
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  const tasks = data?.data || []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {isLoading && <SkeletonCards />}
        {!isLoading && tasks.length === 0 && (
          <div className="col-span-full">
            <EmptyState icon={Play} title="Không có video nào chờ duyệt" description="Video mới nộp sẽ hiện ở đây để duyệt" />
          </div>
        )}
        {!isLoading && tasks.map((task, index) => {
          const title = resolveContentTitle(task)
          const productName = resolveProductName(task)
          const productImage = resolveProductImage(task)
          const isApproving = approveMut.isPending && approveMut.variables === task.id

          return (
            <div
              key={task.id}
              onClick={() => task.result_url ? setPreviewIndex(index) : onViewTask(task.id)}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer"
            >
              <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                <VideoThumbnail resultUrl={task.result_url} productImage={productImage} alt={title ?? ''} />
                <div className="absolute top-1.5 left-1.5">
                  <TaskStatusBadge status={task.status} />
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onViewTask(task.id) }}
                  title="Xem chi tiết task"
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3">
                <p className="text-xs font-semibold text-slate-800 line-clamp-2 min-h-[2rem]" title={title ?? ''}>
                  {title ?? <span className="text-slate-400 italic">Không có tiêu đề</span>}
                </p>
                {productName && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{productName}</p>}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AvatarInitials name={task.assignee?.full_name} size="xs" />
                    <span className="text-[11px] font-medium text-slate-600 truncate">{task.assignee?.full_name ?? 'Chưa giao'}</span>
                  </div>
                  {task.team && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0 ml-1.5">
                      {task.team.name}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Nộp lúc {formatDateTime(task.submitted_at)}</p>

                {canApproveReject && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => approveMut.mutate(task.id)}
                      disabled={isApproving}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Duyệt
                    </button>
                    <button
                      onClick={() => setRejectingTask(task)}
                      className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Từ chối
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <NumberedPagination
        page={page}
        totalPages={totalPages}
        total={total}
        itemLabel="video"
        onPageChange={onPageChange}
        className="px-1"
      />

      {rejectingTask && (
        <RejectModal
          task={rejectingTask}
          onClose={() => setRejectingTask(null)}
          onSuccess={() => setRejectingTask(null)}
        />
      )}

      {previewIndex !== null && tasks[previewIndex]?.result_url && (
        <VideoPreviewOverlay
          resultUrl={tasks[previewIndex].result_url!}
          onClose={() => setPreviewIndex(null)}
          onPrev={() => setPreviewIndex(i => (i !== null ? Math.max(0, i - 1) : i))}
          onNext={() => setPreviewIndex(i => (i !== null ? Math.min(tasks.length - 1, i + 1) : i))}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex < tasks.length - 1}
        />
      )}
    </div>
  )
}
