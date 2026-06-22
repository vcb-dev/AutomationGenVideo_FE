'use client'

import { useState } from 'react'
import { Package, FileText, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductsTab } from './components/ProductsTab/ProductsTab'
import { ContentsTab } from './components/ContentsTab'
import { SourcesTab } from './components/SourcesTab'

type BrandType = 'DO_DA' | 'TRANG_SUC'
type CatalogTab = 'products' | 'contents' | 'sources'

const BRANDS: { key: BrandType; label: string; color: string }[] = [
  { key: 'DO_DA',    label: 'Đồ da',    color: 'amber' },
  { key: 'TRANG_SUC', label: 'Trang sức', color: 'violet' },
]

const TABS: { key: CatalogTab; label: string; icon: React.ElementType }[] = [
  { key: 'products', label: 'Sản phẩm', icon: Package },
  { key: 'contents', label: 'Content',  icon: FileText },
  { key: 'sources',  label: 'Sources',  icon: Radio },
]

export default function CatalogPage() {
  const [brand, setBrand]       = useState<BrandType>('DO_DA')
  const [activeTab, setActiveTab] = useState<CatalogTab>('products')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">Danh mục</h1>
        <p className="text-slate-500 text-base mt-1">Quản lý sản phẩm, content và nguồn tài liệu</p>
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

      {/* Tab content — key={brand} reset state khi đổi nhóm */}
      {activeTab === 'products' && <ProductsTab key={brand} brandType={brand} />}
      {activeTab === 'contents' && <ContentsTab key={brand} brandType={brand} />}
      {activeTab === 'sources'  && <SourcesTab  key={brand} brandType={brand} />}
    </div>
  )
}
