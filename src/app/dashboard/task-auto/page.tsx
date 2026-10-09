'use client'

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ListTodo, Users, User, Sparkles, X, ChevronDown, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getDashboard, getProductVideoStats, getTeams, isContentTeamMember } from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import type { Team, TeamMember } from '@/types/task-auto'
import { GlobalDashboard, buildGlobal } from './components/GlobalDashboard'
import { TeamDashboard } from './components/TeamDashboard'
import { PersonalDashboard } from './components/PersonalDashboard'
import { ContentCreatorDashboard } from './components/ContentCreatorDashboard'
import { ContentTeamLeaderDashboard } from './components/ContentTeamLeaderDashboard'
import { ContentWinFailSection } from './components/ContentWinFailSection'
import { SectionHeader, SegmentedControl } from './components/DashboardUI'

// ── Date filter ───────────────────────────────────────────────────────────────

type DatePreset = 'today' | 'yesterday' | '7days' | 'month' | 'last_month' | 'custom'

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today',      label: 'Hôm nay' },
  { key: 'yesterday',  label: 'Hôm qua' },
  { key: '7days',      label: '7 ngày qua' },
  { key: 'month',      label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'custom',     label: 'Tùy chọn' },
]

// Ngày lịch theo giờ máy (VN), KHÔNG dùng toISOString(): nó đổi sang UTC nên mốc 00:00 ngày 1 bị
// lùi về ngày cuối tháng trước ("Tháng này" kéo theo ngày 30, "Tháng trước" mất ngày cuối tháng).
function fmt(d: Date) {
  return d.toLocaleDateString('en-CA')
}

function formatVNDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function getPeriodLabel(preset: DatePreset, from: string, to: string): string {
  if (preset !== 'custom') return PRESETS.find(p => p.key === preset)?.label ?? ''
  return from === to ? formatVNDate(from) : `${formatVNDate(from)} → ${formatVNDate(to)}`
}

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date()
  switch (preset) {
    case 'today': {
      const s = fmt(today)
      return { from: s, to: s }
    }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      const s = fmt(y)
      return { from: s, to: s }
    }
    case '7days': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return { from: fmt(from), to: fmt(today) }
    }
    case 'last_month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to   = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: fmt(from), to: fmt(to) }
    }
    case 'month':
    default: {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: fmt(from), to: fmt(today) }
    }
  }
}

// ── DateFilter component ──────────────────────────────────────────────────────

interface DateFilterProps {
  preset: DatePreset
  customFrom: string
  customTo: string
  onPresetChange: (p: DatePreset) => void
  onCustomFromChange: (v: string) => void
  onCustomToChange: (v: string) => void
}

const DATE_INPUT_CLS = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300'

function DateFilter({ preset, customFrom, customTo, onPresetChange, onCustomFromChange, onCustomToChange, from, to }: DateFilterProps & { from: string; to: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <SegmentedControl
        ariaLabel="Khoảng thời gian"
        value={preset}
        onChange={onPresetChange}
        options={PRESETS.map(p => ({ value: p.key, label: p.label }))}
      />

      {preset === 'custom' ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Từ ngày"
            value={customFrom}
            max={customTo || undefined}
            onChange={e => onCustomFromChange(e.target.value)}
            className={DATE_INPUT_CLS}
          />
          <span className="text-sm text-slate-400" aria-hidden>–</span>
          <input
            type="date"
            aria-label="Đến ngày"
            value={customTo}
            min={customFrom || undefined}
            onChange={e => onCustomToChange(e.target.value)}
            className={DATE_INPUT_CLS}
          />
        </div>
      ) : from && to ? (
        // Đổi preset ("Tháng này", "7 ngày qua"…) ra ngày cụ thể để người xem biết chắc số liệu tính từ đâu tới đâu.
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
          <span className="tabular-nums">{from === to ? formatVNDate(from) : `${formatVNDate(from)} – ${formatVNDate(to)}`}</span>
        </span>
      ) : null}
    </div>
  )
}

// ── Scope filter (team / member) — chỉ hiện cho ADMIN/MANAGER (scope global) ──────────────────

