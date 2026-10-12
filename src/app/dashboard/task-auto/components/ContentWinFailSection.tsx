'use client'

import { useId, useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Trophy, TrendingDown, Percent, Video, ExternalLink, ChevronRight, RefreshCw, Crown, Medal, Award, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getContentWinFailStats, getTopContentWinFailStats, refreshContentWinFailStats, refreshTopContentWinFailStats } from '@/lib/api/task-auto'
import type { ContentWinFailClassificationRow, ContentWinFailPersonRow } from '@/types/task-auto'
import { CLASSIFICATION_PALETTE, UNCLASSIFIED_COLOR } from '@/components/dashboard/a5/shared/classification-colors'
import { DashboardCard } from './DashboardUI'
import { TONE } from './tokens'
import { DarkModal, UNCLASSIFIED_FILTER } from '@/components/task-auto'

interface Props {
  from: string
  to: string
  /** Team đang xem — cố định theo scope (leader/content-team-leader), hoặc do admin chọn ở ScopeFilter chung trang. */
  teamId?: string
  /** Set khi scope chỉ có đúng 1 người (personal/content creator/admin đã chọn 1 thành viên cụ thể). */
  fixedUserId?: string
  /** true khi đang ở scope global (admin/manager) — chưa chọn team/thành viên thì hiện Top 5 toàn
   * hệ thống thay vì bắt buộc chọn team trước mới xem được. */
  showGlobalTop?: boolean
}

const WIN_FAIL_TONE = { win: 'success', fail: 'danger', pending: 'neutral' } as const
const WIN_FAIL_LABEL = { win: 'Win', fail: 'Fail', pending: 'Chưa xác định' } as const

// Bảng màu avatar xoay vòng theo user_id — chỉ để tạo điểm nhấn thị giác phân biệt từng người,
// không mang ý nghĩa trạng thái nên không dùng TONE.success/danger (đã dành riêng cho win/fail).
const AVATAR_TONES = ['brand', 'violet', 'info', 'warning'] as const
function avatarTone(userId: string) {
  const sum = [...userId].reduce((s, c) => s + c.charCodeAt(0), 0)
  return TONE[AVATAR_TONES[sum % AVATAR_TONES.length]]
}

/** id = classification_id hoặc UNCLASSIFIED_FILTER; giữ kèm tên để vẫn vẽ được ô đang chọn khi kỳ mới không còn phân loại đó. */
type ClassificationFilter = { id: string; name: string }

const filterIdOf = (r: ContentWinFailClassificationRow) => r.classification_id ?? UNCLASSIFIED_FILTER

/** Màu theo THỨ TỰ trong by_classification (BE đã sắp ổn định), như biểu đồ Content theo phân loại — "Chưa phân loại" luôn xám. */
function classificationColors(rows: ContentWinFailClassificationRow[]) {
  const colors = new Map<string, string>()
  let i = 0
  for (const r of rows) {
    colors.set(filterIdOf(r), r.classification_id ? CLASSIFICATION_PALETTE[i++ % CLASSIFICATION_PALETTE.length] : UNCLASSIFIED_COLOR)
  }
  return colors
}

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[parts.length - 1]?.[0] ?? '?').toUpperCase()
}

/** % win trên số content đã có kết quả (win + fail); null khi chưa có kết quả nào. */
function winRate(win: number, fail: number) {
  return win + fail > 0 ? Math.round((win / (win + fail)) * 100) : null
}

/**
 * Thanh xếp chồng win (xanh) | fail (đỏ). Không truyền `scale` → 100% = win + fail của chính nó
 * (tỷ lệ). Truyền `scale` (vd số content nhiều nhất trong bảng) → độ dài thanh thể hiện cả khối lượng.
 */
