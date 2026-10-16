'use client'

import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe2,
  Hash,
  ImageOff,
  Link2,
  Loader2,
  Play,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDebounced } from '@/hooks/useDebounced'
import { CONTENT_LINES } from '@/lib/task-auto/daily-video-plan'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { DateRangeFilter } from '@/components/task-auto/DateRangeFilter'
import { formatDateTime } from '@/components/task-auto/helpers'
import { getTasks, updateTaskPublishedLinks } from '@/lib/api/task-auto'
import { cn, driveImageUrl, drivePreviewUrl } from '@/lib/utils'
import { planPlayback } from '@/lib/video-playback'
import type { PublishedVideo } from '@/types/facebook'
import type { Task } from '@/types/task-auto'
import { Caption } from './detail/PublishedPostPicker'
import { appendPublishedLinks } from './detail/PublishedLinksSection'
import { resolveContentTitle, resolveProductName } from './TasksTable'

const PAGE_SIZE = 12

/** Phạm vi task: của người cầm kênh → của team kênh → mọi task mình được xem. */
type Scope = 'owner' | 'team' | 'all'

interface Props {
  video: PublishedVideo
  /** Thành viên: chỉ gắn được vào task của chính mình (khớp quyền BE published-links) */
  lockedAssigneeId?: string
  /** Leader: "Tất cả" vẫn chỉ trong các team mình quản lý */
  scopeTeamIds: string[]
  onClose: () => void
}

