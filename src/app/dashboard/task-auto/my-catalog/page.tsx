'use client'

import { useState } from 'react'
import { Package, FileText, Radio, BookUser } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { MyProductsTab } from './components/MyProductsTab'
import { MyContentsTab } from './components/MyContentsTab'
import { MySourcesTab } from './components/MySourcesTab'

type BrandType = 'DO_DA' | 'TRANG_SUC'
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
  const [brand, setBrand]       = useState<BrandType>('DO_DA')
  const [activeTab, setActiveTab] = useState<TabId>('products')

  if (!user) return null

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

      {/* Brand group switcher */}
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

      {/* Tab bar */}
      <div className="border-b border-gray-200 flex gap-1">
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

      {/* Tab content — key={brand} resets state khi đổi nhóm sản phẩm */}
      <div>
        {activeTab === 'products' && <MyProductsTab key={brand} userId={user.id} brandType={brand} />}
        {activeTab === 'contents' && <MyContentsTab key={brand} userId={user.id} brandType={brand} />}
        {activeTab === 'sources'  && <MySourcesTab  key={brand} userId={user.id} brandType={brand} />}
      </div>
    </div>
  )
}
