'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw, Ban, Search, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { formatDateTime } from '@/components/task-auto/helpers'
import { socialApi, PLATFORM_META, SocialPlatform, SocialPost, getPostUrl } from '@/lib/api/social'
import { useSocialAccounts } from '@/hooks/useSocialAccounts'
import HashtagPanel from '@/app/dashboard/social/compose/HashtagPanel'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const STATUS_CONFIG: Record<string, { label: string; text: string; bg: string; border: string; icon: typeof Clock }> = {
  PENDING:   { label: 'Đang chờ',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  icon: Clock },
  COMPLETED: { label: 'Đã đăng',    text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  FAILED:    { label: 'Thất bại',   text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',    icon: XCircle },
  CANCELLED: { label: 'Đã huỷ',     text: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',  icon: AlertCircle },
}

function defaultScheduledAt(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  const [channelSearch, setChannelSearch] = useState('')
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt())
  const [message, setMessage] = useState(defaultMessage)
  const [submitting, setSubmitting] = useState(false)

  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('custom_hashtags')
    return saved ? JSON.parse(saved) : []
  })
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')

  const addHashtag = (raw: string) => {
    const tag = raw.trim().replace(/^#+/, '')
    if (!tag) return
    if (!hashtags.includes(tag)) setHashtags(prev => [...prev, tag])
    setHashtagInput('')
  }
  const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(h => h !== tag))
  const addSuggestedHashtag = (tag: string) => {
    const cleanTag = tag.trim().replace(/^#+/, '')
    if (!cleanTag || suggestedHashtags.includes(cleanTag)) return
    const newList = [...suggestedHashtags, cleanTag]
    setSuggestedHashtags(newList)
    localStorage.setItem('custom_hashtags', JSON.stringify(newList))
  }
  const removeSuggestedHashtag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newList = suggestedHashtags.filter(t => t !== tag)
    setSuggestedHashtags(newList)
    localStorage.setItem('custom_hashtags', JSON.stringify(newList))
  }
  const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      addHashtag(hashtagInput)
    }
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

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSubmit = async () => {
    if (selectedAccountIds.length === 0) return toast.error('Chọn ít nhất 1 kênh')
    if (!message.trim()) return toast.error('Nhập caption cho bài đăng')
    const d = new Date(scheduledAt)
    if (isNaN(d.getTime())) return toast.error('Thời gian lên lịch không hợp lệ')
    if (d <= new Date()) return toast.error('Thời gian lên lịch phải ở tương lai')

    const hashtagStr = hashtags.map(h => `#${h}`).join(' ')
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
        toast.error(err?.response?.data?.message ?? 'Lên lịch thất bại cho 1 kênh')
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

  const eligibleAccounts = (accountList ?? []).filter(account => {
    const isChild = !!account.parent_id
    const hasChildren = (accountList ?? []).some(a => a.parent_id === account.id)
    const isPersonalRoot = !isChild && hasChildren && (account.platform === 'FACEBOOK' || account.platform === 'INSTAGRAM')
    const matchesSearch = account.name.toLowerCase().includes(channelSearch.toLowerCase())
    return !isPersonalRoot && matchesSearch
  })

  return (
    <DarkModal open onClose={onClose} title="Lên lịch đăng bài" size="lg">
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map(post => <ScheduledPostRow key={post.id} post={post} currentUserId={currentUserId} onCancel={() => cancelMut.mutate(post.id)} onRetry={() => retryMut.mutate(post.id)} isCancelling={cancelMut.isPending} isRetrying={retryMut.isPending} />)}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-2">Chưa có bài đăng nào được lên lịch cho task này</p>
        )}

        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-indigo-600 border border-dashed border-indigo-300 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            + Lên lịch đăng bài mới
          </button>
        ) : (
          <div className="border border-indigo-200 rounded-xl bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bài đăng mới</p>
              <button onClick={() => setFormOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Đóng</button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-400">Chọn kênh</p>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kênh..."
                  value={channelSearch}
                  onChange={e => setChannelSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 ring-indigo-500/20 outline-none"
                />
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {eligibleAccounts.length === 0 && (
                  <p className="text-xs text-gray-400 italic">
                    {channelSearch ? 'Không tìm thấy kênh phù hợp' : 'Chưa có kênh social nào được kết nối'}
                  </p>
                )}
                {eligibleAccounts.map(account => {
                  const meta = PLATFORM_META[account.platform as SocialPlatform] || PLATFORM_META.FACEBOOK
                  const isSelected = selectedAccountIds.includes(account.id)
                  return (
                    <div
                      key={account.id}
                      onClick={() => toggleAccount(account.id)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                        isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-100 hover:bg-gray-50',
                      )}
                    >
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shrink-0', meta.color)}>
                        {account.avatar_url ? <img src={account.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : meta.emoji}
                      </div>
                      <span className="text-sm text-gray-700 truncate flex-1">{account.name}</span>
                      {isSelected && <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-400">Thời gian đăng</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={scheduledAt.slice(0, 10)}
                  onChange={e => setScheduledAt(`${e.target.value}T${scheduledAt.slice(11, 16)}`)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 ring-indigo-500/20 outline-none font-semibold text-gray-700"
                />
                <select
                  value={scheduledAt.slice(11, 13)}
                  onChange={e => setScheduledAt(`${scheduledAt.slice(0, 10)}T${e.target.value}:${scheduledAt.slice(14, 16)}`)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 ring-indigo-500/20 outline-none font-semibold text-gray-700"
                >
                  {HOURS.map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
                <select
                  value={scheduledAt.slice(14, 16)}
                  onChange={e => setScheduledAt(`${scheduledAt.slice(0, 10)}T${scheduledAt.slice(11, 13)}:${e.target.value}`)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 ring-indigo-500/20 outline-none font-semibold text-gray-700"
                >
                  {MINUTES.map(m => <option key={m} value={m}>{m}p</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-400">Caption</p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 ring-indigo-500/20 outline-none resize-none"
                placeholder="Nội dung bài đăng..."
              />
            </div>

            <HashtagPanel
              hashtags={hashtags}
              suggestedHashtags={suggestedHashtags}
              hashtagInput={hashtagInput}
              onAdd={addHashtag}
              onRemove={removeHashtag}
              onInputChange={setHashtagInput}
              onKeyDown={handleHashtagKeyDown}
              onAddSuggested={addSuggestedHashtag}
              onRemoveSuggested={removeSuggestedHashtag}
            />

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Lên lịch đăng
            </button>
          </div>
        )}
      </div>
    </DarkModal>
  )
}

function ScheduledPostRow({ post, currentUserId, onCancel, onRetry, isCancelling, isRetrying }: {
  post: SocialPost
  currentUserId?: string
  onCancel: () => void
  onRetry: () => void
  isCancelling: boolean
  isRetrying: boolean
}) {
  const meta = PLATFORM_META[post.platform as SocialPlatform] || PLATFORM_META.FACEBOOK
  const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  const isOwner = !!currentUserId && post.user_id === currentUserId
  const postUrl = post.status === 'COMPLETED' ? getPostUrl(post.result, post.platform) : null

  return (
    <div className={cn('px-3 py-2.5 rounded-xl border space-y-2', cfg.bg, cfg.border)}>
      <div className="flex items-center gap-3">
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shrink-0', meta.color)}>
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{post.account?.name || meta.label}</p>
          <p className="text-xs text-gray-400">{formatDateTime(post.scheduled_at || post.executed_at)}</p>
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-semibold shrink-0', cfg.text)}>
          <Icon className="w-3.5 h-3.5" />
          {cfg.label}
        </div>
        {isOwner && post.status === 'PENDING' && (
          <button
            onClick={onCancel}
            disabled={isCancelling}
            title="Huỷ bài đăng"
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 disabled:opacity-50 transition-colors shrink-0"
          >
            {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
          </button>
        )}
        {isOwner && post.status === 'FAILED' && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            title="Thử lại"
            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-100 disabled:opacity-50 transition-colors shrink-0"
          >
            {isRetrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {postUrl && (
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2.5 py-1.5 bg-white/70 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{postUrl}</span>
        </a>
      )}
    </div>
  )
}
