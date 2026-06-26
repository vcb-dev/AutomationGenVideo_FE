'use client'

import { useScrollLock } from '@/hooks/useScrollLock'
import { X, Trash2, Edit2, ExternalLink, Link2, Globe, User, Calendar, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOURCE_TYPE_LABELS, SourceType } from '@/types/task-auto'

const SOURCE_TYPE_COLORS: Record<string, string> = {
  PRODUCT_STOCK: 'bg-indigo-100 text-indigo-700',
  COLLECTED:     'bg-teal-100 text-teal-700',
  OUTRO:         'bg-purple-100 text-purple-700',
  WORKSHOP:      'bg-orange-100 text-orange-700',
  HUYK:          'bg-rose-100 text-rose-700',
}
const CATALOG_LABELS: Record<string, string> = {
  global: 'Kho tổng',
  team:   'Kho team',
  editor: 'Kho cá nhân',
}
const CATALOG_COLORS: Record<string, string> = {
  global: 'bg-violet-50 text-violet-600',
  team:   'bg-blue-50 text-blue-600',
  editor: 'bg-indigo-50 text-indigo-600',
}

export interface SourceViewItem {
  id: string
  type: SourceType
  name: string
  link: string
  code?: string | null
  is_active?: boolean
  brand_type?: string | null
  added_by?: { full_name: string } | null
  added_at?: string
  created_at?: string
  product?: { id: string; name: string } | null
  team_product?: { id: string; sku: string; name: string } | null
  editor_product?: { id: string; name: string } | null
  source_source_id?: string | null
}

interface Props {
  item: SourceViewItem
  open: boolean
  catalogType: 'global' | 'team' | 'editor'
  canEdit?: boolean
  canDelete?: boolean
  canPushToGlobal?: boolean
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPushToGlobal?: () => void
}

export function SourceViewModal({
  item, open, catalogType,
  canEdit, canDelete, canPushToGlobal,
  onClose, onEdit, onDelete, onPushToGlobal,
}: Props) {
  useScrollLock()

  const dateStr = item.added_at ?? item.created_at
  const linkedProduct = item.team_product ?? item.editor_product ?? item.product

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden ring-1 ring-black/8"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b border-gray-100 shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                <span className={cn('px-3 py-1.5 rounded-full text-sm font-bold shrink-0', SOURCE_TYPE_COLORS[item.type] ?? 'bg-slate-100 text-slate-500')}>
                  {SOURCE_TYPE_LABELS[item.type]}
                </span>
                <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
                  item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-slate-400')}>
                  <span className={cn('w-2 h-2 rounded-full', item.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                  {item.is_active ? 'Hoạt động' : 'Ẩn'}
                </span>
                <span className={cn('px-2.5 py-1 rounded-md text-xs font-semibold', CATALOG_COLORS[catalogType])}>
                  {CATALOG_LABELS[catalogType]}
                </span>
              </div>

              <h2 className="font-bold text-slate-900 text-xl leading-snug">{item.name}</h2>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-slate-500">
                {item.code && (
                  <span className="font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-sm">{item.code}</span>
                )}
                {item.brand_type && (
                  <span>{item.brand_type === 'DO_DA' ? 'Đồ da' : 'Trang sức'}</span>
                )}
                {item.added_by && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.added_by.full_name}</span>
                  </div>
                )}
                {dateStr && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{new Date(dateStr).toLocaleDateString('vi-VN')}</span>
                  </div>
                )}
                {item.source_source_id && (
                  <span className="text-violet-500">· copy từ kho tổng</span>
                )}
              </div>
            </div>

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {/* Link */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
            <Link2 className="w-5 h-5 text-slate-400 shrink-0" />
            <a href={item.link} target="_blank" rel="noreferrer"
              className="flex-1 text-base text-indigo-600 hover:text-indigo-400 truncate transition-colors">
              {item.link}
            </a>
            <ExternalLink className="w-4 h-4 text-slate-300 shrink-0" />
          </div>

          {/* Linked product */}
          {linkedProduct && (
            <div className="bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-sm text-slate-400 font-medium">Sản phẩm liên kết</p>
              </div>
              <div className="flex items-center gap-3">
                {item.team_product?.sku && (
                  <span className="font-mono text-sm text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                    {item.team_product.sku}
                  </span>
                )}
                <span className="text-base font-semibold text-slate-800">{linkedProduct.name}</span>
                {item.team_product && <span className="ml-auto text-sm text-blue-400 shrink-0">Kho team</span>}
                {item.editor_product && !item.team_product && <span className="ml-auto text-sm text-indigo-400 shrink-0">Kho cá nhân</span>}
                {item.product && !item.team_product && !item.editor_product && <span className="ml-auto text-sm text-violet-400 shrink-0">Kho tổng</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex gap-2">
            {canPushToGlobal && onPushToGlobal && (
              <button onClick={() => { onPushToGlobal(); onClose() }}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 rounded-xl transition-colors">
                <Globe className="w-4 h-4" /> Đẩy kho tổng
              </button>
            )}
            {canDelete && onDelete && (
              <button onClick={() => { onDelete(); onClose() }}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" /> Xóa
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-gray-100 rounded-xl transition-colors">
              Đóng
            </button>
            {canEdit && onEdit && (
              <button onClick={() => { onEdit(); onClose() }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
                <Edit2 className="w-4 h-4" /> Chỉnh sửa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
