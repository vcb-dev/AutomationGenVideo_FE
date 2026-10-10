'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, Info, RefreshCw, RotateCcw, TrendingUp, Play, Link2, CheckCircle2 } from 'lucide-react'

import VideoCard from '@/app/dashboard/internalChannels/VideoCard'
import { FilterNumber, FilterReset, FilterSelect } from '@/app/dashboard/internalChannels/components/FilterFields'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { NumberedPagination } from '@/components/task-auto/NumberedPagination'
import { useDebounced } from '@/hooks/useDebounced'
import { facebookService } from '@/services/facebookService'
import { PublishedVideo, PublishedVideoRefreshJob } from '@/types/facebook'
import { AttachPostToTaskModal } from './AttachPostToTaskModal'

type SortKey = 'newest' | 'views'

const PAGE_SIZE = 24

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới đăng nhất' },
  { value: 'views', label: 'Nhiều view nhất' },
]

/** Bộ lọc RIÊNG của tab (ngưỡng view/like, sắp xếp, trang) — giữ ở trang cha để không mất khi chuyển tab. */
export interface PublishedViewState {
  minViews: string
  minLikes: string
  sort: SortKey
  page: number
}

export const DEFAULT_PUBLISHED_VIEW: PublishedViewState = { minViews: '', minLikes: '', sort: 'newest', page: 1 }

interface Props {
  // ── Bộ lọc chung của màn Nhiệm vụ (thanh lọc phía trên) ──
  /** Team (nhiều id phân cách dấu phẩy — leader: mọi team mình quản lý khi chưa chọn 1 team) */
  teamId?: string
  /** "Người làm" ở thanh lọc chung = người cầm kênh ở đây (người cầm kênh == người nhận task) */
  ownerId?: string
  /** Tìm trong caption */
  search?: string
  /** Khoảng ngày đăng (YYYY-MM-DD) */
  dateFrom?: string
  dateTo?: string
  /** Mã tuyến A1…A5 → lọc hashtag #A1…#A5 trong caption */
  contentLine?: string
  // ── Bộ lọc riêng tab ──
  view: PublishedViewState
  onViewChange: (patch: Partial<PublishedViewState>) => void
  /** Phạm vi team của leader — modal "Gắn vào video đã làm" dùng khi chọn "Tất cả" */
  scopeTeamIds: string[]
  /** View "của tôi": người cầm kênh bị khoá = chính user */
  lockedOwnerId?: string
  currentUserId?: string
  /** Admin/Manager/Leader — gắn bài vào task của người khác được (khớp quyền BE published-links) */
  canAttachAnyTask: boolean
  /** Mở chi tiết task đã gắn bài */
  onViewTask: (taskId: string) => void
}

/**
 * Tab "Video đã đăng": video của các page Facebook nội bộ, dùng bộ lọc chung của màn Nhiệm vụ (team / người
 * làm = người cầm kênh / từ khoá / ngày đăng / tuyến qua hashtag). Page chưa gán kênh chỉ hiện khi không lọc team/người.
 */
