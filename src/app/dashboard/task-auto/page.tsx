'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ListTodo, Users, User, Loader2, Sparkles, X, ChevronDown } from 'lucide-react'
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

// ── Date filter ───────────────────────────────────────────────────────────────

type DatePreset = 'today' | '7days' | 'month' | 'last_month' | 'custom'

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today',      label: 'Hôm nay' },
  { key: '7days',      label: '7 ngày qua' },
  { key: 'month',      label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'custom',     label: 'Tùy chọn' },
]

function fmt(d: Date) {
  return d.toISOString().split('T')[0]
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

function DateFilter({ preset, customFrom, customTo, onPresetChange, onCustomFromChange, onCustomToChange }: DateFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(p => (
        <button
          key={p.key}
          onClick={() => onPresetChange(p.key)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold border transition-colors whitespace-nowrap',
            preset === p.key
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
          )}
        >
          {p.label}
        </button>
      ))}

      {/* Custom date range inputs */}
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={e => onCustomFromChange(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-sm text-slate-400">→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={e => onCustomToChange(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      )}
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
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}

function ScopeSelect({ value, placeholder, options, onChange }: ScopeSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none text-sm font-semibold border border-slate-200 rounded-lg pl-3.5 pr-8 py-2 text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[180px] truncate cursor-pointer"
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
        options={teams.map(t => ({ value: t.id, label: t.name }))}
        onChange={onTeamChange}
      />
      <ScopeSelect
        value={memberId}
        placeholder="Tất cả thành viên"
        options={memberOptions.map(m => ({ value: m.user_id, label: m.user?.full_name ?? m.user_id }))}
        onChange={onMemberChange}
      />
      {hasFilter && (
        <button
          onClick={() => { onTeamChange(''); onMemberChange('') }}
          className="flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-slate-600"
        >
          <X className="w-3.5 h-3.5" /> Xoá lọc
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

  // Chỉ có tác dụng ở scope global (ADMIN/MANAGER) — BE bỏ qua 2 tham số này ở nhánh LEADER/MEMBER.
  const [teamFilter, setTeamFilter]     = useState('')
  const [memberFilter, setMemberFilter] = useState('')

  const { from, to } = preset === 'custom'
    ? { from: customFrom, to: customTo }
    : getPresetRange(preset)

  const periodLabel = getPeriodLabel(preset, from, to)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'dashboard', from, to, teamFilter, memberFilter],
    queryFn:  () => getDashboard({ date_from: from, date_to: to, team_id: teamFilter || undefined, assignee_id: memberFilter || undefined }),
    refetchInterval: 30_000,
    enabled: !!(from && to),
  })

  // Tải riêng khỏi getDashboard() — cùng bộ lọc ngày/team/thành viên, nhưng độc lập với payload
  // Tổng quan chính (xem lib/api/task-auto.ts: getProductVideoStats).
  const { data: productStats } = useQuery({
    queryKey: ['task-auto', 'product-video-stats', from, to, teamFilter, memberFilter],
    queryFn:  () => getProductVideoStats({ date_from: from, date_to: to, team_id: teamFilter || undefined, assignee_id: memberFilter || undefined }),
    refetchInterval: 30_000,
    enabled: !!(from && to),
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
    : data?.scope === 'team' ? (data.team ? `Team: ${data.team.name}` : 'Team của tôi')
    : 'Cá nhân'

  const scopeIcon = isContentLeader || isContentMember
    ? <Sparkles className="w-4 h-4" />
    : data?.scope === 'personal'
    ? <User className="w-4 h-4" />
    : <Users className="w-4 h-4" />

  const showDateFilter = isContentLeader || isContentMember || data?.scope === 'global' || data?.scope === 'team' || data?.scope === 'personal'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Task Auto</h1>
          <p className="text-slate-500 text-sm mt-0.5">Hệ thống phân công và quản lý task tự động</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
              {scopeIcon}
              {scopeLabel}
            </div>
          )}
          <Link
            href="/dashboard/task-auto/tasks"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <ListTodo className="w-4 h-4" />
            Xem tất cả task
          </Link>
        </div>
      </div>

      {/* Bộ lọc — chỉ hiện cho Global & Team scope. Không bọc card riêng, đặt trực tiếp trên nền trang
          như 1 thanh công cụ — ngày bên trái, team/thành viên (chỉ scope global) bên phải cùng hàng. */}
      {(showDateFilter || isLoading) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DateFilter
            preset={preset}
            customFrom={customFrom}
            customTo={customTo}
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
        </div>
      )}

      {/* Content */}
      {(isLoading || teamsLoading) ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : isContentLeader ? (
        <ContentTeamLeaderDashboard teams={contentTeamsLed} from={from} to={to} periodLabel={periodLabel} />
      ) : isContentMember && user?.id ? (
        <ContentCreatorDashboard
          userId={user.id}
          from={from}
          to={to}
          teamName={teams?.find(t => t.team_kind === 'CONTENT' && t.members?.some(m => m.user_id === user.id))?.name}
        />
      ) : !data ? null
        : data.scope === 'global' ? <GlobalDashboard d={buildGlobal(data)} periodLabel={periodLabel} scopeLabel={globalScopeLabel} productStats={productStats} />
        : data.scope === 'team'   ? <TeamDashboard d={data} periodLabel={periodLabel} productStats={productStats} />
        : <PersonalDashboard d={data} periodLabel={periodLabel} productStats={productStats} />
      }

    </div>
  )
}
