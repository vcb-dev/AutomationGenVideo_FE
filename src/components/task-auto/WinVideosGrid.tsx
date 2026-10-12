'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Eye, Film, MessageCircle, RotateCcw, ThumbsUp, Trophy } from 'lucide-react'

import ContentFilters from '@/app/dashboard/internalChannels/components/ContentFilters'
import {
  FilterDateRange, FilterNumber, FilterReset, FilterSearch, FilterSelect,
} from '@/app/dashboard/internalChannels/components/FilterFields'
import OPaastVideo from '@/app/dashboard/internalChannels/components/OPaastVideo'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { UNCLASSIFIED_FILTER } from '@/components/task-auto/helpers'
import { CLASSIFICATION_PALETTE } from '@/components/dashboard/a5/shared/classification-colors'
import { useDebounced } from '@/hooks/useDebounced'
import { getContentClassifications, getTeams } from '@/lib/api/task-auto'
import { formatTeamName } from '@/lib/task-auto/team-label'
import { scraperService, type ExternalVideo, type TrangThaiPaast } from '@/services/scraperService'
import { useAuthStore } from '@/store/auth-store'

/**
 * Ngưỡng "win" — khớp VIEW_WIN_THRESHOLD bên BE (published-link-win-fail.util.ts): video win khi
 * view > 10.000. Endpoint lọc `view_count >= min_plays` nên gửi ngưỡng + 1.
 */
const WIN_VIEW_THRESHOLD = 10_000
const WIN_MIN_PLAYS = WIN_VIEW_THRESHOLD + 1
const PAGE_SIZE = 24
const DEFAULT_SORT = 'plays'
const CLASSIFICATION_HINT =
  'Phân loại lấy từ content của task đã gắn video. Video chưa gắn task nào (đa số video cũ) tính là "Chưa phân loại".'

const SORT_OPTIONS = [
  { value: 'date', label: 'Mới nhất' },
  { value: 'plays', label: 'Nhiều views nhất' },
  { value: 'likes', label: 'Nhiều likes nhất' },
]

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function relativeTime(dateStr: string): string {
  const diffD = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diffD === 0) return 'Hôm nay'
  if (diffD < 7) return `${diffD} ngày trước`
  if (diffD < 30) return `${Math.floor(diffD / 7)} tuần trước`
  if (diffD < 365) return `${Math.floor(diffD / 30)} tháng trước`
  return `${Math.floor(diffD / 365)} năm trước`
}

interface Props {
  /**
   * Team / người cầm kênh lọc sẵn khi mở — Kho content team truyền team đang chọn, Kho cá nhân
   * truyền người đang xem, Kho content win để trống. Người dùng vẫn đổi được; "Xóa bộ lọc" quay
   * về giá trị này chứ không về "Tất cả".
   */
  defaultTeamId?: string
  defaultOwnerId?: string
  /** Tên hiện cho defaultOwnerId khi người đó không thuộc team nào (vd admin xem kho của chính mình). */
  defaultOwnerName?: string
}

/**
 * Lưới video win: MỌI video trên page Facebook nội bộ đạt trên 10K view, cùng nguồn (`scraper/owned/videos`)
 * và bộ lọc với Kênh nội bộ › Facebook, thêm lọc team / người cầm kênh.
 */