export function PublishedVideosTab({
  teamId, ownerId, search, dateFrom, dateTo, contentLine, view, onViewChange,
  scopeTeamIds, lockedOwnerId, currentUserId, canAttachAnyTask, onViewTask,
}: Props) {
  const { minViews, minLikes, sort, page } = view
  const setPage = (p: number) => onViewChange({ page: p })
  const [activeVideoId, setActiveVideoId] = useState('')
  const [attachVideo, setAttachVideo] = useState<PublishedVideo | null>(null)

  // Ô gõ tay ngưỡng view/like chỉ bắn request khi ngừng gõ
  const debouncedMinViews = useDebounced(minViews)
  const debouncedMinLikes = useDebounced(minLikes)

  const { data: options } = useQuery({
    queryKey: ['facebook', 'published-videos', 'filter-options'],
    queryFn: facebookService.getVideoFilterOptions,
    staleTime: 5 * 60_000,
    enabled: !lockedOwnerId,
  })

  const effectiveTeamId = lockedOwnerId ? undefined : teamId || undefined
  const effectiveOwnerId = lockedOwnerId || ownerId || undefined
  const hashtagCategory = /^A[1-5]$/i.test(contentLine ?? '')
    ? (contentLine!.toLowerCase() as 'a1' | 'a2' | 'a3' | 'a4' | 'a5')
    : undefined

  const filters = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    min_views: debouncedMinViews ? Number(debouncedMinViews) : undefined,
    min_likes: debouncedMinLikes ? Number(debouncedMinLikes) : undefined,
    hashtag_category: hashtagCategory,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    team_id: effectiveTeamId,
    owner_id: effectiveOwnerId,
    sort,
  }

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['facebook', 'published-videos', filters],
    queryFn: () => facebookService.getAllVideos(filters),
    placeholderData: keepPreviousData,
  })

  const videos = data?.videos ?? []
  const total = data?.count ?? 0
  const totalPages = data?.total_pages ?? 1

  const hasViewFilters = !!minViews || !!minLikes
  const hasSharedFilters = !!search || !!contentLine || !!dateFrom || !!dateTo || !!ownerId
  const hasFilters = hasViewFilters || hasSharedFilters
  const clearViewFilters = () => onViewChange({ minViews: '', minLikes: '', page: 1 })

  const handlePlay = useCallback((postId: string) => setActiveVideoId(postId), [])

  const unmatched = options?.unmatched_pages ?? 0
  const showUnmatchedHint = !lockedOwnerId && unmatched > 0 && (!!effectiveTeamId || !!effectiveOwnerId)

  // ─── Nút "Cập nhật": cào bài mới + kéo lại chỉ số theo đúng bộ lọc đang chọn (chạy nền ở BE)
  const queryClient = useQueryClient()
  const [jobId, setJobId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [confirmAllOpen, setConfirmAllOpen] = useState(false)
  const notifiedJobRef = useRef<string | null>(null)

  // Mở lại tab khi lượt trước còn chạy thì bám tiếp tiến độ
  const { data: latestJob } = useQuery({
    queryKey: ['facebook', 'video-refresh', 'latest'],
    queryFn: facebookService.getLatestVideoRefresh,
    staleTime: 0,
  })
  useEffect(() => {
    if (latestJob?.status === 'running') setJobId(id => id ?? latestJob.id)
  }, [latestJob])

  const { data: job, isError: jobLost } = useQuery({
    queryKey: ['facebook', 'video-refresh', jobId],
    queryFn: () => facebookService.getVideoRefresh(jobId!),
    enabled: !!jobId,
    refetchInterval: q => (q.state.data?.status === 'running' ? 2000 : false),
  })

  useEffect(() => {
    if (jobLost && jobId) {
      setJobId(null)
      toast.error('Mất theo dõi tiến độ cập nhật (máy chủ vừa khởi động lại?) — bấm Cập nhật lại nếu cần')
    }
  }, [jobLost, jobId])

  useEffect(() => {
    if (!job || job.status === 'running' || notifiedJobRef.current === job.id) return
    notifiedJobRef.current = job.id
    setJobId(null)
    queryClient.invalidateQueries({ queryKey: ['facebook', 'published-videos'] })
    announceRefreshResult(job)
  }, [job, queryClient])

  const refreshing = starting || (!!jobId && job?.status !== 'done' && job?.status !== 'failed')
  const refreshProgress = !job || starting
    ? 'Đang bắt đầu…'
    : job.sync_new && job.pages_done < job.pages_total
      ? `Cào bài mới ${job.pages_done}/${job.pages_total} page`
      : job.metrics_total > 0
        ? `Cập nhật chỉ số ${job.metrics_done.toLocaleString('vi-VN')}/${job.metrics_total.toLocaleString('vi-VN')} video`
        : 'Đang cập nhật chỉ số…'

  async function startRefresh() {
    setConfirmAllOpen(false)
    setStarting(true)
    try {
      const started = await facebookService.startVideoRefresh({
        search: search || undefined,
        min_views: minViews ? Number(minViews) : undefined,
        min_likes: minLikes ? Number(minLikes) : undefined,
        hashtag_category: hashtagCategory,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        team_id: effectiveTeamId,
        owner_id: effectiveOwnerId,
      })
      queryClient.setQueryData(['facebook', 'video-refresh', started.id], started)
      setJobId(started.id)
    } catch (e: any) {
      toast.error(e?.message || 'Không thể bắt đầu cập nhật')
    } finally {
      setStarting(false)
    }
  }

  function handleRefreshClick() {
    // Không giới hạn team/người = cả hệ thống (~100 page, vài phút) — hỏi lại trước khi chạy
    if (!effectiveTeamId && !effectiveOwnerId) setConfirmAllOpen(true)
    else startRefresh()
  }

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 sm:px-6 py-3.5 space-y-2.5">
        {/* Team / người làm (= người cầm kênh) / từ khoá / ngày đăng / tuyến nằm ở thanh lọc chung
            phía trên — ở đây chỉ còn phần riêng của video đã đăng. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterNumber placeholder="Min views" value={minViews} onChange={v => onViewChange({ minViews: v, page: 1 })} />
          <FilterNumber placeholder="Min likes" value={minLikes} onChange={v => onViewChange({ minLikes: v, page: 1 })} />
          <FilterSelect
            value={sort}
            onChange={v => onViewChange({ sort: v as SortKey, page: 1 })}
            options={SORT_OPTIONS}
            title="Sắp xếp"
            align="right"
          />
          {hasViewFilters && <FilterReset onClick={clearViewFilters} />}

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <TrendingUp className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              <span className="font-semibold text-slate-700 tabular-nums">{total.toLocaleString('vi-VN')}</span> video
            </div>
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={refreshing}
              aria-busy={refreshing}
              title="Cào video mới và cập nhật view/like/comment/share cho các video khớp bộ lọc đang chọn"
              className="h-9 flex items-center gap-1.5 px-3.5 rounded-lg border border-indigo-200 bg-white text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors disabled:cursor-wait disabled:bg-indigo-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
              {/* Nhãn giữ nguyên khi đang chạy để nút không đổi độ rộng làm xô hàng lọc — tiến độ ở dòng dưới */}
              <span className="whitespace-nowrap">Cập nhật</span>
            </button>
          </div>
        </div>

        <div aria-live="polite">
          {refreshing && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-indigo-700">
              <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <span className="tabular-nums">{refreshProgress}</span>
              <span className="text-slate-400 font-normal">· danh sách tự tải lại khi xong</span>
            </p>
          )}
        </div>

        <ConfirmDialog
          open={confirmAllOpen}
          title="Cập nhật toàn bộ page?"
          message={`Chưa chọn team hay người cầm kênh — sẽ cào bài mới và cập nhật chỉ số cho ${options?.total_pages ?? 'tất cả'} page Facebook, có thể mất vài phút. Chọn team trước nếu chỉ cần một phần.`}
          confirmLabel="Cập nhật tất cả"
          onConfirm={startRefresh}
          onCancel={() => setConfirmAllOpen(false)}
        />

        {showUnmatchedHint && (
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 mt-px shrink-0 text-slate-400" aria-hidden="true" />
            {unmatched}/{options?.total_pages} page Facebook chưa gán kênh ở Quản lý kênh nên không hiện khi lọc theo team hoặc người cầm kênh.
          </p>
        )}
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-white border border-gray-100 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-amber-500" aria-hidden="true" />
          <p className="text-base font-semibold text-slate-600">Không tải được video</p>
          <p className="text-sm text-slate-400">{(error as Error)?.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      ) : !isLoading && videos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl">
          <EmptyState
            icon={Play}
            title={hasFilters ? 'Không có video khớp bộ lọc' : lockedOwnerId ? 'Chưa có video trên page bạn cầm' : 'Chưa có video nào'}
            description={hasFilters
              ? 'Thử nới khoảng ngày đăng hoặc bỏ bớt bộ lọc ở thanh lọc phía trên.'
              : lockedOwnerId
                ? 'Page Facebook cần được gán bạn làm người cầm kênh ở Quản lý kênh.'
                : 'Video trên các page Facebook nội bộ sẽ hiện ở đây sau khi được đồng bộ.'}
          />
          {hasViewFilters && (
            <div className="flex justify-center pb-8 -mt-8">
              <FilterReset onClick={clearViewFilters} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}
            aria-busy={isFetching}
          >
            {isLoading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="aspect-[9/16] bg-gray-100 animate-pulse" />
                    <div className="p-3.5 space-y-2">
                      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))
              : videos.map(v => (
                  <VideoCard
                    key={v.post_id}
                    video={v}
                    isPlaying={activeVideoId === v.post_id}
                    onPlay={handlePlay}
                    meta={(
                      <>
                        <ChannelMeta video={v} />
                        <TaskLinkAction video={v} onAttach={() => setAttachVideo(v)} onViewTask={onViewTask} />
                      </>
                    )}
                  />
                ))}
          </div>

          <NumberedPagination
            page={page}
            totalPages={totalPages}
            total={total}
            itemLabel="video"
            onPageChange={setPage}
            className="px-1"
          />
        </div>
      )}

      {attachVideo && (
        <AttachPostToTaskModal
          video={attachVideo}
          lockedAssigneeId={canAttachAnyTask ? undefined : currentUserId}
          scopeTeamIds={scopeTeamIds}
          onClose={() => setAttachVideo(null)}
        />
      )}
    </div>
  )
}

