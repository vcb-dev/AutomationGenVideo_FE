'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Package, Info, User, BookOpen, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { TeamsGrid } from './components/TeamsGrid'
import { TeamFormModal, DeleteTeamModal } from './components/TeamModals'
import { MembersTab } from './components/MembersTab'
import { TeamProductsTab } from './components/TeamProductsTab'
import { TeamContentsTab } from './components/TeamContentsTab'
import { TeamSourcesTab } from './components/TeamSourcesTab'
import { Team } from '@/types/task-auto'
import { UserRole } from '@/types/auth'
import { getTeams, getUsers } from '@/lib/api/task-auto'

type BrandType = 'DO_DA' | 'TRANG_SUC'
type TabId = 'teams' | 'members' | 'products' | 'contents' | 'sources'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

const BRAND_TABS: TabId[] = ['products', 'contents', 'sources']

const ALL_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'teams',    label: 'Đội nhóm',     icon: Users },
  { id: 'members',  label: 'Nhóm của tôi', icon: User },
  { id: 'products', label: 'Kho sản phẩm', icon: Package },
  { id: 'contents', label: 'Kho content',  icon: BookOpen },
  { id: 'sources',  label: 'Kho source',   icon: Radio },
]

export default function TeamsPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []

  const isAdmin         = roles.includes(UserRole.ADMIN)
  const isManager       = roles.includes(UserRole.MANAGER)
  const isLeader        = roles.includes(UserRole.LEADER)
  const isAdminOrManager = isAdmin || isManager
  const isMember        = !isAdmin && !isManager && !isLeader

  // canManage = thêm/xoá thành viên, gán editor
  const canManage = isAdmin || isManager || isLeader
  // canDelete = xoá team (ADMIN/MANAGER only)
  const canDelete = isAdminOrManager
  // canEditTeam = sửa leader (ADMIN/MANAGER only, team đến từ hệ thống gốc)
  const canEditTeam = isAdminOrManager

  const [activeTab, setActiveTab] = useState<TabId>(isAdminOrManager ? 'teams' : 'members')
  const [brand, setBrand] = useState<BrandType>('DO_DA')
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)

  const { data: teams, isLoading } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })
  const { data: users } = useQuery({
    queryKey: ['task-auto', 'users'],
    queryFn: () => getUsers(),
    enabled: canEditTeam,
  })

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">Đội nhóm</h1>
        <p className="text-slate-500 text-base mt-1">Quản lý đội nhóm và thành viên</p>
      </div>

      {/* Member info banner */}
      {isMember && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-blue-700 text-sm">
          <Info className="w-4 h-4 shrink-0" />
          <span>Bạn đang xem với quyền <strong>Thành viên</strong> — chỉ xem thành viên trong team của bạn.</span>
        </div>
      )}

      {/* Brand group switcher — chỉ hiện ở tab kho sản phẩm/content/source */}
      {BRAND_TABS.includes(activeTab) && (
        <div className="flex gap-3">
          {BRANDS.map(b => (
            <button
              key={b.key}
              onClick={() => setBrand(b.key)}
              className={cn(
                'px-6 py-2.5 rounded-full text-sm font-semibold border-2 transition-all',
                brand === b.key
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

      {/* Tab bar */}
      <div className="border-b border-gray-200 flex gap-1 mb-6">
        {ALL_TABS.filter(tab => tab.id !== 'teams' || isAdminOrManager).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-base rounded-t-xl transition-all',
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-gray-100'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'teams' && (
        <TeamsGrid
          teams={teams}
          isLoading={isLoading}
          canDelete={canDelete}
          canEdit={canEditTeam}
          onEdit={team => { setEditTeam(team); setShowEditForm(true) }}
          onDelete={team => setDeleteTarget(team)}
        />
      )}

      {activeTab === 'members' && (
        <MembersTab
          canManage={canManage}
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
        />
      )}

      {activeTab === 'products' && (
        <TeamProductsTab
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
          brandType={brand}
        />
      )}

      {activeTab === 'contents' && (
        <TeamContentsTab
          canManage={canManage}
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
          brandType={brand}
        />
      )}

      {activeTab === 'sources' && (
        <TeamSourcesTab
          isAdminOrManager={isAdminOrManager}
          userId={user?.id}
          brandType={brand}
        />
      )}

      {/* Edit team modal (no create) */}
      <TeamFormModal
        open={showEditForm}
        team={editTeam || undefined}
        users={users || []}
        onClose={() => setShowEditForm(false)}
        onSuccess={() => setShowEditForm(false)}
      />
      <DeleteTeamModal
        open={!!deleteTarget}
        team={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => setDeleteTarget(null)}
      />
    </div>
  )
}
