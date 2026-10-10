'use client'

import { type ReactNode, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  CalendarCheck, CheckCircle2, ChevronRight, Eye, FileText, Film, Loader2, Plus, Search, Sparkles, Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmDialog, DarkModal, TaskStatusBadge, formatDateTime, vnDate } from '@/components/task-auto'
import { getMyDailyPlans, quickCreateFromDailyPlan } from '@/lib/api/task-auto'
import type { DailyPlan, DailyPlanSuggestion } from '@/types/task-auto'
import { SOURCE_LABEL, formatViews, stripHashtags } from './daily-plan-helpers'
import { DailyPlanSearch } from './DailyPlanSearch'
import { WarehouseNoticeAlert, type WarehouseNotice } from './WarehouseEmptyBanner'

function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

interface Props {
  /** Chỉ hiện ở view cá nhân — kế hoạch là của riêng người đang đăng nhập */
  enabled: boolean
  /** Bộ lọc ngày chung của trang (YYYY-MM-DD, '' = không giới hạn đầu đó) */
  dateFrom: string
  dateTo: string
  onOpenTask: (taskId: string) => void
  /** Mở modal tạo tay — có `plan` (mở từ hộp thoại 1 tuyến) thì điền sẵn team/hạn chót/tuyến của kế hoạch */
  onCreateManual: (plan?: DailyPlan) => void
  /** Cảnh báo kho SP team trống hôm nay (A4 không tự tạo được task) — hiện ở góc phải đầu khối khi
   * khoảng ngày đang xem có hôm nay; có cảnh báo thì khối vẫn hiện dù không có kế hoạch A1/A2/A3/A5. */
  warehouseNotice?: WarehouseNotice | null
  onDismissWarehouseNotice?: () => void
}

/**
 * Kế hoạch ngày các tuyến không tự tạo task (A1/A2/A3/A5) theo bộ lọc ngày của trang (mặc định hôm
 * nay — kế hoạch ngày mai lập lúc 17:00 chỉ hiện khi chọn ngày mai):
 * - Chọn 1 ngày: mỗi tuyến 1 ô, bấm ô mở gợi ý content kho / video win kèm nút tạo task nhanh.
 * - Chọn khoảng ngày: mỗi tuyến 1 ô cộng dồn các ngày, chỉ để xem (gợi ý gắn với từng ngày).
 * Không có kế hoạch nào trong khoảng thì không hiện gì.
 */
