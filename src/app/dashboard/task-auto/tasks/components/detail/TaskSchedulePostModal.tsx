'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Send, Clock, CheckCircle2, XCircle, AlertCircle, RotateCcw, Ban,
  Search, ExternalLink, Plus, X, AtSign, AlertTriangle, ChevronDown, Film,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, driveImageUrl } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { socialApi, SocialPlatform, SocialPost, SocialAccount, getPostUrl } from '@/lib/api/social'
import { useSocialAccounts } from '@/hooks/useSocialAccounts'

// ─── Nền tảng: icon thương hiệu thật + màu, để mỗi nơi phân biệt được ngay ────────
// SVG path đồng bộ với PublishedLinksSection / social/channels (P_STATIC).
const PLATFORM_UI: Record<SocialPlatform, { label: string; color: string; svg?: string }> = {
  FACEBOOK: {
    label: 'Facebook', color: '#1877F2',
    svg: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  INSTAGRAM: {
    label: 'Instagram', color: '#E1306C',
    svg: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  },
  YOUTUBE: {
    label: 'YouTube', color: '#FF0000',
    svg: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  THREADS: { label: 'Threads', color: '#000000' },
}
const PLATFORM_ORDER: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'THREADS']

function PlatformGlyph({ platform, className }: { platform: SocialPlatform; className?: string }) {
  const ui = PLATFORM_UI[platform] ?? PLATFORM_UI.FACEBOOK
  if (ui.svg) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d={ui.svg} />
      </svg>
    )
  }
  return <AtSign className={className} aria-hidden />
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const STATUS_CONFIG: Record<string, { label: string; text: string; bg: string; border: string; icon: typeof Clock }> = {
  PENDING:   { label: 'Đang chờ',  text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  icon: Clock },
  COMPLETED: { label: 'Đã đăng',   text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  FAILED:    { label: 'Thất bại',  text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',    icon: XCircle },
  CANCELLED: { label: 'Đã huỷ',    text: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',  icon: AlertCircle },
}

// ─── Helpers thời gian (giờ máy = giờ VN với mọi người dùng nội bộ) ───────────────
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function plusHours(n: number): Date {
  return new Date(Date.now() + n * 60 * 60 * 1000)
}
function atRelativeDay(dayOffset: number, h: number, m: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d
}
function friendlyDateTime(input: string): string {
  const d = new Date(input)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
}
function formatDateTime(dt?: string | null): string {
  if (!dt) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dt))
}

// ─── Đọc lỗi Meta cho ra tiếng người, bỏ phần " | stack: ..." ────────────────────
function cleanErrorMsg(raw?: string | null): string {
  if (!raw) return 'Không rõ nguyên nhân (chưa có thông tin lỗi từ nền tảng).'
  let s = String(raw).split(' | stack:')[0].trim()
  const tryParse = (txt: string): string | null => {
    try {
      const j = JSON.parse(txt)
      return j?.error?.error_user_msg || j?.error?.message || j?.message || null
    } catch { return null }
  }
  const direct = tryParse(s)
  if (direct) return direct
  const brace = s.indexOf('{')
  if (brace >= 0) {
    const inner = tryParse(s.slice(brace))
    if (inner) return `${s.slice(0, brace).trim()} ${inner}`.trim()
  }
  return s.length > 320 ? `${s.slice(0, 320)}…` : s
}

// ─── Phân loại tài khoản ─────────────────────────────────────────────────────────
function accountSubLabel(a: SocialAccount): string {
  const type = String(a.extra_data?.type ?? '')
  switch (a.platform) {
    case 'INSTAGRAM': return type === 'instagram_direct' ? 'IG Login trực tiếp' : 'Instagram Business'
    case 'FACEBOOK':  return (type === 'page' || a.parent_id) ? 'Trang Facebook' : 'Hồ sơ Facebook'
    case 'YOUTUBE':   return 'Kênh YouTube'
    case 'THREADS':   return 'Threads'
    default:          return a.platform
  }
}
function igMissingUserId(a: SocialAccount): boolean {
  return a.platform === 'INSTAGRAM'
    && !a.extra_data?.igUserId
    && !a.extra_data?.igBusinessId
    && !a.platform_id
}

function defaultScheduledAt(): string {
  return toLocalInput(plusHours(1))
}

interface Props {
  taskId: string
  resultUrl: string
  defaultMessage: string
  currentUserId?: string
  onClose: () => void
}

export function TaskSchedulePostModal({ taskId, resultUrl, defaultMessage, currentUserId, onClose }: Props) {
  const qc = useQueryClient()
  const queryKey = ['social-schedule-by-task', taskId]

  const { data: posts, isLoading } = useQuery({
    queryKey,
    queryFn: () => socialApi.schedule.listByTask(taskId),
  })
  const { data: accountList } = useSocialAccounts()

  const [formOpen, setFormOpen] = useState(false)
  const [platformTab, setPlatformTab] = useState<'ALL' | SocialPlatform>('ALL')
  const [channelSearch, setChannelSearch] = useState('')
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt())
  const [message, setMessage] = useState(defaultMessage)
  const [submitting, setSubmitting] = useState(false)

  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('custom_hashtags') || '[]') } catch { return [] }
  })

  // Chưa có bài nào → mở luôn form cho đỡ 1 cú click.
  useEffect(() => {
    if (!isLoading && (!posts || posts.length === 0)) setFormOpen(true)
  }, [isLoading, posts])

  const addHashtag = (raw: string) => {
    const tag = raw.trim().replace(/^#+/, '').replace(/\s+/g, '')
    if (!tag) return
    setHashtags(prev => (prev.includes(tag) ? prev : [...prev, tag]))
    setHashtagInput('')
  }
  const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(h => h !== tag))
  const persistSuggested = (list: string[]) => {
    setSuggestedHashtags(list)
    try { localStorage.setItem('custom_hashtags', JSON.stringify(list)) } catch { /* ignore */ }
  }

  const cancelMut = useMutation({
    mutationFn: (id: string) => socialApi.schedule.cancel(id),
    onSuccess: () => { toast.success('Đã huỷ bài đăng'); qc.invalidateQueries({ queryKey }) },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Huỷ thất bại'),
  })
  const retryMut = useMutation({
    mutationFn: (id: string) => socialApi.schedule.retry(id),
    onSuccess: () => { toast.success('Đã đưa vào hàng chờ thử lại'); qc.invalidateQueries({ queryKey }) },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Thử lại thất bại'),
  })

  // ─── Tài khoản đủ điều kiện chọn ───────────────────────────────────────────────
  const eligibleAccounts = useMemo(() => {
    const list = accountList ?? []
    return list.filter(account => {
      const isChild = !!account.parent_id
      const hasChildren = list.some(a => a.parent_id === account.id)
      // Ẩn "hồ sơ gốc" FB/IG chỉ đóng vai trò chứa các trang con — không đăng lên được.
      const isPersonalRoot = !isChild && hasChildren && (account.platform === 'FACEBOOK' || account.platform === 'INSTAGRAM')
      return !isPersonalRoot
    })
  }, [accountList])

  const platformCounts = useMemo(() => {
    const m = new Map<SocialPlatform, number>()
    for (const a of eligibleAccounts) m.set(a.platform, (m.get(a.platform) ?? 0) + 1)
    return m
  }, [eligibleAccounts])

  const visibleAccounts = useMemo(() => {
    const q = channelSearch.trim().toLowerCase()
    return eligibleAccounts.filter(a => {
      if (platformTab !== 'ALL' && a.platform !== platformTab) return false
      if (q && !a.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [eligibleAccounts, platformTab, channelSearch])

  const groupedAccounts = useMemo(() => {
    const groups: { platform: SocialPlatform; accounts: SocialAccount[] }[] = []
    for (const platform of PLATFORM_ORDER) {
      const accounts = visibleAccounts
        .filter(a => a.platform === platform)
        .sort((a, b) => Number(!!a.parent_id) - Number(!!b.parent_id) || a.name.localeCompare(b.name))
      if (accounts.length) groups.push({ platform, accounts })
    }
    return groups
  }, [visibleAccounts])

  const accountById = useMemo(() => {
    const m = new Map<string, SocialAccount>()
    for (const a of eligibleAccounts) m.set(a.id, a)
    return m
  }, [eligibleAccounts])
  const selectedAccounts = selectedAccountIds
    .map(id => accountById.get(id))
    .filter((a): a is SocialAccount => !!a)

  const toggleAccount = (a: SocialAccount) => {
    if (igMissingUserId(a)) {
      toast.error('Kênh Instagram này thiếu IG User ID — hãy kết nối lại ở trang Kênh social.')
      return
    }
    setSelectedAccountIds(prev => (prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id]))
  }

  const hasInstagramSelected = selectedAccounts.some(a => a.platform === 'INSTAGRAM')
  const captionLimit = hasInstagramSelected ? 2200 : 5000
  const hashtagStr = hashtags.map(h => `#${h}`).join(' ')
  const fullCaptionLength = message.trim().length + (hashtagStr ? hashtagStr.length + 2 : 0)

  const handleSubmit = async () => {
    if (selectedAccountIds.length === 0) return toast.error('Chọn ít nhất 1 kênh')
    if (!message.trim()) return toast.error('Nhập caption cho bài đăng')
    const d = new Date(scheduledAt)
    if (isNaN(d.getTime())) return toast.error('Thời gian lên lịch không hợp lệ')
    if (d <= new Date()) return toast.error('Thời gian lên lịch phải ở tương lai')

    const fullMessage = message.trim() + (hashtagStr ? `\n\n${hashtagStr}` : '')

    setSubmitting(true)
    let successCount = 0
    for (const accountId of selectedAccountIds) {
      try {
        await socialApi.schedule.create({
          accountId,
          message: fullMessage,
          mediaUrls: [resultUrl],
          scheduledAt: d.toISOString(),
          taskId,
        })
        successCount++
      } catch (err: any) {
        const acc = accountById.get(accountId)
        toast.error(`${acc?.name ?? 'Kênh'}: ${err?.response?.data?.message ?? 'lên lịch thất bại'}`)
      }
    }
    setSubmitting(false)

    if (successCount > 0) {
      toast.success(`Đã lên lịch ${successCount} bài đăng`)
      qc.invalidateQueries({ queryKey })
      setSelectedAccountIds([])
      setFormOpen(false)
    }
  }

  const thumb = driveImageUrl(resultUrl, 320)

  return (
    <DarkModal open onClose={onClose} title="Lên lịch đăng bài" size="xl">
      <div className="space-y-4">
        {/* Video của task */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-900">
            {thumb
              ? <img src={thumb} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              : <div className="flex h-full w-full items-center justify-center text-gray-500"><Film className="h-5 w-5" /></div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Video từ task</p>
            <p className="truncate text-sm font-medium text-gray-700">{defaultMessage || 'Video đã nộp'}</p>
          </div>
          <a
            href={resultUrl} target="_blank" rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Xem
          </a>
        </div>

        {/* Bài đã lên lịch */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Bài đã lên lịch ({posts.length})
            </p>
            {posts.map(post => (
              <ScheduledPostRow
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onCancel={() => cancelMut.mutate(post.id)}
                onRetry={() => retryMut.mutate(post.id)}
                isCancelling={cancelMut.isPending}
                isRetrying={retryMut.isPending}
              />
            ))}
          </div>
        ) : (
          <p className="py-1 text-sm italic text-gray-400">Chưa có bài đăng nào được lên lịch cho task này</p>
        )}

        {/* Nút mở form */}
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 py-2.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" /> Lên lịch đăng bài mới
          </button>
        ) : (
          <div className="space-y-4 rounded-xl border border-indigo-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Bài đăng mới</p>
              {posts && posts.length > 0 && (
                <button onClick={() => setFormOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Đóng</button>
              )}
            </div>

            {/* Chọn kênh */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">Chọn kênh đăng</p>
                {selectedAccountIds.length > 0 && (
                  <button
                    onClick={() => setSelectedAccountIds([])}
                    className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>

              {/* Tab nền tảng */}
              <div className="flex flex-wrap gap-1.5">
                <PlatformTab
                  active={platformTab === 'ALL'}
                  onClick={() => setPlatformTab('ALL')}
                  label="Tất cả"
                  count={eligibleAccounts.length}
                  color="#4f46e5"
                />
                {PLATFORM_ORDER.filter(p => platformCounts.get(p)).map(p => (
                  <PlatformTab
                    key={p}
                    active={platformTab === p}
                    onClick={() => setPlatformTab(p)}
                    label={PLATFORM_UI[p].label}
                    count={platformCounts.get(p) ?? 0}
                    color={PLATFORM_UI[p].color}
                    platform={p}
                  />
                ))}
              </div>

              {/* Chip đã chọn */}
              {selectedAccounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-lg bg-indigo-50/60 p-2">
                  {selectedAccounts.map(a => (
                    <span
                      key={a.id}
                      className="flex items-center gap-1.5 rounded-lg bg-white py-1 pl-1.5 pr-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200"
                    >
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded text-white"
                        style={{ backgroundColor: PLATFORM_UI[a.platform]?.color }}
                      >
                        <PlatformGlyph platform={a.platform} className="h-2.5 w-2.5" />
                      </span>
                      <span className="max-w-[140px] truncate">{a.name}</span>
                      <button
                        onClick={() => setSelectedAccountIds(prev => prev.filter(x => x !== a.id))}
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kênh..."
                  value={channelSearch}
                  onChange={e => setChannelSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {groupedAccounts.length === 0 && (
                  <p className="text-xs italic text-gray-400">
                    {channelSearch || platformTab !== 'ALL' ? 'Không có kênh phù hợp' : 'Chưa kết nối kênh social nào'}
                  </p>
                )}
                {groupedAccounts.map(group => (
                  <div key={group.platform} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-0.5">
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded text-white"
                        style={{ backgroundColor: PLATFORM_UI[group.platform].color }}
                      >
                        <PlatformGlyph platform={group.platform} className="h-2.5 w-2.5" />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        {PLATFORM_UI[group.platform].label} · {group.accounts.length} kênh
                      </span>
                    </div>
                    {group.accounts.map(account => {
                      const isSelected = selectedAccountIds.includes(account.id)
                      const missing = igMissingUserId(account)
                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => toggleAccount(account)}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors',
                            missing
                              ? 'cursor-not-allowed border-amber-200 bg-amber-50/60'
                              : isSelected
                                ? 'border-indigo-300 bg-indigo-50'
                                : 'border-gray-100 bg-white hover:bg-gray-50',
                          )}
                        >
                          <span
                            className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-white"
                            style={{ backgroundColor: PLATFORM_UI[account.platform]?.color }}
                          >
                            {account.avatar_url
                              ? <img src={account.avatar_url} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover" />
                              : <PlatformGlyph platform={account.platform} className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-gray-800">{account.name}</span>
                            <span className={cn('block text-[11px]', missing ? 'font-semibold text-amber-600' : 'text-gray-400')}>
                              {missing ? 'Thiếu IG User ID — kết nối lại' : accountSubLabel(account)}
                            </span>
                          </span>
                          {missing
                            ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                            : isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Thời gian */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">Thời gian đăng</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="date"
                  value={scheduledAt.slice(0, 10)}
                  onChange={e => setScheduledAt(`${e.target.value}T${scheduledAt.slice(11, 16)}`)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <select
                  value={scheduledAt.slice(11, 13)}
                  onChange={e => setScheduledAt(`${scheduledAt.slice(0, 10)}T${e.target.value}:${scheduledAt.slice(14, 16)}`)}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {HOURS.map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
                <select
                  value={scheduledAt.slice(14, 16)}
                  onChange={e => setScheduledAt(`${scheduledAt.slice(0, 10)}T${scheduledAt.slice(11, 13)}:${e.target.value}`)}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {MINUTES.map(m => <option key={m} value={m}>{m}p</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Sau 1 giờ', get: () => plusHours(1) },
                  { label: 'Tối nay 19:00', get: () => atRelativeDay(0, 19, 0) },
                  { label: 'Sáng mai 08:00', get: () => atRelativeDay(1, 8, 0) },
                  { label: 'Trưa mai 12:00', get: () => atRelativeDay(1, 12, 0) },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setScheduledAt(toLocalInput(preset.get()))}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                Đăng lúc: <span className="font-semibold text-gray-600">{friendlyDateTime(scheduledAt)}</span>
              </p>
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">Caption</p>
                <span className={cn('text-[11px]', fullCaptionLength > captionLimit ? 'font-semibold text-red-500' : 'text-gray-400')}>
                  {fullCaptionLength}/{captionLimit}
                </span>
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Nội dung bài đăng..."
              />
              {hasInstagramSelected && (
                <p className="text-[11px] text-gray-400">Instagram Reels dùng video dọc 9:16, caption tối đa 2.200 ký tự, tối đa 30 hashtag.</p>
              )}
            </div>

            {/* Hashtag */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">Hashtag</p>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 p-2">
                {hashtags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                    #{tag}
                    <X onClick={() => removeHashtag(tag)} className="h-3 w-3 cursor-pointer hover:text-red-500" />
                  </span>
                ))}
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={e => setHashtagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); addHashtag(hashtagInput) }
                    if (e.key === 'Backspace' && !hashtagInput && hashtags.length) removeHashtag(hashtags[hashtags.length - 1])
                  }}
                  placeholder={hashtags.length ? 'Thêm...' : 'Nhập hashtag, Enter để thêm'}
                  className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              {suggestedHashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestedHashtags.map(tag => (
                    <div key={tag} className="group relative">
                      <button
                        type="button"
                        onClick={() => addHashtag(tag)}
                        disabled={hashtags.includes(tag)}
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
                          hashtags.includes(tag)
                            ? 'border-gray-100 bg-gray-100 text-gray-300'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600',
                        )}
                      >
                        #{tag}
                      </button>
                      <X
                        onClick={() => persistSuggested(suggestedHashtags.filter(t => t !== tag))}
                        className="absolute -right-1 -top-1 h-3.5 w-3.5 cursor-pointer rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                  ))}
                </div>
              )}
              {hashtagInput.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const t = hashtagInput.trim().replace(/^#+/, '')
                    if (t && !suggestedHashtags.includes(t)) persistSuggested([...suggestedHashtags, t])
                  }}
                  className="text-[11px] font-semibold text-indigo-500 hover:underline"
                >
                  + Lưu &quot;#{hashtagInput.trim().replace(/^#+/, '')}&quot; vào gợi ý
                </button>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || selectedAccountIds.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Lên lịch đăng{selectedAccountIds.length > 0 ? ` (${selectedAccountIds.length} kênh)` : ''}
            </button>
          </div>
        )}
      </div>
    </DarkModal>
  )
}

function PlatformTab({
  active, onClick, label, count, color, platform,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  color: string
  platform?: SocialPlatform
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
        active ? 'text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
      )}
      style={active ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {platform && <PlatformGlyph platform={platform} className="h-3 w-3" />}
      {label}
      <span className={cn('rounded px-1 text-[10px]', active ? 'bg-white/25' : 'bg-gray-100 text-gray-500')}>{count}</span>
    </button>
  )
}

function ScheduledPostRow({
  post, currentUserId, onCancel, onRetry, isCancelling, isRetrying,
}: {
  post: SocialPost
  currentUserId?: string
  onCancel: () => void
  onRetry: () => void
  isCancelling: boolean
  isRetrying: boolean
}) {
  const [showError, setShowError] = useState(false)
  const ui = PLATFORM_UI[post.platform as SocialPlatform] ?? PLATFORM_UI.FACEBOOK
  const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  const isOwner = !!currentUserId && post.user_id === currentUserId
  const postUrl = post.status === 'COMPLETED' ? getPostUrl(post.result, post.platform) : null
  const autoRetrying = post.status === 'PENDING' && (post.retry_count ?? 0) > 0

  return (
    <div className={cn('space-y-2 rounded-xl border px-3 py-2.5', cfg.bg, cfg.border)}>
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: ui.color }}
        >
          <PlatformGlyph platform={post.platform as SocialPlatform} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-gray-800">{post.account?.name || ui.label}</p>
            <span className="shrink-0 rounded bg-white/70 px-1.5 py-px text-[10px] font-bold uppercase text-gray-500">{ui.label}</span>
          </div>
          <p className="text-xs text-gray-400">{formatDateTime(post.scheduled_at || post.executed_at)}</p>
        </div>
        <div className={cn('flex shrink-0 items-center gap-1 text-xs font-semibold', cfg.text)}>
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
        </div>
        {isOwner && post.status === 'PENDING' && (
          <button
            onClick={onCancel}
            disabled={isCancelling}
            title="Huỷ bài đăng"
            className="shrink-0 rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
          </button>
        )}
        {isOwner && post.status === 'FAILED' && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            title="Thử lại"
            className="shrink-0 rounded-lg p-1.5 text-indigo-500 transition-colors hover:bg-indigo-100 disabled:opacity-50"
          >
            {isRetrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {autoRetrying && (
        <p className="text-[11px] text-amber-600">
          Đã thử {post.retry_count}/3 lần, hệ thống đang tự thử lại
          {post.next_retry_at ? ` · lần kế: ${formatDateTime(post.next_retry_at)}` : ''}
        </p>
      )}

      {post.status === 'FAILED' && (
        <div className="rounded-lg border border-red-200 bg-white/70 text-xs">
          <button
            onClick={() => setShowError(v => !v)}
            className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 font-semibold text-red-600"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Lý do thất bại
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showError && 'rotate-180')} />
          </button>
          {showError && (
            <p className="whitespace-pre-wrap break-words px-2.5 pb-2 pt-0 text-[11px] leading-relaxed text-red-700">
              {cleanErrorMsg(post.error_msg)}
            </p>
          )}
        </div>
      )}

      {postUrl && (
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-white"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{postUrl}</span>
        </a>
      )}
    </div>
  )
}