function dedupeMembers(members: TeamMember[]): TeamMember[] {
  const seen = new Set<string>()
  const out: TeamMember[] = []
  for (const m of members) {
    if (seen.has(m.user_id)) continue
    seen.add(m.user_id)
    out.push(m)
  }
  return out.sort((a, b) => (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? ''))
}

interface ScopeSelectProps {
  value: string
  placeholder: string
  /** Không có nhãn hiển thị (placeholder chỉ là lựa chọn "tất cả") nên cần nhãn cho trình đọc màn hình. */
  ariaLabel: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}

function ScopeSelect({ value, placeholder, ariaLabel, options, onChange }: ScopeSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'h-9 appearance-none rounded-lg border pl-3 pr-8 text-sm font-semibold max-w-[200px] truncate cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-indigo-300',
          value ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}

interface ScopeFilterProps {
  teams: Team[]
  teamId: string
  memberId: string
  onTeamChange: (id: string) => void
  onMemberChange: (id: string) => void
}

function ScopeFilter({ teams, teamId, memberId, onTeamChange, onMemberChange }: ScopeFilterProps) {
  const selectedTeam = teams.find(t => t.id === teamId)
  const memberOptions = dedupeMembers(selectedTeam ? (selectedTeam.members ?? []) : teams.flatMap(t => t.members ?? []))
  const hasFilter = !!teamId || !!memberId

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ScopeSelect
        value={teamId}
        placeholder="Tất cả team"
        ariaLabel="Lọc theo team"
        options={teams.map(t => ({ value: t.id, label: t.name }))}
        onChange={onTeamChange}
      />
      <ScopeSelect
        value={memberId}
        placeholder="Tất cả thành viên"
        ariaLabel="Lọc theo thành viên"
        options={memberOptions.map(m => ({ value: m.user_id, label: m.user?.full_name ?? m.user_id }))}
        onChange={onMemberChange}
      />
      {hasFilter && (
        <button
          type="button"
          onClick={() => { onTeamChange(''); onMemberChange('') }}
          className="flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <X className="w-3.5 h-3.5" aria-hidden /> Xoá lọc
        </button>
      )}
    </div>
  )
}

// ── Lọc thành viên trong team — LEADER (scope team) ───────────────────────────────────────────

interface TeamMemberFilterProps {
  /** `member_options` từ BE — đã lọc đúng quy tắc ẩn/hiện như bảng "Thành viên". */
  options: { user_id: string; full_name: string }[]
  memberId: string
  onChange: (id: string) => void
}

