'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play, Info, CheckCircle2 } from 'lucide-react'
import { driveImageUrl } from '@/lib/utils'
import { TaskStatusBadge } from '@/components/task-auto/StatusBadge'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { NumberedPagination } from '@/components/task-auto/NumberedPagination'
import { formatDateTime } from '@/components/task-auto/helpers'
import { getTasks } from '@/lib/api/task-auto'
import { VideoPreviewOverlay } from './detail/VideoPreviewOverlay'
import { resolveContentTitle, resolveProductName, resolveProductImage } from './TasksTable'

interface Props {
  teamId?: string
  search?: string
  reviewedFrom?: string
  reviewedTo?: string
  assigneeId?: string
  page: number
  onPageChange: (page: number) => void
  onViewTask: (id: string) => void
}

const LIMIT = 8

function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="aspect-[4/5] bg-gray-100 animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
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

export function ApprovedVideosGrid({ teamId, search, reviewedFrom, reviewedTo, assigneeId, page, onPageChange, onViewTask }: Props) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'tasks', 'approved', { teamId, search, reviewedFrom, reviewedTo, assigneeId, page }],
    queryFn: () => getTasks({
      status: 'APPROVED',
      team_id: teamId,
      search: search || undefined,
      reviewed_from: reviewedFrom || undefined,
      reviewed_to: reviewedTo || undefined,
      assignee_id: assigneeId,
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
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

          return (
            <div
              key={task.id}
              onClick={() => task.result_url ? setPreviewIndex(index) : onViewTask(task.id)}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group cursor-pointer"
            >
              <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                <VideoThumbnail resultUrl={task.result_url} productImage={productImage} alt={title ?? ''} />
                <div className="absolute top-2 left-2">
                  <TaskStatusBadge status={task.status} />
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onViewTask(task.id) }}
                  title="Xem chi tiết task"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4">
                <p className="text-sm font-semibold text-slate-800 line-clamp-2 min-h-[2.5rem]" title={title ?? ''}>
                  {title ?? <span className="text-slate-400 italic">Không có tiêu đề</span>}
                </p>
                {productName && <p className="text-xs text-slate-400 mt-0.5 truncate">{productName}</p>}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AvatarInitials name={task.assignee?.full_name} size="xs" />
                    <span className="text-xs font-medium text-slate-600 truncate">{task.assignee?.full_name ?? 'Chưa giao'}</span>
                  </div>
                  {task.team && (
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      {task.team.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Duyệt lúc {formatDateTime(task.reviewed_at)}</p>
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
    </div>
  )
}
