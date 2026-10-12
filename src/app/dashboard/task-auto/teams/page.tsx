'use client'

import { useState, useEffect } from 'react'
import { Package, User, Users, Globe, BookOpen, BarChart2, Inbox } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { canAccessRoute } from '@/lib/permissions'
import { ProductsTab } from '../catalog/components/ProductsTab/ProductsTab'
import { ContentsTab } from '../content/components/ContentsTab'
import { PersonalCatalogPanel } from '../my-catalog/components/PersonalCatalogPanel'
import { MembersTab } from './components/MembersTab'
import { CreateTeamModal } from './components/CreateTeamModal'
import { TeamProductsTab } from './components/TeamProductsTab'
import { TeamContentsTab } from './components/TeamContentsTab'
import { WinVideosGrid } from '@/components/task-auto/WinVideosGrid'
import { ContentViewTabs, type ContentView } from '@/components/task-auto/ContentViewTabs'
import { TeamSourcesTab } from './components/TeamSourcesTab'
import { TeamStatsTab } from './components/TeamStatsTab'
import { TeamPushRequestsTab } from './components/TeamPushRequestsTab'
import { UserRole } from '@/types/auth'
import { getTeams, isPrivilegedSourceTeamMember, isContentTeamMember } from '@/lib/api/task-auto'
import { formatTeamName } from '@/lib/task-auto/team-label'
import type { BrandType } from '@/types/task-auto'

type TabId = 'members' | 'products' | 'contents' | 'sources' | 'stats' | 'push-requests'

const BASE_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'contents',  label: 'Kho nội dung', icon: BookOpen },
  { id: 'products',  label: 'Kho sản phẩm', icon: Package },
  // Tạm ẩn kho tư liệu dựng video
  // { id: 'sources',   label: 'Kho tư liệu dựng video', icon: Radio },
]

const MEMBERS_TAB = { id: 'members' as TabId, label: 'Thành viên', icon: User }

const STATS_TAB = { id: 'stats' as TabId, label: 'Thống kê đóng góp', icon: BarChart2 }
const PUSH_REQUESTS_TAB = { id: 'push-requests' as TabId, label: 'Yêu cầu thêm vào kho', icon: Inbox }

type CatalogScope = 'personal' | 'team' | 'global'

const SCOPES: { id: CatalogScope; label: string; icon: React.ElementType }[] = [
  { id: 'personal', label: 'Kho cá nhân', icon: User },
  { id: 'team', label: 'Kho team', icon: Users },
  { id: 'global', label: 'Kho tổng', icon: Globe },
]

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

