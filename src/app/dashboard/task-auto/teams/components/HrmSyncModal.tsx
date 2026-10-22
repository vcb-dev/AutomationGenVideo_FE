'use client'

import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, UserMinus, UserPlus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { applyHrmSync, previewHrmSync } from '@/lib/api/task-auto'
import type { HrmMemberKind, HrmSyncMember, HrmSyncPlan, HrmSyncProjectPlan, Team } from '@/types/task-auto'

const NEW_TEAM = 'NEW'
const SKIP = 'SKIP'
const CREATE_ACCOUNT = ''

type AccountRow = HrmSyncPlan['accounts_to_create'][number]

const STATUS_BADGE: Record<HrmSyncProjectPlan['status'], { label: string; className: string }> = {
  LINKED:    { label: 'Đã gắn',   className: 'bg-slate-100 text-slate-600' },
  CHOSEN:    { label: 'Gắn mới',  className: 'bg-indigo-50 text-indigo-700' },
  SUGGESTED: { label: 'Gợi ý',    className: 'bg-amber-50 text-amber-700' },
  NEW:       { label: 'Tạo mới',  className: 'bg-emerald-50 text-emerald-700' },
  SKIP:      { label: 'Bỏ qua',   className: 'bg-gray-100 text-slate-500' },
}

const selectClass = 'px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60'

function KindTag({ kind }: { kind: HrmMemberKind | null }) {
  if (!kind) return null
  return (
    <span className={cn(
      'text-[11px] font-semibold px-1.5 py-0.5 rounded-md',
      kind === 'CONTENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700',
    )}>
      {kind === 'CONTENT' ? 'Content' : 'Editor'}
    </span>
  )
}

function MemberChips({ members, tone }: { members: HrmSyncMember[]; tone: 'add' | 'remove' }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {members.map(m => (
        <li
          key={m.user_id ?? m.hrm_employee_id ?? m.full_name}
          className={cn(
            'flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-sm border',
            tone === 'add' ? 'bg-emerald-50/40 border-emerald-100 text-slate-800' : 'bg-rose-50/50 border-rose-100 text-slate-700',
          )}
        >
          <span>{m.full_name}</span>
          {!m.user_id && <span className="text-[11px] font-semibold text-emerald-700">TK mới</span>}
          {m.inactive && <span className="text-[11px] text-slate-400">(đã vô hiệu hoá)</span>}
          {tone === 'add' && <KindTag kind={m.kind} />}
        </li>
      ))}
    </ul>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  teams: Team[]
}

