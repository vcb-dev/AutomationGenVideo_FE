'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, ExternalLink, Loader2, Radio,
  ChevronLeft, ChevronRight, Search, Globe, Users, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, ProductSearchSelect, CustomSelect } from '@/components/task-auto/DarkInput'
import { EmptyState } from '@/components/task-auto/EmptyState'
import {
  getSources, createSource, updateSource, deleteSource,
  getProducts, getTeams,
} from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { Source, SOURCE_TYPE_LABELS, SourceType } from '@/types/task-auto'

const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  PRODUCT_STOCK: 'bg-indigo-100 text-indigo-700',
  COLLECTED:     'bg-teal-100 text-teal-700',
  OUTRO:         'bg-purple-100 text-purple-700',
  WORKSHOP:      'bg-orange-100 text-orange-700',
  HUYK:          'bg-rose-100 text-rose-700',
}

const OWNER_OPTIONS = [
  { value: '',       label: 'Tất cả nguồn' },
  { value: 'global', label: 'Kho chung' },
  { value: 'team',   label: 'Của team' },
  { value: 'editor', label: 'Của editor' },
]

function OwnerBadge({ source }: { source: Source }) {
  if (source.user_id) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold whitespace-nowrap">
      <User className="w-3 h-3" />
      {source.owner_user?.full_name ?? 'Editor'}
    </span>
  )
  if (source.team_id) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold whitespace-nowrap">
      <Users className="w-3 h-3" />
      {source.team?.name ?? 'Team'}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-slate-500 text-xs font-semibold whitespace-nowrap">
      <Globe className="w-3 h-3" />
      Chung
    </span>
  )
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-5 py-5">
              <div className="h-5 bg-gray-100 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

type BrandType = 'DO_DA' | 'TRANG_SUC'

