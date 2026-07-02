'use client'

import { useState, useEffect } from 'react'
import { Package, FileText, Radio, Archive } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { getTeams } from '@/lib/api/task-auto'
import { UserRole } from '@/types/auth'
import { ProductsTab } from './components/ProductsTab/ProductsTab'
import { ContentsTab } from './components/ContentsTab'
import { SourcesTab } from './components/SourcesTab'
import { WarehouseTab } from './components/WarehouseTab'
import type { BrandType } from '@/types/task-auto'

type CatalogTab = 'products' | 'contents' | 'sources' | 'warehouse'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

const TABS: { key: CatalogTab; label: string; icon: React.ElementType }[] = [
  { key: 'products',  label: 'Sản phẩm', icon: Package },
  { key: 'contents',  label: 'Content',  icon: FileText },
  { key: 'sources',   label: 'Sources',  icon: Radio },
  { key: 'warehouse', label: 'Kho tháng', icon: Archive },
]

export default function CatalogPage() {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []
  const isAdminOrManager = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MANAGER)

  const [brand, setBrand]         = useState<BrandType>('TRANG_SUC')
  const [activeTab, setActiveTab] = useState<CatalogTab>('products')
  const [month, setMonth]         = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const isScaleData = !isAdminOrManager && !!(teams?.find(
    t => t.name === 'Scale Data' && t.members?.some((m: any) => m.user_id === user?.id)
  ))

  // Auto-derive brand from user's team for non-admin/manager
  useEffect(() => {
    if (isAdminOrManager || !user?.id || !teams) return
    const myTeam =
      teams.find(t => t.leader_id === user.id) ||
      teams.find(t => t.members?.some(m => m.user_id === user.id))
    if (myTeam?.brand_type) setBrand(myTeam.brand_type)
  }, [isAdminOrManager, user?.id, teams])

  const currentBrand = BRANDS.find(b => b.key === brand)!

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">Danh mục</h1>
        <p className="text-slate-500 text-base mt-1">Quản lý sản phẩm, content và nguồn tài liệu</p>
      </div>

      {/* Tab bar + Brand indicator */}
      <div className="border-b border-gray-200 flex items-center justify-between">
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-base font-medium rounded-t-lg transition-colors',
                activeTab === tab.key
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
          {isAdminOrManager || isScaleData ? (
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

      {/* Tab content — key={brand} reset state khi đổi nhóm */}
      {activeTab === 'products'  && <ProductsTab  key={brand} brandType={brand} month={month} onMonthChange={setMonth} />}
      {activeTab === 'contents'  && <ContentsTab  key={brand} brandType={brand} month={month} onMonthChange={setMonth} />}
      {activeTab === 'sources'   && <SourcesTab   key={brand} brandType={brand} isScaleData={isScaleData || isAdminOrManager} month={month} onMonthChange={setMonth} />}
      {activeTab === 'warehouse' && <WarehouseTab key={brand} brandType={brand} isAdminOrManager={isAdminOrManager} isScaleData={isScaleData} />}
    </div>
  )
}
