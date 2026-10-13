'use client'

import { useState } from 'react'
import { Package, FileText, BookUser } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContentViewTabs, type ContentView } from '@/components/task-auto/ContentViewTabs'
import type { BrandType } from '@/types/task-auto'
import { PersonalCatalogPanel, type PersonalCatalogKind } from './components/PersonalCatalogPanel'

const TABS: { id: PersonalCatalogKind; label: string; icon: React.ElementType }[] = [
  { id: 'products',  label: 'Sản phẩm', icon: Package },
  { id: 'contents',  label: 'Nội dung', icon: FileText },
  // Tạm ẩn tư liệu dựng video
  // { id: 'sources',   label: 'Tư liệu dựng video', icon: Radio },
]

export default function MyCatalogPage() {
  const [activeTab, setActiveTab]     = useState<PersonalCatalogKind>('products')
  const [viewUserId, setViewUserId]   = useState('') // '' = xem kho của chính mình
  const [brand, setBrand]             = useState<BrandType>('TRANG_SUC')
  const [contentView, setContentView] = useState<ContentView>('win')

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <BookUser className="w-8 h-8 text-indigo-600" aria-hidden="true" />
        <div>
          <h1 className="text-3xl font-black text-slate-900">Kho cá nhân</h1>
          <p className="text-slate-500 text-base mt-0.5">Kho riêng của bạn — gồm sản phẩm và nội dung do bạn tự thêm</p>
        </div>
      </div>

      <div className="border-b border-gray-200 flex gap-1 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-base rounded-t-xl transition-all shrink-0 whitespace-nowrap',
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

      <div className="space-y-5">
        {activeTab === 'contents' && <ContentViewTabs value={contentView} onChange={setContentView} />}
        <PersonalCatalogPanel
          kind={activeTab}
          contentView={contentView}
          viewUserId={viewUserId}
          onViewUserIdChange={setViewUserId}
          brand={brand}
          onBrandChange={setBrand}
        />
      </div>
    </div>
  )
}
