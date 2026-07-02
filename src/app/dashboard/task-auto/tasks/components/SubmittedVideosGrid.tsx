'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Play, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { driveImageUrl } from '@/lib/utils'
import { TaskStatusBadge } from '@/components/task-auto/StatusBadge'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { formatDateTime } from '@/components/task-auto/helpers'
import { getTasks, approveTask } from '@/lib/api/task-auto'
import { RejectModal } from './RejectModal'
import { VideoPreviewOverlay } from './detail/VideoPreviewOverlay'
import { resolveContentTitle, resolveProductName, resolveProductImage } from './TasksTable'
import type { Task, Team } from '@/types/task-auto'

interface Props {
  teamId?: string
  teams: Team[]
  search?: string
  deadlineDate?: string
  assigneeId?: string
  page: number
  onPageChange: (page: number) => void
  onViewTask: (id: string) => void
  canApproveReject: boolean
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

export function SubmittedVideosGrid({ teamId, teams, search, deadlineDate, assigneeId, page, onPageChange, onViewTask, canApproveReject }: Props) {
  const qc = useQueryClient()
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [submitterFilter, setSubmitterFilter] = useState('')

  // Danh sách người nộp để lọc: thành viên của team đang chọn, hoặc tất cả nếu chưa chọn team
  const memberOptions = useMemo(() => {
    const relevantTeams = teamId ? teams.filter(t => t.id === teamId) : teams
    const map = new Map<string, string>()
    for (const t of relevantTeams) for (const m of t.members ?? []) if (m.user) map.set(m.user_id, m.user.full_name)
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [teams, teamId])

  const effectiveAssigneeId = assigneeId ?? (submitterFilter || undefined)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'tasks', 'submitted', { teamId, search, deadlineDate, effectiveAssigneeId, page }],
    queryFn: () => getTasks({
      status: 'SUBMITTED',
      team_id: teamId,
      search: search || undefined,
      deadline_date: deadlineDate || undefined,
      assignee_id: effectiveAssigneeId,
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
      {!assigneeId && memberOptions.length > 0 && (
        <div className="w-56">
          <CustomSelect
            value={submitterFilter}
            onChange={v => { setSubmitterFilter(v); onPageChange(1) }}
            options={[{ value: '', label: 'Tất cả người nộp' }, ...memberOptions.map(m => ({ value: m.id, label: m.name }))]}
            compact
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {isLoading && <SkeletonCards />}
        {!isLoading && tasks.length === 0 && (
          <div className="col-span-full">
            <EmptyState icon={Play} title="Không có video nào chờ duyệt" description="Video đã nộp sẽ hiện ở đây để duyệt" />
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
                <p className="text-xs text-slate-400 mt-1.5">Nộp lúc {formatDateTime(task.submitted_at)}</p>

                {canApproveReject && !task.is_extra && (
                  <div className="grid grid-cols-2 gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => approveMut.mutate(task.id)}
                      disabled={isApproving}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Duyệt
                    </button>
                    <button
                      onClick={() => setRejectingTask(task)}
                      className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Từ chối
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-slate-500">
            Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
            {' '}·{' '}
            <span className="font-semibold text-slate-700">{total}</span> video
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
