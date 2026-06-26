'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, Plus, Edit2, Trash2, Loader2, Package, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, CustomSelect, CreatableSelect } from '@/components/task-auto/DarkInput'
import { EmptyState } from '@/components/task-auto/EmptyState'
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getProductLines, createProductLine, deleteProductLine,
  getMaterials, createMaterial, deleteMaterial,
  createSource,
} from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { parseMarkets, formatPrice, defaultSource } from './product-utils'
import type { SourceDraft } from './product-utils'
import { MarketBadge, LoadingRows, MiniList, MarketPicker, PriceInput, MultiImagePicker, SourceForm } from './ProductFormFields'
import { ProductViewModal } from '@/components/task-auto/ProductViewModal'
import { Product } from '@/types/task-auto'

type BrandType = 'DO_DA' | 'TRANG_SUC'

export function ProductsTab({ brandType }: { brandType: BrandType }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canDelete = user?.roles?.some((r: string) => ['ADMIN', 'MANAGER'].includes(r)) ?? false
  const [search, setSearch] = useState('')
  const [productLineFilter, setProductLineFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCatalogPanel, setShowCatalogPanel] = useState(false)
  const [form, setForm] = useState<Partial<Product> & { image_urls: string[] }>({
    sku: '', name: '', image_urls: [], price: '',
    price_segment: '', priority_score: 0, material_id: '', product_line_id: '', is_active: true,
  })
  const [markets, setMarkets] = useState<string[]>(['VIETNAM'])
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(defaultSource)

  const { data: productLines } = useQuery({ queryKey: ['task-auto', 'product-lines', brandType], queryFn: () => getProductLines(brandType) })
  const { data: materials } = useQuery({ queryKey: ['task-auto', 'materials', brandType], queryFn: () => getMaterials(brandType) })
  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'products', brandType, search, productLineFilter, activeFilter, page],
    queryFn: () => getProducts({
      brand_type: brandType,
      search: search || undefined,
      product_line_id: productLineFilter || undefined,
      is_active: activeFilter === 'all' ? undefined : activeFilter === 'true',
      page, limit: 20,
    }),
  })

  const refresh = () => qc.refetchQueries({ queryKey: ['task-auto', 'products'] })

  const createMut = useMutation({
    mutationFn: async (body: Partial<Product>) => {
      const product = await createProduct(body)
      if (sourceDraft.enabled && sourceDraft.name && sourceDraft.link) {
        await createSource({
          type: sourceDraft.type, name: sourceDraft.name, link: sourceDraft.link,
          code: sourceDraft.code || undefined, product_id: product.id, is_active: true,
        } as any).catch(() => null)
        qc.invalidateQueries({ queryKey: ['task-auto', 'sources'] })
      }
      return product
    },
    onSuccess: async () => { await refresh(); toast.success('Đã thêm sản phẩm'); setModal(null) },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể thêm sản phẩm'),
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<Product> }) => {
      const product = await updateProduct(id, body)
      if (sourceDraft.enabled && sourceDraft.name && sourceDraft.link) {
        await createSource({
          type: sourceDraft.type, name: sourceDraft.name, link: sourceDraft.link,
          code: sourceDraft.code || undefined, product_id: id, is_active: true,
        } as any).catch(() => null)
        qc.invalidateQueries({ queryKey: ['task-auto', 'sources'] })
      }
      return product
    },
    onSuccess: async () => { await refresh(); toast.success('Đã cập nhật sản phẩm'); setModal(null) },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể cập nhật sản phẩm'),
  })

  const createLineMut = useMutation({
    mutationFn: ({ name }: { name: string }) => createProductLine(name, brandType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'product-lines', brandType] }),
    onError: () => toast.error('Không thể thêm dòng sản phẩm'),
  })
  const deleteLineMut = useMutation({
    mutationFn: deleteProductLine,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'product-lines', brandType] }),
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

  const openCreate = () => {
    setForm({ sku: '', name: '', image_urls: [], price: '', price_segment: '', priority_score: 0, material_id: '', product_line_id: '', is_active: true })
    setMarkets(['VIETNAM'])
    setSourceDraft(defaultSource)
    setEditing(null)
    setModal('create')
  }

  const openEdit = (p: Product) => {
    const image_urls = p.image_urls?.length ? p.image_urls : (p.image_url ? [p.image_url] : [])
    setForm({ ...p, image_urls })
    setMarkets(parseMarkets(p.market))
    setSourceDraft(defaultSource)
    setEditing(p)
    setViewProduct(null)
    setModal('edit')
  }

  const handleSubmit = () => {
    if (!form.sku || !form.name) return toast.error('SKU và tên là bắt buộc')
    if (markets.length === 0) return toast.error('Chọn ít nhất một thị trường')
    if (sourceDraft.enabled && (!sourceDraft.name || !sourceDraft.link)) return toast.error('Source cần có tên và link')
    const baseBody = {
      name: form.name,
      brand_type: brandType,
      image_urls: form.image_urls,
      price: form.price || undefined,
      market: markets.join(','),
      price_segment: form.price_segment || undefined,
      priority_score: form.priority_score,
      material_id: form.material_id || null,
      product_line_id: form.product_line_id || null,
      is_active: form.is_active,
    }
    if (modal === 'create') createMut.mutate({ sku: form.sku, ...baseBody })
    else if (editing) updateMut.mutate({ id: editing.id, body: baseBody })
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

  const saving = createMut.isPending || updateMut.isPending
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
          <CustomSelect
            value={productLineFilter}
            onChange={v => { setProductLineFilter(v); setPage(1) }}
            options={[
              { value: '', label: 'Tất cả dòng SP' },
              ...(productLines?.map(l => ({ value: l.id, label: l.name })) ?? []),
            ]}
            className="min-w-[180px]"
            searchable
          />
          <CustomSelect
            value={activeFilter}
            onChange={v => { setActiveFilter(v as 'all' | 'true' | 'false'); setPage(1) }}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'true', label: 'Đang hoạt động' },
              { value: 'false', label: 'Không hoạt động' },
            ]}
            className="min-w-[175px]"
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
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Dòng SP</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Chất liệu</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Thị trường</th>
                <th className="text-right px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Giá bán</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Trạng thái</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Người thêm</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <LoadingRows cols={9} />}

              {!isLoading && (!data?.data || data.data.length === 0) && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState icon={Package} title="Không có sản phẩm nào" />
                  </td>
                </tr>
              )}

              {data?.data.map(p => {
                const thumb = p.image_urls?.[0] ?? p.image_url
                return (
                  <tr key={p.id} onClick={() => setViewProduct(p)} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-block bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg">
                        {p.sku}
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
                          <p className="text-base font-semibold text-slate-800 truncate max-w-[260px]" title={p.name}>{p.name}</p>
                          {p.price_segment && <p className="text-xs text-slate-400 mt-0.5">{p.price_segment}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {p.product_line?.name
                        ? <span className="text-sm font-medium text-slate-700">{p.product_line.name}</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {p.material?.name
                        ? <span className="text-sm text-slate-600">{p.material.name}</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex gap-1.5">
                        {parseMarkets(p.market).map(m => <MarketBadge key={m} market={m} />)}
                        {!p.market && <span className="text-slate-300 text-sm">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {formatPrice(p.price)
                        ? <span className="text-base font-bold text-slate-800">{formatPrice(p.price)}</span>
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
              <span className="block text-sm font-bold text-slate-800">Dòng sản phẩm &amp; Chất liệu</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                {(productLines?.length ?? 0)} dòng sản phẩm · {(materials?.length ?? 0)} chất liệu
              </span>
            </span>
          </span>
          <ChevronRight className={cn(
            'w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:text-slate-600',
            showCatalogPanel && 'rotate-90'
          )} />
        </button>
        {showCatalogPanel && (
          <div className="border-t border-gray-100 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <DarkModal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}
        size="xl"
        footer={
          <>
            <button onClick={() => setModal(null)} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={saving || markets.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {modal === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div className="space-y-6">

          {/* Thông tin cơ bản */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Thông tin cơ bản
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DarkInput
                label="SKU *"
                placeholder="VD: NM101"
                value={form.sku ?? ''}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
              />
              <MarketPicker label="Thị trường" value={markets} onChange={setMarkets} />
            </div>
            <DarkInput
              label="Tên sản phẩm *"
              placeholder="Nhập tên sản phẩm đầy đủ..."
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Phân loại & Giá */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Phân loại & Giá
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CreatableSelect
                label="Dòng sản phẩm"
                value={form.product_line_id ?? ''}
                onChange={v => setForm(f => ({ ...f, product_line_id: v }))}
                options={productLines?.map(l => ({ value: l.id, label: l.name })) ?? []}
                createLabel="Thêm dòng sản phẩm"
                onCreate={async (name) => {
                  const created = await createProductLine(name, brandType)
                  qc.setQueryData<typeof productLines>(
                    ['task-auto', 'product-lines', brandType],
                    old => [...(old ?? []), created]
                  )
                  return { id: created.id, label: created.name }
                }}
              />
              <CreatableSelect
                label="Chất liệu"
                value={form.material_id ?? ''}
                onChange={v => setForm(f => ({ ...f, material_id: v }))}
                options={materials?.map(m => ({ value: m.id, label: m.name })) ?? []}
                createLabel="Thêm chất liệu"
                onCreate={async (name) => {
                  const created = await createMaterial(name, brandType)
                  qc.setQueryData<typeof materials>(
                    ['task-auto', 'materials', brandType],
                    old => [...(old ?? []), created]
                  )
                  return { id: created.id, label: created.name }
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PriceInput
                label="Giá bán (₫)"
                value={form.price ?? ''}
                onChange={v => setForm(f => ({ ...f, price: v }))}
              />
              <DarkInput
                label="Phân khúc giá"
                placeholder="VD: MID, HIGH"
                value={form.price_segment ?? ''}
                onChange={e => setForm(f => ({ ...f, price_segment: e.target.value }))}
              />
              <DarkInput
                label="Điểm ưu tiên"
                type="number"
                placeholder="0"
                value={form.priority_score ?? 0}
                onChange={e => setForm(f => ({ ...f, priority_score: Number(e.target.value) }))}
                min={0}
              />
            </div>
          </div>

          {/* Hình ảnh */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Hình ảnh sản phẩm
            </p>
            <MultiImagePicker
              values={form.image_urls ?? []}
              onChange={urls => setForm(f => ({ ...f, image_urls: urls }))}
            />
          </div>

          {/* Trạng thái */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Trạng thái
            </p>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}
                </p>
                <p className="text-xs text-slate-500">
                  {form.is_active ? 'Sản phẩm hiển thị và có thể dùng trong task' : 'Sản phẩm bị ẩn khỏi danh sách'}
                </p>
              </div>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Source đi kèm <span className="text-gray-300 font-normal normal-case tracking-normal">(tuỳ chọn)</span>
            </p>
            <SourceForm value={sourceDraft} onChange={setSourceDraft} />
          </div>
        </div>
      </DarkModal>

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
