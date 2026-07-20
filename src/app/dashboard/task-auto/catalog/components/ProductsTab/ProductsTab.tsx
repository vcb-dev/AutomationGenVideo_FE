'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, Plus, Edit2, Trash2, Package, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { HeaderFilterDropdown } from '@/components/task-auto/HeaderFilterDropdown'
import {
  getProducts, deleteProduct,
  getProductLines, createProductLine, deleteProductLine,
  getMaterials, createMaterial, deleteMaterial,
  getProductClassifications, createProductClassification, deleteProductClassification,
} from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { parseMarkets, formatPrice } from './product-utils'
import { MarketBadge, LoadingRows, MiniList } from './ProductFormFields'
import { ProductFormModal } from '@/components/task-auto/ProductFormModal'
import { ProductViewModal } from '@/components/task-auto/ProductViewModal'
import { Product } from '@/types/task-auto'

type BrandType = 'DO_DA' | 'TRANG_SUC'

export function ProductsTab({ brandType, month, onMonthChange }: { brandType: BrandType; month: string; onMonthChange: (month: string) => void }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canDelete = user?.roles?.some((r: string) => ['ADMIN', 'MANAGER'].includes(r)) ?? false
  const [search, setSearch] = useState('')
  const [productLineFilter, setProductLineFilter] = useState('')
  const [classificationFilter, setClassificationFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCatalogPanel, setShowCatalogPanel] = useState(false)

  const { data: productLines } = useQuery({ queryKey: ['task-auto', 'product-lines'], queryFn: () => getProductLines() })
  const { data: materials } = useQuery({ queryKey: ['task-auto', 'materials', brandType], queryFn: () => getMaterials(brandType) })
  const { data: productClassifications } = useQuery({ queryKey: ['task-auto', 'product-classifications'], queryFn: () => getProductClassifications() })
  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'products', brandType, search, productLineFilter, classificationFilter, activeFilter, month, page],
    queryFn: () => getProducts({
      brand_type: brandType,
      search: search || undefined,
      product_line_id: productLineFilter || undefined,
      classification_id: classificationFilter || undefined,
      is_active: activeFilter === 'all' ? undefined : activeFilter === 'true',
      month: month || undefined,
      page, limit: 10,
    }),
  })

  const refresh = () => qc.refetchQueries({ queryKey: ['task-auto', 'products'] })

  const createLineMut = useMutation({
    mutationFn: ({ name }: { name: string }) => createProductLine(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'product-lines'] }),
    onError: () => toast.error('Không thể thêm dòng sản phẩm'),
  })
  const deleteLineMut = useMutation({
    mutationFn: deleteProductLine,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'product-lines'] }),
    onError: () => toast.error('Không thể xóa dòng sản phẩm'),
  })
  const createMatMut = useMutation({
    mutationFn: ({ name }: { name: string }) => createMaterial(name, brandType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'materials', brandType] }),
    onError: () => toast.error('Không thể thêm chất liệu'),
  })
  const deleteMatMut = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'materials'] }),
    onError: () => toast.error('Không thể xóa chất liệu'),
  })
  const createClassificationMut = useMutation({
    mutationFn: ({ name }: { name: string }) => createProductClassification(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'product-classifications'] }),
    onError: () => toast.error('Không thể thêm phân loại sản phẩm'),
  })
  const deleteClassificationMut = useMutation({
    mutationFn: deleteProductClassification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'product-classifications'] }),
    onError: () => toast.error('Không thể xóa phân loại sản phẩm'),
  })

  const openCreate = () => {
    setEditing(null)
    setModal('create')
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setViewProduct(null)
    setModal('edit')
  }

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => { await refresh(); toast.success('Đã xóa sản phẩm'); setDeletingId(null) },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Không thể xóa sản phẩm'
      toast.error(msg)
      setDeletingId(null)
    },
  })

  const total = data?.total ?? 0

  return (
    <div className="space-y-5">

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm kiếm SKU, tên sản phẩm..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          {/* <CustomSelect
            value={activeFilter}
            onChange={v => { setActiveFilter(v as 'all' | 'true' | 'false'); setPage(1) }}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'true', label: 'Đang hoạt động' },
              { value: 'false', label: 'Không hoạt động' },
            ]}
            className="min-w-[175px]"
          /> */}
          <input
            type="month"
            value={month}
            onChange={e => { onMonthChange(e.target.value); setPage(1) }}
            className="px-3 py-3.5 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {canDelete && (
            <button
              onClick={openCreate}
              className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
            >
              <Plus className="w-5 h-5" /> Thêm sản phẩm
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {total > 0 && (
        <p className="text-sm text-slate-500 px-1">
          Tổng <span className="font-bold text-slate-700">{total}</span> sản phẩm
          {search && <span> · kết quả cho "<span className="font-semibold text-indigo-600">{search}</span>"</span>}
        </p>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-gray-200">
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">SKU</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Sản phẩm</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">
                  <HeaderFilterDropdown
                    label="Dòng SP"
                    value={productLineFilter}
                    onChange={v => { setProductLineFilter(v); setPage(1) }}
                    options={(productLines ?? []).map(l => ({ value: l.id, label: l.name }))}
                  />
                </th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Chất liệu</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">
                  <HeaderFilterDropdown
                    label="Phân loại"
                    value={classificationFilter}
                    onChange={v => { setClassificationFilter(v); setPage(1) }}
                    options={(productClassifications ?? []).map(c => ({ value: c.id, label: c.name }))}
                  />
                </th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Thị trường</th>
                <th className="text-right px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Giá bán</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Trạng thái</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Người thêm</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Ngày thêm</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <LoadingRows cols={11} />}

              {!isLoading && (!data?.data || data.data.length === 0) && (
                <tr>
                  <td colSpan={11}>
                    <EmptyState icon={Package} title="Không có sản phẩm nào" />
                  </td>
                </tr>
              )}

              {data?.data.map(p => {
                const tp = p.source_team_product
                const tp_ep = tp?.source_editor_product
                const rSku = p.sku || tp?.sku || tp_ep?.sku || ''
                const rName = p.name || tp?.name || tp_ep?.name || ''
                const rPrice = p.price || tp?.price || tp_ep?.price || null
                const rPriceSeg = p.price_segment || tp?.price_segment || tp_ep?.price_segment || null
                const rMarket = p.market || tp?.market || tp_ep?.market || null
                const rProductLine = p.product_line ?? tp?.product_line ?? tp_ep?.product_line ?? null
                const rMaterial = p.material ?? tp?.material ?? tp_ep?.material ?? null
                const rClassification = p.classification ?? tp?.classification ?? tp_ep?.classification ?? null
                const rImages = p.image_urls?.length ? p.image_urls : tp?.image_urls?.length ? tp.image_urls : tp_ep?.image_urls?.length ? tp_ep.image_urls : []
                const rImageUrl = p.image_url ?? tp?.image_url ?? tp_ep?.image_url ?? null
                const thumb = rImages[0] ?? rImageUrl
                return (
                  <tr key={p.id} onClick={() => setViewProduct(p)} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-block bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg">
                        {rSku || <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img src={driveImageUrl(thumb) ?? thumb} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0 shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-800 truncate max-w-[260px]" title={rName}>{rName || <span className="text-slate-300 italic font-normal text-sm">Chưa đặt tên</span>}</p>
                          {rPriceSeg && <p className="text-xs text-slate-400 mt-0.5">{rPriceSeg}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {rProductLine?.name
                        ? <span className="text-sm font-medium text-slate-700">{rProductLine.name}</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {rMaterial?.name
                        ? <span className="text-sm text-slate-600">{rMaterial.name}</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {rClassification?.name
                        ? <span className="text-sm text-slate-600">{rClassification.name}</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex gap-1.5">
                        {parseMarkets(rMarket).map(m => <MarketBadge key={m} market={m} />)}
                        {!rMarket && <span className="text-slate-300 text-sm">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {formatPrice(rPrice)
                        ? <span className="text-base font-bold text-slate-800">{formatPrice(rPrice)}</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                        p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-slate-400'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', p.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                        {p.is_active ? 'Hoạt động' : 'Ẩn'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-500">
                        {p.added_by?.full_name ?? <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-500">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        {canDelete && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); openEdit(p) }}
                              className="p-2 rounded-xl hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDeletingId(p.id) }}
                              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-slate-500">
              Trang <span className="font-semibold text-slate-700">{page}</span> / {data.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
                const pg = data.totalPages <= 7
                  ? i + 1
                  : page <= 4
                    ? i + 1
                    : page >= data.totalPages - 3
                      ? data.totalPages - 6 + i
                      : page - 3 + i
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn('w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                      pg === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-200 text-slate-600'
                    )}>
                    {pg}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Catalog management panel */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCatalogPanel(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 transition-colors group"
        >
          <span className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-indigo-600" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-bold text-slate-800">Dòng sản phẩm, Chất liệu &amp; Phân loại</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                {(productLines?.length ?? 0)} dòng sản phẩm · {(materials?.length ?? 0)} chất liệu · {(productClassifications?.length ?? 0)} phân loại
              </span>
            </span>
          </span>
          <ChevronRight className={cn(
            'w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:text-slate-600',
            showCatalogPanel && 'rotate-90'
          )} />
        </button>
        {showCatalogPanel && (
          <div className="border-t border-gray-100 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MiniList
              title="Dòng sản phẩm"
              items={productLines ?? []}
              addLabel="Nhập tên dòng sản phẩm..."
              onAdd={name => createLineMut.mutateAsync({ name })}
              onDelete={id => deleteLineMut.mutate(id)}
              color="purple"
            />
            <MiniList
              title="Chất liệu"
              items={materials ?? []}
              addLabel="Nhập tên chất liệu..."
              onAdd={name => createMatMut.mutateAsync({ name })}
              onDelete={id => deleteMatMut.mutate(id)}
              color="teal"
            />
            <MiniList
              title="Phân loại sản phẩm"
              items={productClassifications ?? []}
              addLabel="Nhập tên phân loại..."
              onAdd={name => createClassificationMut.mutateAsync({ name })}
              onDelete={id => deleteClassificationMut.mutate(id)}
              color="indigo"
            />
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <ProductFormModal
          open
          editing={editing}
          defaultBrandType={brandType}
          lockBrandType
          onClose={() => setModal(null)}
          onSuccess={() => { refresh(); setModal(null) }}
        />
      )}

      {viewProduct && (
        <ProductViewModal
          open
          item={viewProduct as any}
          catalogType="global"
          canEdit={canDelete}
          canDelete={canDelete}
          onClose={() => setViewProduct(null)}
          onEdit={() => { openEdit(viewProduct); setViewProduct(null) }}
          onDelete={() => { setDeletingId(viewProduct.id); setViewProduct(null) }}
        />
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Xóa sản phẩm"
        message="Sản phẩm sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xóa sản phẩm"
        danger
        isLoading={deleteMut.isPending}
        onConfirm={() => deletingId && deleteMut.mutate(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
