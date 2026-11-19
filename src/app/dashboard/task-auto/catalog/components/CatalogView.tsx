'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { getTeams, isPrivilegedSourceTeamMember } from '@/lib/api/task-auto'
import { UserRole } from '@/types/auth'
import { ProductsTab } from './ProductsTab/ProductsTab'
import { SourcesTab } from './SourcesTab'
import type { BrandType } from '@/types/task-auto'

// Mỗi kho là một trang riêng trên thanh nav (Kho sản phẩm / Kho tư liệu dựng video).
export type CatalogKind = 'products' | 'sources'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',     label: 'Đồ da',     color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

const HEADERS: Record<CatalogKind, { title: string; description: string }> = {
  products: { title: 'Kho sản phẩm', description: 'Sản phẩm dùng chung toàn hệ thống để chọn khi tạo nhiệm vụ' },
  sources:  { title: 'Kho tư liệu dựng video', description: 'Tư liệu đầu vào dùng chung toàn hệ thống: video nguồn, outro và tài liệu sản phẩm' },
}

export function CatalogView({ kind }: { kind: CatalogKind }) {
  const { user } = useAuthStore()
  const roles: UserRole[] = user?.roles ?? []
  const isAdminOrManager = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MANAGER)

  const [brand, setBrand] = useState<BrandType>('TRANG_SUC')
  const [month, setMonth] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const isScaleData = !isAdminOrManager && isPrivilegedSourceTeamMember(teams, user?.id)

  // Auto-derive brand from user's team for non-admin/manager
  useEffect(() => {
    if (isAdminOrManager || !user?.id || !teams) return
    const myTeam =
      teams.find(t => t.leader_id === user.id) ||
      teams.find(t => t.members?.some(m => m.user_id === user.id))
    if (myTeam?.brand_type) setBrand(myTeam.brand_type)
  }, [isAdminOrManager, user?.id, teams])

  const currentBrand = BRANDS.find(b => b.key === brand)!
  const header = HEADERS[kind]

  return (
    <div className="space-y-6">
      {/* Page header + Brand indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900">{header.title}</h1>
          <p className="text-slate-500 text-base mt-1">{header.description}</p>
        </div>

        {/* Brand: switcher cho admin/manager, badge cho user thường */}
        <div className="flex gap-3 flex-wrap">
          {isAdminOrManager || isScaleData ? (
            BRANDS.map(b => (
              <button
                key={b.key}
                onClick={() => setBrand(b.key)}
                aria-pressed={brand === b.key}
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
            ))
          ) : (
            <span className={cn(
              'px-6 py-2.5 rounded-full text-sm font-semibold border-2',
              currentBrand.color === 'amber'
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-violet-600 border-violet-600 text-white'
            )}>
              {currentBrand.label}
            </span>
          )}
        </div>
      </div>

      {/* key={brand} reset state khi đổi nhóm */}
      {kind === 'products' && <ProductsTab key={brand} brandType={brand} month={month} onMonthChange={setMonth} />}
      {kind === 'sources'  && <SourcesTab  key={brand} brandType={brand} isScaleData={isScaleData || isAdminOrManager} month={month} onMonthChange={setMonth} />}
    </div>
  )
}
