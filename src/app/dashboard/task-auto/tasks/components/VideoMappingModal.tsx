'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertCircle, ArrowRight, Clock, ExternalLink, Link2, Loader2, Play, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getAutoAssignSettings, updateAutoAssignSettings } from '@/lib/api/task-auto'
import { cn } from '@/lib/utils'
import type { AutoAssignSetting, TaskVideoMatchMappedItem, TaskVideoMatchRunResult } from '@/types/task-auto'

interface Props {
  open: boolean
  running: boolean
  result: TaskVideoMatchRunResult | null
  error: string | null
  scopeLabels: string[]
  /** Cờ AI là cài đặt chung (áp dụng cả lượt tự chạy 7:45) — BE chỉ cho ADMIN/MANAGER đổi. */
  canToggleAi: boolean
  onClose: () => void
  /** Bắt đầu quét — nút mở modal KHÔNG tự chạy, người dùng đọc phạm vi rồi mới bấm. */
  onRun: () => void
  onViewTask: (taskId: string) => void
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

/** Căn cứ để hệ thống gắn video vào task, viết bằng lời người dùng hiểu được (không hiện điểm). */
function evidence(item: TaskVideoMatchMappedItem): string[] {
  if (item.alreadyLinked) return ['Task đã có sẵn link này']
  return signalLabels(item.matchedBy)
}

function signalLabels(matched: Record<string, unknown>): string[] {
  // Ca AI chốt: tín hiệu heuristic nằm trong `heuristic.candidateSignals`, phán quyết AI trong `ai`.
  if (matched.source === 'ai') {
    const signals = (matched.heuristic as { candidateSignals?: unknown } | undefined)?.candidateSignals
    const heuristic = signals && typeof signals === 'object'
      ? signalLabels(signals as Record<string, unknown>)
      : []
    return [...heuristic, 'AI xác nhận nội dung khớp']
  }
  if (matched.source === 'repost-other-page') {
    return ['Đăng lại ở page khác của cùng người cầm kênh']
  }
  const labels: string[] = []
  if (matched.channelOwnerGuard || matched.channelOwner) labels.push('Đăng trên kênh của người nhận task')
  if (matched.team) labels.push('Đúng team')
  if (matched.contentLine) labels.push(`Tuyến #${String(matched.contentLine)}`)
  if (matched.hook) labels.push('Trùng tiêu đề')
  if (matched.sku) labels.push('Trùng mã SKU')
  if (matched.hashtags) labels.push('Trùng hashtag')
  if (matched.caption) labels.push('Trùng nội dung caption')
  if (matched.timing) labels.push('Đăng gần hạn task')
  return labels
}

const HOW_IT_WORKS = [
  {
    icon: ShieldCheck,
    title: 'Chỉ gắn khi chắc chắn',
    body: 'Video phải đăng trên kênh của đúng người nhận task và trùng nội dung (tiêu đề, mã SKU…). Chưa chắc thì để nguyên, không gắn bừa.',
  },
  {
    icon: Link2,
    title: 'Chỉ thêm, không xoá',
    body: 'Link được thêm vào mục link đã đăng của task. Link bạn đã dán trước đó vẫn giữ nguyên.',
  },
  {
    icon: Clock,
    title: 'Hệ thống tự chạy lúc 7:45 mỗi sáng',
    body: 'Chỉ cần bấm khi muốn gắn ngay video vừa đăng, không phải chờ đến sáng mai.',
  },
]

const AUTO_ASSIGN_SETTINGS_KEY = ['task-auto', 'auto-assign-settings']

/** Bật/tắt lớp AI của job gắn link — lưu ngay vào cài đặt chung, lượt quét kế tiếp áp dụng luôn. */
function AiAssistToggle({ canToggle, running }: { canToggle: boolean; running: boolean }) {
  const qc = useQueryClient()
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: AUTO_ASSIGN_SETTINGS_KEY,
    queryFn: getAutoAssignSettings,
  })
  const toggleMut = useMutation({
    mutationFn: (next: boolean) => updateAutoAssignSettings({ video_match_ai_enabled: next }),
    onSuccess: updated => {
      qc.setQueryData<AutoAssignSetting>(AUTO_ASSIGN_SETTINGS_KEY, updated)
      toast.success(updated.video_match_ai_enabled ? 'Đã bật AI hỗ trợ gắn link' : 'Đã tắt AI hỗ trợ gắn link')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không đổi được cài đặt AI'),
  })

  const enabled = settings?.video_match_ai_enabled ?? false
  const disabled = !canToggle || running || isLoading || isError || toggleMut.isPending
  return (
    <div className="flex items-start gap-3 border-t border-slate-200 px-6 py-3.5">
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        enabled ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-500',
      )}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p id="video-mapping-ai-label" className="text-sm font-semibold text-slate-900">
          Dùng AI cho video chưa ghép được
          <span className={cn(
            'ml-2 inline-flex rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold',
            enabled ? 'bg-violet-100 text-violet-800' : 'bg-slate-200 text-slate-600',
          )}>
            {isLoading ? 'Đang tải…' : isError ? 'Không tải được' : enabled ? 'Đang bật' : 'Đang tắt'}
          </span>
        </p>
        <p id="video-mapping-ai-desc" className="mt-0.5 text-xs leading-5 text-slate-500">
          AI đọc nội dung video và so với task của đúng người cầm kênh, chỉ gắn khi chắc từ 85% trở lên.
          Áp dụng cho cả lượt tự chạy 7:45 sáng.
          {!canToggle && ' Chỉ Admin/Manager bật hoặc tắt được.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="video-mapping-ai-label"
        aria-describedby="video-mapping-ai-desc"
        disabled={disabled}
        onClick={() => toggleMut.mutate(!enabled)}
        className="group flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed"
      >
        <span className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 group-disabled:opacity-50',
          enabled ? 'bg-violet-600' : 'bg-slate-300',
        )}>
          <span className={cn(
            'inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200',
            enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}>
            {toggleMut.isPending && <Loader2 className="h-3 w-3 animate-spin text-slate-500" aria-hidden="true" />}
          </span>
        </span>
      </button>
    </div>
  )
}

