'use client'

import { useState } from 'react'
import { Package, User, BookOpen, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { MembersTab } from './components/MembersTab'
import { TeamProductsTab } from './components/TeamProductsTab'
import { TeamContentsTab } from './components/TeamContentsTab'
import { TeamSourcesTab } from './components/TeamSourcesTab'
import { UserRole } from '@/types/auth'

type BrandType = 'DO_DA' | 'TRANG_SUC'
type TabId = 'members' | 'products' | 'contents' | 'sources'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

const BRAND_TABS: TabId[] = ['products', 'contents', 'sources']

const ALL_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'members',  label: 'Nhóm của tôi', icon: User },
  { id: 'products', label: 'Kho sản phẩm', icon: Package },
  { id: 'contents', label: 'Kho content',  icon: BookOpen },
  { id: 'sources',  label: 'Kho source',   icon: Radio },
]

export default function TeamsPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []

  const isAdmin          = roles.includes(UserRole.ADMIN)
  const isManager        = roles.includes(UserRole.MANAGER)
  const isLeader         = roles.includes(UserRole.LEADER)
  const isAdminOrManager = isAdmin || isManager
  const canManage        = isAdmin || isManager || isLeader

  const [activeTab, setActiveTab] = useState<TabId>('members')
  const [brand, setBrand] = useState<BrandType>('DO_DA')

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">Đội nhóm</h1>
        <p className="text-slate-500 text-base mt-1">Quản lý đội nhóm và thành viên</p>
      </div>

      {/* Tab bar + brand switcher cùng hàng */}
      <div className="border-b border-gray-200 flex items-end gap-1">
        <div className="flex gap-1">
          {ALL_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-base transition-all border-b-2 -mb-px',
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

        {/* Brand switcher — hiện khi ở tab kho, không gây layout shift */}
        {BRAND_TABS.includes(activeTab) && (
          <div className="flex gap-2 ml-auto pb-2">
            {BRANDS.map(b => (
              <button
                key={b.key}
                onClick={() => setBrand(b.key)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all',
                  brand === b.key
                    ? b.color === 'amber'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-violet-600 border-violet-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab content */}
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

    </div>
  )
}
