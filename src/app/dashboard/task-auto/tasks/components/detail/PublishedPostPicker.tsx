'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Globe2,
  Hash,
  ImageOff,
  Info,
  Loader2,
  Play,
  Search,
  Sparkles,
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
import { platformStyle } from '@/lib/platform-config'
import { cn } from '@/lib/utils'
import { planPlayback } from '@/lib/video-playback'
import { scraperService, type ExternalVideo } from '@/services/scraperService'
import { useAuthStore } from '@/store/auth-store'

// Chia hết cho 4 và 5 cột — trang nào cũng lấp đủ hàng.
const PAGE_SIZE = 20
const PLATFORM_OPTIONS = [
  { value: '', label: 'Tất cả nền tảng' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'threads', label: 'Threads' },
  { value: 'douyin', label: 'Douyin' },
  { value: 'xiaohongshu', label: 'Xiaohongshu' },
]

/** Phạm vi kênh: kênh người nhận task cầm → kênh cả team → mọi kênh nội bộ. */
type Scope = 'owner' | 'team' | 'all'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingUrls: string[]
  taskTitle?: string | null
  anchorDate?: string | null
  owner?: { id: string; name: string } | null
  team?: { id: string; name: string } | null
  /** Mã tuyến A1–A5 của task */
  contentLine?: string | null
  onAttach: (videos: ExternalVideo[]) => Promise<void>
  isSaving: boolean
}

/**
 * Mã tuyến A1–A5 của task. Task mang tuyến riêng hoặc thừa hưởng từ content gắn kèm — lấy cái
 * đầu tiên có mã. Tên tuyến trong DB chính là "A1"… nhưng vẫn bóc bằng regex để chịu được tên
 * dài kiểu "A1 - Kiến thức".
 */
export function contentLineCode(
  ...lines: ({ name?: string | null; a_type?: string | null } | null | undefined)[]
): string | null {
  for (const line of lines) {
    const match = (line?.a_type || line?.name || '').match(/\bA([1-5])\b/i)
    if (match) return `A${match[1]}`
  }
  return null
}

function normalizeComparableUrl(raw: string): string {
  return raw.trim().replace(/\/$/, '').toLowerCase()
}

function toLocalDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultDateRange(anchor?: string | null): { from: string; to: string } {
  if (!anchor) return { from: '', to: '' }
  const parsed = new Date(anchor)
  if (Number.isNaN(parsed.getTime())) return { from: '', to: '' }
  const from = new Date(parsed)
  const to = new Date(parsed)
  from.setDate(from.getDate() - 2)
  to.setDate(to.getDate() + 2)
  return { from: toLocalDateInput(from), to: toLocalDateInput(to) }
}

function formatDate(raw: string): string {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return 'Không rõ ngày đăng'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('vi-VN')
}