export function SourcesTab({ brandType }: { brandType: BrandType }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdminOrManager = user?.roles?.some((r: string) => ['ADMIN', 'MANAGER'].includes(r)) ?? false
  const canDelete = isAdminOrManager

  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState<SourceType | ''>('')
  const [ownerFilter, setOwnerFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const [modal, setModal]       = useState<null | 'create' | 'edit'>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editing, setEditing]   = useState<Source | null>(null)
  const [form, setForm] = useState<Partial<Source>>({
    type: 'PRODUCT_STOCK', name: '', link: '', code: '',
    product_id: '', team_id: null, user_id: null, is_active: true,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'sources', brandType, search, typeFilter, ownerFilter, activeFilter, page],
    queryFn: () => getSources({
      brand_type: brandType,
      search:    search     || undefined,
      type:      typeFilter || undefined,
      owner:     (ownerFilter as any) || undefined,
      is_active: activeFilter === 'all' ? undefined : activeFilter === 'true',
      page,
      limit: 20,
    }),
  })

  const { data: productsForSelect } = useQuery({
    queryKey: ['task-auto', 'products-select'],
    queryFn: () => getProducts({ limit: 200 }),
    enabled: modal !== null,
  })

  const { data: teamsData } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
    enabled: modal !== null && isAdminOrManager,
  })
  const teams = teamsData ?? []

  const createMut = useMutation({
    mutationFn: createSource,
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['task-auto', 'sources'] })
      toast.success('Đã thêm Source')
      setModal(null)
    },
    onError: () => toast.error('Không thể thêm Source'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Source> }) => updateSource(id, body),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['task-auto', 'sources'] })
      toast.success('Đã cập nhật Source')
      setModal(null)
    },
    onError: () => toast.error('Không thể cập nhật Source'),
  })
  const deleteMut = useMutation({
    mutationFn: deleteSource,
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['task-auto', 'sources'] })
      toast.success('Đã xóa source')
      setDeletingId(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể xóa source')
      setDeletingId(null)
    },
  })

  const openCreate = () => {
    setForm({ type: 'PRODUCT_STOCK', name: '', link: '', code: '', product_id: '', team_id: null, user_id: null, is_active: true })
    setEditing(null)
    setModal('create')
  }
  const openEdit = (s: Source) => { setForm({ ...s }); setEditing(s); setModal('edit') }

  const handleSubmit = () => {
    if (!form.name || !form.link) return toast.error('Tên và link là bắt buộc')
    const body = {
      name:       form.name,
      link:       form.link,
      code:       form.code || null,
      product_id: form.product_id || null,
      team_id:    form.team_id   || null,
      user_id:    form.user_id   || null,
      is_active:  form.is_active,
    }
    if (modal === 'create') createMut.mutate({ type: form.type!, brand_type: brandType, ...body })
    else if (editing)       updateMut.mutate({ id: editing.id, body })
  }

  const saving = createMut.isPending || updateMut.isPending
  const total  = data?.total ?? 0

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm kiếm tên, code source..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <CustomSelect
            value={typeFilter}
            onChange={v => { setTypeFilter(v as SourceType | ''); setPage(1) }}
            options={[
              { value: '', label: 'Tất cả loại' },
              ...(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map(k => ({ value: k, label: SOURCE_TYPE_LABELS[k] })),
            ]}
            className="min-w-[180px]"
          />
          <CustomSelect
            value={ownerFilter}
            onChange={v => { setOwnerFilter(v); setPage(1) }}
            options={OWNER_OPTIONS}
            className="min-w-[150px]"
          />
          <CustomSelect
            value={activeFilter}
            onChange={v => { setActiveFilter(v as 'all' | 'true' | 'false'); setPage(1) }}
            options={[
              { value: 'all',   label: 'Tất cả trạng thái' },
              { value: 'true',  label: 'Đang hoạt động' },
              { value: 'false', label: 'Không hoạt động' },
            ]}
            className="min-w-[175px]"
          />
          <button
            onClick={openCreate}
            className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" /> Thêm Source
          </button>
        </div>
      </div>

      {total > 0 && (
        <p className="text-sm text-slate-500 px-1">
          Tổng <span className="font-bold text-slate-700">{total}</span> source
          {search && <span> · kết quả cho "<span className="font-semibold text-indigo-600">{search}</span>"</span>}
        </p>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-gray-200">
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Tên source</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Loại</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Kho</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Code</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Link</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Sản phẩm</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Trạng thái</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <LoadingRows cols={8} />}
              {!isLoading && (!data?.data || data.data.length === 0) && (
                <tr><td colSpan={8}><EmptyState icon={Radio} title="Không có Source nào" /></td></tr>
              )}
              {data?.data.map(s => (
                <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="px-5 py-4">
                    <p className="text-base font-semibold text-slate-800 truncate max-w-[240px]" title={s.name}>{s.name}</p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap', SOURCE_TYPE_COLORS[s.type])}>
                      {SOURCE_TYPE_LABELS[s.type]}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <OwnerBadge source={s} />
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {s.code
                      ? <span className="inline-block bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg">{s.code}</span>
                      : <span className="text-slate-300 text-sm">—</span>
                    }
                  </td>
                  <td className="px-5 py-4 max-w-[220px]">
                    <a href={s.link} target="_blank" rel="noreferrer" title={s.link}
                      className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-400 text-sm transition-colors">
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{s.link}</span>
                    </a>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-slate-700 truncate block max-w-[180px]" title={s.product?.name ?? ''}>
                      {s.product?.name ?? <span className="text-slate-300">—</span>}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                      s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-slate-400'
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', s.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                      {s.is_active ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)}
                        className="p-2 rounded-xl hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors" title="Chỉnh sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button onClick={() => setDeletingId(s.id)}
                          className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
                const pg = data.totalPages <= 7 ? i + 1
                  : page <= 4 ? i + 1
                  : page >= data.totalPages - 3 ? data.totalPages - 6 + i
                  : page - 3 + i
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn('w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                      pg === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-200 text-slate-600')}>
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

      <ConfirmDialog
        open={!!deletingId}
        title="Xóa source"
        message="Source sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xóa source"
        danger
        isLoading={deleteMut.isPending}
        onConfirm={() => deletingId && deleteMut.mutate(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      {/* Create / Edit modal */}
      <DarkModal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Thêm Source mới' : 'Chỉnh sửa Source'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModal(null)}
              className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-3 text-base font-semibold transition-colors">
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {modal === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div className="space-y-6">

          {/* Phân loại */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Phân loại
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CustomSelect
                label="Loại Source *"
                value={form.type ?? 'PRODUCT_STOCK'}
                onChange={v => setForm(f => ({ ...f, type: v as SourceType }))}
                options={(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map(k => ({ value: k, label: SOURCE_TYPE_LABELS[k] }))}
              />
              <DarkInput
                label="Mã code"
                placeholder="VD: SRC001 (tuỳ chọn)"
                value={form.code ?? ''}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              />
            </div>
          </div>

          {/* Thông tin source */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Thông tin Source
            </p>
            <DarkInput
              label="Tên Source *"
              placeholder="Tên nguồn tài liệu..."
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <DarkInput
              label="Link *"
              placeholder="https://drive.google.com/..."
              value={form.link ?? ''}
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
            />
            <ProductSearchSelect
              label="Sản phẩm liên kết"
              value={form.product_id ?? ''}
              onChange={id => setForm(f => ({ ...f, product_id: id }))}
              products={productsForSelect?.data ?? []}
              placeholder="-- Không liên kết sản phẩm --"
              clearLabel="-- Không liên kết --"
            />
          </div>

          {/* Chủ sở hữu — chỉ ADMIN/MANAGER */}
          {isAdminOrManager && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
                Kho chứa
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect
                  label="Thuộc team"
                  value={form.team_id ?? ''}
                  onChange={v => setForm(f => ({ ...f, team_id: v || null, user_id: null }))}
                  options={[
                    { value: '', label: '— Kho chung —' },
                    ...teams.map(t => ({ value: t.id, label: t.name })),
                  ]}
                />
              </div>
              {form.team_id && (
                <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
                  Source này sẽ thuộc <strong>kho riêng của team</strong>. Auto-assign sẽ ưu tiên source này cho editor trong team.
                </p>
              )}
              {!form.team_id && (
                <p className="text-xs text-slate-500 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5">
                  Source này thuộc <strong>kho chung</strong> — tất cả team đều có thể dùng.
                </p>
              )}
            </div>
          )}

          {/* Trạng thái */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Trạng thái
            </p>
            <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-4 border border-gray-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <div>
                <p className="text-base font-semibold text-slate-800">
                  {form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {form.is_active ? 'Source hiển thị và có thể gán vào task' : 'Source bị ẩn khỏi danh sách chọn'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </DarkModal>
    </div>
  )
}
