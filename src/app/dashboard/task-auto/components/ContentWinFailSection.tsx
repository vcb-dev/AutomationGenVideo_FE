'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trophy, TrendingDown, HelpCircle, Video, ExternalLink, ChevronRight, RefreshCw, Crown, Medal, Award, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getContentWinFailStats, getTopContentWinFailStats, refreshContentWinFailStats, refreshTopContentWinFailStats } from '@/lib/api/task-auto'
import type { ContentWinFailPersonRow } from '@/types/task-auto'
import { DashboardCard } from './DashboardUI'
import { TONE } from './tokens'
import { DarkModal } from '@/components/task-auto'

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

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[parts.length - 1]?.[0] ?? '?').toUpperCase()
}

function SummaryPill({ label, value, kind, icon: Icon }: { label: string; value: number; kind: keyof typeof WIN_FAIL_TONE; icon: React.ElementType }) {
  const t = TONE[WIN_FAIL_TONE[kind]]
  return (
    <div className={cn('flex-1 min-w-[130px] rounded-2xl border px-4 py-3.5 flex items-center gap-3', t.bg, t.border)}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/70', t.text)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className={cn('text-2xl font-black tabular-nums leading-none', t.text)}>{value.toLocaleString('vi-VN')}</p>
        <p className="text-xs font-semibold text-slate-500 mt-1 truncate">{label}</p>
      </div>
    </div>
  )
}

// Huy hiệu thứ hạng — top 3 có màu riêng (vàng/bạc/đồng) + icon, còn lại số thứ tự trơn.
function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shrink-0 shadow-sm shadow-amber-300/60">
      <Crown className="w-4 h-4 text-white" fill="currentColor" />
    </div>
  )
  if (rank === 1) return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shrink-0">
      <Medal className="w-4 h-4 text-white" />
    </div>
  )
  if (rank === 2) return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center shrink-0">
      <Award className="w-4 h-4 text-white" />
    </div>
  )
  return (
    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
      <span className="text-xs font-black text-slate-400">{rank + 1}</span>
    </div>
  )
}