/** Tuyến gắn trong caption (#A1…#A5) — đội nội dung gắn thẳng vào caption khi đăng. */
function lineFromCaption(caption: string | null | undefined): string {
  const match = (caption || '').match(/#A([1-5])(?![0-9A-Za-z_])/i)
  return match ? `A${match[1]}` : ''
}

/** Dãy số dài nhất của link (id reel) — cùng cách BE khớp link task ↔ video. */
function videoIdToken(url: string | null | undefined): string | null {
  const runs = (url || '').match(/\d{8,}/g)
  return runs ? runs.sort((a, b) => b.length - a.length)[0] : null
}

function isFacebookLink(link: { platform: string; url: string }): boolean {
  return /facebook/i.test(link.platform) || /facebook\.com|fb\.watch/i.test(link.url)
}

/** "trước đăng 3 giờ" / "sau đăng 2 ngày" — video nộp cách giờ đăng bao lâu. */
function gapToPost(submittedAt: string | null, postedAt: string): string | null {
  if (!submittedAt) return null
  const ms = new Date(postedAt).getTime() - new Date(submittedAt).getTime()
  if (!Number.isFinite(ms)) return null
  const side = ms >= 0 ? 'trước đăng' : 'sau đăng'
  const hours = Math.round(Math.abs(ms) / 3_600_000)
  if (hours < 1) return `${side} < 1 giờ`
  if (hours < 48) return `${side} ${hours} giờ`
  return `${side} ${Math.round(hours / 24)} ngày`
}

/**
 * Gắn bài đăng vào mục "Link bài đăng" của 1 nhiệm vụ đã duyệt. Mặc định lọc theo người cầm page + tuyến
 * #A1…#A5 trong caption + chỉ video nộp TRƯỚC lúc bài được đăng — cả ba đều tắt được.
 */
export function AttachPostToTaskModal({ video, lockedAssigneeId, scopeTeamIds, onClose }: Props) {
  const qc = useQueryClient()
  const channel = video.channel
  const defaultScope: Scope = lockedAssigneeId ? 'owner' : channel?.owner_id ? 'owner' : channel?.team_id ? 'team' : 'all'
  const [scope, setScope] = useState<Scope>(defaultScope)
  const [line, setLine] = useState(() => lineFromCaption(video.caption))
  const [search, setSearch] = useState('')
  const [beforePost, setBeforePost] = useState(true)
  const [reviewedFrom, setReviewedFrom] = useState('')
  const [reviewedTo, setReviewedTo] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const debouncedSearch = useDebounced(search.trim())
  const captionLine = lineFromCaption(video.caption)
  const postToken = videoIdToken(video.permalink_url)

  useEffect(() => {
    setPage(1)
    setPreviewIndex(null)
  }, [beforePost, debouncedSearch, line, reviewedFrom, reviewedTo, scope])

  useEffect(() => setPreviewIndex(null), [page])

  const assigneeId = lockedAssigneeId ?? (scope === 'owner' ? channel?.owner_id ?? undefined : undefined)
  const teamId = lockedAssigneeId
    ? undefined
    : scope === 'team'
      ? channel?.team_id ?? undefined
      : scope === 'all' && scopeTeamIds.length
        ? scopeTeamIds.join(',')
        : undefined

  const query = useQuery({
    queryKey: ['task-auto', 'tasks', 'attach-post', {
      post: video.post_id, assigneeId, teamId, line, debouncedSearch, beforePost, reviewedFrom, reviewedTo, page,
    }],
    queryFn: () => getTasks({
      status: 'APPROVED',
      submitted_before: beforePost ? video.published_at : undefined,
      reviewed_from: reviewedFrom || undefined,
      reviewed_to: reviewedTo || undefined,
      assignee_id: assigneeId,
      team_id: teamId,
      content_line: line || undefined,
      search: debouncedSearch || undefined,
      sort: 'submitted_at',
      page,
      limit: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  })

  const tasks = query.data?.data ?? []
  const total = query.data?.total ?? 0
  const totalPages = query.data?.totalPages ?? 1
  const selectedTask = tasks.find(task => task.id === selectedId) ?? null
  const previewTask = previewIndex != null ? tasks[previewIndex] ?? null : null

  const alreadyHasThisPost = (task: Task) =>
    !!postToken && (task.published_links ?? []).some(link => link.url.includes(postToken))

  const mutation = useMutation({
    mutationFn: async (task: Task) => {
      const next = appendPublishedLinks(task.published_links ?? [], [
        { platform: 'facebook', url: video.permalink_url || '' },
      ])
      if (!next) throw new Error('Video này đã có link bài đăng này rồi')
      return updateTaskPublishedLinks(task.id, next)
    },
    onSuccess: () => {
      toast.success('Đã gắn bài vào video đã làm')
      qc.invalidateQueries({ queryKey: ['facebook', 'published-videos'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      if (selectedId) qc.invalidateQueries({ queryKey: ['task-auto', 'task', selectedId] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err?.message ?? 'Gắn bài thất bại'),
  })

  function toggle(task: Task) {
    if (alreadyHasThisPost(task)) return
    setSelectedId(current => (current === task.id ? null : task.id))
  }

  const scopeOptions: { value: Scope; label: string; icon: typeof UserRound }[] = lockedAssigneeId
    ? []
    : [
        ...(channel?.owner_id ? [{ value: 'owner' as const, label: `Video của ${channel.owner_name ?? 'người cầm page'}`, icon: UserRound }] : []),
        ...(channel?.team_id ? [{ value: 'team' as const, label: `Video ${channel.team_name ?? 'team của page'}`, icon: Users }] : []),
        { value: 'all', label: 'Tất cả', icon: Globe2 },
      ]

  const relaxActions = [
    line && { label: `Bỏ lọc tuyến #${line}`, run: () => setLine('') },
    !lockedAssigneeId && scope === 'owner' && channel?.team_id && { label: 'Mở rộng ra cả team', run: () => setScope('team') },
    !lockedAssigneeId && scope !== 'all' && { label: 'Xem tất cả', run: () => setScope('all') },
    beforePost && { label: 'Bỏ lọc nộp trước giờ đăng', run: () => setBeforePost(false) },
    (reviewedFrom || reviewedTo) && { label: 'Xem mọi ngày duyệt', run: () => { setReviewedFrom(''); setReviewedTo('') } },
    search && { label: 'Xoá từ khoá', run: () => setSearch('') },
  ].filter(Boolean) as { label: string; run: () => void }[]

  return (
    <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}>
      <DialogContent
        className="flex h-[min(92vh,920px)] w-[calc(100vw-24px)] max-w-6xl flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl"
        onEscapeKeyDown={event => {
          if (previewTask) {
            event.preventDefault()
            setPreviewIndex(null)
          }
        }}
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 pr-14 sm:px-6">
          <DialogTitle className="text-lg font-bold text-slate-900">Gắn bài vào video đã làm</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-500">
            Chọn video đã duyệt để gắn bài đăng lúc {formatDateTime(video.published_at)}. Link bài sẽ được thêm vào mục “Link bài đăng” của task.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Bài đăng đang gắn — xem được ngay để so với video đã làm */}
          <aside className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 lg:flex">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bài đăng</p>
            <div className="overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '9 / 16' }}>
              <PostPlayer video={video} />
            </div>
            <div>
              <p className="truncate text-sm font-semibold text-slate-900">{video.page?.name ?? 'Không rõ page'}</p>
              <p className="text-xs text-slate-500">{channel?.owner_name ?? 'Chưa gán người cầm'}{channel?.team_name ? ` · ${channel.team_name}` : ''}</p>
              <p className="text-xs text-slate-500">Đăng {formatDateTime(video.published_at)}</p>
            </div>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
              <Caption text={video.caption || ''} line={line} />
            </p>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 space-y-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                {scopeOptions.length > 0 && (
                  <div role="group" aria-label="Phạm vi video" className="flex flex-wrap gap-1.5">
                    {scopeOptions.map(option => {
                      const Icon = option.icon
                      const active = scope === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setScope(option.value)}
                          aria-pressed={active}
                          className={cn(
                            'inline-flex min-h-9 max-w-[16rem] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                            active
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <label className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="sr-only">Tuyến nội dung</span>
                  <select
                    value={line}
                    onChange={event => setLine(event.target.value)}
                    className={cn(
                      'h-9 rounded-lg border px-2.5 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-indigo-500/30',
                      line ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-700',
                    )}
                  >
                    <option value="">Mọi tuyến</option>
                    {CONTENT_LINES.map(code => (
                      <option key={code} value={code}>
                        #{code}{code === captionLine ? ' — theo hashtag bài đăng' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => setBeforePost(value => !value)}
                  aria-pressed={beforePost}
                  title={`Chỉ video nộp trước lúc bài được đăng (${formatDateTime(video.published_at)}) — tắt để xem mọi thời gian`}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    beforePost
                      ? 'border-slate-700 bg-slate-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100',
                  )}
                >
                  {beforePost ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  Nộp trước giờ đăng
                </button>

                <DateRangeFilter
                  compact
                  from={reviewedFrom}
                  to={reviewedTo}
                  onFromChange={setReviewedFrom}
                  onToChange={setReviewedTo}
                  label="Ngày duyệt"
                  tooltip="Lọc theo ngày video được duyệt — giống tab Video đã duyệt"
                />

                <label className="relative min-w-[200px] flex-1">
                  <span className="sr-only">Tìm theo tiêu đề content</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Tìm theo tiêu đề content..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </label>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {beforePost
                  ? `Chỉ video nộp trước ${formatDateTime(video.published_at)} · nộp gần giờ đăng nhất lên đầu`
                  : 'Mọi thời điểm nộp · nộp mới nhất lên đầu'}
                {' · bấm ảnh để xem video'}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {query.isLoading ? (
                <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-500 motion-reduce:animate-none" aria-hidden="true" />
                  Đang tải video đã làm…
                </div>
              ) : query.isError ? (
                <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
                  <p className="font-semibold text-slate-700">Không tải được video đã làm</p>
                  <button
                    type="button"
                    onClick={() => query.refetch()}
                    className="min-h-10 rounded-xl bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Thử lại
                  </button>
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center">
                  <ImageOff className="h-9 w-9 text-slate-300" aria-hidden="true" />
                  <p className="font-semibold text-slate-700">Không có video đã làm nào phù hợp</p>
                  <p className="max-w-md text-sm text-slate-500">
                    {beforePost
                      ? 'Đang chỉ tính video đã duyệt nộp trước lúc bài được đăng. Thử nới bộ lọc:'
                      : 'Thử nới bộ lọc:'}
                  </p>
                  {relaxActions.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {relaxActions.map(action => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={action.run}
                          className="min-h-10 rounded-xl bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500"><strong className="text-slate-700">{total.toLocaleString('vi-VN')}</strong> video đã làm</p>
                    {query.isFetching && <Loader2 className="h-4 w-4 animate-spin text-indigo-500 motion-reduce:animate-none" aria-label="Đang cập nhật kết quả" />}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {tasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        postedAt={video.published_at}
                        line={line}
                        isSelected={selectedId === task.id}
                        hasThisPost={alreadyHasThisPost(task)}
                        onToggle={() => toggle(task)}
                        onPreview={() => setPreviewIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={page <= 1 || query.isFetching}
              aria-label="Trang trước"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-sm tabular-nums text-slate-500">Trang <strong className="text-slate-700">{page}</strong>/{totalPages}</span>
            <button
              type="button"
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages || query.isFetching}
              aria-label="Trang sau"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <p aria-live="polite" className="mr-auto min-w-0 truncate text-sm text-slate-500 sm:mr-2 sm:max-w-xs">
              {selectedTask ? <>Đã chọn: <strong className="text-indigo-700">{resolveContentTitle(selectedTask) ?? 'video không tiêu đề'}</strong></> : 'Chưa chọn video'}
            </p>
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="min-h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => selectedTask && mutation.mutate(selectedTask)}
              disabled={!selectedTask || mutation.isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              Gắn vào video đã chọn
            </button>
          </div>
        </div>

        {previewTask && previewIndex != null && (
          <TaskVideoPreview
            task={previewTask}
            video={video}
            line={line}
            position={`${previewIndex + 1}/${tasks.length}`}
            isSelected={selectedId === previewTask.id}
            hasThisPost={alreadyHasThisPost(previewTask)}
            onToggle={() => toggle(previewTask)}
            onClose={() => setPreviewIndex(null)}
            onPrev={previewIndex > 0 ? () => setPreviewIndex(previewIndex - 1) : undefined}
            onNext={previewIndex < tasks.length - 1 ? () => setPreviewIndex(previewIndex + 1) : undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Video bài đăng: link CDN Facebook (nét, đúng khung dọc) → hết hạn thì trình phát nhúng. */
function PostPlayer({ video }: { video: PublishedVideo }) {
  const [directFailed, setDirectFailed] = useState(false)
  if (video.video_url && !directFailed) {
    return (
      <video
        src={video.video_url}
        poster={video.thumbnail_url || undefined}
        controls
        playsInline
        preload="none"
        className="h-full w-full bg-black object-contain"
        onError={() => setDirectFailed(true)}
      />
    )
  }
  const embed = planPlayback('facebook', video.post_id, video.permalink_url || '', '')
  if (embed.mode === 'embed') {
    return (
      <iframe
        src={embed.src}
        title="Video bài đăng"
        className="h-full w-full border-0 bg-white"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    )
  }
  return video.thumbnail_url
    ? <img src={video.thumbnail_url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
    : null
}

function TaskCard({
  task,
  postedAt,
  line,
  isSelected,
  hasThisPost,
  onToggle,
  onPreview,
}: {
  task: Task
  postedAt: string
  line: string
  isSelected: boolean
  hasThisPost: boolean
  onToggle: () => void
  onPreview: () => void
}) {
  const title = resolveContentTitle(task) ?? 'Không có tiêu đề'
  const productName = resolveProductName(task)
  const thumb = driveImageUrl(task.result_url, 600)
  const [thumbFailed, setThumbFailed] = useState(false)
  const hasFacebookLink = (task.published_links ?? []).some(isFacebookLink)
  const gap = gapToPost(task.submitted_at, postedAt)
  const taskLine = task.content_line?.name ?? null

  return (
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded-xl border bg-white transition',
        hasThisPost && 'border-emerald-200 bg-emerald-50/40',
        isSelected && 'border-indigo-500 ring-2 ring-indigo-500/30',
        !hasThisPost && !isSelected && 'border-slate-200 hover:border-indigo-300 hover:shadow-sm',
      )}
    >
      <div className="relative aspect-[9/16] bg-slate-900">
        <button
          type="button"
          onClick={onPreview}
          disabled={!task.result_url}
          aria-label={`Xem video ${title}`}
          className="group absolute inset-0 block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 disabled:cursor-default"
        >
          {thumb && !thumbFailed ? (
            <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setThumbFailed(true)} />
          ) : (
            <span className="flex h-full items-center justify-center"><ImageOff className="h-7 w-7 text-slate-500" aria-hidden="true" /></span>
          )}
          {task.result_url && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white shadow-lg backdrop-blur-sm transition group-hover:scale-105">
                <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />
              </span>
            </span>
          )}
        </button>

        {hasFacebookLink && !hasThisPost && (
          <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-1 text-[11px] font-bold text-amber-800 shadow-sm" title="Task này đã có link Facebook khác — thường mỗi video chỉ đăng 1 bài Facebook">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Đã có link FB
          </span>
        )}

        {hasThisPost ? (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm">Đã gắn bài này</span>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={isSelected}
            aria-label={isSelected ? `Bỏ chọn ${title}` : `Chọn ${title}`}
            className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm transition',
              isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-white bg-black/30 text-transparent hover:bg-black/45',
            )}>
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={hasThisPost}
        aria-pressed={isSelected}
        className="flex flex-1 flex-col gap-1 p-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 disabled:cursor-default"
      >
        <span className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800" title={title}>{title}</span>
        {productName && <span className="truncate text-xs text-slate-500">{productName}</span>}
        <span className="flex min-w-0 items-center gap-1.5">
          <AvatarInitials name={task.assignee?.full_name} size="xs" />
          <span className="truncate text-xs font-medium text-slate-600">{task.assignee?.full_name ?? 'Chưa giao'}</span>
          {taskLine && (
            <span className={cn(
              'ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              line && taskLine.toUpperCase() === line ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
            )}>
              #{taskLine}
            </span>
          )}
        </span>
        <span className="text-xs text-slate-500">Nộp {formatDateTime(task.submitted_at)}{gap ? ` · ${gap}` : ''}</span>
        <span className="text-xs text-slate-500">Duyệt {formatDateTime(task.reviewed_at)}</span>
      </button>
    </article>
  )
}

// Khung dọc 9:16 lớn nhất vừa vùng xem theo CẢ hai chiều (container query: cqh/cqw), chia đều
// cho --frames khung (1 dưới xl, 2 từ xl — video đã làm cạnh bài đăng). Để flex-1 thì iframe
// Drive co về rộng mặc định 300px; chỉ theo chiều cao thì 2 khung tràn ngang.
const FRAME_STYLE = {
  height: 'min(calc(100cqh - 1.5rem), calc((100cqw - (var(--frames) - 1) * 1rem) / var(--frames) * 16 / 9))',
  aspectRatio: '9 / 16',
} as const

/** Xem video đã làm (Drive) cạnh bài đăng để so — phủ kín hộp thoại như PostPreview ở picker. */
function TaskVideoPreview({
  task,
  video,
  line,
  position,
  isSelected,
  hasThisPost,
  onToggle,
  onClose,
  onPrev,
  onNext,
}: {
  task: Task
  video: PublishedVideo
  line: string
  position: string
  isSelected: boolean
  hasThisPost: boolean
  onToggle: () => void
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const title = resolveContentTitle(task) ?? 'Không có tiêu đề'
  const src = drivePreviewUrl(task.result_url)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Xem video đã làm"
      className="absolute inset-0 z-20 flex flex-col bg-slate-950 lg:flex-row"
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' && onPrev) { event.preventDefault(); onPrev() }
        if (event.key === 'ArrowRight' && onNext) { event.preventDefault(); onNext() }
        if (event.key === 'Tab' && rootRef.current) {
          const focusables = rootRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), video[controls], iframe')
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }
      }}
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center gap-4 px-14 py-4 [--frames:1] xl:[--frames:2]" style={{ containerType: 'size' }}>
        <figure className="flex h-full flex-col items-center gap-2">
          <figcaption className="text-xs font-semibold text-white/70">Video đã duyệt</figcaption>
          <div className="max-w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10" style={FRAME_STYLE}>
            {src ? (
              <iframe key={src} src={src} title={`Video ${title}`} className="h-full w-full border-0" allow="autoplay" allowFullScreen />
            ) : (
              <p className="flex h-full items-center justify-center p-4 text-center text-sm text-white/70">Task chưa có video</p>
            )}
          </div>
        </figure>
        <figure className="hidden h-full flex-col items-center gap-2 xl:flex">
          <figcaption className="text-xs font-semibold text-white/70">Bài đăng</figcaption>
          <div className="max-w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10" style={FRAME_STYLE}>
            <PostPlayer video={video} />
          </div>
        </figure>

        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Video trước"
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Video sau"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
      </div>

      <aside className="flex max-h-[45%] w-full shrink-0 flex-col bg-white lg:max-h-none lg:w-80">
        <div className="flex items-start gap-2 border-b border-slate-200 p-4">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-xs text-slate-500">{task.assignee?.full_name ?? 'Chưa giao'}{task.team ? ` · ${task.team.name}` : ''}</p>
            <p className="text-xs text-slate-500">Nộp {formatDateTime(task.submitted_at)} · Video {position}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng xem video"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
          {task.content_line?.name && (
            <p className="text-xs text-slate-500">Tuyến task: <strong className="text-slate-700">#{task.content_line.name}</strong></p>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Caption bài đăng</p>
            <p className="mt-1 whitespace-pre-line leading-6 text-slate-700"><Caption text={video.caption || ''} line={line} /></p>
          </div>
          {(task.published_links?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Link đã gắn</p>
              <ul className="mt-1 space-y-1">
                {task.published_links!.map(link => (
                  <li key={link.id} className="truncate text-xs">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      {link.platform}: {link.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-200 p-3">
          {task.result_url && (
            <a
              href={task.result_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Mở Drive
            </a>
          )}
          <button
            type="button"
            onClick={onToggle}
            disabled={hasThisPost}
            aria-pressed={isSelected}
            className={cn(
              'inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
              hasThisPost
                ? 'bg-emerald-50 text-emerald-700'
                : isSelected
                  ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500',
            )}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {hasThisPost ? 'Đã gắn bài này' : isSelected ? 'Bỏ chọn' : 'Chọn video này'}
          </button>
        </div>
      </aside>
    </div>
  )
}
