'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Play, Info, CheckCircle2, Link2, Plus } from 'lucide-react'
import { driveImageUrl } from '@/lib/utils'
import { TaskStatusBadge } from '@/components/task-auto/StatusBadge'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { NumberedPagination } from '@/components/task-auto/NumberedPagination'
import { formatDateTime } from '@/components/task-auto/helpers'
import { getTasks, updateTaskPublishedLinks } from '@/lib/api/task-auto'
import type { Task } from '@/types/task-auto'
import { VideoPreviewOverlay } from './detail/VideoPreviewOverlay'
import { PublishedPostPicker, contentLineCode } from './detail/PublishedPostPicker'
import { appendPublishedLinks } from './detail/PublishedLinksSection'
import { resolveContentTitle, resolveProductName, resolveProductImage } from './TasksTable'

interface Props {
  teamId?: string
  search?: string
  reviewedFrom?: string
  reviewedTo?: string
  assigneeId?: string
  contentLineId?: string
  productLineId?: string
  page: number
  onPageChange: (page: number) => void
  onViewTask: (id: string) => void
  currentUserId?: string
  /** Admin/Manager/Leader — gắn link cho task của người khác được (khớp quyền BE published-links) */
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

export function ApprovedVideosGrid({ teamId, search, reviewedFrom, reviewedTo, assigneeId, contentLineId, productLineId, page, onPageChange, onViewTask, currentUserId, canApproveReject }: Props) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [linkTask, setLinkTask] = useState<Task | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'tasks', 'approved', { teamId, search, reviewedFrom, reviewedTo, assigneeId, contentLineId, productLineId, page }],
    queryFn: () => getTasks({
      status: 'APPROVED',
      team_id: teamId,
      search: search || undefined,
      reviewed_from: reviewedFrom || undefined,
      reviewed_to: reviewedTo || undefined,
      assignee_id: assigneeId,
      content_line_id: contentLineId,
      product_line_id: productLineId,
      page,
      limit: LIMIT,
    }),
    refetchOnWindowFocus: true,
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
            <EmptyState icon={CheckCircle2} title="Không có video nào đã duyệt" description="Video sau khi được duyệt sẽ hiện ở đây" />
          </div>
        )}
        {!isLoading && tasks.map((task, index) => {
          const title = resolveContentTitle(task)
          const productName = resolveProductName(task)
          const productImage = resolveProductImage(task)
          const linkCount = task.published_links?.length ?? 0
          const canEditLinks = canApproveReject || (!!currentUserId && task.assignee_id === currentUserId)

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
                <p className="text-[11px] text-slate-400 mt-1">Duyệt lúc {formatDateTime(task.reviewed_at)}</p>

                {linkCount > 0 ? (
                  <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    {linkCount} link bài đăng
                  </p>
                ) : canEditLinks ? (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setLinkTask(task) }}
                    className="mt-2 w-full min-h-9 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-300 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Thêm link bài đăng
                  </button>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400 italic">Chưa có link bài đăng</p>
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

      {linkTask && <AddPostLinkPicker task={linkTask} onClose={() => setLinkTask(null)} />}
    </div>
  )
}

/** Picker "Chọn bài đã đăng" mở thẳng từ thẻ video — cùng bộ lọc mặc định với chi tiết task. */
function AddPostLinkPicker({ task, onClose }: { task: Task; onClose: () => void }) {
  const qc = useQueryClient()
  const links = task.published_links ?? []
  const mutation = useMutation({
    mutationFn: (next: NonNullable<Task['published_links']>) => updateTaskPublishedLinks(task.id, next),
    onSuccess: () => {
      toast.success('Đã gắn link bài đăng')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', task.id] })
      qc.invalidateQueries({ queryKey: ['facebook', 'published-videos'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Gắn link thất bại'),
  })

  return (
    <PublishedPostPicker
      open
      onOpenChange={open => { if (!open) onClose() }}
      existingUrls={links.map(link => link.url)}
      taskTitle={resolveContentTitle(task)}
      anchorDate={task.submitted_at ?? task.reviewed_at ?? task.deadline}
      owner={task.assignee ? { id: task.assignee.id, name: task.assignee.full_name } : null}
      team={task.team ? { id: task.team.id, name: task.team.name } : null}
      contentLine={contentLineCode(task.content_line)}
      onAttach={async videos => {
        const next = appendPublishedLinks(links, videos)
        if (!next) {
          toast('Các bài đã chọn đều đang được gắn với task')
          return
        }
        await mutation.mutateAsync(next)
      }}
      isSaving={mutation.isPending}
    />
  )
}