function ScopeTabs({ scopes, value, onChange }: { scopes: CatalogScope[]; value: CatalogScope; onChange: (v: CatalogScope) => void }) {
  if (scopes.length < 2) return null
  return (
    <div role="tablist" aria-label="Phạm vi kho" className="inline-flex gap-1 p-1 bg-white border border-gray-200 rounded-xl shadow-sm">
      {SCOPES.filter(s => scopes.includes(s.id)).map(s => {
        const active = value === s.id
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
              active ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-gray-100',
            )}
          >
            <s.icon className="w-4 h-4" aria-hidden="true" />
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

export default function TeamsPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []

  const isAdmin          = roles.includes(UserRole.ADMIN)
  const isManager        = roles.includes(UserRole.MANAGER)
  const isLeader         = roles.includes(UserRole.LEADER)
  const isAdminOrManager = isAdmin || isManager
  const canManage        = isAdmin || isManager || isLeader

  const [activeTab, setActiveTab]           = useState<TabId>('contents')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  // Tab source của Scale Data members dùng state riêng để chọn team độc lập với các tab khác
  const [sourceTeamId, setSourceTeamId]     = useState('')
  // State lọc theo tháng dùng chung giữa các tab products/contents/sources
  const [month, setMonth]                   = useState('')
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [contentView, setContentView]       = useState<ContentView>('manual')
  const [productScope, setProductScope]     = useState<CatalogScope>('team')
  const [contentScope, setContentScope]     = useState<CatalogScope>('team')
  const [globalBrand, setGlobalBrand]       = useState<BrandType | null>(null)
  const [personalUserId, setPersonalUserId] = useState('')
  const [personalBrand, setPersonalBrand]   = useState<BrandType>('TRANG_SUC')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  // Auto-select own team for non-admin/manager
  useEffect(() => {
    if (!isAdminOrManager && user?.id && teams && !selectedTeamId) {
      const myTeam =
        teams.find(t => t.leader_id === user.id) ||
        teams.find(t => t.members?.some(m => m.user_id === user.id))
      if (myTeam) setSelectedTeamId(myTeam.id)
    }
  }, [isAdminOrManager, user?.id, teams, selectedTeamId])

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const brand: BrandType = selectedTeam?.brand_type ?? 'TRANG_SUC'
  // User nhiều team thấy tên team đang chọn
  const pageTitle = isAdminOrManager
    ? 'Nội dung, sản phẩm & team'
    : selectedTeam ? formatTeamName(selectedTeam.name) : 'Nội dung, sản phẩm & team'

  // Scale Data membership: ADMIN/MANAGER hoặc là thành viên team "Scale Data"
  const scaleDataTeam = teams?.find(t => t.name === 'Scale Data')
  const scaleDataTeamId = scaleDataTeam?.id ?? ''
  const isScaleDataMember = isAdminOrManager || !!(scaleDataTeam?.members?.some((m: any) => m.user_id === user?.id))
  // Quyền quản lý source xuyên team: Scale Data hoặc MEDIA (khớp BE ScaleDataSourceGuard/assertCanManageSource)
  const canManageAnyTeamSources = isAdminOrManager || isPrivilegedSourceTeamMember(teams, user?.id)

  // Kho cá nhân + kho tổng gộp vào đây thay cho các trang riêng — vẫn giữ quyền của các trang cũ
  const canViewPersonal = canAccessRoute(user, '/dashboard/task-auto/my-catalog')
  const canViewGlobalProducts = canAccessRoute(user, '/dashboard/task-auto/catalog/products')
  const canViewGlobalContents = canAccessRoute(user, '/dashboard/task-auto/content')
  const productScopes: CatalogScope[] = [
    ...(canViewPersonal ? ['personal' as const] : []),
    'team',
    ...(canViewGlobalProducts ? ['global' as const] : []),
  ]
  const contentScopes: CatalogScope[] = [
    ...(canViewPersonal ? ['personal' as const] : []),
    'team',
    ...(canViewGlobalContents ? ['global' as const] : []),
  ]
  const activeProductScope: CatalogScope = productScopes.includes(productScope) ? productScope : 'team'
  const activeContentScope: CatalogScope = contentScopes.includes(contentScope) ? contentScope : 'team'
  const showGlobalProducts = activeProductScope === 'global'
  const showGlobalContents = activeContentScope === 'global'
  // Content Team làm content cho cả 2 thương hiệu nên được đổi như admin/manager/Scale Data
  const canSwitchGlobalBrand = canManageAnyTeamSources || isContentTeamMember(teams, user?.id)
  const globalContentBrand = (canSwitchGlobalBrand ? globalBrand : null) ?? brand

  // Tab "Thống kê" chỉ hiển thị với Scale Data member (xem thống kê source, luôn dùng Scale Data team ID) —
  // thống kê content đã duyệt của leader đã chuyển sang card content creator ở /dashboard/leader.
  const showStatsTab = isScaleDataMember && !!scaleDataTeamId
  // Tab "Chờ duyệt" cho leader/admin/manager — duyệt yêu cầu đẩy kho cá nhân → kho team
  const showPushRequestsTab = canManage
  const visibleTabs = [
    ...BASE_TABS,
    ...(showPushRequestsTab ? [PUSH_REQUESTS_TAB] : []),
    // Tạm ẩn thống kê đóng góp
    // ...(showStatsTab ? [STATS_TAB] : []),
    MEMBERS_TAB,
  ]

  // Nếu đang ở stats tab nhưng mất quyền (teams chưa load xong), reset về tab mặc định
  useEffect(() => {
    if (activeTab === 'stats' && !showStatsTab) setActiveTab('contents')
  }, [showStatsTab, activeTab])

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">{pageTitle}</h1>
        <p className="text-slate-500 text-base mt-1">
          {isAdminOrManager
            ? 'Kho nội dung, kho sản phẩm (cá nhân, từng team, kho tổng) và quản lý đội nhóm, thành viên'
            : 'Nội dung, sản phẩm và thành viên của team bạn'}
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 flex gap-1 overflow-x-auto scrollbar-none">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-base transition-all border-b-2 -mb-px shrink-0 whitespace-nowrap',
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-gray-100 rounded-t-xl'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'members' && (
        <MembersTab
          canManage={canManage}
          isAdmin={isAdmin}
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
          onCreateTeam={isAdminOrManager ? () => setCreateTeamOpen(true) : undefined}
        />
      )}

      {activeTab === 'products' && (
        <div className="space-y-5">
          <ScopeTabs scopes={productScopes} value={activeProductScope} onChange={setProductScope} />
          {showGlobalProducts ? (
            <ProductsTab brandType={brand} month={month} onMonthChange={setMonth} />
          ) : activeProductScope === 'personal' ? (
            <PersonalCatalogPanel
              kind="products"
              contentView={contentView}
              viewUserId={personalUserId}
              onViewUserIdChange={setPersonalUserId}
              brand={personalBrand}
              onBrandChange={setPersonalBrand}
            />
          ) : (
            <TeamProductsTab
              isAdminOrManager={isAdminOrManager}
              userId={user?.id}
              brandType={brand}
              selectedTeamId={selectedTeamId}
              setSelectedTeamId={setSelectedTeamId}
              month={month}
              setMonth={setMonth}
            />
          )}
        </div>
      )}

      {/* Kho content: video win (lọc sẵn theo người/team đang chọn) + content nhập tay như cũ */}
      {activeTab === 'contents' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <ScopeTabs scopes={contentScopes} value={activeContentScope} onChange={setContentScope} />
            <ContentViewTabs value={contentView} onChange={setContentView} />
            {showGlobalContents && contentView === 'manual' && canSwitchGlobalBrand && (
              <div className="flex gap-2 flex-wrap sm:ml-auto">
                {BRANDS.map(b => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setGlobalBrand(b.key)}
                    aria-pressed={globalContentBrand === b.key}
                    className={cn(
                      'px-5 py-2 rounded-full text-sm font-semibold border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
                      globalContentBrand === b.key
                        ? b.color === 'amber'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                          : 'bg-violet-600 border-violet-600 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {activeContentScope === 'personal' ? (
            <PersonalCatalogPanel
              kind="contents"
              contentView={contentView}
              viewUserId={personalUserId}
              onViewUserIdChange={setPersonalUserId}
              brand={personalBrand}
              onBrandChange={setPersonalBrand}
            />
          ) : contentView === 'win' ? (
            showGlobalContents
              ? <WinVideosGrid key="global" />
              : <WinVideosGrid key={selectedTeamId} defaultTeamId={selectedTeamId} />
          ) : showGlobalContents ? (
            <ContentsTab key={globalContentBrand} brandType={globalContentBrand} month={month} onMonthChange={setMonth} />
          ) : (
            <TeamContentsTab
              canManage={canManage}
              isAdminOrManager={isAdminOrManager}
              userId={user?.id}
              brandType={brand}
              selectedTeamId={selectedTeamId}
              setSelectedTeamId={setSelectedTeamId}
              month={month}
              setMonth={setMonth}
            />
          )}
        </div>
      )}

      {activeTab === 'sources' && (
        <TeamSourcesTab
          isAdminOrManager={isAdminOrManager}
          isScaleData={canManageAnyTeamSources}
          userId={user?.id}
          brandType={canManageAnyTeamSources && !isAdminOrManager
            ? (teams?.find(t => t.id === sourceTeamId)?.brand_type ?? brand)
            : brand}
          selectedTeamId={canManageAnyTeamSources && !isAdminOrManager ? sourceTeamId : selectedTeamId}
          setSelectedTeamId={canManageAnyTeamSources && !isAdminOrManager ? setSourceTeamId : setSelectedTeamId}
          month={month}
          setMonth={setMonth}
        />
      )}

      {activeTab === 'push-requests' && showPushRequestsTab && (
        <TeamPushRequestsTab
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
        />
      )}

      {activeTab === 'stats' && showStatsTab && (
        <TeamStatsTab
          teamId={scaleDataTeamId}
          showSourceStats={isScaleDataMember}
        />
      )}

      <CreateTeamModal
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onSuccess={team => setSelectedTeamId(team.id)}
      />

    </div>
  )
}