export function HrmSyncModal({ open, onClose, teams }: Props) {
  const qc = useQueryClient()
  const [links, setLinks] = useState<Record<string, string>>({})
  const [accounts, setAccounts] = useState<Record<string, string>>({})
  const [accountRows, setAccountRows] = useState<Record<string, AccountRow>>({})

  useEffect(() => {
    if (!open) { setLinks({}); setAccounts({}); setAccountRows({}) }
  }, [open])

  const previewQuery = useQuery({
    queryKey: ['task-auto', 'hrm-sync', 'preview', links, accounts],
    queryFn: () => previewHrmSync({ links, accounts }),
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
  const plan = previewQuery.data

  useEffect(() => {
    if (!plan) return
    setAccountRows(prev => {
      const next = { ...prev }
      for (const a of plan.accounts_to_create) next[a.hrm_employee_id] = a
      return next
    })
  }, [plan])

  const effectiveChoice = (p: HrmSyncProjectPlan) =>
    links[p.project_id] ?? (p.status === 'NEW' || p.status === 'SKIP' ? p.status : p.team_id ?? NEW_TEAM)

  const unlinked = plan?.projects.filter(p => p.status !== 'LINKED') ?? []
  const takenTeamIds = new Set(
    (plan?.projects ?? []).flatMap(p => (p.status === 'LINKED' ? [p.team_id!] : [effectiveChoice(p)])),
  )
  const linkableTeams = teams
    .filter(t => t.is_active && !t.hrm_project_id)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))

  const visibleAccountRows = Object.values(accountRows).filter(a =>
    accounts[a.hrm_employee_id] || plan?.accounts_to_create.some(x => x.hrm_employee_id === a.hrm_employee_id),
  )

  const totals = useMemo(() => {
    const active = (plan?.projects ?? []).filter(p => p.status !== 'SKIP')
    return {
      projects: active.length,
      added: active.reduce((s, p) => s + p.add.length, 0),
      removed: active.reduce((s, p) => s + p.remove.length, 0),
      renamed: active.filter(p => p.rename).length,
      created: active.filter(p => p.status === 'NEW').length,
    }
  }, [plan])

  const applyMut = useMutation({
    mutationFn: () => applyHrmSync({
      links: Object.fromEntries(unlinked.map(p => [p.project_id, effectiveChoice(p)])),
      accounts,
    }),
    onSuccess: r => {
      toast.success(
        `Đã đồng bộ: +${r.members_added} / −${r.members_removed} thành viên, ${r.accounts_created} tài khoản mới, ${r.teams_created} team mới`,
      )
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'approvals'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'users'] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Đồng bộ thất bại'),
  })

  const busy = previewQuery.isFetching || applyMut.isPending
  const hasErrors = !!plan?.errors.length
  const errorMessage = (previewQuery.error as any)?.response?.data?.message || (previewQuery.error as Error | null)?.message

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      size="2xl"
      title="Đồng bộ team từ HRM"
      subtitle="Mỗi dự án HRM là một team; thành viên là nhân sự Content/Editor đang tham gia dự án"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => applyMut.mutate()}
            disabled={!plan || busy || hasErrors}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {applyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
            Áp dụng đồng bộ
          </button>
        </>
      }
    >
      {!plan && previewQuery.isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-500" role="status">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" aria-hidden="true" />
          <p className="text-sm">Đang lấy dự án và nhân sự từ HRM…</p>
        </div>
      ) : !plan ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
          <AlertTriangle className="w-6 h-6 text-rose-500" aria-hidden="true" />
          <p className="text-sm text-slate-700">{errorMessage || 'Không lấy được dữ liệu từ HRM'}</p>
          <button
            type="button"
            onClick={() => previewQuery.refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Thử lại
          </button>
        </div>
      ) : (
        <div className={cn('space-y-6 transition-opacity', previewQuery.isFetching && 'opacity-60')} aria-busy={previewQuery.isFetching}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            <span><strong className="text-slate-900">{totals.projects}</strong> dự án</span>
            <span className="text-emerald-700"><strong>+{totals.added}</strong> thành viên</span>
            <span className="text-rose-700"><strong>−{totals.removed}</strong> thành viên</span>
            <span><strong className="text-slate-900">{plan.accounts_to_create.length}</strong> tài khoản mới</span>
            <span><strong className="text-slate-900">{totals.renamed}</strong> team đổi tên</span>
            {totals.created > 0 && <span><strong className="text-slate-900">{totals.created}</strong> team mới</span>}
            {previewQuery.isFetching && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" aria-label="Đang cập nhật xem trước" />}
          </div>

          {hasErrors && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {plan.errors.map(e => <p key={e}>{e}</p>)}
            </div>
          )}

          <section className="space-y-3" aria-label="Dự án HRM">
            {plan.projects.map(p => {
              const badge = STATUS_BADGE[p.status]
              const choice = effectiveChoice(p)
              const teamOptions = linkableTeams
                .filter(t => t.id === choice || !takenTeamIds.has(t.id))
                .map(t => ({ id: t.id, name: t.name }))
              if (p.team_id && !teamOptions.some(t => t.id === p.team_id)) {
                teamOptions.unshift({ id: p.team_id, name: p.team_name ?? p.team_id })
              }
              const noChange = p.status === 'LINKED' && !p.add.length && !p.remove.length && !p.rename && !p.flag_updates.length
              return (
                <article key={p.project_id} className="border border-gray-200 rounded-2xl">
                  <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60 rounded-t-2xl">
                    <h3 className="font-bold text-slate-900">{p.project_name}</h3>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', badge.className)}>{badge.label}</span>
                    <div className="flex items-center gap-2 ml-auto text-sm text-slate-600">
                      <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      {p.status === 'LINKED' ? (
                        <span className="font-medium">{p.team_name}</span>
                      ) : (
                        <select
                          aria-label={`Team cho dự án ${p.project_name}`}
                          value={choice}
                          disabled={busy}
                          onChange={e => setLinks(prev => ({ ...prev, [p.project_id]: e.target.value }))}
                          className={selectClass}
                        >
                          <option value={NEW_TEAM}>Tạo team mới</option>
                          <option value={SKIP}>Bỏ qua lần này</option>
                          {teamOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>
                  </header>

                  <div className="px-4 py-3 space-y-3 text-sm">
                    {p.status === 'SKIP' ? (
                      <p className="text-slate-400 italic">Không đồng bộ dự án này lần này.</p>
                    ) : (
                      <>
                        {p.rename && (
                          <p className="text-slate-600">
                            Đổi tên team: <span className="line-through text-slate-400">{p.team_name}</span>{' '}
                            <ArrowRight className="inline w-3.5 h-3.5 text-slate-400" aria-hidden="true" />{' '}
                            <span className="font-semibold text-slate-900">{p.project_name}</span>
                          </p>
                        )}
                        {p.rename_conflict && (
                          <p className="flex items-center gap-1.5 text-amber-700">
                            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                            Tên &quot;{p.project_name}&quot; đã thuộc team khác — giữ tên &quot;{p.team_name}&quot;
                          </p>
                        )}
                        {p.add.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
                              <UserPlus className="w-4 h-4" aria-hidden="true" /> Thêm {p.add.length}
                            </p>
                            <MemberChips members={p.add} tone="add" />
                          </div>
                        )}
                        {p.remove.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="flex items-center gap-1.5 font-semibold text-rose-700">
                              <UserMinus className="w-4 h-4" aria-hidden="true" /> Gỡ khỏi team {p.remove.length}
                            </p>
                            <MemberChips members={p.remove} tone="remove" />
                          </div>
                        )}
                        <p className="flex items-center gap-1.5 text-slate-500">
                          <Users className="w-4 h-4" aria-hidden="true" />
                          {noChange
                            ? `Không thay đổi · ${p.keep.length} thành viên`
                            : `Giữ nguyên ${p.keep.length} thành viên${p.flag_updates.length ? ` · ${p.flag_updates.length} người đổi vai trò Content/Editor` : ''}`}
                        </p>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </section>

          {visibleAccountRows.length > 0 && (
            <section className="space-y-2" aria-labelledby="hrm-sync-accounts">
              <h3 id="hrm-sync-accounts" className="font-bold text-slate-900">Nhân sự chưa có tài khoản</h3>
              <p className="text-sm text-slate-500">
                Mặc định tạo tài khoản MEMBER theo email HRM (đăng nhập Google). Nếu người đó đã có tài khoản với email khác, chọn tài khoản đó để giữ lịch sử task.
              </p>
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-2xl">
                {visibleAccountRows.map(a => (
                  <li key={a.hrm_employee_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 flex items-center gap-2">{a.full_name} <KindTag kind={a.kind} /></p>
                      <p className="text-xs text-slate-500 truncate">{a.email}</p>
                    </div>
                    {a.possible_matches.length > 0 ? (
                      <select
                        aria-label={`Tài khoản cho ${a.full_name}`}
                        value={accounts[a.hrm_employee_id] ?? CREATE_ACCOUNT}
                        disabled={busy}
                        onChange={e => setAccounts(prev => {
                          const next = { ...prev }
                          if (e.target.value === CREATE_ACCOUNT) delete next[a.hrm_employee_id]
                          else next[a.hrm_employee_id] = e.target.value
                          return next
                        })}
                        className={cn(selectClass, 'w-full sm:w-auto sm:max-w-md')}
                      >
                        <option value={CREATE_ACCOUNT}>Tạo tài khoản mới</option>
                        {a.possible_matches.map(m => (
                          <option key={m.user_id} value={m.user_id}>Dùng TK có sẵn: {m.full_name} ({m.email})</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700">Tạo tài khoản mới</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.skipped.length > 0 && (
            <section className="space-y-2" aria-labelledby="hrm-sync-skipped">
              <h3 id="hrm-sync-skipped" className="font-bold text-slate-900">Bỏ qua</h3>
              <ul className="space-y-1 text-sm">
                {plan.skipped.map(s => (
                  <li key={s.hrm_employee_id} className="flex flex-wrap gap-x-2 text-slate-600">
                    <span className="font-medium text-slate-800">{s.full_name}</span>
                    {s.email && <span className="text-slate-400">{s.email}</span>}
                    <span className="text-amber-700">— {s.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-slate-400">
            Mỗi sáng 6:30 hệ thống tự đồng bộ lại các dự án đã gắn team. Dự án mới bên HRM cần mở lại màn này để chọn team.
            Leader của team không bị gỡ dù không có trong dự án.
          </p>
        </div>
      )}
    </DarkModal>
  )
}
