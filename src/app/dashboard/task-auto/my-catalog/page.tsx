'use client'

import { useState, useEffect } from 'react'
import { Package, FileText, Radio, BookUser } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { getTeams } from '@/lib/api/task-auto'
import { UserRole } from '@/types/auth'
import { MyProductsTab } from './components/MyProductsTab'
import { MyContentsTab } from './components/MyContentsTab'
import { MySourcesTab } from './components/MySourcesTab'
import type { BrandType } from '@/types/task-auto'

type TabId = 'products' | 'contents' | 'sources'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'products', label: 'Sản phẩm', icon: Package },
  { id: 'contents', label: 'Content',  icon: FileText },
  { id: 'sources',  label: 'Source',   icon: Radio },
]

export default function MyCatalogPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []
  const isAdminOrManager = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MANAGER)

  const [brand, setBrand]         = useState<BrandType>('TRANG_SUC')
  const [activeTab, setActiveTab] = useState<TabId>('products')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
    enabled: !isAdminOrManager,
  })

  // Auto-derive brand from user's team for non-admin/manager
  useEffect(() => {
    if (isAdminOrManager || !user?.id || !teams) return
    const myTeam =
      teams.find(t => t.leader_id === user.id) ||
      teams.find(t => t.members?.some(m => m.user_id === user.id))
    if (myTeam?.brand_type) setBrand(myTeam.brand_type)
  }, [isAdminOrManager, user?.id, teams])

  if (!user) return null

  const currentBrand = BRANDS.find(b => b.key === brand)!

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <BookUser className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-black text-slate-900">Kho cá nhân</h1>
            <p className="text-slate-500 text-base mt-0.5">
              Danh mục riêng của bạn — sản phẩm, content và source bạn tự thêm
            </p>
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 text-indigo-700 text-sm">
        Những mục trong kho cá nhân chỉ mình bạn quản lý. Bạn có thể{' '}
        <strong>đẩy sang kho team</strong> để chia sẻ với cả đội.
      </div>

      {/* Tab bar + Brand indicator */}
      <div className="border-b border-gray-200 flex items-center justify-between">
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
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

        {/* Brand: switcher cho admin/manager, badge cho user thường */}
        <div className="flex gap-3 pb-1">
          {isAdminOrManager ? (
            BRANDS.map(b => (
              <button
                key={b.key}
                onClick={() => setBrand(b.key)}
                className={cn(
                  'px-6 py-1.5 rounded-full text-sm font-semibold border-2 transition-all',
                  brand === b.key
                    ? b.color === 'amber'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                      : 'bg-violet-600 border-violet-600 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                )}
              >
                {b.label}
              </button>
            ))
          ) : (
            <span className={cn(
              'px-6 py-1.5 rounded-full text-sm font-semibold border-2',
              currentBrand.color === 'amber'
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-violet-600 border-violet-600 text-white'
            )}>
              {currentBrand.label}
            </span>
          )}
        </div>
      </div>

      {/* Tab content — key={brand} resets state khi đổi nhóm */}
      <div>
        {activeTab === 'products' && <MyProductsTab key={brand} userId={user.id} brandType={brand} />}
        {activeTab === 'contents' && <MyContentsTab key={brand} userId={user.id} brandType={brand} />}
        {activeTab === 'sources'  && <MySourcesTab  key={brand} userId={user.id} brandType={brand} />}
      </div>
    </div>
  )
}