/** Bài đã gắn task → xem task đó; chưa gắn → mở chọn video đã làm để gắn. */
function TaskLinkAction({ video, onAttach, onViewTask }: {
  video: PublishedVideo
  onAttach: () => void
  onViewTask: (taskId: string) => void
}) {
  const linked = video.linked_task_ids ?? []
  if (linked.length > 0) {
    return (
      <button
        type="button"
        onClick={() => onViewTask(linked[0])}
        title={linked.length > 1 ? `Bài này đang gắn ở ${linked.length} task` : 'Xem task đã gắn bài này'}
        className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {linked.length > 1 ? `Đã gắn ${linked.length} task · Xem` : 'Đã gắn task · Xem'}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onAttach}
      disabled={!video.permalink_url}
      className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-300 px-3 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
      Gắn vào video đã làm
    </button>
  )
}

function announceRefreshResult(job: PublishedVideoRefreshJob) {
  if (job.status === 'failed') {
    toast.error(`Cập nhật thất bại${job.errors[0] ? `: ${job.errors[0]}` : ''}`)
    return
  }
  if (job.pages_total === 0) {
    toast.error(job.pages_skipped > 0
      ? 'Các page trong phạm vi chưa có token Facebook hoặc đã ngừng hoạt động — không cập nhật được'
      : 'Không có page nào trong phạm vi bộ lọc để cập nhật')
    return
  }
  const parts = [
    job.sync_new ? `+${job.new_videos.toLocaleString('vi-VN')} video mới` : 'khoảng ngày đã qua nên không cào bài mới',
    `${job.metrics_updated.toLocaleString('vi-VN')} video cập nhật chỉ số`,
  ]
  toast.success(`Đã cập nhật: ${parts.join(' · ')}${job.capped ? ' (giới hạn 1.000 video mới đăng nhất)' : ''}`, { duration: 5000 })
  if (job.errors.length) {
    toast.error(`${job.errors.length} page lỗi khi cập nhật — ${job.errors[0]}`, { duration: 8000 })
  }
}

