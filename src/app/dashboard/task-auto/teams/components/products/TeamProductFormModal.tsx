'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Trash2, Link2 } from 'lucide-react'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, CreatableSelect, CustomSelect } from '@/components/task-auto/DarkInput'
import {
  MarketPicker, PriceInput, MultiImagePicker, SourceForm,
} from '@/app/dashboard/task-auto/catalog/components/ProductsTab/ProductFormFields'
import type { MultiImagePickerHandle } from '@/app/dashboard/task-auto/catalog/components/ProductsTab/ProductFormFields'
import {
  SourceDraft, defaultSource,
} from '@/app/dashboard/task-auto/catalog/components/ProductsTab/product-utils'
import {
  addTeamProduct, updateTeamProduct, createProductLine, createMaterial,
  getProductLines, getMaterials, addTeamSource, getTeamSources, removeTeamSource,
} from '@/lib/api/task-auto'
import type { TeamProduct, BrandType } from '@/types/task-auto'

interface Props {
  open: boolean
  teamId: string
  teamProduct?: TeamProduct | null
  defaultBrandType?: BrandType
  onClose: () => void
  onSuccess: (product?: TeamProduct) => void
}

interface FormState {
  sku: string
  name: string
  image_urls: string[]
  price: string
  price_segment: string
  priority_score: number
  material_id: string
  product_line_id: string
  is_active: boolean
}

const defaultForm: FormState = {
  sku: '', name: '', image_urls: [], price: '',
  price_segment: '', priority_score: 0, material_id: '', product_line_id: '', is_active: true,
}