export function WinVideosGrid({ defaultTeamId = '', defaultOwnerId = '', defaultOwnerName }: Props) {
  const { token } = useAuthStore()

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState(DEFAULT_SORT)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minPlays, setMinPlays] = useState('')
  const [market, setMarket] = useState('')
  const [contentLine, setContentLine] = useState('')
  const [channel, setChannel] = useState('')
  const [hashtag, setHashtag] = useState('')
  const [teamId, setTeamId] = useState(defaultTeamId)
  const [ownerId, setOwnerId] = useState(defaultOwnerId)
  const [classificationId, setClassificationId] = useState('')

  const debouncedSearch = useDebounced(search)
  const debouncedMinPlays = useDebounced(minPlays)
  // Ô min view chỉ nâng ngưỡng — gõ thấp hơn 10K vẫn giữ nguyên kho là video win.
  const effectiveMinPlays = Math.max(WIN_MIN_PLAYS, Number(debouncedMinPlays) || 0)

  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  const { data: classifications } = useQuery({
    queryKey: ['task-auto', 'content-classifications'],
    queryFn: getContentClassifications,
  })
  const classificationOptions = [
    { value: '', label: 'Mọi phân loại' },
    ...(classifications ?? []).map(c => ({ value: c.id, label: c.name })),
    { value: UNCLASSIFIED_FILTER, label: 'Chưa phân loại' },
  ]
  // Màu theo thứ tự danh sách phân loại — cùng bảng màu với biểu đồ "Content theo phân loại".
  const classificationColor = new Map(
    (classifications ?? []).map((c, i) => [c.id, CLASSIFICATION_PALETTE[i % CLASSIFICATION_PALETTE.length]]),
  )
  const teamOptions = [
    { value: '', label: 'Tất cả team' },
    ...(teams ?? [])
      .filter(t => t.is_active || t.id === defaultTeamId)
      .map(t => ({ value: t.id, label: formatTeamName(t.name) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
  ]

  // Người cầm kênh: leader + thành viên của team đang lọc (chưa chọn team thì mọi team).
  const membersOf = (tid: string) => {
    const people = new Map<string, string>()
    for (const t of teams ?? []) {
      if (tid && t.id !== tid) continue
      if (t.leader) people.set(t.leader.id, t.leader.full_name)
      for (const m of t.members ?? []) people.set(m.user_id, m.user?.full_name ?? m.user_id)
    }
    return people
  }
  const ownerPeople = membersOf(teamId)
  if (defaultOwnerId && !ownerPeople.has(defaultOwnerId) && !teamId) {
    ownerPeople.set(defaultOwnerId, defaultOwnerName ?? 'Tôi')
  }
  const ownerOptions = [
    { value: '', label: 'Mọi người cầm kênh' },
    ...[...ownerPeople].map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
  ]
  // Đổi sang team không có người đang lọc thì bỏ lọc người — giữ lại chắc chắn ra 0 video.
  const changeTeam = (tid: string) => {
    setTeamId(tid)
    if (tid && ownerId && !membersOf(tid).has(ownerId)) setOwnerId('')
  }

  const hasFilters = !!search || !!dateFrom || !!dateTo || !!minPlays || sortBy !== DEFAULT_SORT
    || !!market || !!contentLine || !!channel || !!hashtag || teamId !== defaultTeamId || ownerId !== defaultOwnerId
    || !!classificationId
  const clearFilters = () => {
    setSearch(''); setSortBy(DEFAULT_SORT); setDateFrom(''); setDateTo(''); setMinPlays('')
    setMarket(''); setContentLine(''); setChannel(''); setHashtag(''); setTeamId(defaultTeamId); setOwnerId(defaultOwnerId)
    setClassificationId('')
  }
  const isScoped = !!teamId || !!ownerId

  const videosQuery = useInfiniteQuery({
    queryKey: ['task-auto', 'win-videos', debouncedSearch, sortBy, dateFrom, dateTo, effectiveMinPlays, market, contentLine, channel, hashtag, teamId, ownerId, classificationId],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token')
      return scraperService.getOwnedChannelVideos(token, {
        page: pageParam,
        page_size: PAGE_SIZE,
        platform: 'facebook',
        min_plays: effectiveMinPlays,
        q: debouncedSearch || undefined,
        sort: sortBy,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        market: market || undefined,
        content_line: contentLine || undefined,
        channel: channel || undefined,
        hashtag: hashtag || undefined,
        team_id: teamId || undefined,
        owner_id: ownerId || undefined,
        classification_id: classificationId || undefined,
        with_classification: 1,
      })
    },
    getNextPageParam: last => (last.page < last.total_pages ? last.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!token,
  })

  const allVideos = videosQuery.data?.pages.flatMap(p => p.videos) ?? []
  const totalVideos = videosQuery.data?.pages[0]?.count ?? 0

  // Trạng thái chấm điểm PAAST của cả lưới — một lượt gọi cho mỗi trang vừa tải, chỉ đọc bảng đã lưu.
  const [paastMap, setPaastMap] = useState<Record<string, TrangThaiPaast>>({})
  const askedPaastKeysRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!token) return
    const pendingKeys = allVideos
      .map(v => `facebook:${v.post_id}`)
      .filter(k => !askedPaastKeysRef.current.has(k))
    if (!pendingKeys.length) return
    pendingKeys.forEach(k => askedPaastKeysRef.current.add(k))
    scraperService.getPaastStatus(token, pendingKeys).then(r => {
      if (r && Object.keys(r).length) setPaastMap(cu => ({ ...cu, ...r }))
    })
  }, [allVideos.length, token])

  const observerRef = useRef<IntersectionObserver>()
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (videosQuery.isFetchingNextPage) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && videosQuery.hasNextPage) videosQuery.fetchNextPage()
    }, { rootMargin: '200px' })
    if (node) observerRef.current.observe(node)
  }, [videosQuery.isFetchingNextPage, videosQuery.hasNextPage, videosQuery.fetchNextPage])

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
        <FilterSearch value={search} onChange={setSearch} placeholder="Tìm caption, hashtag..." />
        <FilterSelect
          value={teamId}
          onChange={changeTeam}
          className="w-[170px]"
          title="Chỉ hiện video trên page của team đã chọn (theo Quản lý kênh)"
          options={teamOptions}
        />
        <FilterSelect
          value={ownerId}
          onChange={setOwnerId}
          className="w-[190px]"
          title="Chỉ hiện video trên page do người này cầm (theo Quản lý kênh)"
          options={ownerOptions}
        />
        <FilterSelect value={sortBy} onChange={setSortBy} className="w-[160px]" title="Sắp xếp" options={SORT_OPTIONS} />
        <FilterDateRange from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <FilterNumber value={minPlays} onChange={setMinPlays} placeholder="Min view (>10K)" className="w-40" />
        <ContentFilters
          value={{ channel, hashtag, market, contentLine }}
          onChange={v => {
            if (v.channel !== undefined) setChannel(v.channel)
            if (v.hashtag !== undefined) setHashtag(v.hashtag)
            if (v.market !== undefined) setMarket(v.market)
            if (v.contentLine !== undefined) setContentLine(v.contentLine)
          }}
          platform="facebook"
        />
        <FilterSelect
          value={classificationId}
          onChange={setClassificationId}
          className="w-[170px]"
          title={CLASSIFICATION_HINT}
          options={classificationOptions}
        />
        {hasFilters && <FilterReset onClick={clearFilters} />}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-base font-bold text-slate-800">
          Video nổi bật{' '}
          {totalVideos > 0 && (
            <span className="font-normal text-slate-500 tabular-nums">({totalVideos.toLocaleString('vi-VN')})</span>
          )}
        </h2>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
          <Trophy className="w-3 h-3" aria-hidden="true" />
          Facebook · trên {WIN_VIEW_THRESHOLD / 1000}K view
        </span>
        {classificationId && <p className="basis-full text-xs text-slate-500">{CLASSIFICATION_HINT}</p>}
      </div>

      {videosQuery.isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-white border border-gray-200 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-amber-500" aria-hidden="true" />
          <p className="text-base font-semibold text-slate-600">Không tải được video</p>
          <button
            type="button"
            onClick={() => videosQuery.refetch()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      ) : !videosQuery.isLoading && allVideos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl">
          <EmptyState
            icon={Film}
            title={hasFilters || isScoped ? 'Không có video nổi bật khớp bộ lọc' : 'Chưa có video nổi bật nào'}
            description={classificationId && classificationId !== UNCLASSIFIED_FILTER
              ? 'Chưa có video win nào đã gắn task thuộc phân loại này. Thử bỏ bớt bộ lọc khác.'
              : isScoped
              ? 'Chỉ tính page Facebook đã gán team / người cầm kênh ở Quản lý kênh. Thử bỏ bớt bộ lọc hoặc xem mọi kênh.'
              : hasFilters
                ? 'Thử nới khoảng ngày đăng hoặc bỏ bớt bộ lọc.'
                : 'Video trên page Facebook nội bộ đạt trên 10K view sẽ hiện ở đây sau khi được đồng bộ.'}
          />
          {(hasFilters || isScoped) && (
            <div className="flex justify-center gap-2 pb-8 -mt-8">
              {hasFilters && <FilterReset onClick={clearFilters} />}
              {isScoped && (
                <button
                  type="button"
                  onClick={() => { setTeamId(''); setOwnerId('') }}
                  className="h-9 rounded-lg border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                >
                  Xem mọi kênh
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {videosQuery.isLoading
              ? Array.from({ length: 12 }).map((_, i) => <VideoCardSkeleton key={i} />)
              : allVideos.map(v => (
                  <WinVideoCard
                    key={v.post_id}
                    video={v}
                    classificationColor={v.content_classification ? classificationColor.get(v.content_classification.id) : undefined}
                    paast={paastMap[`facebook:${v.post_id}`]}
                    onPaastUpdate={t => setPaastMap(cu => ({ ...cu, [`facebook:${v.post_id}`]: t }))}
                  />
                ))}
            {videosQuery.isFetchingNextPage && Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={`next-${i}`} />)}
          </div>
          <div ref={loadMoreRef} className="h-4" />
          {!videosQuery.isLoading && !videosQuery.hasNextPage && (
            <p className="text-xs text-slate-400 text-center py-4">
              Đã hiển thị toàn bộ {totalVideos.toLocaleString('vi-VN')} video.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function VideoCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="aspect-[9/16] bg-gray-100 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
      </div>
    </div>
  )
}

/** Thẻ video giống Kênh nội bộ › Facebook: bấm mở bài gốc, ô PAAST ở góc trên phải. */
function WinVideoCard({
  video: v,
  classificationColor,
  paast,
  onPaastUpdate,
}: {
  video: ExternalVideo
  /** Màu chấm cạnh nhãn phân loại — không có (phân loại mới tạo chưa tải về) thì chấm xám. */
  classificationColor?: string
  paast?: TrangThaiPaast
  onPaastUpdate?: (t: TrangThaiPaast) => void
}) {
  // author_username của nhánh Facebook là page_id — ảnh Graph API làm dự phòng khi ảnh đã lưu hỏng.
  const avatarCandidates = [v.author_avatar, v.author_username ? `https://graph.facebook.com/${v.author_username}/picture?type=small` : '']
    .filter(Boolean)
  const [avatarIdx, setAvatarIdx] = useState(0)
  const avatarSrc = avatarCandidates[avatarIdx]

  return (
    <a
      href={v.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="relative aspect-[9/16] bg-slate-100 overflow-hidden">
        {v.thumbnail_url ? (
          <img
            src={v.thumbnail_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 motion-reduce:transition-none"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : null}

        {/* Ô chấm điểm PAAST — bấm vào mới chấm, không tự chấm */}
        <OPaastVideo platform="facebook" postId={v.post_id} trangThai={paast} onCapNhat={onPaastUpdate} />

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-6">
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1 font-semibold" title="Lượt xem">
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />{formatNum(v.play_count)}
            </span>
            <span className="flex items-center gap-1" title="Lượt thích">
              <ThumbsUp className="w-3 h-3" aria-hidden="true" />{formatNum(v.likes_count)}
            </span>
            <span className="flex items-center gap-1" title="Bình luận">
              <MessageCircle className="w-3 h-3" aria-hidden="true" />{formatNum(v.comments_count)}
            </span>
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {v.content_classification && (
          <span
            className="self-start inline-flex items-center gap-1 max-w-full rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600"
            title={`Phân loại nội dung: ${v.content_classification.name}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-400"
              style={classificationColor ? { backgroundColor: classificationColor } : undefined}
              aria-hidden="true"
            />
            <span className="truncate">{v.content_classification.name}</span>
          </span>
        )}
        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{v.description || 'Không có mô tả'}</p>
        {v.author_name && (
          <div className="flex items-center gap-1.5 mt-auto pt-1.5 min-w-0">
            {avatarSrc && (
              <img
                src={avatarSrc}
                alt=""
                className="w-4 h-4 rounded-full shrink-0 bg-slate-100"
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setAvatarIdx(i => i + 1)}
              />
            )}
            <span className="text-xs text-slate-500 truncate">{v.author_name}</span>
          </div>
        )}
        <p className="text-xs text-slate-400">{relativeTime(v.date_posted)}</p>
      </div>
    </a>
  )
}
