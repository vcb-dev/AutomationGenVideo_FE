'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Crown, Users, PenLine, Pencil, Check, X, Loader2, Trash2, Sparkles, Link2, Lock, ChevronDown, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { formatDate } from '@/components/task-auto/helpers'
import { getTeams, getApprovals, setMemberEditorRole, setMemberContentCreatorRole, updateTeam, deleteTeam } from '@/lib/api/task-auto'
import type { BrandType, Team, TeamMarket, TeamKind, TeamMember } from '@/types/task-auto'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

type MarketColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate'

const MARKET_BADGE_CLASS: Record<MarketColor, string> = {
  blue:    'bg-blue-600 border-blue-600 text-white shadow-sm',
  emerald: 'bg-emerald-500 border-emerald-500 text-white shadow-sm',
  amber:   'bg-amber-500 border-amber-500 text-white shadow-sm',
  rose:    'bg-rose-500 border-rose-500 text-white shadow-sm',
  sky:     'bg-sky-500 border-sky-500 text-white shadow-sm',
  slate:   'bg-slate-500 border-slate-500 text-white shadow-sm',
}

const MARKETS: { key: TeamMarket; label: string; color: MarketColor }[] = [
  { key: 'GLOBAL',    label: 'Global',    color: 'blue' },
  { key: 'VIETNAM',   label: 'Việt Nam',  color: 'emerald' },
  { key: 'INDONESIA', label: 'Indonesia', color: 'amber' },
  { key: 'JAPAN',     label: 'Nhật Bản',  color: 'rose' },
  { key: 'THAILAND',  label: 'Thái Lan',  color: 'sky' },
]

const getMarketDisplay = (market: string): { label: string; color: MarketColor } =>
  MARKETS.find(m => m.key === market) ?? {
    label: market || 'Chưa xác định',
    color: 'slate',
  }

const marketBtnClass = (color: MarketColor, active: boolean) => cn(
  'px-3 py-2 rounded-full text-xs font-semibold border-2 transition-all',
  active ? MARKET_BADGE_CLASS[color] : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
)

const NEUTRAL_BADGE_CLASS = 'px-3 py-1 rounded-full text-xs font-semibold border-2 bg-slate-100 border-slate-200 text-slate-500'

// Huy hiệu loại · thị trường · nhóm của 1 team — dùng chung cho team đang chọn và danh sách tất cả đội nhóm
function TeamBadges({ team }: { team: Team }) {
  // Scale Data quản lý nguồn/sản phẩm xuyên suốt mọi loại & thị trường
  if (team.name === 'Scale Data') {
    return <span className={NEUTRAL_BADGE_CLASS}>Mọi loại · Mọi thị trường</span>
  }
  const isContentTeam = team.team_kind === 'CONTENT'
  const brand = BRANDS.find(b => b.key === (team.brand_type ?? 'TRANG_SUC'))!
  const market = getMarketDisplay(team.market ?? 'VIETNAM')
  return (
    <>
      {isContentTeam ? (
        <span className={NEUTRAL_BADGE_CLASS}>Cả 2 thương hiệu</span>
      ) : (
        <span className={cn(
          'px-3 py-1 rounded-full text-xs font-semibold border-2',
          brand.color === 'amber'
            ? 'bg-amber-500 border-amber-500 text-white'
            : 'bg-violet-600 border-violet-600 text-white'
        )}>
          {brand.label}
        </span>
      )}
      <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border-2', MARKET_BADGE_CLASS[market.color])}>
        {market.label}
      </span>
      {isContentTeam && (
        <span className="px-3 py-1 rounded-full text-xs font-semibold border-2 bg-indigo-600 border-indigo-600 text-white">
          Content Team
        </span>
      )}
    </>
  )
}

interface MembersTabProps {
  canManage: boolean
  isAdmin: boolean
  isAdminOrManager: boolean
  userId?: string
  selectedTeamId: string
  setSelectedTeamId: (id: string) => void
}

