'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, CreatableSelect, CustomSelect } from '@/components/task-auto/DarkInput'
import { defaultSource } from '@/app/dashboard/task-auto/catalog/components/ProductsTab/product-utils'
import type { SourceDraft } from '@/app/dashboard/task-auto/catalog/components/ProductsTab/product-utils'
import {
  MarketPicker, PriceInput, MultiImagePicker, SourceForm,
} from '@/app/dashboard/task-auto/catalog/components/ProductsTab/ProductFormFields'
import {
  createProduct, createProductLine, createMaterial, createSource,
  getProductLines, getMaterials,
} from '@/lib/api/task-auto'
import type { Product } from '@/types/task-auto'

interface Props {
  open: boolean
  userId?: string
  title?: string
  defaultBrandType?: 'DO_DA' | 'TRANG_SUC'
  onClose: () => void
  onSuccess: (product: Product) => void
}

export function ProductFormModal({ open, userId, title, defaultBrandType = 'DO_DA', onClose, onSuccess }: Props) {
  const qc = useQueryClient()

  const [brandType, setBrandType] = useState<'DO_DA' | 'TRANG_SUC'>(defaultBrandType)
  const [form, setForm] = useState<Partial<Product> & { image_urls: string[] }>({
    sku: '', name: '', image_urls: [], price: '',
    price_segment: '', priority_score: 0, material_id: '', product_line_id: '', is_active: true,
  })
  const [markets, setMarkets] = useState<string[]>(['VIETNAM'])
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(defaultSource)

  const { data: productLines } = useQuery({
    queryKey: ['task-auto', 'product-lines', brandType],
    queryFn: () => getProductLines(brandType),
    enabled: open,
  })
  const { data: materials } = useQuery({
    queryKey: ['task-auto', 'materials', brandType],
    queryFn: () => getMaterials(brandType),
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setBrandType(defaultBrandType)
      setForm({ sku: '', name: '', image_urls: [], price: '', price_segment: '', priority_score: 0, material_id: '', product_line_id: '', is_active: true })
      setMarkets(['VIETNAM'])
      setSourceDraft(defaultSource)
    }
  }, [open, defaultBrandType])

  const mut = useMutation({
    mutationFn: async () => {
      const product = await createProduct({
        sku: form.sku,
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
        ...(userId ? { user_id: userId } : {}),
      })
      if (sourceDraft.enabled && sourceDraft.name && sourceDraft.link) {
        await createSource({
          type: sourceDraft.type, name: sourceDraft.name, link: sourceDraft.link,
          code: sourceDraft.code || undefined, product_id: product.id,
          ...(userId ? { user_id: userId } : {}),
          is_active: true,
        } as any).catch(() => null)
        qc.invalidateQueries({ queryKey: ['task-auto', 'sources'] })
      }
      qc.invalidateQueries({ queryKey: ['task-auto', 'products'] })
      return product
    },
    onSuccess: (product: Product) => {
      toast.success('Đã tạo sản phẩm')
      onSuccess(product)
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Không thể tạo sản phẩm'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    },
  })

  const handleSubmit = () => {
    if (!form.sku?.trim() || !form.name?.trim()) return toast.error('SKU và tên là bắt buộc')
    if (markets.length === 0) return toast.error('Chọn ít nhất một thị trường')
    if (sourceDraft.enabled && (!sourceDraft.name || !sourceDraft.link)) return toast.error('Source cần có tên và link')
    mut.mutate()
  }

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title={title ?? (userId ? 'Thêm sản phẩm cá nhân' : 'Thêm sản phẩm')}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button onClick={handleSubmit} disabled={mut.isPending || markets.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Thêm mới
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
          <CustomSelect
            label="Nhóm sản phẩm *"
            value={brandType}
            onChange={v => setBrandType(v as 'DO_DA' | 'TRANG_SUC')}
            options={[{ value: 'DO_DA', label: 'Đồ da' }, { value: 'TRANG_SUC', label: 'Trang sức' }]}
          />
        </div>

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
                qc.setQueryData<typeof productLines>(['task-auto', 'product-lines', brandType], old => [...(old ?? []), created])
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
                qc.setQueryData<typeof materials>(['task-auto', 'materials', brandType], old => [...(old ?? []), created])
                return { id: created.id, label: created.name }
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PriceInput label="Giá bán (₫)" value={form.price ?? ''} onChange={v => setForm(f => ({ ...f, price: v }))} />
            <DarkInput label="Phân khúc giá" placeholder="VD: MID, HIGH"
              value={form.price_segment ?? ''} onChange={e => setForm(f => ({ ...f, price_segment: e.target.value }))} />
            <DarkInput label="Điểm ưu tiên" type="number" placeholder="0" min={0}
              value={form.priority_score ?? 0} onChange={e => setForm(f => ({ ...f, priority_score: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Hình ảnh sản phẩm
          </p>
          <MultiImagePicker values={form.image_urls ?? []} onChange={urls => setForm(f => ({ ...f, image_urls: urls }))} />
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
            Source đi kèm <span className="text-gray-300 font-normal normal-case tracking-normal">(tuỳ chọn)</span>
          </p>
          <SourceForm value={sourceDraft} onChange={setSourceDraft} />
        </div>
      </div>
    </DarkModal>
  )
}