export function DailyPlanPanel({
  enabled, dateFrom, dateTo, onOpenTask, onCreateManual, warehouseNotice, onDismissWarehouseNotice,
}: Props) {
  const qc = useQueryClient()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [openPlanId, setOpenPlanId] = useState<string | null>(null)
  const [dialogTab, setDialogTab] = useState<'suggest' | 'search'>('suggest')
  const [bulk, setBulk] = useState<{ plan: DailyPlan; ids: string[] } | null>(null)

  const { data } = useQuery({
    queryKey: ['task-auto', 'daily-plans', 'me', dateFrom, dateTo],
    queryFn: () => getMyDailyPlans({ from: dateFrom, to: dateTo }),
    enabled,
    refetchOnWindowFocus: true,
  })

  const mutation = useMutation({
    mutationFn: (ids: string[]) => quickCreateFromDailyPlan(ids),
    onMutate: ids => setPendingIds(prev => new Set([...prev, ...ids])),
    onSuccess: res => {
      if (res.created.length) toast.success(`Đã tạo ${res.created.length} nhiệm vụ`)
      if (res.failed.length) toast.error([...new Set(res.failed.map(f => f.message))].join(' · '))
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Tạo nhiệm vụ thất bại'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    },
    onSettled: (_res, _err, ids) => {
      setPendingIds(prev => {
        const next = new Set(prev)
        ids.forEach(id => next.delete(id))
        return next
      })
      setBulk(null)
      qc.invalidateQueries({ queryKey: ['task-auto', 'daily-plans'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
    },
  })

  // Cảnh báo kho trống là của riêng hôm nay — xem ngày khác thì không hiện
  const today = vnDate()
  const notice = warehouseNotice && (!dateFrom || dateFrom <= today) && (!dateTo || today <= dateTo)
    ? warehouseNotice
    : null

  if (!enabled || (!data?.totals.length && !notice)) return null

  const totals = data?.totals ?? []
  const plans = data?.plans ?? []
  const hasPlans = totals.length > 0
  const singleDay = hasPlans ? data!.plan_date : today
  const totalTarget = totals.reduce((s, t) => s + t.target, 0)
  const totalDone = totals.reduce((s, t) => s + Math.min(t.done, t.target), 0)
  const showTeam = new Set(totals.map(t => t.team.id)).size > 1
  // "Tất cả ngày" / khoảng hở 1 đầu: hiện theo ngày có kế hoạch đầu/cuối
  const firstDate = data?.from ?? data?.plan_dates[0] ?? today
  const lastDate = data?.to ?? data?.plan_dates.at(-1) ?? today
  // Luôn đọc từ data mới nhất để hộp thoại cập nhật ngay sau khi tạo task
  const openPlan = plans.find(p => p.id === openPlanId) ?? null

  function openBulk(plan: DailyPlan) {
    const ids = plan.suggestions.filter(s => !s.used).slice(0, plan.remaining).map(s => s.id)
    if (ids.length) setBulk({ plan, ids })
  }

  // Đóng hộp thoại trước khi mở panel task / modal tạo task phía sau, tránh 2 lớp phủ chồng nhau
  function openTaskFromDialog(taskId: string) {
    setOpenPlanId(null)
    onOpenTask(taskId)
  }
  function createManualFromDialog(plan: DailyPlan) {
    setOpenPlanId(null)
    onCreateManual(plan)
  }

  const bulkCounts = bulk && {
    contents: bulk.plan.suggestions.filter(s => bulk.ids.includes(s.id) && s.kind === 'CONTENT').length,
    videos: bulk.plan.suggestions.filter(s => bulk.ids.includes(s.id) && s.kind === 'WIN_VIDEO').length,
  }

  return (
    <section aria-labelledby="daily-plan-title" className="bg-white border border-gray-100 rounded-2xl shadow-sm">
      {/* Luôn mở — kế hoạch ngày phải thấy ngay khi vào trang, không thu gọn được */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-4 h-4 text-indigo-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="daily-plan-title" className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
              {singleDay ? (singleDay === today ? 'Kế hoạch hôm nay' : 'Kế hoạch ngày') : 'Kế hoạch'}
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold tabular-nums">
                {singleDay ? shortDate(singleDay) : `${shortDate(firstDate)} – ${shortDate(lastDate)}`}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {hasPlans ? (
                <>
                  <span className="font-semibold text-slate-700 tabular-nums">{totalDone}/{totalTarget}</span> video theo KPI tuyến
                  {singleDay
                    ? ' · task tự tạo có hạn trong ngày cũng được tính'
                    : ` · cộng dồn ${data!.plan_dates.length} ngày có kế hoạch · chọn 1 ngày để xem content đề xuất`}
                </>
              ) : (
                'Chưa có kế hoạch tuyến nào trong ngày'
              )}
            </p>
          </div>
        </div>

        {notice && (
          <WarehouseNoticeAlert
            notice={notice}
            onCreate={() => onCreateManual()}
            onDismiss={() => onDismissWarehouseNotice?.()}
          />
        )}
      </div>

      {hasPlans && (
      <div id="daily-plan-body" className="px-5 pb-4 grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {singleDay
          ? plans.map(plan => (
              <LineTile
                key={plan.id}
                line={plan.content_line.name}
                team={showTeam ? plan.team.name : null}
                done={plan.done}
                target={plan.target}
                remaining={plan.remaining}
                onOpen={() => { setDialogTab('suggest'); setOpenPlanId(plan.id) }}
                aside={<SuggestionCount unused={plan.suggestions.filter(s => !s.used).length} />}
              />
            ))
          : totals.map(t => (
              <LineTile
                key={`${t.team.id}|${t.content_line.id}`}
                line={t.content_line.name}
                team={showTeam ? t.team.name : null}
                done={t.done}
                target={t.target}
                remaining={t.remaining}
                aside={<span className="shrink-0 pl-1 text-xs text-slate-500 tabular-nums">{t.days} ngày</span>}
              />
            ))}
      </div>
      )}

      {openPlan && (
        <DarkModal
          open
          size="xl"
          onClose={() => setOpenPlanId(null)}
          title={`Content đề xuất · ${openPlan.content_line.name}`}
          subtitle={`${Math.min(openPlan.done, openPlan.target)}/${openPlan.target} video · ${openPlan.remaining > 0 ? `còn ${openPlan.remaining}` : 'đã đủ'} · hạn ${formatDateTime(openPlan.deadline)}${showTeam ? ` · ${openPlan.team.name}` : ''}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => createManualFromDialog(openPlan)}
                className="h-10 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Tự tạo nhiệm vụ khác
              </button>
              {dialogTab === 'suggest' && (
                <BulkButton plan={openPlan} pendingIds={pendingIds} onClick={() => openBulk(openPlan)} />
              )}
            </>
          }
        >
          <div className="space-y-5">
            <div role="tablist" aria-label="Nguồn content" className="flex gap-1 border-b border-gray-100">
              <DialogTab id="suggest" active={dialogTab === 'suggest'} onClick={() => setDialogTab('suggest')}>
                Đề xuất cho bạn
                <span className="font-normal tabular-nums opacity-70">({openPlan.suggestions.filter(s => !s.used).length})</span>
              </DialogTab>
              <DialogTab id="search" active={dialogTab === 'search'} onClick={() => setDialogTab('search')}>
                <Search className="w-3.5 h-3.5" aria-hidden="true" />
                Tìm trong hệ thống
              </DialogTab>
            </div>
            <div role="tabpanel" id="daily-plan-tab-suggest" aria-labelledby="daily-plan-tabbtn-suggest" hidden={dialogTab !== 'suggest'}>
              <PlanSuggestions
                plan={openPlan}
                pendingIds={pendingIds}
                onCreate={ids => mutation.mutate(ids)}
                onOpenTask={openTaskFromDialog}
                onCreateManual={() => createManualFromDialog(openPlan)}
              />
            </div>
            {/* Giữ nguyên khi đổi tab để không mất từ khoá / kết quả đang xem */}
            <div role="tabpanel" id="daily-plan-tab-search" aria-labelledby="daily-plan-tabbtn-search" hidden={dialogTab !== 'search'}>
              <DailyPlanSearch key={openPlan.id} plan={openPlan} onOpenTask={openTaskFromDialog} />
            </div>
          </div>
        </DarkModal>
      )}

      <ConfirmDialog
        open={!!bulk}
        title={`Tạo ${bulk?.ids.length ?? 0} nhiệm vụ ${bulk?.plan.content_line.name ?? ''}`}
        message={bulkCounts
          ? `Tạo nhiệm vụ từ ${bulkCounts.contents} content trong kho${bulkCounts.videos ? ` và ${bulkCounts.videos} video win (lưu thành content kho cá nhân, bỏ hashtag)` : ''} đứng đầu danh sách gợi ý. Hạn chót theo kế hoạch ngày.`
          : ''}
        confirmLabel="Tạo nhiệm vụ"
        isLoading={mutation.isPending}
        onConfirm={() => bulk && mutation.mutate(bulk.ids)}
        onCancel={() => setBulk(null)}
      />
    </section>
  )
}

function DialogTab({ id, active, onClick, children }: { id: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      id={`daily-plan-tabbtn-${id}`}
      aria-selected={active}
      aria-controls={`daily-plan-tab-${id}`}
      onClick={onClick}
      className={cn(
        '-mb-px inline-flex items-center gap-1.5 px-3 py-2 border-b-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-md',
        active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Ô gọn của 1 tuyến (1 hàng): mã tuyến · đã làm/chỉ tiêu + thanh tiến độ · `aside`. Có `onOpen` (xem
 * 1 ngày) thì cả ô là nút mở hộp thoại content đề xuất — chữ trong ô cũng là tên truy cập của nút nên
 * thanh tiến độ chỉ để nhìn; khoảng nhiều ngày thì chỉ là ô số liệu.
 */
function LineTile({
  line, team, done: rawDone, target, remaining, aside, onOpen,
}: {
  line: string
  team: string | null
  done: number
  target: number
  remaining: number
  aside: ReactNode
  onOpen?: () => void
}) {
  const done = Math.min(rawDone, target)
  const pct = target > 0 ? Math.round((done / target) * 100) : 0
  const finished = remaining === 0
  const className = cn(
    'group w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left',
    finished ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100 bg-slate-50/60',
    onOpen && 'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
    onOpen && (finished ? 'hover:bg-emerald-50' : 'hover:border-indigo-200 hover:bg-indigo-50/50'),
  )

  const body = (
    <>
      <span
        className={cn(
          'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold text-white',
          finished ? 'bg-emerald-600' : 'bg-indigo-600',
        )}
      >
        {line}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-base font-bold text-slate-900 tabular-nums leading-none">
            {done}<span className="text-xs font-semibold text-slate-400">/{target}</span>
          </span>
          <span className="text-xs text-slate-500">video</span>
          {finished ? (
            <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Đã đủ
            </span>
          ) : (
            <span className="ml-auto text-xs font-semibold text-slate-600 shrink-0">
              Còn <span className="tabular-nums">{remaining}</span>
            </span>
          )}
        </span>
        {team && <span className="block text-[11px] text-slate-500 truncate mt-0.5">{team}</span>}
        <span aria-hidden="true" className="mt-1.5 block h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <span
            className={cn('block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', finished ? 'bg-emerald-500' : 'bg-indigo-500')}
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>

      {aside}
    </>
  )

  return onOpen ? (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" className={className}>{body}</button>
  ) : (
    <div className={className}>{body}</div>
  )
}

/** Phần phải của ô 1 ngày: số gợi ý chưa dùng + mũi tên — báo cả ô bấm được. */
function SuggestionCount({ unused }: { unused: number }) {
  return (
    <span className="shrink-0 flex items-center gap-1 pl-1 text-xs font-semibold text-indigo-700">
      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="tabular-nums">{unused}</span>
      <span className="hidden sm:inline font-normal text-indigo-600">đề xuất</span>
      <span className="sr-only sm:hidden">content đề xuất</span>
      <ChevronRight className="w-4 h-4 text-indigo-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
    </span>
  )
}

function BulkButton({ plan, pendingIds, onClick }: { plan: DailyPlan; pendingIds: Set<string>; onClick: () => void }) {
  const unused = plan.suggestions.filter(s => !s.used).length
  const count = Math.min(plan.remaining, unused)
  if (count <= 0) return null
  const pending = plan.suggestions.some(s => pendingIds.has(s.id))
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
      Tạo {count} task còn thiếu
    </button>
  )
}

/** Nội dung hộp thoại: gợi ý content trong kho + video win, mỗi dòng 1 nút tạo task nhanh. */
function PlanSuggestions({
  plan, pendingIds, onCreate, onOpenTask, onCreateManual,
}: {
  plan: DailyPlan
  pendingIds: Set<string>
  onCreate: (ids: string[]) => void
  onOpenTask: (taskId: string) => void
  onCreateManual: () => void
}) {
  const line = plan.content_line.name
  const contents = plan.suggestions.filter(s => s.kind === 'CONTENT')
  const videos = plan.suggestions.filter(s => s.kind === 'WIN_VIDEO')

  if (!plan.suggestions.length) {
    return plan.remaining > 0 ? (
      <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-slate-500">
        Chưa có content {line} phù hợp để gợi ý (content bạn đã làm trong 14 ngày không được gợi ý lại).{' '}
        <button
          type="button"
          onClick={onCreateManual}
          className="text-indigo-600 font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
        >
          Tự tạo nhiệm vụ
        </button>
      </div>
    ) : (
      <p className="flex items-center justify-center gap-2 py-6 text-sm text-emerald-700">
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        Đã đủ chỉ tiêu {line} của ngày.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {contents.length > 0 && (
        <SuggestionGroup title="Content trong kho" count={contents.length}>
          {contents.map(s => (
            <ContentRow key={s.id} s={s} pending={pendingIds.has(s.id)} onCreate={onCreate} onOpenTask={onOpenTask} />
          ))}
        </SuggestionGroup>
      )}
      {videos.length > 0 && (
        <SuggestionGroup title="Video nổi bật chưa có nội dung" count={videos.length}>
          {videos.map(s => (
            <VideoRow key={s.id} s={s} pending={pendingIds.has(s.id)} onCreate={onCreate} onOpenTask={onOpenTask} />
          ))}
        </SuggestionGroup>
      )}
    </div>
  )
}

function SuggestionGroup({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {title} <span className="font-normal normal-case tabular-nums">({count})</span>
      </h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

function ContentRow({ s, pending, onCreate, onOpenTask }: RowProps) {
  const c = s.content
  return (
    <li className="flex items-start gap-3 rounded-lg bg-white border border-gray-100 px-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-indigo-500" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800 line-clamp-2">{c?.title || 'Content chưa có tiêu đề'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
          {c && <span>{SOURCE_LABEL[c.source]}</span>}
          {c?.code && <span className="font-mono">· {c.code}</span>}
          {c?.is_win && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
              <Trophy className="w-3 h-3" aria-hidden="true" />
              Win{c.win_views ? ` · ${formatViews(c.win_views)} view` : ''}
            </span>
          )}
        </div>
      </div>
      <RowAction s={s} pending={pending} onCreate={onCreate} onOpenTask={onOpenTask} label={c?.title ?? 'content'} />
    </li>
  )
}

function VideoRow({ s, pending, onCreate, onOpenTask }: RowProps) {
  const v = s.video
  const [thumbOk, setThumbOk] = useState(true)
  const caption = stripHashtags(v?.caption ?? null)
  return (
    <li className="flex items-start gap-3 rounded-lg bg-white border border-gray-100 px-3 py-2.5">
      <a
        href={v?.url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-12 h-[4.5rem] shrink-0 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {v?.thumbnail_url && thumbOk ? (
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
          <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
            <Eye className="w-3 h-3" aria-hidden="true" />
            {formatViews(v?.views)} view
          </span>
          {v?.page_name && <span className="truncate max-w-[12rem]">· {v.page_name}</span>}
        </div>
      </div>
      <RowAction s={s} pending={pending} onCreate={onCreate} onOpenTask={onOpenTask} label={caption || 'video win'} />
    </li>
  )
}

type RowProps = {
  s: DailyPlanSuggestion
  pending: boolean
  onCreate: (ids: string[]) => void
  onOpenTask: (taskId: string) => void
}

function RowAction({ s, pending, onCreate, onOpenTask, label }: RowProps & { label: string }) {
  if (s.task) {
    return (
      <button
        type="button"
        onClick={() => onOpenTask(s.task!.id)}
        aria-label={`Mở task đã tạo từ gợi ý: ${label}`}
        className="shrink-0 inline-flex items-center gap-1.5 h-8 px-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <TaskStatusBadge status={s.task.status} />
      </button>
    )
  }
  const busy = pending || s.used
  return (
    <button
      type="button"
      onClick={() => onCreate([s.id])}
      disabled={busy}
      aria-busy={busy}
      aria-label={`Tạo nhiệm vụ từ gợi ý: ${label}`}
      title={s.kind === 'WIN_VIDEO' ? 'Lưu caption (bỏ hashtag) thành content kho cá nhân rồi tạo nhiệm vụ' : undefined}
      className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
      Tạo nhiệm vụ
    </button>
  )
}