export function MembersTab({ canManage, isAdmin, isAdminOrManager, userId, selectedTeamId, setSelectedTeamId }: MembersTabProps) {
  const qc = useQueryClient()
  const [editingTeam, setEditingTeam] = useState(false)
  const [pendingBrand, setPendingBrand] = useState<BrandType | null>(null)
  const [pendingMarket, setPendingMarket] = useState<TeamMarket | null>(null)
  const [pendingTeamKind, setPendingTeamKind] = useState<TeamKind | null>(null)
  const [deletingTeam, setDeletingTeam] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(false)
  const [pendingWebhookUrl, setPendingWebhookUrl] = useState('')
  const [pendingWebhookSecret, setPendingWebhookSecret] = useState('')
  const [collapsedTeamIds, setCollapsedTeamIds] = useState<Set<string>>(() => new Set())

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const { data: approvedEditors } = useQuery({
    queryKey: ['task-auto', 'approvals', 'APPROVED'],
    queryFn: () => getApprovals('APPROVED'),
  })
  const approvedEditorIds = new Set((approvedEditors || []).map(a => a.user_id))

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const members: TeamMember[] = selectedTeam?.members || []
  const brand: BrandType = selectedTeam?.brand_type ?? 'TRANG_SUC'
  // Scale Data quản lý nguồn/sản phẩm xuyên suốt mọi loại & thị trường — không gán cố định 1 loại/1 thị trường
  const isScaleDataTeam = selectedTeam?.name === 'Scale Data'
  // Content Team làm content cho cả Đồ da và Trang sức — không gán cố định 1 thương hiệu
  const isContentTeam = selectedTeam?.team_kind === 'CONTENT'

  const isLeaderOfSelected = selectedTeam?.leader_id === userId
  const canEditBrand = (isAdminOrManager || isLeaderOfSelected) && !isScaleDataTeam
  // Webhook Lark không gắn với brand/thị trường — cho phép cấu hình kể cả với Scale Data.
  const canEditWebhook = isAdminOrManager || isLeaderOfSelected

  const myTeams = (teams ?? []).filter(t =>
    t.leader_id === userId || t.members?.some((m: any) => m.user_id === userId)
  )
  const showTeamPicker = isAdminOrManager || myTeams.length > 1
  const teamPickerOptions = isAdminOrManager
    ? [{ value: '', label: 'Tất cả đội nhóm' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]
    : myTeams.map(t => ({ value: t.id, label: t.name }))

  // Admin/Manager chọn "Tất cả đội nhóm" → hiện thành viên của mọi team thay vì bắt chọn 1 team
  const showAllTeams = isAdminOrManager && !selectedTeamId
  const allTeamsMemberCount = new Set((teams ?? []).flatMap(t => (t.members ?? []).map(m => m.user_id))).size

  const selectTeam = (id: string) => {
    setSelectedTeamId(id)
    setEditingTeam(false)
    setPendingBrand(null)
    setPendingMarket(null)
    setPendingTeamKind(null)
    setEditingWebhook(false)
    setPendingWebhookSecret('')
  }

  const toggleTeamCollapsed = (id: string) => setCollapsedTeamIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const editorMut = useMutation({
    mutationFn: ({ teamId, memberId, isEditor }: { teamId: string; memberId: string; isEditor: boolean }) =>
      setMemberEditorRole(teamId, memberId, isEditor),
    onSuccess: (_, vars) => {
      toast.success(vars.isEditor ? 'Đã đặt làm Editor' : 'Đã thu hồi quyền Editor')
      qc.invalidateQueries({ queryKey: ['task-auto', 'approvals'] })
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  const contentCreatorMut = useMutation({
    mutationFn: ({ teamId, memberId, isContentCreator }: { teamId: string; memberId: string; isContentCreator: boolean }) =>
      setMemberContentCreatorRole(teamId, memberId, isContentCreator),
    onSuccess: (_, vars) => {
      toast.success(vars.isContentCreator ? 'Đã đặt làm Content Creator' : 'Đã thu hồi quyền Content Creator')
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  const market: TeamMarket = selectedTeam?.market ?? 'VIETNAM'
  const teamKind: TeamKind = selectedTeam?.team_kind ?? 'PRODUCTION'

  const teamMut = useMutation({
    mutationFn: ({ brand, mkt, kind }: { brand: BrandType; mkt: TeamMarket; kind: TeamKind }) =>
      updateTeam(selectedTeamId, { brand_type: brand, market: mkt, team_kind: kind } as any),
    onSuccess: () => {
      toast.success('Đã cập nhật thông tin team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
      setEditingTeam(false)
      setPendingBrand(null)
      setPendingMarket(null)
      setPendingTeamKind(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Thay đổi thất bại'),
  })

  // secret: undefined = giữ nguyên secret hiện có (không gửi field này lên BE — BE là write-only,
  // không có cách nào đọc lại giá trị cũ để so sánh), null = xoá hẳn, string = ghi đè.
  const webhookMut = useMutation({
    mutationFn: ({ url, secret }: { url: string | null; secret?: string | null }) =>
      updateTeam(selectedTeamId, {
        lark_webhook_url: url,
        ...(secret !== undefined ? { lark_webhook_secret: secret } : {}),
      } as any),
    onSuccess: () => {
      toast.success('Đã cập nhật webhook Lark')
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
      setEditingWebhook(false)
      setPendingWebhookSecret('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cập nhật webhook thất bại — kiểm tra lại URL'),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteTeam(selectedTeamId),
    onSuccess: () => {
      toast.success('Đã xóa team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
      setSelectedTeamId('')
      setDeletingTeam(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xóa team thất bại'),
  })

  const handleSave = () => {
    const newBrand = pendingBrand ?? brand
    const newMarket = pendingMarket ?? market
    const newTeamKind = pendingTeamKind ?? teamKind
    if (newBrand !== brand || newMarket !== market || newTeamKind !== teamKind) {
      teamMut.mutate({ brand: newBrand, mkt: newMarket, kind: newTeamKind })
    } else {
      setEditingTeam(false)
    }
  }

  const handleSaveWebhook = () => {
    const trimmedUrl = pendingWebhookUrl.trim()
    const trimmedSecret = pendingWebhookSecret.trim()
    const urlChanged = trimmedUrl !== (selectedTeam?.lark_webhook_url ?? '')
    // Ô secret để trống = không đổi secret hiện có (BE không trả lại secret thật nên không thể
    // so sánh) — chỉ gửi field này lên khi người dùng thực sự gõ giá trị mới.
    if (!urlChanged && !trimmedSecret) {
      setEditingWebhook(false)
      return
    }
    webhookMut.mutate({ url: trimmedUrl || null, secret: trimmedSecret ? trimmedSecret : undefined })
  }

  const handleClearWebhookSecret = () => {
    webhookMut.mutate({ url: selectedTeam?.lark_webhook_url ?? null, secret: null })
  }

  const renderMemberRow = (team: Team, member: TeamMember) => {
    const isLeader = member.user_id === team.leader_id
    const isEditor = approvedEditorIds.has(member.user_id)
    const isContentCreator = !!member.is_content_creator
    const isTogglingThis = editorMut.isPending && editorMut.variables?.memberId === member.user_id
    const isTogglingContentCreator = contentCreatorMut.isPending
      && contentCreatorMut.variables?.teamId === team.id
      && contentCreatorMut.variables?.memberId === member.user_id

    return (
      <div key={member.id} className="flex items-center gap-4 flex-wrap gap-y-2 px-5 py-4 hover:bg-gray-50 transition-colors">
        <AvatarInitials name={member.user?.full_name} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm">
              {member.user?.full_name || member.user_id}
            </p>
            {isLeader && (
              <span className="bg-amber-50 text-amber-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Crown className="w-2.5 h-2.5" /> Leader
              </span>
            )}
            {isEditor && (
              <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <PenLine className="w-2.5 h-2.5" /> Editor
              </span>
            )}
            {isContentCreator && (
              <span className="bg-emerald-50 text-emerald-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Content Creator
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{member.user?.email}</p>
        </div>

        {/* Trailing group — cho phép xuống dòng riêng trên màn hình hẹp, không phá vỡ cụm avatar+tên */}
        <div className="flex items-center gap-4 ml-auto shrink-0">
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500">Tham gia</p>
            <p className="text-xs text-slate-400 font-medium">
              {formatDate(member.joined_at)}
            </p>
          </div>

          {/* Editor toggle */}
          {canManage && (
            <button
              onClick={() => editorMut.mutate({ teamId: team.id, memberId: member.user_id, isEditor: !isEditor })}
              disabled={editorMut.isPending}
              title={isEditor ? 'Thu hồi quyền Editor' : 'Gán làm Editor'}
              className={cn(
                'p-1.5 rounded-lg transition-colors flex-shrink-0 text-xs font-semibold flex items-center gap-1 disabled:opacity-60',
                isEditor
                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  : 'bg-gray-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
              )}
            >
              {isTogglingThis
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <PenLine className="w-3.5 h-3.5" />
              }
              {isEditor ? 'Editor' : 'Gán Editor'}
            </button>
          )}

          {/* Content Creator toggle */}
          {canManage && (
            <button
              onClick={() => contentCreatorMut.mutate({ teamId: team.id, memberId: member.user_id, isContentCreator: !isContentCreator })}
              disabled={contentCreatorMut.isPending}
              title={isContentCreator ? 'Thu hồi quyền Content Creator' : 'Gán làm Content Creator'}
              className={cn(
                'p-1.5 rounded-lg transition-colors flex-shrink-0 text-xs font-semibold flex items-center gap-1 disabled:opacity-60',
                isContentCreator
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-gray-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
              )}
            >
              {isTogglingContentCreator
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />
              }
              {isContentCreator ? 'Content Creator' : 'Gán Content Creator'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {showTeamPicker ? (
            <CustomSelect
              value={selectedTeamId}
              onChange={selectTeam}
              options={teamPickerOptions}
              className="min-w-[220px]"
              searchable
            />
          ) : (
            selectedTeam && (
              <div className="flex items-center gap-2 px-4 py-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-base font-semibold text-indigo-700">
                <Users className="w-4 h-4" />
                {selectedTeam.name}
              </div>
            )
          )}

          {selectedTeam && (
            <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
              {members.length} thành viên
            </span>
          )}

          {showAllTeams && teams && (
            <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
              {teams.length} đội nhóm · {allTeamsMemberCount} thành viên
            </span>
          )}

          {/* Brand + Market editor */}
          {selectedTeam && (
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              {editingTeam && !isScaleDataTeam ? (
                <>
                  {/* Brand buttons — Content Team làm cho cả 2 thương hiệu, không cần chọn */}
                  {!isContentTeam && (
                    <>
                      <span className="text-xs text-slate-400 font-medium">Loại:</span>
                      {BRANDS.map(b => (
                        <button
                          key={b.key}
                          onClick={() => setPendingBrand(b.key)}
                          className={cn(
                            'px-3 py-2 rounded-full text-xs font-semibold border-2 transition-all',
                            (pendingBrand ?? brand) === b.key
                              ? b.color === 'amber'
                                ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                : 'bg-violet-600 border-violet-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                          )}
                        >
                          {b.label}
                        </button>
                      ))}
                      <span className="text-slate-300 mx-1">|</span>
                    </>
                  )}
                  {/* Market buttons */}
                  <span className="text-xs text-slate-400 font-medium">TT:</span>
                  {MARKETS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setPendingMarket(m.key)}
                      className={marketBtnClass(m.color, (pendingMarket ?? market) === m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                  <span className="text-slate-300 mx-1">|</span>
                  {/* Team kind buttons */}
                  <span className="text-xs text-slate-400 font-medium">Nhóm:</span>
                  {(['PRODUCTION', 'CONTENT'] as TeamKind[]).map(k => (
                    <button
                      key={k}
                      onClick={() => setPendingTeamKind(k)}
                      className={cn(
                        'px-3 py-2 rounded-full text-xs font-semibold border-2 transition-all',
                        (pendingTeamKind ?? teamKind) === k
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                      )}
                    >
                      {k === 'CONTENT' ? 'Content Team' : 'Sản xuất video'}
                    </button>
                  ))}
                  <span className="text-slate-300 mx-1">|</span>
                  <button
                    onClick={handleSave}
                    disabled={teamMut.isPending}
                    className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setEditingTeam(false); setPendingBrand(null); setPendingMarket(null); setPendingTeamKind(null) }}
                    className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <TeamBadges team={selectedTeam} />
                  {canEditBrand && (
                    <button
                      onClick={() => { setEditingTeam(true); setPendingBrand(brand); setPendingMarket(market); setPendingTeamKind(teamKind) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                      title="Đổi loại & thị trường"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Webhook Lark — thông báo "task/content cần duyệt" của team này */}
          {selectedTeam && (
            <div className="w-full pt-3 mt-1 border-t border-slate-100">
              {editingWebhook ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-medium shrink-0 w-16">URL:</span>
                    <input
                      type="url"
                      autoFocus
                      value={pendingWebhookUrl}
                      onChange={e => setPendingWebhookUrl(e.target.value)}
                      placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
                      className="flex-1 min-w-[240px] px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-medium shrink-0 w-16">Secret:</span>
                    <input
                      type="password"
                      value={pendingWebhookSecret}
                      onChange={e => setPendingWebhookSecret(e.target.value)}
                      placeholder={selectedTeam.lark_webhook_secret_set ? 'Để trống = giữ nguyên secret hiện có' : 'Chỉ cần nếu bot bật Ký số bảo mật'}
                      className="flex-1 min-w-[240px] px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleSaveWebhook}
                      disabled={webhookMut.isPending}
                      className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      {webhookMut.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Check className="w-3.5 h-3.5" />
                      }
                    </button>
                    <button
                      onClick={() => { setEditingWebhook(false); setPendingWebhookSecret('') }}
                      disabled={webhookMut.isPending}
                      className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {selectedTeam.lark_webhook_secret_set && (
                    <button
                      onClick={handleClearWebhookSecret}
                      disabled={webhookMut.isPending}
                      className="text-[11px] text-slate-400 hover:text-red-600 self-start disabled:opacity-50 transition-colors"
                    >
                      Xoá secret đã đặt
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-400 font-medium shrink-0">Webhook Lark:</span>
                  <span className={cn(
                    'text-xs font-medium truncate max-w-[360px]',
                    selectedTeam.lark_webhook_url ? 'text-slate-600' : 'text-slate-400 italic'
                  )}>
                    {selectedTeam.lark_webhook_url || 'Chưa cấu hình — thông báo cần duyệt chỉ gửi vào webhook chung'}
                  </span>
                  {selectedTeam.lark_webhook_secret_set && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                      <Lock className="w-2.5 h-2.5" /> Đã đặt Secret
                    </span>
                  )}
                  {canEditWebhook && (
                    <button
                      onClick={() => {
                        setEditingWebhook(true)
                        setPendingWebhookUrl(selectedTeam.lark_webhook_url ?? '')
                        setPendingWebhookSecret('')
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                      title="Cấu hình webhook Lark riêng cho team"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedTeam?.leader && (
            <div className="flex items-center gap-2 text-sm">
              <Crown className="w-4 h-4 text-amber-600" />
              <span className="text-slate-700 font-medium">{selectedTeam.leader.full_name}</span>
              <span className="bg-amber-50 text-amber-600 text-xs px-2 py-0.5 rounded-full">Leader</span>
            </div>
          )}

          {isAdmin && selectedTeam && (
            <button
              onClick={() => setDeletingTeam(true)}
              title="Xóa team"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {showAllTeams ? (
        !teams ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" aria-hidden="true" />
          </div>
        ) : teams.length === 0 ? (
          <EmptyState icon={Users} title="Chưa có đội nhóm nào" />
        ) : (
          <div className="space-y-4">
            {teams.map(team => {
              const teamMembers = team.members ?? []
              const collapsed = collapsedTeamIds.has(team.id)
              const listId = `team-members-${team.id}`
              return (
                <section key={team.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  <div className={cn(
                    'flex items-center gap-3 flex-wrap px-5 py-3 bg-gray-50/70',
                    !collapsed && 'border-b border-gray-100'
                  )}>
                    <button
                      type="button"
                      onClick={() => toggleTeamCollapsed(team.id)}
                      aria-expanded={!collapsed}
                      aria-controls={listId}
                      className="flex items-center gap-2 min-w-0 py-1.5 -ml-1 pl-1 pr-2 rounded-lg text-left hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform', collapsed && '-rotate-90')}
                      />
                      <span className="text-base font-bold text-slate-800 truncate">{team.name}</span>
                      <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
                        {teamMembers.length} thành viên
                      </span>
                    </button>

                    <div className="flex items-center gap-2 flex-wrap">
                      <TeamBadges team={team} />
                    </div>

                    {team.leader && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Crown className="w-4 h-4 text-amber-600" aria-hidden="true" />
                        <span className="text-slate-700 font-medium">{team.leader.full_name}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => selectTeam(team.id)}
                      title="Mở team để sửa loại, thị trường, webhook"
                      className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Quản lý
                    </button>
                  </div>

                  {!collapsed && (
                    <div id={listId} className="divide-y divide-gray-100">
                      {teamMembers.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-slate-400 italic">Team chưa có thành viên</p>
                      ) : (
                        teamMembers.map(member => renderMemberRow(team, member))
                      )}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )
      ) : !selectedTeam ? (
        <EmptyState icon={Users} title="Chọn đội nhóm để xem thành viên" />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="Team chưa có thành viên" />
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {members.map(member => renderMemberRow(selectedTeam, member))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingTeam}
        title="Xóa team"
        message={`Xóa team "${selectedTeam?.name ?? ''}"? ${members.length > 0 ? `${members.length} thành viên sẽ bị gỡ khỏi team. ` : ''}Nếu team còn task/video/content đang hoạt động, hệ thống sẽ chặn xóa cho tới khi dữ liệu đó được xử lý. Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa team"
        danger
        isLoading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDeletingTeam(false)}
      />
    </div>
  )
}
