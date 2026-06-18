'use client'

import { useState } from 'react'
import { Package, FileText, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductsTab } from './components/ProductsTab/ProductsTab'
import { ContentsTab } from './components/ContentsTab'
import { SourcesTab } from './components/SourcesTab'

type CatalogTab = 'products' | 'contents' | 'sources'

const TABS: { key: CatalogTab; label: string; icon: React.ElementType }[] = [
  { key: 'products', label: 'Sản phẩm', icon: Package },
  { key: 'contents', label: 'Content', icon: FileText },
  { key: 'sources', label: 'Sources', icon: Radio },
]

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState<CatalogTab>('products')

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">Danh mục</h1>
        <p className="text-slate-500 text-base mt-1">Quản lý sản phẩm, content và nguồn tài liệu</p>
      </div>

      {/* Tab bar — consistent with teams/kpi pages */}
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

      {/* Tab content */}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'contents' && <ContentsTab />}
      {activeTab === 'sources' && <SourcesTab />}
    </div>
  )
}
