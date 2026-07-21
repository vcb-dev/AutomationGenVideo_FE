'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, CreatableSelect, CustomSelect } from '@/components/task-auto/DarkInput'
import { defaultSource, SOURCE_TYPE_COLORS } from '@/app/dashboard/task-auto/catalog/components/ProductsTab/product-utils'
import type { SourceDraft } from '@/app/dashboard/task-auto/catalog/components/ProductsTab/product-utils'
import {
  MarketPicker, PriceInput, MultiImagePicker, SourceForm,
} from '@/app/dashboard/task-auto/catalog/components/ProductsTab/ProductFormFields'
import type { MultiImagePickerHandle } from '@/app/dashboard/task-auto/catalog/components/ProductsTab/ProductFormFields'
import {
  createProduct, updateProduct, createProductLine, createMaterial, createSource,
  createEditorProduct, updateEditorProduct, createEditorSource, getEditorSources,
  getProductLines, getMaterials, getSources,
  getProductClassifications, createProductClassification, getAutoAssignSettings,
} from '@/lib/api/task-auto'
import type { Product } from '@/types/task-auto'
import { SOURCE_TYPE_LABELS } from '@/types/task-auto'

interface Props {
  open: boolean
  editing?: Product | null
  userId?: string
  title?: string
  defaultBrandType?: 'DO_DA' | 'TRANG_SUC'
  /** Ẩn lựa chọn nhóm sản phẩm khi form được mở từ một tab đã cố định nhóm (VD: tab Đồ da/Trang sức riêng biệt). */
  lockBrandType?: boolean
  onClose: () => void
  onSuccess: (product: Product) => void
}