/** Page đăng video + người cầm kênh + team — nằm đầu thân thẻ video. */
function ChannelMeta({ video }: { video: PublishedVideo }) {
  const { page, channel } = video
  return (
    <div className="flex items-center gap-2 min-w-0 pb-2.5 border-b border-slate-100">
      <PageAvatar pageId={page?.page_id} avatarUrl={page?.avatar_url} name={page?.name} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800 truncate" title={page?.name}>
          {page?.name ?? 'Không rõ page'}
        </p>
        <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
          {channel?.owner_name
            ? <span className="text-[11px] text-slate-500 truncate" title={`Người cầm kênh: ${channel.owner_name}`}>{channel.owner_name}</span>
            : <span className="text-[11px] text-slate-400 italic truncate">Chưa gán kênh</span>}
          {channel?.team_name && (
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">
              {channel.team_name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/** Ảnh page: Graph API picture → avatar đã lưu → chữ cái đầu. */
function PageAvatar({ pageId, avatarUrl, name }: { pageId?: string; avatarUrl?: string | null; name?: string }) {
  const candidates = [pageId ? `https://graph.facebook.com/${pageId}/picture?type=small` : null, avatarUrl]
    .filter((u): u is string => !!u)
  const [idx, setIdx] = useState(0)
  const src = candidates[idx]
  if (!src) return <AvatarInitials name={name} size="xs" />
  return (
    <img
      src={src}
      alt=""
      className="w-7 h-7 rounded-full object-cover bg-slate-100 shrink-0"
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setIdx(i => i + 1)}
    />
  )
}