function WinFailBar({ win, fail, scale, className }: { win: number; fail: number; scale?: number; className?: string }) {
  const max = scale ?? win + fail
  const pct = (n: number) => (max > 0 ? `${(n / max) * 100}%` : '0%')
  return (
    <div className={cn('flex h-1.5 gap-px overflow-hidden rounded-full bg-slate-100', className)} aria-hidden>
      {win > 0 && <div className="h-full bg-emerald-500 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: pct(win) }} />}
      {fail > 0 && <div className="h-full bg-red-400 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: pct(fail) }} />}
    </div>
  )
}

function SummaryStat({ label, icon: Icon, tone, value, children }: {
  label: string; icon: React.ElementType; tone: 'success' | 'danger' | 'brand'; value: string; children?: React.ReactNode
}) {
  const t = TONE[tone]
  return (
    <div className="min-w-0 px-3 sm:px-5 first:pl-0 last:pr-0">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md', t.bg, t.text)}>
          <Icon className="h-3 w-3" aria-hidden />
        </span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className={cn('mt-2 text-2xl font-bold leading-none tracking-tight tabular-nums', tone === 'brand' ? 'text-slate-900' : t.text)}>
        {value}
      </dd>
      {children}
    </div>
  )
}

/** Dải tổng Win · Fail · Tỷ lệ win — dùng chung cho card và cửa sổ chi tiết 1 người. */
function WinFailSummary({ win, fail, winLabel = 'Win', className }: { win: number; fail: number; winLabel?: string; className?: string }) {
  const rate = winRate(win, fail)
  return (
    <dl className={cn('grid grid-cols-3 divide-x divide-slate-100', className)}>
      <SummaryStat label={winLabel} icon={Trophy} tone="success" value={win.toLocaleString('vi-VN')} />
      <SummaryStat label="Fail" icon={TrendingDown} tone="danger" value={fail.toLocaleString('vi-VN')} />
      <SummaryStat label="Tỷ lệ win" icon={Percent} tone="brand" value={rate == null ? '—' : `${rate}%`}>
        <WinFailBar win={win} fail={fail} className="mt-2.5" />
      </SummaryStat>
    </dl>
  )
}

// Huy hiệu thứ hạng — top 3 có màu riêng (vàng/bạc/đồng) + icon, còn lại số thứ tự trơn. Nhỏ hơn avatar
// đứng cạnh để 2 hình tròn không tranh nhau.
const RANK_MEDAL = [
  { icon: Crown, cls: 'from-amber-300 to-amber-500 shadow-sm shadow-amber-300/60', fill: true },
  { icon: Medal, cls: 'from-slate-300 to-slate-400', fill: false },
  { icon: Award, cls: 'from-orange-300 to-orange-500', fill: false },
] as const

function RankBadge({ rank }: { rank: number }) {
  const medal = RANK_MEDAL[rank]
  if (!medal) {
    return <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums text-slate-400">{rank + 1}</span>
  }
  const Icon = medal.icon
  return (
    <span className={cn('w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0', medal.cls)}>
      <Icon className="w-3.5 h-3.5 text-white" fill={medal.fill ? 'currentColor' : 'none'} aria-hidden />
      <span className="sr-only">Hạng {rank + 1}</span>
    </span>
  )
}

function CountChip({ kind, value }: { kind: 'win' | 'fail'; value: number }) {
  const t = TONE[WIN_FAIL_TONE[kind]]
  const Icon = kind === 'win' ? Trophy : TrendingDown
  return (
    <span className={cn('inline-flex sm:min-w-[3.25rem] items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-bold tabular-nums', t.bg, t.text)}>
      <Icon className="w-3 h-3" aria-hidden />
      {value}
      <span className="sr-only"> {WIN_FAIL_LABEL[kind]}</span>
    </span>
  )
}

function MemberRow({ row, rank, maxDecided, filtered, onClick }: { row: ContentWinFailPersonRow; rank: number; maxDecided: number; filtered: boolean; onClick: () => void }) {
  const rate = winRate(row.win, row.fail)
  const avatar = avatarTone(row.user_id)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
    >
      <RankBadge rank={rank} />

      {/* Màn hẹp bỏ avatar + mũi tên để tên và thanh win/fail còn đủ chỗ đọc. */}
      <div className={cn('hidden sm:flex w-9 h-9 rounded-full items-center justify-center shrink-0 text-sm font-black', avatar.bg, avatar.text)} aria-hidden>
        {initials(row.user?.full_name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate">{row.user?.full_name ?? row.user_id}</p>
        {rate != null ? (
          <div className="mt-1.5 flex items-center gap-2">
            <WinFailBar win={row.win} fail={row.fail} scale={maxDecided} className="flex-1 max-w-[200px]" />
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">{rate}% win</span>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered ? 'Không có content thuộc phân loại này' : 'Chưa có content win/fail'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <CountChip kind="win" value={row.win} />
        <CountChip kind="fail" value={row.fail} />
      </div>

      <ChevronRight className="hidden sm:block w-4 h-4 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden />
    </button>
  )
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
      <div className="w-7 h-7 rounded-full bg-slate-100 shrink-0" />
      <div className="hidden sm:block w-9 h-9 rounded-full bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-100 rounded-full w-1/3" />
        <div className="h-1.5 bg-slate-50 rounded-full w-1/4" />
      </div>
      <div className="h-6 w-14 bg-slate-100 rounded-lg" />
      <div className="h-6 w-14 bg-slate-100 rounded-lg" />
    </div>
  )
}

function ClassificationChip({ pressed, onClick, color, label, win, title }: {
  pressed: boolean; onClick: () => void; color?: string; label: string; win?: number; title?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1',
        pressed
          ? 'bg-indigo-600 border-indigo-600 text-white'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300',
      )}
    >
      {color && (
        <span className={cn('w-2 h-2 rounded-full shrink-0', pressed && 'ring-2 ring-white/70')} style={{ backgroundColor: color }} aria-hidden />
      )}
      {label}
      {win !== undefined && (
        <span className={cn('inline-flex items-center gap-0.5 tabular-nums', pressed ? 'text-white' : 'text-emerald-600')}>
          <Trophy className="w-3 h-3" aria-hidden />
          {win}
          <span className="sr-only"> content win</span>
        </span>
      )}
    </button>
  )
}

/** Hàng ô lọc phân loại nội dung — mỗi ô kèm số content win của phân loại đó trong scope + kỳ đang xem. */
function ClassificationFilterBar({ rows, colors, selected, onSelect }: {
  rows: ContentWinFailClassificationRow[]
  colors: Map<string, string>
  selected: ClassificationFilter | null
  onSelect: (f: ClassificationFilter | null) => void
}) {
  const labelId = useId()
  // Ô đang chọn không còn trong kỳ/scope mới → vẫn hiện (số 0) để thấy mình đang lọc gì và bỏ chọn được.
  const items = selected && !rows.some(r => filterIdOf(r) === selected.id)
    ? [...rows, {
        classification_id: selected.id === UNCLASSIFIED_FILTER ? null : selected.id,
        classification: selected.name, win: 0, fail: 0, pending: 0,
      }]
    : rows
  if (items.length === 0) return null

  return (
    <div className="px-5 py-3 border-b border-slate-100">
      <p id={labelId} className="text-xs font-semibold text-slate-500 mb-2">Lọc theo phân loại nội dung</p>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
        <ClassificationChip pressed={!selected} onClick={() => onSelect(null)} label="Tất cả" />
        {items.map(r => {
          const id = filterIdOf(r)
          const isSelected = selected?.id === id
          return (
            <ClassificationChip
              key={id}
              pressed={isSelected}
              onClick={() => onSelect(isSelected ? null : { id, name: r.classification })}
              color={colors.get(id) ?? UNCLASSIFIED_COLOR}
              label={r.classification}
              win={r.win}
              title={`${r.classification}: ${r.win} win · ${r.fail} fail`}
            />
          )
        })}
      </div>
    </div>
  )
}

function ClassificationTag({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
      {name}
    </span>
  )
}

function MemberContentModal({ row, colors, filter, onClose }: {
  row: ContentWinFailPersonRow
  colors: Map<string, string>
  filter: ClassificationFilter | null
  onClose: () => void
}) {
  // Chỉ liệt kê content đã có kết quả win/fail (content chưa cào được số liệu không hiển thị) —
  // win lên trước, trong mỗi nhóm view cao xếp trên.
  const videos = row.videos
    .filter(v => v.win_status_auto !== 'pending')
    .sort((a, b) => Number(b.win_status_auto === 'win') - Number(a.win_status_auto === 'win') || b.views_auto - a.views_auto)
  return (
    <DarkModal
      open
      onClose={onClose}
      title={`Content của ${row.user?.full_name ?? row.user_id}`}
      subtitle={`${videos.length} content win/fail trong kỳ đã chọn${filter ? ` · phân loại "${filter.name}"` : ''}`}
      size="lg"
    >
      <WinFailSummary win={row.win} fail={row.fail} className="mb-5 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5" />

      {videos.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          <Video className="w-8 h-8 mx-auto mb-2 text-slate-300" aria-hidden />
          {filter ? `Không có content win/fail thuộc phân loại "${filter.name}" trong kỳ này` : 'Chưa có content win/fail nào trong kỳ này'}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 -mx-1">
          {videos.map(v => {
            const t = TONE[WIN_FAIL_TONE[v.win_status_auto]]
            const StatusIcon = v.win_status_auto === 'win' ? Trophy : TrendingDown
            return (
              <div key={v.task_id} className="flex items-center gap-3 px-1 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate" title={v.content_title ?? undefined}>
                      {v.content_title || v.content_code || 'Content'}
                    </p>
                    <ClassificationTag
                      name={v.classification?.name ?? 'Chưa phân loại'}
                      color={colors.get(v.classification?.id ?? UNCLASSIFIED_FILTER) ?? UNCLASSIFIED_COLOR}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {(v.published_links ?? []).length === 0 && (
                      <span className="text-xs text-slate-300">Chưa có link</span>
                    )}
                    {(v.published_links ?? []).map(l => (
                      <a
                        key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:underline whitespace-nowrap"
                      >
                        {l.platform}{l.stats ? ` · ${l.stats.views.toLocaleString('vi-VN')} views` : ''} <ExternalLink className="w-3 h-3" aria-hidden />
                      </a>
                    ))}
                  </div>
                </div>
                <span className={cn('shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border tabular-nums', t.bg, t.text, t.border)}>
                  <StatusIcon className="w-3 h-3" aria-hidden />
                  {WIN_FAIL_LABEL[v.win_status_auto]} · {v.views_auto.toLocaleString('vi-VN')} views
                </span>
              </div>
            )
          })}
        </div>
      )}
    </DarkModal>
  )
}

/**
 * Chỉ số MỚI, tự tính win/fail (có ít nhất 1 link bài đăng bất kỳ — Facebook/YouTube/Instagram —
 * đạt > 10.000 view = win; có số liệu nhưng không link nào vượt ngưỡng = fail; chưa cào được số
 * liệu = "chưa xác định", BE vẫn đếm nhưng màn này không hiển thị) — MỘT cơ chế duy nhất áp dụng cho mọi thành viên trong team (không phân
 * biệt content creator/editor): "content được gắn task trong kỳ".
 * ADMIN/MANAGER chưa chọn team/thành viên → hiện Top 5 toàn hệ thống thay vì bắt buộc chọn team.
 * Bấm vào 1 thành viên để xem chi tiết danh sách content + view tương ứng (đọc số đã có sẵn, KHÔNG
 * tự động cào lại — số liệu mặc định được làm mới mỗi ngày qua cron 8:15 sáng). Muốn số mới ngay
 * lập tức thì bấm nút "Cập nhật" ở góc phải tiêu đề. Tách biệt hoàn toàn EditorKpi.video_win/fail
 * (nhập tay) và module content-report cũ.
 */
export function ContentWinFailSection({ from, to, teamId, fixedUserId, showGlobalTop }: Props) {
  const [openMemberId, setOpenMemberId] = useState<string | null>(null)
  const [classification, setClassification] = useState<ClassificationFilter | null>(null)
  const queryClient = useQueryClient()

  const isGlobalTop = !teamId && !fixedUserId && !!showGlobalTop
  const hasScope = !!(teamId || fixedUserId || isGlobalTop)
  const classificationId = classification?.id
  const queryKey = ['task-auto', 'content-win-fail', teamId, fixedUserId, isGlobalTop, from, to, classificationId]

  // keepPreviousData: bấm ô phân loại thì giữ hàng ô lọc + số cũ (làm mờ) tới khi có số mới, không nháy skeleton.
  const { data: stats, isLoading, isPlaceholderData } = useQuery({
    queryKey,
    queryFn: () => isGlobalTop
      ? getTopContentWinFailStats({ from, to, limit: 5, classification_id: classificationId })
      : getContentWinFailStats({ team_id: fixedUserId ? undefined : teamId, user_id: fixedUserId, from, to, classification_id: classificationId }),
    enabled: hasScope,
    placeholderData: keepPreviousData,
  })

  // Nút "Cập nhật" — CHỦ ĐỘNG cào lại traffic cho đúng những gì đang hiển thị (không tự động khi
  // bấm xem 1 thành viên nữa: từng gây dội hàng loạt request Facebook/YouTube khi duyệt qua nhiều
  // người trong bảng xếp hạng, làm chậm cả hệ thống).
  const refreshMutation = useMutation({
    mutationFn: () => isGlobalTop
      ? refreshTopContentWinFailStats({ from, to, limit: 5, classification_id: classificationId })
      : refreshContentWinFailStats({ team_id: fixedUserId ? undefined : teamId, user_id: fixedUserId, from, to, classification_id: classificationId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const members = [...(stats?.by_member ?? [])].sort(
    (a, b) => b.win - a.win || a.fail - b.fail || b.pending - a.pending,
  )
  const maxDecided = Math.max(1, ...members.map(m => m.win + m.fail))
  const openRow = members.find(m => m.user_id === openMemberId)
  const byClassification = stats?.by_classification ?? []
  const colors = classificationColors(byClassification)

  return (
    <DashboardCard
      icon={Video} iconColor="text-indigo-600" iconBg="bg-indigo-50"
      title={isGlobalTop ? 'Top 5 thành viên nhiều content win nhất' : 'Win/Fail theo thành viên'}
      subtitle="Win = có ít nhất 1 link bài đăng >10.000 view. Số liệu cập nhật mỗi sáng — bấm 1 người để xem chi tiết."
      right={hasScope && (
        <button
          type="button"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshMutation.isPending && 'animate-spin')} aria-hidden />
          {refreshMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
      )}
    >
      {!hasScope ? (
        <div className="text-center py-10 text-slate-500 text-sm px-5">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" aria-hidden />
          Chọn team hoặc thành viên để xem thống kê win/fail.
        </div>
      ) : isLoading ? (
        <>
          <div className="px-5 py-4 grid grid-cols-3 gap-4 border-b border-slate-100 animate-pulse">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-2.5">
                <div className="h-4 w-16 rounded-md bg-slate-100" />
                <div className="h-6 w-12 rounded-md bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="divide-y divide-slate-50">
            {[0, 1, 2].map(i => <RowSkeleton key={i} />)}
          </div>
        </>
      ) : (
        <>
          <ClassificationFilterBar rows={byClassification} colors={colors} selected={classification} onSelect={setClassification} />
          <div aria-busy={isPlaceholderData} className={cn('transition-opacity duration-200', isPlaceholderData && 'opacity-60')}>
            <WinFailSummary
              win={stats?.totals.win ?? 0}
              fail={stats?.totals.fail ?? 0}
              winLabel={isGlobalTop ? 'Win (toàn hệ thống)' : 'Win'}
              className="px-5 py-4 border-b border-slate-100"
            />
            {members.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm px-5">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-slate-300" aria-hidden />
                {classification
                  ? `Không có content thuộc phân loại "${classification.name}" trong kỳ này.`
                  : isGlobalTop ? 'Chưa có ai có content win trong kỳ này.' : 'Chưa có thành viên nào.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((row, i) => (
                  <MemberRow key={row.user_id} row={row} rank={i} maxDecided={maxDecided} filtered={!!classification} onClick={() => setOpenMemberId(row.user_id)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {openRow && (
        <MemberContentModal row={openRow} colors={colors} filter={classification} onClose={() => setOpenMemberId(null)} />
      )}
    </DashboardCard>
  )
}