function MappingRow({ item, onViewTask }: { item: TaskVideoMatchMappedItem; onViewTask: (id: string) => void }) {
  const signals = evidence(item)
  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <span className={cn(
          'mt-0.5 inline-flex shrink-0 rounded-md px-2 py-1 text-[10px] font-bold tracking-wide',
          item.platform === 'FACEBOOK' ? 'bg-blue-50 text-blue-700' : 'bg-fuchsia-50 text-fuchsia-700',
        )}>
          {item.platform === 'FACEBOOK' ? 'FACEBOOK' : 'INSTAGRAM'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-6 max-w-full items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span className="line-clamp-2 break-words">{item.caption || 'Video không có caption'}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">(mở video trong tab mới)</span>
            </a>
            <span className="text-xs text-slate-500">Đăng {formatDateTime(item.publishedAt)}</span>
          </div>

          <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Gắn vào task</p>
              <button
                type="button"
                onClick={() => onViewTask(item.task.id)}
                className="min-h-6 max-w-full break-words text-left text-sm font-semibold text-slate-900 hover:text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {item.task.title}
              </button>
              <p className="mt-0.5 text-xs text-slate-500">
                {[item.task.assigneeName, item.task.teamName, item.task.contentLineName ? `Tuyến ${item.task.contentLineName}` : null]
                  .filter(Boolean).join(' · ') || 'Chưa có thông tin task'}
              </p>
            </div>
            <span className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold',
              item.alreadyLinked ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800',
            )}>
              {item.alreadyLinked ? 'Có sẵn' : 'Mới gắn'}
            </span>
          </div>

          {signals.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Căn cứ:</span>
              {signals.map(signal => (
                <span key={signal} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {signal}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export function VideoMappingModal({ open, running, result, error, scopeLabels, canToggleAi, onClose, onRun, onViewTask }: Props) {
  const [listView, setListView] = useState<'current' | 'history'>('current')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!result) return
    setListView(result.mappedItems.length > 0 ? 'current' : 'history')
  }, [result])

  // Chưa chạy, chưa lỗi, chưa có kết quả ⇒ bước giới thiệu + xác nhận phạm vi.
  const isIntro = !running && !error && !result
  const notLinked = result ? result.unmatched + result.ambiguous : 0
  const currentItems = result?.mappedItems ?? []
  const historyItems = result?.existingMappedItems ?? []
  const visibleItems = listView === 'current' ? currentItems : historyItems
  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose() }}>
      <DialogContent
        // Radix tự focus phần tử bấm được đầu tiên — giờ là switch AI (cài đặt chung) ⇒ lỡ Space là đổi.
        onOpenAutoFocus={e => { e.preventDefault(); closeButtonRef.current?.focus() }}
        className="flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 [&>button]:flex [&>button]:h-10 [&>button]:w-10 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="border-b border-slate-200 px-6 py-5 pr-14 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Link2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Tự gắn link video vào task</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Tìm video Facebook đã đăng trên kênh nội bộ và gắn link vào đúng task tương ứng.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite" aria-busy={running}>
          {isIntro && (
            <div className="space-y-5 px-6 py-5">
              <ul className="space-y-3">
                {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{title}</p>
                      <p className="mt-0.5 text-sm leading-6 text-slate-600">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Phạm vi sẽ quét</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {scopeLabels.map(label => (
                    <span key={label} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                      {label}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Lấy theo bộ lọc đang chọn trên màn hình. Riêng khoảng ngày được hiểu là <strong className="font-semibold text-slate-700">ngày đăng video</strong> —
                  muốn quét thêm video đăng hôm trước, hãy đóng cửa sổ này và nới bộ lọc ngày.
                </p>
              </div>
            </div>
          )}

          {running && (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-indigo-600" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-slate-800">Đang tìm video và gắn vào task...</p>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                Có thể mất 1–3 phút. Bạn có thể đóng cửa sổ này, hệ thống vẫn chạy tiếp và báo khi xong.
              </p>
            </div>
          )}

          {!running && error && (
            <div className="m-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Chưa gắn được link video</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <p className="mt-1 text-sm text-red-700">Bấm “Thử lại” sau ít phút. Nếu vẫn lỗi, báo admin kèm thời điểm bấm.</p>
              </div>
            </div>
          )}

          {!running && result && (
            <>
              <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
                {[
                  ['Video đã quét', result.considered, 'text-slate-900'],
                  ['Vừa gắn link', result.matched, 'text-emerald-700'],
                  ['Task đã có link', result.alreadyLinked, 'text-indigo-700'],
                  ['Chưa gắn được', notLinked, 'text-amber-700'],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="bg-white px-4 py-3 text-center">
                    <p className={cn('text-xl font-black', color)}>{value}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {notLinked > 0 && (
                <p className="border-b border-slate-100 bg-amber-50/60 px-6 py-3 text-xs leading-5 text-amber-900">
                  <strong className="font-semibold">{notLinked} video chưa gắn được</strong> vì chưa tìm thấy task khớp, hoặc khớp nhiều task
                  cùng lúc nên hệ thống không dám chọn. Hệ thống sẽ tự thử lại trong 10 ngày tới; bạn cũng có thể gắn tay ở tab
                  “Bài đăng Facebook” hoặc trong chi tiết nhiệm vụ.
                </p>
              )}

              {result.ai && (
                <p className="flex gap-2 border-b border-slate-100 bg-violet-50/60 px-6 py-3 text-xs leading-5 text-violet-900">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    AI đã xét <strong className="font-semibold">{result.ai.asked + result.ai.cached} video</strong> luật chưa ghép được,
                    gắn thêm <strong className="font-semibold">{result.ai.attached}</strong>.
                    {result.ai.failed > 0 && ` ${result.ai.failed} video chưa hỏi được vì AI service không phản hồi — lượt sau sẽ hỏi lại.`}
                  </span>
                </p>
              )}

              <div className="border-b border-slate-100 px-6">
                <div className="flex gap-5" role="tablist" aria-label="Danh sách video đã gắn">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={listView === 'current'}
                    onClick={() => setListView('current')}
                    className={cn(
                      'min-h-11 border-b-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      listView === 'current' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800',
                    )}
                  >
                    Kết quả lần này ({currentItems.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={listView === 'history'}
                    onClick={() => setListView('history')}
                    className={cn(
                      'min-h-11 border-b-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      listView === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800',
                    )}
                  >
                    Đã gắn trước đó ({historyItems.length})
                  </button>
                </div>
              </div>

              {visibleItems.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {visibleItems.map(item => (
                    <MappingRow key={`${item.platform}:${item.postId}`} item={item} onViewTask={onViewTask} />
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    {listView === 'current' ? 'Lần này chưa có video nào được gắn' : 'Chưa có video nào được tự gắn trong phạm vi này'}
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                    {listView === 'current'
                      ? 'Có thể video chưa được kéo về từ Facebook, hoặc chưa trùng nhiệm vụ nào. Thử nới bộ lọc ngày, hoặc gắn tay ở tab “Bài đăng Facebook”.'
                      : 'Thử chọn thêm team, người làm hoặc nới khoảng ngày đăng để xem thêm.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <AiAssistToggle canToggle={canToggleAi} running={running} />

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {isIntro ? 'Huỷ' : 'Đóng'}
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={running}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              : isIntro
                ? <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
                : <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            {running ? 'Đang chạy...' : isIntro ? 'Bắt đầu gắn link' : error ? 'Thử lại' : 'Quét lại'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