export function ProductFormModal({ open, editing, userId, title, defaultBrandType = 'DO_DA', lockBrandType, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const isEdit = !!editing

  const [brandType, setBrandType] = useState<'DO_DA' | 'TRANG_SUC'>(defaultBrandType)
  const [form, setForm] = useState<Partial<Product> & { image_urls: string[] }>({
    sku: '', name: '', image_urls: [], price: '',
    price_segment: '', priority_score: 0, cooldown_days: null, material_id: '', product_line_id: '', classification_id: '', is_active: true,
  })
  const [markets, setMarkets] = useState<string[]>(['VIETNAM'])
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(defaultSource)
  const imagePickerRef = useRef<MultiImagePickerHandle>(null)

  const { data: autoAssignSettings } = useQuery({
    queryKey: ['task-auto', 'auto-assign-settings'],
    queryFn: getAutoAssignSettings,
    enabled: open,
  })
  const { data: productLines, isLoading: loadingProductLines } = useQuery({
    queryKey: ['task-auto', 'product-lines'],
    queryFn: () => getProductLines(),
    enabled: open,
  })
  const { data: materials, isLoading: loadingMaterials } = useQuery({
    queryKey: ['task-auto', 'materials', brandType],
    queryFn: () => getMaterials(brandType),
    enabled: open,
  })
  const { data: productClassifications, isLoading: loadingProductClassifications } = useQuery({
    queryKey: ['task-auto', 'product-classifications'],
    queryFn: () => getProductClassifications(),
    enabled: open,
  })
  const { data: sourcesData } = useQuery({
    queryKey: ['task-auto', 'sources', 'by-product', editing?.id, !!userId],
    queryFn: () => userId
      ? getEditorSources(userId, { editor_product_id: editing!.id, limit: 100 })
      : getSources({ product_id: editing!.id, limit: 100 }),
    enabled: open && !!editing?.id,
  })
  const existingSources = sourcesData?.data ?? []

  useEffect(() => {
    if (open) {
      if (editing) {
        setBrandType((editing.brand_type as 'DO_DA' | 'TRANG_SUC') ?? defaultBrandType)
        setForm({
          ...editing,
          image_urls: editing.image_urls ?? (editing.image_url ? [editing.image_url] : []),
        })
        setMarkets(editing.market ? editing.market.split(',').map(m => m.trim()) : ['VIETNAM'])
        setSourceDraft(defaultSource)
      } else {
        setBrandType(defaultBrandType)
        setForm({ sku: '', name: '', image_urls: [], price: '', price_segment: '', priority_score: 0, cooldown_days: null, material_id: '', product_line_id: '', classification_id: '', is_active: true })
        setMarkets(['VIETNAM'])
        setSourceDraft(defaultSource)
      }
    }
  }, [open, editing, defaultBrandType])

  const mut = useMutation({
    mutationFn: async () => {
      const image_urls = await imagePickerRef.current!.resolvePending(form.image_urls ?? [])
      const basePayload = {
        name: form.name,
        brand_type: brandType,
        image_urls,
        price: form.price || undefined,
        market: markets.join(','),
        price_segment: form.price_segment || undefined,
        priority_score: form.priority_score,
        cooldown_days: form.cooldown_days ?? null,
        material_id: form.material_id || null,
        product_line_id: form.product_line_id || null,
        classification_id: form.classification_id || null,
        is_active: form.is_active,
      }
      const product = isEdit
        ? userId
          ? await updateEditorProduct(userId, editing!.id, basePayload)
          : await updateProduct(editing!.id, basePayload)
        : userId
          ? await createEditorProduct(userId, { sku: form.sku, ...basePayload })
          : await createProduct({ sku: form.sku, ...basePayload })
      if (sourceDraft.enabled && sourceDraft.name && sourceDraft.link) {
        const sourcePayload = userId
          ? { type: sourceDraft.type, name: sourceDraft.name, link: sourceDraft.link, code: sourceDraft.code || undefined, editor_product_id: product.id, is_active: true }
          : { type: sourceDraft.type, name: sourceDraft.name, link: sourceDraft.link, code: sourceDraft.code || undefined, product_id: product.id, is_active: true }
        await (userId
          ? createEditorSource(userId, sourcePayload as any)
          : createSource(sourcePayload as any)
        ).catch(() => null)
        qc.invalidateQueries({ queryKey: ['task-auto', 'sources'] })
        qc.invalidateQueries({ queryKey: ['task-auto', 'sources', 'by-product', product.id] })
      }
      qc.invalidateQueries({ queryKey: ['task-auto', 'products'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'product', product.id] })
      return product
    },
    onSuccess: (product: Product) => {
      toast.success(isEdit ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm')
      onSuccess(product)
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || (isEdit ? 'Không thể cập nhật' : 'Không thể tạo sản phẩm')
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    },
  })

  const handleSubmit = () => {
    if (!form.sku?.trim() || !form.name?.trim()) return toast.error('SKU và tên là bắt buộc')
    if (markets.length === 0) return toast.error('Chọn ít nhất một thị trường')
    if (!isEdit && sourceDraft.enabled && (!sourceDraft.name || !sourceDraft.link)) return toast.error('Source cần có tên và link')
    mut.mutate()
  }

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title={title ?? (isEdit ? 'Chỉnh sửa sản phẩm' : userId ? 'Thêm sản phẩm cá nhân' : 'Thêm sản phẩm')}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button onClick={handleSubmit} disabled={mut.isPending || markets.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Thông tin cơ bản
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DarkInput label="SKU *" placeholder="VD: NM101"
              value={form.sku ?? ''} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            <MarketPicker label="Thị trường" value={markets} onChange={setMarkets} />
          </div>
          <DarkInput label="Tên sản phẩm *" placeholder="Nhập tên sản phẩm đầy đủ..."
            value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          {lockBrandType ? (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nhóm sản phẩm</label>
              <div className="px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-600">
                {brandType === 'DO_DA' ? 'Đồ da' : 'Trang sức'}
              </div>
            </div>
          ) : (
            <CustomSelect
              label="Nhóm sản phẩm *"
              value={brandType}
              onChange={v => setBrandType(v as 'DO_DA' | 'TRANG_SUC')}
              options={[{ value: 'DO_DA', label: 'Đồ da' }, { value: 'TRANG_SUC', label: 'Trang sức' }]}
            />
          )}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Phân loại & Giá
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CreatableSelect
              label="Dòng sản phẩm"
              value={form.product_line_id ?? ''}
              onChange={v => setForm(f => ({ ...f, product_line_id: v }))}
              options={productLines?.map(l => ({ value: l.id, label: l.name })) ?? []}
              createLabel="Thêm dòng sản phẩm"
              loading={loadingProductLines}
              onCreate={async (name) => {
                const created = await createProductLine(name)
                qc.setQueryData<typeof productLines>(['task-auto', 'product-lines'], old => [...(old ?? []), created])
                return { id: created.id, label: created.name }
              }}
            />
            <CreatableSelect
              label="Chất liệu"
              value={form.material_id ?? ''}
              onChange={v => setForm(f => ({ ...f, material_id: v }))}
              options={materials?.map(m => ({ value: m.id, label: m.name })) ?? []}
              createLabel="Thêm chất liệu"
              loading={loadingMaterials}
              onCreate={async (name) => {
                const created = await createMaterial(name, brandType)
                qc.setQueryData<typeof materials>(['task-auto', 'materials', brandType], old => [...(old ?? []), created])
                return { id: created.id, label: created.name }
              }}
            />
            <CreatableSelect
              label="Phân loại sản phẩm"
              value={form.classification_id ?? ''}
              onChange={v => setForm(f => ({ ...f, classification_id: v }))}
              options={productClassifications?.map(c => ({ value: c.id, label: c.name })) ?? []}
              createLabel="Thêm phân loại sản phẩm"
              loading={loadingProductClassifications}
              onCreate={async (name) => {
                const created = await createProductClassification(name)
                qc.setQueryData<typeof productClassifications>(['task-auto', 'product-classifications'], old => [...(old ?? []), created])
                return { id: created.id, label: created.name }
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PriceInput label="Giá bán (₫)" value={form.price ?? ''} onChange={v => setForm(f => ({ ...f, price: v }))} />
            <DarkInput label="Phân khúc giá" placeholder="VD: MID, HIGH"
              value={form.price_segment ?? ''} onChange={e => setForm(f => ({ ...f, price_segment: e.target.value }))} />
            <DarkInput label="Điểm ưu tiên" type="number" placeholder="0" min={0}
              value={form.priority_score ?? 0} onChange={e => setForm(f => ({ ...f, priority_score: Number(e.target.value) }))} />
            <div>
              <DarkInput label="Giãn cách giao lại SP (ngày)" type="number"
                placeholder={`Mặc định: ${autoAssignSettings?.default_cooldown_days ?? 5} ngày`} min={0}
                value={form.cooldown_days ?? ''} onChange={e => setForm(f => ({ ...f, cooldown_days: e.target.value === '' ? null : Number(e.target.value) }))} />
              <p className="text-xs text-slate-400 mt-1.5 leading-snug">
                Sau khi giao cho 1 editor, phải chờ đủ số ngày này mới được giao lại SP này cho chính người đó. Để trống = dùng mặc định hệ thống.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Hình ảnh sản phẩm
          </p>
          <MultiImagePicker ref={imagePickerRef} values={form.image_urls ?? []} onChange={urls => setForm(f => ({ ...f, image_urls: urls }))} />
        </div>

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
              <p className="text-sm font-semibold text-slate-800">{form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}</p>
              <p className="text-xs text-slate-500">{form.is_active ? 'Sản phẩm hiển thị và có thể dùng trong task' : 'Sản phẩm bị ẩn khỏi danh sách'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Source{' '}
            {isEdit
              ? <span className="text-gray-300 font-normal normal-case tracking-normal">({existingSources.length} hiện có)</span>
              : <span className="text-gray-300 font-normal normal-case tracking-normal">(tuỳ chọn)</span>
            }
          </p>

          {/* Danh sách sources hiện có khi edit */}
          {isEdit && existingSources.length > 0 && (
            <div className="space-y-1.5 mb-1">
              {existingSources.map(s => (
                <a
                  key={s.id}
                  href={s.link ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                >
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold shrink-0',
                    SOURCE_TYPE_COLORS[s.type] ?? 'bg-slate-100 text-slate-500'
                  )}>
                    {SOURCE_TYPE_LABELS[s.type]}
                  </span>
                  <span className="text-sm text-slate-700 truncate flex-1">{s.name}</span>
                  {s.code && (
                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                      {s.code}
                    </span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          )}

          {/* Form thêm source mới */}
          <SourceForm value={sourceDraft} onChange={setSourceDraft} />
        </div>
      </div>
    </DarkModal>
  )
}