function TeamMemberFilter({ options, memberId, onChange }: TeamMemberFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ScopeSelect
        value={memberId}
        placeholder="Cả team"
        ariaLabel="Xem số liệu của thành viên"
        options={options.map(m => ({ value: m.user_id, label: m.full_name || m.user_id }))}
        onChange={onChange}
      />
      {memberId && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <X className="w-3.5 h-3.5" aria-hidden /> Xoá lọc
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TaskAutoDashboard() {
  const today = fmt(new Date())
  const firstOfMonth = fmt(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const [preset, setPreset]           = useState<DatePreset>('month')
  const [customFrom, setCustomFrom]   = useState(firstOfMonth)
  const [customTo, setCustomTo]       = useState(today)

  // teamFilter chỉ dùng ở scope global (ADMIN/MANAGER). memberFilter dùng cho cả global lẫn LEADER
  // (BE chỉ nhận thành viên team leader đang lead); MEMBER thì BE bỏ qua cả 2.
  const [teamFilter, setTeamFilter]     = useState('')
  const [memberFilter, setMemberFilter] = useState('')

  const { from, to } = preset === 'custom'
    ? { from: customFrom, to: customTo }
    : getPresetRange(preset)

  const periodLabel = getPeriodLabel(preset, from, to)

  // keepPreviousData: đổi ngày/thành viên thì giữ số liệu cũ (làm mờ) tới khi có số mới, thay vì
  // nháy về spinner — tránh luôn việc thanh lọc (phụ thuộc data.scope) biến mất giữa chừng.
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['task-auto', 'dashboard', from, to, teamFilter, memberFilter],
    queryFn:  () => getDashboard({ date_from: from, date_to: to, team_id: teamFilter || undefined, assignee_id: memberFilter || undefined }),
    refetchInterval: 30_000,
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
  })

  // Tải riêng khỏi getDashboard() — cùng bộ lọc ngày/team/thành viên, nhưng độc lập với payload
  // Tổng quan chính (xem lib/api/task-auto.ts: getProductVideoStats).
  const { data: productStats } = useQuery({
    queryKey: ['task-auto', 'product-video-stats', from, to, teamFilter, memberFilter],
    queryFn:  () => getProductVideoStats({ date_from: from, date_to: to, team_id: teamFilter || undefined, assignee_id: memberFilter || undefined }),
    refetchInterval: 30_000,
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
  })

  // Content Team (team_kind=CONTENT) có Tổng quan riêng — không dùng dashboard theo task/KPI video
  // vì content creator không nhận task sản xuất video theo cách thông thường.
  const { user } = useAuthStore()
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })
  const contentTeamsLed = (teams ?? []).filter(t => t.team_kind === 'CONTENT' && t.leader_id === user?.id)
  const isContentLeader = contentTeamsLed.length > 0
  const isContentMember = !isContentLeader && isContentTeamMember(teams, user?.id)

  // Khi ADMIN/MANAGER khoan sâu bằng ScopeFilter, badge phải phản ánh đúng phạm vi đang xem thay vì
  // luôn nói "Toàn hệ thống" — dễ gây hiểu lầm số liệu vẫn là toàn hệ thống trong khi đã bị lọc.
  const filteredMember = memberFilter
    ? (teamFilter ? teams?.find(t => t.id === teamFilter)?.members : teams?.flatMap(t => t.members ?? []))
        ?.find(m => m.user_id === memberFilter)
    : undefined
  const globalScopeLabel = filteredMember
    ? `Thành viên: ${filteredMember.user?.full_name ?? filteredMember.user_id}`
    : teamFilter
    ? `Team: ${teams?.find(t => t.id === teamFilter)?.name ?? '—'}`
    : 'Toàn hệ thống'

  const scopeLabel = isContentLeader ? (contentTeamsLed.length === 1 ? `Content Team: ${contentTeamsLed[0].name}` : 'Content Team')
    : isContentMember ? 'Content Creator'
    : data?.scope === 'global' ? globalScopeLabel
    : data?.scope === 'team' ? (
        data.focus_member ? `Thành viên: ${data.focus_member.full_name}`
        : data.team ? `Team: ${data.team.name}` : 'Team của tôi'
      )
    : 'Cá nhân'

  const scopeIcon = isContentLeader || isContentMember
    ? <Sparkles className="w-3.5 h-3.5" aria-hidden />
    : data?.scope === 'personal' || (data?.scope === 'team' && data.focus_member)
    ? <User className="w-3.5 h-3.5" aria-hidden />
    : <Users className="w-3.5 h-3.5" aria-hidden />

  const showDateFilter = isContentLeader || isContentMember || data?.scope === 'global' || data?.scope === 'team' || data?.scope === 'personal'
  const loading = isLoading || teamsLoading

  const pageSubtitle = isContentLeader || isContentMember
    ? 'Content sưu tầm, bản dịch và video được làm từ content'
    : data?.scope === 'personal'
    ? 'Traffic theo ngày, tiến độ KPI và kết quả video của bạn'
    : 'Tiến độ nhiệm vụ, KPI và kết quả video — chọn khoảng thời gian để xem số liệu'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tổng quan</h1>
            {data && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                {scopeIcon}
                {scopeLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{pageSubtitle}</p>
        </div>
        <Link
          href="/dashboard/task-auto/tasks"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
        >
          <ListTodo className="w-4 h-4" aria-hidden />
          Danh sách nhiệm vụ
        </Link>
      </div>

      {/* Thanh lọc — 1 dải duy nhất: khoảng thời gian (+ ngày cụ thể) bên trái, phạm vi team/thành viên
          bên phải. Kỳ chỉ hiện 1 lần ở đây thay vì lặp nhãn "Tháng này" trên từng card. */}
      {(showDateFilter || isLoading) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <DateFilter
            preset={preset}
            customFrom={customFrom}
            customTo={customTo}
            from={from}
            to={to}
            onPresetChange={p => {
              setPreset(p)
              if (p === 'custom') {
                setCustomFrom(firstOfMonth)
                setCustomTo(today)
              }
            }}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />

          {data?.scope === 'global' && (teams?.length ?? 0) > 0 && (
            <ScopeFilter
              teams={teams ?? []}
              teamId={teamFilter}
              memberId={memberFilter}
              onTeamChange={id => { setTeamFilter(id); setMemberFilter('') }}
              onMemberChange={setMemberFilter}
            />
          )}

          {data?.scope === 'team' && !isContentLeader && (data.member_options?.length ?? 0) > 0 && (
            <TeamMemberFilter
              options={data.member_options ?? []}
              memberId={memberFilter}
              onChange={setMemberFilter}
            />
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <DashboardSkeleton />
      ) : isContentLeader ? (
        <ContentTeamLeaderDashboard teams={contentTeamsLed} from={from} to={to} periodLabel={periodLabel} />
      ) : isContentMember && user?.id ? (
        <ContentCreatorDashboard
          userId={user.id}
          from={from}
          to={to}
          teamName={teams?.find(t => t.team_kind === 'CONTENT' && t.members?.some(m => m.user_id === user.id))?.name}
        />
      ) : !data ? null : (
        <div
          aria-busy={isPlaceholderData}
          className={cn('transition-opacity duration-200', isPlaceholderData && 'opacity-60')}
        >
          {data.scope === 'global' ? <GlobalDashboard d={buildGlobal(data)} scopeLabel={globalScopeLabel} productStats={productStats} />
            : data.scope === 'team'   ? <TeamDashboard d={data} productStats={productStats} />
            : <PersonalDashboard d={data} productStats={productStats} />}
        </div>
      )}

      {/* Content Win/Fail — chỉ số MỚI, tự tính từ view link bài đăng (1 link bất kỳ >10.000 view = win), tách biệt các số KPI nhập tay ở trên */}
      {!loading && (
        <section aria-label="Content Win/Fail" className="pt-2">
          <SectionHeader title="Content Win/Fail" description="Tự tính từ lượt xem thật của link bài đăng" />
          <ContentWinFailSection
            from={from}
            to={to}
            teamId={
              isContentLeader ? contentTeamsLed[0]?.id
                : data?.scope === 'team' ? data.team?.id
                : data?.scope === 'global' ? (teamFilter || undefined)
                : undefined
            }
            fixedUserId={
              isContentMember || data?.scope === 'personal' ? user?.id
                : data?.scope === 'global' ? (memberFilter || undefined)
                : data?.scope === 'team' ? data.focus_member?.user_id
                : undefined
            }
            showGlobalTop={data?.scope === 'global'}
          />
        </section>
      )}

    </div>
  )
}

// ── Skeleton lúc tải lần đầu — giữ chỗ đúng bố cục (ô số liệu + 2 card) để trang không nhảy ──────

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Đang tải số liệu">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-[124px] rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="h-3.5 w-24 rounded-full bg-slate-100 animate-pulse motion-reduce:animate-none" />
            <div className="mt-4 h-7 w-16 rounded-lg bg-slate-100 animate-pulse motion-reduce:animate-none" />
            <div className="mt-3 h-3 w-32 rounded-full bg-slate-50 animate-pulse motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="h-80 rounded-2xl border border-slate-200/80 bg-white lg:col-span-2 animate-pulse motion-reduce:animate-none" />
        <div className="h-80 rounded-2xl border border-slate-200/80 bg-white lg:col-span-3 animate-pulse motion-reduce:animate-none" />
      </div>
    </div>
  )
}