function MemberRow({ row, rank, maxWin, onClick }: { row: ContentWinFailPersonRow; rank: number; maxWin: number; onClick: () => void }) {
  const total = row.win + row.fail + row.pending
  const barPct = maxWin > 0 ? Math.max(4, Math.round((row.win / maxWin) * 100)) : 0
  const avatar = avatarTone(row.user_id)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors text-left group"
    >
      <RankBadge rank={rank} />

      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black', avatar.bg, avatar.text)}>
        {initials(row.user?.full_name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800 truncate">{row.user?.full_name ?? row.user_id}</p>
        {row.win > 0 ? (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 max-w-[160px]">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${barPct}%` }} />
          </div>
        ) : (
          <p className="text-xs text-slate-300 mt-0.5">{total === 0 ? 'Chưa có hoạt động' : 'Chưa có content win'}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="flex items-center gap-1 text-xs font-black text-emerald-600 tabular-nums bg-emerald-50 rounded-lg px-2 py-1">
          <Trophy className="w-3 h-3" /> {row.win}
        </span>
        <span className="flex items-center gap-1 text-xs font-bold text-red-500 tabular-nums bg-red-50 rounded-lg px-2 py-1">
          <TrendingDown className="w-3 h-3" /> {row.fail}
        </span>
        <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-400 tabular-nums bg-slate-50 rounded-lg px-2 py-1">
          <HelpCircle className="w-3 h-3" /> {row.pending}
        </span>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  )
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
      <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-100 rounded-full w-1/3" />
        <div className="h-1.5 bg-slate-50 rounded-full w-1/4" />
      </div>
      <div className="h-6 w-14 bg-slate-100 rounded-lg" />
      <div className="h-6 w-14 bg-slate-100 rounded-lg" />
    </div>
  )
}

function MemberContentModal({ row, onClose }: { row: ContentWinFailPersonRow; onClose: () => void }) {
  return (
    <DarkModal
      open
      onClose={onClose}
      title={`Content của ${row.user?.full_name ?? row.user_id}`}
      subtitle={`${row.videos.length} content được gắn task trong kỳ đã chọn`}
      size="lg"
    >
      <div className="flex gap-2.5 flex-wrap mb-5">
        <SummaryPill label="Win" value={row.win} kind="win" icon={Trophy} />
        <SummaryPill label="Fail" value={row.fail} kind="fail" icon={TrendingDown} />
        <SummaryPill label="Chưa xác định" value={row.pending} kind="pending" icon={HelpCircle} />
      </div>

      {row.videos.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          <Video className="w-8 h-8 mx-auto mb-2 opacity-20" />
          Chưa có content nào được gắn task trong kỳ này
        </div>
      ) : (
        <div className="divide-y divide-slate-100 -mx-1">
          {row.videos.map(v => {
            const t = TONE[WIN_FAIL_TONE[v.win_status_auto]]
            return (
              <div key={v.task_id} className="flex items-center gap-3 px-1 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate" title={v.content_title ?? undefined}>
                    {v.content_title || v.content_code || 'Content'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {(v.published_links ?? []).length === 0 && (
                      <span className="text-xs text-slate-300">Chưa có link</span>
                    )}
                    {(v.published_links ?? []).map(l => (
                      <a
                        key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:underline whitespace-nowrap"
                      >
                        {l.platform}{l.stats ? ` · ${l.stats.views.toLocaleString('vi-VN')} views` : ''} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
                <span className={cn('shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg border', t.bg, t.text, t.border)}>
                  {WIN_FAIL_LABEL[v.win_status_auto]}
                  {v.win_status_auto !== 'pending' && ` · ${v.views_auto.toLocaleString('vi-VN')} views`}
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
 * liệu = "chưa xác định") — MỘT cơ chế duy nhất áp dụng cho mọi thành viên trong team (không phân
 * biệt content creator/editor): "content được gắn task trong kỳ".
 * ADMIN/MANAGER chưa chọn team/thành viên → hiện Top 5 toàn hệ thống thay vì bắt buộc chọn team.
 * Bấm vào 1 thành viên để xem chi tiết danh sách content + view tương ứng (đọc số đã có sẵn, KHÔNG
 * tự động cào lại — số liệu mặc định được làm mới mỗi ngày qua cron 8:15 sáng). Muốn số mới ngay
 * lập tức thì bấm nút "Cập nhật" ở góc phải tiêu đề. Tách biệt hoàn toàn EditorKpi.video_win/fail
 * (nhập tay) và module content-report cũ.
 */
export function ContentWinFailSection({ from, to, teamId, fixedUserId, showGlobalTop }: Props) {
  const [openMemberId, setOpenMemberId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const isGlobalTop = !teamId && !fixedUserId && !!showGlobalTop
  const hasScope = !!(teamId || fixedUserId || isGlobalTop)
  const queryKey = ['task-auto', 'content-win-fail', teamId, fixedUserId, isGlobalTop, from, to]

  const { data: stats, isLoading } = useQuery({
    queryKey,
    queryFn: () => isGlobalTop
      ? getTopContentWinFailStats({ from, to, limit: 5 })
      : getContentWinFailStats({ team_id: fixedUserId ? undefined : teamId, user_id: fixedUserId, from, to }),
    enabled: hasScope,
  })

  // Nút "Cập nhật" — CHỦ ĐỘNG cào lại traffic cho đúng những gì đang hiển thị (không tự động khi
  // bấm xem 1 thành viên nữa: từng gây dội hàng loạt request Facebook/YouTube khi duyệt qua nhiều
  // người trong bảng xếp hạng, làm chậm cả hệ thống).
  const refreshMutation = useMutation({
    mutationFn: () => isGlobalTop
      ? refreshTopContentWinFailStats({ from, to, limit: 5 })
      : refreshContentWinFailStats({ team_id: fixedUserId ? undefined : teamId, user_id: fixedUserId, from, to }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const members = [...(stats?.by_member ?? [])].sort(
    (a, b) => b.win - a.win || a.fail - b.fail || b.pending - a.pending,
  )
  const maxWin = Math.max(1, ...members.map(m => m.win))
  const openRow = members.find(m => m.user_id === openMemberId)

  return (
    <DashboardCard
      icon={Video} iconColor="text-indigo-600" iconBg="bg-indigo-50"
      title={isGlobalTop ? 'Top 5 Content Win toàn hệ thống' : 'Content Win/Fail (tự động)'}
      subtitle={isGlobalTop
        ? '1 link bài đăng bất kỳ >10.000 view = win — số liệu cập nhật mỗi sáng. Bấm 1 thành viên để xem chi tiết.'
        : 'Tự tính từ view thật, 1 link bài đăng bất kỳ >10.000 view = win — số liệu cập nhật mỗi sáng. Bấm 1 thành viên để xem chi tiết.'}
      right={hasScope && (
        <button
          type="button"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshMutation.isPending && 'animate-spin')} />
          {refreshMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
      )}
    >
      {!hasScope ? (
        <div className="text-center py-10 text-slate-400 text-sm px-5">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
          Chọn team hoặc thành viên để xem thống kê win/fail.
        </div>
      ) : isLoading ? (
        <>
          <div className="px-5 py-4 flex gap-2.5 flex-wrap border-b border-slate-100">
            {[Trophy, TrendingDown, HelpCircle].map((Icon, i) => (
              <div key={i} className="flex-1 min-w-[130px] h-[70px] rounded-2xl bg-slate-50 animate-pulse" />
            ))}
          </div>
          <div className="divide-y divide-slate-50">
            {[0, 1, 2].map(i => <RowSkeleton key={i} />)}
          </div>
        </>
      ) : (
        <>
          <div className="px-5 py-4 flex gap-2.5 flex-wrap border-b border-slate-100">
            <SummaryPill label={isGlobalTop ? 'Win (toàn hệ thống)' : 'Win'} value={stats?.totals.win ?? 0} kind="win" icon={Trophy} />
            <SummaryPill label="Fail" value={stats?.totals.fail ?? 0} kind="fail" icon={TrendingDown} />
            <SummaryPill label="Chưa xác định" value={stats?.totals.pending ?? 0} kind="pending" icon={HelpCircle} />
          </div>
          {members.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm px-5">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
              {isGlobalTop ? 'Chưa có ai có content win trong kỳ này.' : 'Chưa có thành viên nào.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {members.map((row, i) => (
                <MemberRow key={row.user_id} row={row} rank={i} maxWin={maxWin} onClick={() => setOpenMemberId(row.user_id)} />
              ))}
            </div>
          )}
        </>
      )}

      {openRow && (
        <MemberContentModal row={openRow} onClose={() => setOpenMemberId(null)} />
      )}
    </DashboardCard>
  )
}
