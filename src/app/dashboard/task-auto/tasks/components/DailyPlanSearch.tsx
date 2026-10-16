'use client'

import { useEffect, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronDown, ExternalLink, Eye, FileText, Film, Loader2, Plus, Search, SearchX, Trophy, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/components/task-auto'
import { getContentLines, quickCreateFromDailyPlanSearch, searchForDailyPlan } from '@/lib/api/task-auto'
import type {
  DailyPlan, DailyPlanSearchContent, DailyPlanSearchCreateBody, DailyPlanSearchKind, DailyPlanSearchMarket,
  DailyPlanSearchResult, DailyPlanSearchVideo,
} from '@/types/task-auto'
import { SOURCE_LABEL, formatViews, stripHashtags } from './daily-plan-helpers'

const ALL_LINES = 'all'
const SEARCH_DEBOUNCE_MS = 300

const MARKET_OPTIONS: { value: DailyPlanSearchMarket; label: string }[] = [
  { value: 'vn', label: 'Thị trường Việt Nam' },
  { value: 'global', label: 'Thị trường Global' },
  { value: 'all', label: 'Tất cả thị trường' },
]

const MARKET_LABEL: Record<string, string> = {
  VIETNAM: 'Việt Nam', GLOBAL: 'Global', THAILAND: 'Thái Lan', JAPAN: 'Nhật', INDONESIA: 'Indonesia',
}

/** Mặc định theo thị trường của team: team Việt Nam → Việt Nam, team nước ngoài → Global (khớp BE). */
function defaultMarket(teamMarket: string | null | undefined): DailyPlanSearchMarket {
  return (teamMarket || 'VIETNAM').toUpperCase() === 'VIETNAM' ? 'vn' : 'global'
}

const KIND_TABS: { value: DailyPlanSearchKind; label: string }[] = [
  { value: 'content', label: 'Content trong kho' },
  { value: 'video', label: 'Video nổi bật' },
]

function contentKey(c: DailyPlanSearchContent) { return `c:${c.source}:${c.id}` }
function videoKey(v: DailyPlanSearchVideo) { return `v:${v.post_id}` }

interface Props {
  plan: DailyPlan
  onOpenTask: (taskId: string) => void
}

/**
 * Tìm trong toàn hệ thống ngoài danh sách gợi ý: content trong các kho mình được dùng (kho cá nhân,
 * kho team, kho tổng) hoặc video win Facebook mọi kênh — mặc định lọc theo tuyến của kế hoạch — rồi
 * tạo task nhanh từ kết quả.
 */
export function DailyPlanSearch({ plan, onOpenTask }: Props) {
  const qc = useQueryClient()
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [line, setLine] = useState(plan.content_line.id)
  const [market, setMarket] = useState<DailyPlanSearchMarket>(() => defaultMarket(plan.team.market))
  const [kind, setKind] = useState<DailyPlanSearchKind>('content')
  // Kết quả đã tạo task trong phiên mở hộp thoại này: key → task id (để hiện "Mở task")
  const [created, setCreated] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<Set<string>>(new Set())

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [input])

  const { data: contentLines = [] } = useQuery({
    queryKey: ['task-auto', 'content-lines'],
    queryFn: getContentLines,
    staleTime: 10 * 60_000,
  })

  const results = useInfiniteQuery({
    queryKey: ['task-auto', 'daily-plans', 'search', plan.id, kind, q, line, market],
    queryFn: ({ pageParam }): Promise<DailyPlanSearchResult<DailyPlanSearchContent | DailyPlanSearchVideo>> => kind === 'content'
      ? searchForDailyPlan(plan.id, { kind: 'content', q: q || undefined, line, market, page: pageParam })
      : searchForDailyPlan(plan.id, { kind: 'video', q: q || undefined, line, market, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.has_more ? all.length + 1 : undefined),
  })
  const items = results.data?.pages.flatMap(p => p.items) ?? []
  const total = results.data?.pages[0]?.total ?? 0

  const mutation = useMutation({
    mutationFn: ({ body }: { key: string; body: DailyPlanSearchCreateBody }) =>
      quickCreateFromDailyPlanSearch(plan.id, body),
    onMutate: ({ key }) => setPending(prev => new Set(prev).add(key)),
    onSuccess: (res, { key }) => {
      setCreated(prev => ({ ...prev, [key]: res.task_id }))
      toast.success(res.reused ? 'Nhiệm vụ này vừa được tạo rồi' : 'Đã tạo nhiệm vụ')
      qc.invalidateQueries({ queryKey: ['task-auto', 'daily-plans', 'me'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Tạo nhiệm vụ thất bại'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    },
    onSettled: (_r, _e, { key }) => setPending(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    }),
  })

  const lineName = line === ALL_LINES ? null : contentLines.find(l => l.id === line)?.name ?? plan.content_line.name
  const isDefaultLine = line === plan.content_line.id
  const isDefaultMarket = market === defaultMarket(plan.team.market)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={kind === 'content' ? 'Tìm theo tiêu đề hoặc mã content…' : 'Tìm theo caption video…'}
            aria-label={kind === 'content' ? 'Tìm content trong kho' : 'Tìm video win'}
            // Ẩn nút xoá sẵn có của trình duyệt cho input search — đã có nút X riêng bên phải
            className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 [&::-webkit-search-cancel-button]:hidden"
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput('')}
              aria-label="Xoá từ khoá"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={line}
            onChange={e => setLine(e.target.value)}
            aria-label="Lọc theo tuyến nội dung"
            className="appearance-none h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={plan.content_line.id}>Tuyến {plan.content_line.name} (kế hoạch)</option>
            {contentLines.filter(l => l.id !== plan.content_line.id).map(l => (
              <option key={l.id} value={l.id}>Tuyến {l.name}</option>
            ))}
            <option value={ALL_LINES}>Tất cả tuyến</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
        </div>
        <div className="relative">
          <select
            value={market}
            onChange={e => setMarket(e.target.value as DailyPlanSearchMarket)}
            aria-label="Lọc theo thị trường"
            className="appearance-none h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MARKET_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div role="tablist" aria-label="Loại kết quả" className="flex rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          {KIND_TABS.map(t => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={kind === t.value}
              onClick={() => setKind(t.value)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500',
                kind === t.value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500" aria-live="polite">
          {results.isLoading ? 'Đang tìm…' : `${total.toLocaleString('vi-VN')} kết quả`}
          {' · '}task tính theo tuyến của {kind === 'content' ? 'content' : 'hashtag video'}
        </p>
      </div>

      {results.isLoading ? (
        <ul className="space-y-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </ul>
      ) : results.isError ? (
        <p className="py-8 text-center text-sm text-red-600">Không tìm được — thử lại sau.</p>
      ) : items.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2 text-center">
          <SearchX className="w-8 h-8 text-slate-300" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-600">
            Không có {kind === 'content' ? 'content' : 'video win'} nào{q ? ` khớp “${q}”` : ''}{lineName ? ` ở tuyến ${lineName}` : ''}
          </p>
          <p className="text-xs text-slate-400">
            {isDefaultLine ? 'Thử chọn "Tất cả tuyến", ' : ''}{market !== 'all' ? 'đổi thị trường, ' : ''}đổi từ khoá hoặc chuyển sang {kind === 'content' ? 'Video nổi bật' : 'Nội dung trong kho'}.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {kind === 'content'
            ? (items as DailyPlanSearchContent[]).map(c => (
              <ContentResult
                key={contentKey(c)}
                c={c}
                showLine={!isDefaultLine || c.line?.id !== plan.content_line.id}
                showMarket={!isDefaultMarket || market === 'all'}
                taskId={created[contentKey(c)]}
                pending={pending.has(contentKey(c))}
                onCreate={() => mutation.mutate({ key: contentKey(c), body: { kind: 'CONTENT', source: c.source, content_id: c.id } })}
                onOpenTask={onOpenTask}
              />
            ))
            : (items as DailyPlanSearchVideo[]).map(v => (
              <VideoResult
                key={videoKey(v)}
                v={v}
                taskId={created[videoKey(v)]}
                pending={pending.has(videoKey(v))}
                onCreate={() => mutation.mutate({ key: videoKey(v), body: { kind: 'WIN_VIDEO', post_id: v.post_id } })}
                onOpenTask={onOpenTask}
              />
            ))}
        </ul>
      )}

      {results.hasNextPage && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => results.fetchNextPage()}
            disabled={results.isFetchingNextPage}
            aria-busy={results.isFetchingNextPage}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-200 text-xs font-semibold text-slate-600 hover:bg-gray-50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {results.isFetchingNextPage && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            Xem thêm kết quả
          </button>
        </div>
      )}
    </div>
  )
}

function LineBadge({ name }: { name: string }) {
  return <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">{name}</span>
}

function ResultAction({ taskId, pending, label, title, onCreate, onOpenTask }: {
  taskId?: string
  pending: boolean
  label: string
  title?: string
  onCreate: () => void
  onOpenTask: (taskId: string) => void
}) {
  if (taskId) {
    return (
      <button
        type="button"
        onClick={() => onOpenTask(taskId)}
        aria-label={`Mở task vừa tạo: ${label}`}
        className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        Mở task
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onCreate}
      disabled={pending}
      aria-busy={pending}
      aria-label={`Tạo nhiệm vụ: ${label}`}
      title={title}
      className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
      Tạo nhiệm vụ
    </button>
  )
}

function ContentResult({ c, showLine, showMarket, taskId, pending, onCreate, onOpenTask }: {
  c: DailyPlanSearchContent
  showLine: boolean
  showMarket: boolean
  taskId?: string
  pending: boolean
  onCreate: () => void
  onOpenTask: (taskId: string) => void
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-white border border-gray-100 px-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-indigo-500" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800 line-clamp-2">{c.title || 'Content chưa có tiêu đề'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
          {showLine && c.line && <LineBadge name={c.line.name} />}
          {showMarket && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{MARKET_LABEL[c.market] ?? c.market}</span>}
          <span>{SOURCE_LABEL[c.source]}</span>
          {c.code && <span className="font-mono">· {c.code}</span>}
          {c.is_win && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
              <Trophy className="w-3 h-3" aria-hidden="true" />
              Win{c.win_views ? ` · ${formatViews(c.win_views)} view` : ''}
            </span>
          )}
          {c.last_used_at && <span className="text-amber-700">· bạn đã làm ngày {formatDate(c.last_used_at)}</span>}
        </div>
      </div>
      <ResultAction taskId={taskId} pending={pending} label={c.title ?? 'content'} onCreate={onCreate} onOpenTask={onOpenTask} />
    </li>
  )
}

function VideoResult({ v, taskId, pending, onCreate, onOpenTask }: {
  v: DailyPlanSearchVideo
  taskId?: string
  pending: boolean
  onCreate: () => void
  onOpenTask: (taskId: string) => void
}) {
  const [thumbOk, setThumbOk] = useState(true)
  const caption = stripHashtags(v.caption)
  return (
    <li className="flex items-start gap-3 rounded-lg bg-white border border-gray-100 px-3 py-2.5">
      <a
        href={v.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-12 h-[4.5rem] shrink-0 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {v.thumbnail_url && thumbOk ? (
          <img
            src={v.thumbnail_url}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setThumbOk(false)}
            className="w-full h-full object-cover"
          />
        ) : (
          <Film className="w-4 h-4 text-slate-400" aria-hidden="true" />
        )}
        <span className="sr-only">Xem video gốc trên Facebook</span>
      </a>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800 line-clamp-2">{caption || 'Video không có mô tả'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
          {v.line_name && <LineBadge name={v.line_name} />}
          <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
            <Eye className="w-3 h-3" aria-hidden="true" />
            {formatViews(v.views)} view
          </span>
          {v.page_name && <span className="truncate max-w-[12rem]">· {v.page_name}</span>}
          {v.in_my_warehouse && <span className="text-emerald-700">· đã có trong kho cá nhân</span>}
        </div>
      </div>
      <ResultAction
        taskId={taskId}
        pending={pending}
        label={caption || 'video win'}
        title={v.in_my_warehouse ? 'Dùng lại content đã lưu từ video này' : 'Lưu caption (bỏ hashtag) thành content kho cá nhân rồi tạo nhiệm vụ'}
        onCreate={onCreate}
        onOpenTask={onOpenTask}
      />
    </li>
  )
}