export function TeamProductFormModal({ open, teamId, teamProduct, defaultBrandType = 'DO_DA', onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const isEdit = !!teamProduct

  const [brandType, setBrandType] = useState<BrandType>(defaultBrandType)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [markets, setMarkets] = useState<string[]>(['VIETNAM'])
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(defaultSource)
  const imagePickerRef = useRef<MultiImagePickerHandle>(null)

  const { data: productLines } = useQuery({
    queryKey: ['task-auto', 'product-lines'],
    queryFn: () => getProductLines(),
    enabled: open,
  })
  const { data: materials } = useQuery({
    queryKey: ['task-auto', 'materials', brandType],
    queryFn: () => getMaterials(brandType),
    enabled: open,
  })
  const { data: existingSources, refetch: refetchSources } = useQuery({
    queryKey: ['task-auto', 'team-sources', 'by-product', teamProduct?.id],
    queryFn: () => getTeamSources(teamId, { team_product_id: teamProduct!.id }),
    enabled: open && isEdit && !!teamProduct,
  })

  useEffect(() => {
    if (open) {
      if (teamProduct) {
        setBrandType(teamProduct.brand_type ?? defaultBrandType)
        setForm({
          sku: teamProduct.sku ?? '',
          name: teamProduct.name ?? '',
          image_urls: teamProduct.image_urls?.length
            ? teamProduct.image_urls
            : teamProduct.image_url ? [teamProduct.image_url] : [],
          price: teamProduct.price ?? '',
          price_segment: teamProduct.price_segment ?? '',
          priority_score: teamProduct.priority_score ?? 0,
          material_id: teamProduct.material_id ?? '',
          product_line_id: teamProduct.product_line_id ?? '',
          is_active: teamProduct.is_active ?? true,
        })
        setMarkets(teamProduct.market ? teamProduct.market.split(',').map(m => m.trim()) : ['VIETNAM'])
        setSourceDraft(defaultSource)
      } else {
        setBrandType(defaultBrandType)
        setForm(defaultForm)
        setMarkets(['VIETNAM'])
        setSourceDraft(defaultSource)
      }
    }
  }, [open, teamProduct, defaultBrandType])

  const removeSrcMut = useMutation({
    mutationFn: (sourceId: string) => removeTeamSource(teamId, sourceId),
    onSuccess: () => {
      refetchSources()
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-sources', teamId] })
      toast.success('Đã xóa source')
    },
    onError: () => toast.error('Không thể xóa source'),
  })

  const mut = useMutation({
    mutationFn: async () => {
      const image_urls = await imagePickerRef.current!.resolvePending(form.image_urls)
      const payload = {
        name: form.name,
        brand_type: brandType,
        image_urls,
        price: form.price || undefined,
        market: markets.join(','),
        price_segment: form.price_segment || undefined,
        priority_score: form.priority_score,
        material_id: form.material_id || null,
        product_line_id: form.product_line_id || null,
        is_active: form.is_active,
      }
      const addSourceIfNeeded = async (productId: string) => {
        if (sourceDraft.enabled && sourceDraft.name && sourceDraft.link) {
          await addTeamSource(teamId, {
            brand_type: brandType,
            type: sourceDraft.type,
            name: sourceDraft.name,
            link: sourceDraft.link,
            code: sourceDraft.code || undefined,
            team_product_id: productId,
          })
        }
      }
      if (isEdit) {
        await updateTeamProduct(teamId, teamProduct!.id, payload)
        await addSourceIfNeeded(teamProduct!.id)
        return undefined
      } else {
        const newProduct = await addTeamProduct(teamId, { sku: form.sku, ...payload })
        await addSourceIfNeeded(newProduct.id)
        return newProduct
      }
    },
    onSuccess: (newProduct) => {
      toast.success(isEdit ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm vào kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', teamId] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-sources', teamId] })
      setSourceDraft(defaultSource)
      onSuccess(newProduct)
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || (isEdit ? 'Không thể cập nhật' : 'Không thể thêm sản phẩm')
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    },
  })

  const handleSubmit = () => {
    if (!isEdit && !form.sku.trim()) return toast.error('SKU là bắt buộc')
    if (!form.name.trim()) return toast.error('Tên sản phẩm là bắt buộc')
    if (markets.length === 0) return toast.error('Chọn ít nhất một thị trường')
    mut.mutate()
  }

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa sản phẩm team' : 'Tạo sản phẩm mới cho kho team'}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={mut.isPending || markets.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
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
            {!isEdit && (
              <DarkInput
                label="SKU *"
                placeholder="VD: NM101"
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
              />
            )}
            <MarketPicker label="Thị trường" value={markets} onChange={setMarkets} />
          </div>
          <DarkInput
            label="Tên sản phẩm *"
            placeholder="Nhập tên sản phẩm đầy đủ..."
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <CustomSelect
            label="Nhóm sản phẩm *"
            value={brandType}
            onChange={v => setBrandType(v as BrandType)}
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
              value={form.product_line_id}
              onChange={v => setForm(f => ({ ...f, product_line_id: v }))}
              options={productLines?.map(l => ({ value: l.id, label: l.name })) ?? []}
              createLabel="Thêm dòng sản phẩm"
              onCreate={async (name) => {
                const created = await createProductLine(name)
                qc.setQueryData<typeof productLines>(['task-auto', 'product-lines'], old => [...(old ?? []), created])
                return { id: created.id, label: created.name }
              }}
            />
            <CreatableSelect
              label="Chất liệu"
              value={form.material_id}
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
            <PriceInput label="Giá bán (₫)" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} />
            <DarkInput
              label="Phân khúc giá"
              placeholder="VD: MID, HIGH"
              value={form.price_segment}
              onChange={e => setForm(f => ({ ...f, price_segment: e.target.value }))}
            />
            <DarkInput
              label="Điểm ưu tiên"
              type="number"
              placeholder="0"
              min={0}
              value={form.priority_score}
              onChange={e => setForm(f => ({ ...f, priority_score: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Hình ảnh sản phẩm
          </p>
          <MultiImagePicker ref={imagePickerRef} values={form.image_urls} onChange={urls => setForm(f => ({ ...f, image_urls: urls }))} />
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Source sản phẩm
          </p>

          {/* Danh sách source hiện tại (chỉ hiển thị ở edit mode) */}
          {isEdit && existingSources && existingSources.length > 0 && (
            <div className="space-y-2">
              {existingSources.map(src => (
                <div key={src.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                  <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{src.name}</p>
                    <p className="text-xs text-slate-400 truncate">{src.type} · {src.link}</p>
                  </div>
                  <button
                    onClick={() => removeSrcMut.mutate(src.id)}
                    disabled={removeSrcMut.isPending}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {removeSrcMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          <SourceForm value={sourceDraft} onChange={setSourceDraft} />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Trạng thái
          </p>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            </label>
            <div>
              <p className="text-sm font-semibold text-slate-800">{form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}</p>
              <p className="text-xs text-slate-500">{form.is_active ? 'Sản phẩm hiển thị trong kho team' : 'Sản phẩm bị ẩn'}</p>
            </div>
          </div>
        </div>
      </div>
    </DarkModal>
  )
}