function thumbnailUrl(video: ExternalVideo): string {
  const url = video.thumbnail_url || ''
  if (
    (video.platform === 'instagram' || video.platform === 'threads') &&
    (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))
  ) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`
  }
  return url
}

function videoKey(video: ExternalVideo): string {
  return `${video.platform}:${video.post_id}`
}

/** Caption có tô hashtag; hashtag trùng tuyến của task được nhấn mạnh để liếc là thấy. */
export function Caption({ text, line }: { text: string; line: string }) {
  if (!text) return <span className="italic text-slate-400">Bài đăng không có mô tả</span>
  return (
    <>
      {text.split(/(#[^\s#]+)/g).map((part, i) => {
        if (!part.startsWith('#')) return <span key={i}>{part}</span>
        const tag = part.slice(1).replace(/[.,;:!?)\]]+$/, '').toUpperCase()
        return (
          <span
            key={i}
            className={cn(
              line && tag === line
                ? 'rounded bg-amber-100 px-1 font-semibold text-amber-800'
                : 'font-medium text-indigo-600',
            )}
          >
            {part}
          </span>
        )
      })}
    </>
  )
}

export function PublishedPostPicker({
  open,
  onOpenChange,
  existingUrls,
  taskTitle,
  anchorDate,
  owner,
  team,
  contentLine,
  onAttach,
  isSaving,
}: Props) {
  const { token } = useAuthStore()
  const initialRange = useMemo(() => defaultDateRange(anchorDate), [anchorDate])
  const defaultScope: Scope = owner ? 'owner' : team ? 'team' : 'all'
  const defaultLine = contentLine && (CONTENT_LINES as readonly string[]).includes(contentLine) ? contentLine : ''

  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('')
  const [dateFrom, setDateFrom] = useState(initialRange.from)
  const [dateTo, setDateTo] = useState(initialRange.to)
  const [scope, setScope] = useState<Scope>(defaultScope)
  const [line, setLine] = useState(defaultLine)
  const [notice, setNotice] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Map<string, ExternalVideo>>(new Map())
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  // Chỉ tự nới phạm vi MỘT lần mỗi lần mở — người dùng tự bấm lại "Kênh của X" thì tôn trọng.
  const autoWidened = useRef(false)
  const debouncedSearch = useDebounced(search.trim())

  useEffect(() => {
    if (!open) return
    setSearch('')
    setPlatform('')
    setDateFrom(initialRange.from)
    setDateTo(initialRange.to)
    setScope(defaultScope)
    setLine(defaultLine)
    setNotice(null)
    setPage(1)
    setSelected(new Map())
    setPreviewIndex(null)
    autoWidened.current = false
  }, [defaultLine, defaultScope, initialRange.from, initialRange.to, open])

  useEffect(() => {
    setPage(1)
    setPreviewIndex(null)
  }, [debouncedSearch, platform, dateFrom, dateTo, scope, line])

  useEffect(() => setPreviewIndex(null), [page])

  const query = useQuery({
    queryKey: ['task-auto', 'published-post-picker', {
      debouncedSearch, platform, dateFrom, dateTo, page, scope, line, ownerId: owner?.id, teamId: team?.id,
    }],
    queryFn: () => scraperService.getOwnedChannelVideos(token!, {
      page,
      page_size: PAGE_SIZE,
      q: debouncedSearch || undefined,
      sort: 'date',
      platform: platform || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      content_line: line || undefined,
      owner_id: scope === 'owner' ? owner?.id : undefined,
      team_id: scope === 'team' ? team?.id : undefined,
    }),
    enabled: open && !!token,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

  // Người nhận task chưa được ghép kênh nào ở Quản lý kênh → đừng mở ra một danh sách rỗng,
  // tự nới sang kênh team và nói rõ vì sao.
  useEffect(() => {
    if (!open || scope !== 'owner' || autoWidened.current || !query.data || query.isPlaceholderData) return
    if (query.data.scope_channels?.length !== 0) return
    autoWidened.current = true
    setScope(team ? 'team' : 'all')
    setNotice(`${owner?.name ?? 'Người nhận task'} chưa được ghép kênh nào ở Quản lý kênh — đang hiện ${team ? `kênh của ${team.name}` : 'mọi kênh'}.`)
  }, [open, owner?.name, query.data, query.isPlaceholderData, scope, team])

  const attachedUrls = useMemo(
    () => new Set(existingUrls.map(normalizeComparableUrl)),
    [existingUrls],
  )
  const videos = query.data?.videos ?? []
  const total = query.data?.count ?? 0
  const totalPages = query.data?.total_pages ?? 1
  const scopeChannels = scope === 'all' ? null : query.data?.scope_channels ?? null
  const hasDateFilter = !!dateFrom || !!dateTo
  const previewVideo = previewIndex != null ? videos[previewIndex] ?? null : null

  const isAttached = (video: ExternalVideo) => !!video.url && attachedUrls.has(normalizeComparableUrl(video.url))

  function toggle(video: ExternalVideo) {
    if (!video.url || isAttached(video)) return
    const key = videoKey(video)
    setSelected(current => {
      const next = new Map(current)
      if (next.has(key)) next.delete(key)
      else next.set(key, video)
      return next
    })
  }

  function chooseScope(next: Scope) {
    setNotice(null)
    setScope(next)
  }

  async function submit() {
    if (!selected.size || isSaving) return
    await onAttach([...selected.values()])
  }

  const scopeOptions: { value: Scope; label: string; icon: typeof UserRound; title: string }[] = [
    ...(owner ? [{ value: 'owner' as const, label: `Kênh của ${owner.name}`, icon: UserRound, title: 'Kênh người nhận task đang cầm (theo Quản lý kênh)' }] : []),
    ...(team ? [{ value: 'team' as const, label: `Kênh ${team.name}`, icon: Users, title: 'Kênh của mọi người trong team — dùng khi bài được đăng lên kênh người khác cầm' }] : []),
    { value: 'all', label: 'Mọi kênh', icon: Globe2, title: 'Mọi kênh nội bộ đã đồng bộ' },
  ]

  // Gợi ý nới từng bộ lọc đang bật khi không ra bài nào — bấm một cái là thấy thêm bài.
  const relaxActions = [
    line && { label: `Bỏ lọc tuyến #${line}`, run: () => setLine('') },
    scope === 'owner' && team && { label: `Mở rộng ra kênh ${team.name}`, run: () => chooseScope('team') },
    scope !== 'all' && { label: 'Xem mọi kênh', run: () => chooseScope('all') },
    hasDateFilter && { label: 'Xem mọi ngày', run: () => { setDateFrom(''); setDateTo('') } },
    search && { label: 'Xoá từ khoá', run: () => setSearch('') },
  ].filter(Boolean) as { label: string; run: () => void }[]

  return (
    <Dialog open={open} onOpenChange={value => !isSaving && onOpenChange(value)}>
      <DialogContent
        className="flex h-[min(92vh,920px)] w-[calc(100vw-24px)] max-w-6xl flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl"
        onEscapeKeyDown={event => {
          // Esc khi đang xem video chỉ đóng khung xem, không đóng cả hộp chọn.
          if (previewVideo) {
            event.preventDefault()
            setPreviewIndex(null)
          }
        }}
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 pr-14 sm:px-6">
          <DialogTitle className="text-lg font-bold text-slate-900">Chọn bài đã đăng</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-500">
            Mặc định chỉ hiện bài trên kênh của người nhận task, đúng tuyến nội dung, quanh ngày nộp/duyệt. Bấm ảnh để xem video lớn.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
          {(taskTitle || anchorDate) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              {taskTitle && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
                  <span className="truncate"><strong>Task:</strong> {taskTitle}</span>
                </span>
              )}
              {anchorDate && (
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  Ưu tiên bài đăng quanh ngày nộp/duyệt
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Phạm vi kênh" className="flex flex-wrap gap-1.5">
              {scopeOptions.map(option => {
                const Icon = option.icon
                const active = scope === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => chooseScope(option.value)}
                    aria-pressed={active}
                    title={option.title}
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

            <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />

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
                    #{code}{code === defaultLine ? ' — tuyến của task' : ''}
                  </option>
                ))}
              </select>
            </label>

            {taskTitle && (
              <button
                type="button"
                onClick={() => setSearch(taskTitle)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Tìm theo tiêu đề task
              </button>
            )}
          </div>

          {(notice || (scopeChannels && scopeChannels.length > 0)) && (
            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0">
                {notice && <span className="font-medium text-amber-700">{notice} </span>}
                {scopeChannels && scopeChannels.length > 0 && (
                  <span title={scopeChannels.map(c => `${c.name} (${platformStyle(c.platform).label})`).join('\n')}>
                    Đang lọc {scopeChannels.length} kênh:{' '}
                    {scopeChannels.slice(0, 4).map(c => `${c.name} (${platformStyle(c.platform).label})`).join(', ')}
                    {scopeChannels.length > 4 && `, +${scopeChannels.length - 4} kênh`}
                  </span>
                )}
              </span>
            </p>
          )}

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_160px_160px_auto]">
            <label className="relative block">
              <span className="sr-only">Tìm theo nội dung hoặc tên kênh</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Tìm caption, hashtag, tên kênh..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>

            <label>
              <span className="sr-only">Nền tảng</span>
              <select
                value={platform}
                onChange={event => setPlatform(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              >
                {PLATFORM_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label>
              <span className="sr-only">Từ ngày</span>
              <input
                type="date"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>

            <label>
              <span className="sr-only">Đến ngày</span>
              <input
                type="date"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>

            {hasDateFilter ? (
              <button
                type="button"
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="h-10 rounded-xl px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Xem mọi ngày
              </button>
            ) : (
              anchorDate && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(initialRange.from); setDateTo(initialRange.to) }}
                  className="h-10 rounded-xl px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Lọc quanh task
                </button>
              )
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {query.isLoading ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500 motion-reduce:animate-none" aria-hidden="true" />
                Đang tải kho bài đăng…
              </div>
            ) : query.isError ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
                <p className="font-semibold text-slate-700">Không tải được kho bài đăng</p>
                <button
                  type="button"
                  onClick={() => query.refetch()}
                  className="min-h-10 rounded-xl bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Thử lại
                </button>
              </div>
            ) : videos.length === 0 ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center">
                <ImageOff className="h-9 w-9 text-slate-300" aria-hidden="true" />
                {scopeChannels && scopeChannels.length === 0 ? (
                  <>
                    <p className="font-semibold text-slate-700">
                      {scope === 'owner' ? owner?.name : team?.name} chưa được ghép kênh nào
                    </p>
                    <p className="max-w-md text-sm text-slate-500">
                      Kiểm tra link/tên kênh ở Quản lý kênh — hệ thống ghép page/profile với kênh theo id, username hoặc tên.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-700">Chưa thấy bài đăng phù hợp</p>
                    <p className="max-w-md text-sm text-slate-500">
                      Bài có thể chưa được đồng bộ về, chưa gắn hashtag tuyến, hoặc đăng lệch ngày. Thử nới bộ lọc:
                    </p>
                  </>
                )}
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
                  <p className="text-sm text-slate-500"><strong className="text-slate-700">{total.toLocaleString('vi-VN')}</strong> bài đăng</p>
                  {query.isFetching && <Loader2 className="h-4 w-4 animate-spin text-indigo-500 motion-reduce:animate-none" aria-label="Đang cập nhật kết quả" />}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {videos.map((video, index) => {
                    const key = videoKey(video)
                    const isSelected = selected.has(key)
                    const attached = isAttached(video)
                    const style = platformStyle(video.platform)
                    const PlatformIcon = style.icon
                    const thumb = thumbnailUrl(video)
                    const channelName = video.author_name || video.author_username || 'Không rõ kênh'
                    return (
                      <article
                        key={key}
                        className={cn(
                          'relative flex flex-col overflow-hidden rounded-xl border bg-white transition',
                          attached && 'border-emerald-200 bg-emerald-50/40',
                          isSelected && 'border-indigo-500 ring-2 ring-indigo-500/30',
                          !attached && !isSelected && 'border-slate-200 hover:border-indigo-300 hover:shadow-sm',
                        )}
                      >
                        {/* Ảnh = xem video lớn; ô tròn góc phải + phần chữ = chọn. Hai nút anh em, không lồng nhau. */}
                        <div className="relative aspect-[9/16] bg-slate-900">
                          <button
                            type="button"
                            onClick={() => setPreviewIndex(index)}
                            aria-label={`Xem video của ${channelName}`}
                            className="group absolute inset-0 block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
                          >
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                                onError={event => { (event.currentTarget as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center"><ImageOff className="h-7 w-7 text-slate-500" aria-hidden="true" /></span>
                            )}
                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white shadow-lg backdrop-blur-sm transition group-hover:scale-105">
                                <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />
                              </span>
                            </span>
                            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                              <Eye className="h-3 w-3" aria-hidden="true" />{formatCount(video.play_count)}
                            </span>
                          </button>

                          <span className={cn('pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold shadow-sm', style.bg, style.color)}>
                            <PlatformIcon size={12} weight="fill" aria-hidden="true" />
                            {style.label}
                          </span>

                          {attached ? (
                            <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
                              Đã gắn
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggle(video)}
                              disabled={!video.url}
                              aria-pressed={isSelected}
                              aria-label={isSelected ? `Bỏ chọn bài của ${channelName}` : `Chọn bài của ${channelName}`}
                              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed"
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
                          onClick={() => toggle(video)}
                          disabled={attached || !video.url}
                          aria-pressed={isSelected}
                          className="flex flex-1 flex-col gap-1.5 p-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 disabled:cursor-default"
                        >
                          <span className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-800">
                            <Caption text={video.description} line={line} />
                          </span>
                          <span className="truncate text-xs font-medium text-slate-600">{channelName}</span>
                          <span className="text-xs text-slate-500">{formatDate(video.date_posted)}</span>
                        </button>
                      </article>
                    )
                  })}
                </div>
              </>
            )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center justify-between gap-3 sm:justify-start">
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
            <p aria-live="polite" className="mr-auto text-sm text-slate-500 sm:mr-2"><strong className="text-indigo-700">{selected.size}</strong> bài đã chọn</p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="min-h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!selected.size || isSaving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              Gắn {selected.size || ''} bài vào task
            </button>
          </div>
        </div>

        {previewVideo && previewIndex != null && (
          <PostPreview
            video={previewVideo}
            line={line}
            position={`${previewIndex + 1}/${videos.length}`}
            selectedCount={selected.size}
            isSelected={selected.has(videoKey(previewVideo))}
            isAttached={isAttached(previewVideo)}
            onToggle={() => toggle(previewVideo)}
            onClose={() => setPreviewIndex(null)}
            onPrev={previewIndex > 0 ? () => setPreviewIndex(previewIndex - 1) : undefined}
            onNext={previewIndex < videos.length - 1 ? () => setPreviewIndex(previewIndex + 1) : undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Khung xem video lớn, phủ kín hộp chọn ngay TRONG DialogContent (không mở dialog thứ hai —
 * Radix khoá tương tác ngoài dialog đang mở). Facebook phát thẳng link CDN (nét, đúng khung dọc); link
 * hết hạn thì lùi về trình phát nhúng của Facebook. Instagram dùng trình nhúng chính chủ.
 */
function PostPreview({
  video,
  line,
  position,
  selectedCount,
  isSelected,
  isAttached,
  onToggle,
  onClose,
  onPrev,
  onNext,
}: {
  video: ExternalVideo
  line: string
  position: string
  selectedCount: number
  isSelected: boolean
  isAttached: boolean
  onToggle: () => void
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [directFailed, setDirectFailed] = useState(false)
  const style = platformStyle(video.platform)
  const PlatformIcon = style.icon

  useEffect(() => {
    setDirectFailed(false)
  }, [video.platform, video.post_id])

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const embed = planPlayback(video.platform, video.post_id, video.url, '')
  const player = video.video_url && !directFailed ? (
    <video
      key={video.video_url}
      src={video.video_url}
      poster={thumbnailUrl(video) || undefined}
      controls
      autoPlay
      playsInline
      className="h-full w-full bg-black object-contain"
      onError={() => setDirectFailed(true)}
    />
  ) : embed.mode === 'embed' ? (
    <iframe
      key={embed.src}
      src={embed.src}
      title={`Video ${style.label} của ${video.author_name || video.author_username}`}
      className="h-full w-full border-0 bg-white"
      allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
      allowFullScreen
    />
  ) : (
    <div className="relative h-full w-full">
      {video.thumbnail_url && (
        <img src={thumbnailUrl(video)} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
      )}
      <p className="absolute inset-x-3 bottom-3 rounded-lg bg-black/70 px-3 py-2 text-center text-xs text-white">
        {style.label} chưa phát được tại đây — bấm “Mở bài gốc” để xem.
      </p>
    </div>
  )

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Xem video bài đăng"
      className="absolute inset-0 z-20 flex flex-col bg-slate-950 lg:flex-row"
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' && onPrev) { event.preventDefault(); onPrev() }
        if (event.key === 'ArrowRight' && onNext) { event.preventDefault(); onNext() }
        // Bộ lọc/lưới vẫn nằm bên dưới trong cùng DialogContent — giữ Tab quanh khung xem để
        // focus không chui xuống phần bị che.
        if (event.key === 'Tab' && rootRef.current) {
          const focusables = rootRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), video[controls], iframe')
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }
      }}
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 py-4">
        <div className="h-full max-w-full overflow-hidden rounded-xl bg-black shadow-2xl" style={{ aspectRatio: '9 / 16' }}>
          {player}
        </div>

        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Bài trước"
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Bài sau"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
      </div>

      <aside className="flex max-h-[45%] w-full shrink-0 flex-col bg-white lg:max-h-none lg:w-80">
        <div className="flex items-start gap-2 border-b border-slate-200 p-4">
          <div className="min-w-0 flex-1">
            <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold', style.bg, style.color)}>
              <PlatformIcon size={12} weight="fill" aria-hidden="true" />
              {style.label}
            </span>
            <p className="mt-1.5 truncate text-sm font-semibold text-slate-900">{video.author_name || video.author_username || 'Không rõ kênh'}</p>
            <p className="text-xs text-slate-500">{formatDate(video.date_posted)} · Bài {position}</p>
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

        <div className="flex gap-4 border-b border-slate-100 px-4 py-2 text-xs text-slate-600">
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden="true" />{formatCount(video.play_count)} lượt xem</span>
          <span>{formatCount(video.likes_count)} thích</span>
          <span>{formatCount(video.comments_count)} bình luận</span>
        </div>

        <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line px-4 py-3 text-sm leading-6 text-slate-700">
          <Caption text={video.description} line={line} />
        </p>

        <div className="flex gap-2 border-t border-slate-200 p-3">
          {video.url && (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Mở bài gốc
            </a>
          )}
          <button
            type="button"
            onClick={onToggle}
            disabled={isAttached || !video.url}
            aria-pressed={isSelected}
            className={cn(
              'inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
              isAttached
                ? 'bg-emerald-50 text-emerald-700'
                : isSelected
                  ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500',
            )}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {isAttached ? 'Đã gắn vào task' : isSelected ? 'Bỏ chọn' : 'Chọn bài này'}
          </button>
        </div>
        <p aria-live="polite" className="px-4 pb-3 text-xs text-slate-500">
          Đã chọn <strong className="text-indigo-700">{selectedCount}</strong> bài · đóng khung xem để bấm “Gắn vào task”
        </p>
      </aside>
    </div>
  )
}
