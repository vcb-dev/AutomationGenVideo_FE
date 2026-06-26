'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ShoppingBag, Plus, Search, X, ImageIcon, Edit2, Trash2, Upload } from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'

import type { TeamProduct } from '@/types/task-auto'
import { getTeamProducts, getTeams, removeTeamProduct, pushTeamProductToGlobal, getTeamSources, pushTeamSourceToGlobal } from '@/lib/api/task-auto'
import { AddProductModal } from './products/AddProductModal'
import { ProductViewModal } from '@/components/task-auto/ProductViewModal'
import { TeamProductFormModal } from './products/TeamProductFormModal'

interface TeamProductsTabProps {
  isAdminOrManager: boolean
  userId?: string
  brandType: 'DO_DA' | 'TRANG_SUC'
  selectedTeamId: string
  setSelectedTeamId: (id: string) => void
}

function parseMarkets(market?: string | null): string[] {
  if (!market) return []
  return market.split(',').map(m => m.trim()).filter(Boolean)
}

function formatPrice(price?: string | number | null): string {
  if (!price) return ''
  return Number(price).toLocaleString('vi-VN') + '₫'
}

export function TeamProductsTab({ isAdminOrManager, userId, brandType, selectedTeamId, setSelectedTeamId }: TeamProductsTabProps) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingProduct, setEditingProduct] = useState<TeamProduct | null>(null)
  const [viewProduct, setViewProduct] = useState<TeamProduct | null>(null)
  const [search, setSearch] = useState('')
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [deletingProductName, setDeletingProductName] = useState('')
  const [pushingProduct, setPushingProduct] = useState<TeamProduct | null>(null)

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const isLeaderOfSelected = selectedTeam?.leader_id === userId
  const isMemberOfSelected = selectedTeam?.members?.some(m => m.user_id === userId) ?? false
  const canAddSelected = isAdminOrManager || isLeaderOfSelected || isMemberOfSelected
  const canEditSelected = isAdminOrManager || isLeaderOfSelected
  const canDeleteSelected = isAdminOrManager || isLeaderOfSelected

  const { data: teamProducts, isLoading } = useQuery({
    queryKey: ['task-auto', 'team-products', selectedTeamId, brandType],
    queryFn: () => getTeamProducts(selectedTeamId, brandType),
    enabled: !!selectedTeamId,
  })

  const removeMut = useMutation({
    mutationFn: (productId: string) => removeTeamProduct(selectedTeamId, productId),
    onSuccess: () => {
      toast.success('Đã xóa sản phẩm khỏi kho team')
      setDeletingProductId(null)
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', selectedTeamId, brandType] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xóa thất bại'),
  })

  const pushMut = useMutation({
    mutationFn: async (teamProductId: string) => {
      await pushTeamProductToGlobal(selectedTeamId, teamProductId)
      const linkedSources = await getTeamSources(selectedTeamId, { team_product_id: teamProductId })
      if (linkedSources.length > 0) {
        const results = await Promise.allSettled(
          linkedSources.map(s => pushTeamSourceToGlobal(selectedTeamId, s.id))
        )
        const failed = results.filter(r => r.status === 'rejected').length
        if (failed > 0) toast.error(`Sản phẩm đã đẩy nhưng ${failed} source liên kết thất bại`)
      }
    },
    onSuccess: () => {
      toast.success('Đã đẩy sản phẩm và source liên kết ra kho tổng')
      setPushingProduct(null)
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', selectedTeamId, brandType] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-sources', selectedTeamId, brandType] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Đẩy ra kho tổng thất bại'),
  })

  const existingSkus = (teamProducts ?? []).map(tp => tp.sku)

  const filtered = (teamProducts ?? []).filter(tp => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      tp.name?.toLowerCase().includes(q) ||
      tp.sku?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {isAdminOrManager ? (
            <CustomSelect
              value={selectedTeamId}
              onChange={setSelectedTeamId}
              options={[
                { value: '', label: 'Tất cả đội nhóm' },
                ...(teams ?? []).map(t => ({ value: t.id, label: t.name })),
              ]}
              className="min-w-[220px]"
              searchable
            />
          ) : (
            selectedTeam && (
              <div className="flex items-center gap-2 px-4 py-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-base font-semibold text-indigo-700">
                <ShoppingBag className="w-4 h-4" />
                {selectedTeam.name}
              </div>
            )
          )}

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm SKU, tên sản phẩm..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedTeamId && teamProducts && (
            <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
              {filtered.length} sản phẩm
            </span>
          )}

          {selectedTeamId && canAddSelected && (
            <button
              onClick={() => setShowAdd(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors ml-auto shrink-0"
            >
              <Plus className="w-5 h-5" /> Thêm sản phẩm
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!selectedTeamId ? (
        <EmptyState icon={ShoppingBag} title="Chọn đội nhóm để xem kho sản phẩm" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-gray-200">
                  <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">SKU</th>
                  <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Sản phẩm</th>
                  <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Dòng SP</th>
                  <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Thị trường</th>
                  <th className="text-right px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Giá bán</th>
                  <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Trạng thái</th>
                  <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Người thêm</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Loading skeleton */}
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Empty states */}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      {teamProducts?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <ShoppingBag className="w-7 h-7 text-indigo-300" />
                          </div>
                          <p className="font-semibold text-slate-600">Kho team chưa có sản phẩm</p>
                          <p className="text-sm text-slate-400">
                            {canAddSelected ? 'Nhấn "Thêm sản phẩm" để chọn từ kho tổng' : 'Chưa có sản phẩm nào trong kho team'}
                          </p>
                          {canAddSelected && (
                            <button
                              onClick={() => setShowAdd(true)}
                              className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
                            >
                              <Plus className="w-4 h-4" /> Thêm sản phẩm đầu tiên
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="py-10 text-center">
                          <p className="text-slate-400 text-sm italic">Không tìm thấy sản phẩm "{search}"</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}

                {/* Rows */}
                {!isLoading && filtered.map((tp: TeamProduct) => {
                  const rawThumb = tp.image_urls?.[0] ?? tp.image_url ?? null
                  const thumb = rawThumb ? (driveImageUrl(rawThumb) ?? rawThumb) : null
                  const markets = parseMarkets(tp.market)
                  const isTeamCreated = tp.source_product_id === null
                  return (
                    <tr
                      key={tp.id}
                      onClick={() => setViewProduct(tp)}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                    >
                      {/* SKU */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-block bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg">
                          {tp.sku}
                        </span>
                      </td>

                      {/* Sản phẩm */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={tp.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-slate-800 truncate max-w-[260px]" title={tp.name}>
                              {tp.name}
                            </p>
                            {tp.price_segment && (
                              <p className="text-xs text-slate-400 mt-0.5">{tp.price_segment}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Dòng SP */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {tp.product_line?.name
                          ? <span className="text-sm font-medium text-slate-700">{tp.product_line.name}</span>
                          : <span className="text-slate-300 text-sm">—</span>
                        }
                      </td>

                      {/* Thị trường */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          {markets.length > 0
                            ? markets.map(m => (
                              <span key={m} className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                                m === 'GLOBAL' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                              )}>
                                {m === 'VIETNAM' ? 'VN' : m}
                              </span>
                            ))
                            : <span className="text-slate-300 text-sm">—</span>
                          }
                        </div>
                      </td>

                      {/* Giá bán */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        {formatPrice(tp.price)
                          ? <span className="text-base font-bold text-slate-800">{formatPrice(tp.price)}</span>
                          : <span className="text-slate-300 text-sm">—</span>
                        }
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                          tp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-slate-400'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', tp.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                          {tp.is_active ? 'Hoạt động' : 'Ẩn'}
                        </span>
                      </td>

                      {/* Người thêm */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-500">
                          {tp.added_by?.full_name ?? <span className="text-slate-300">—</span>}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                        {(canEditSelected || canDeleteSelected) && (
                          <div className="flex items-center justify-end gap-1">
                            {canEditSelected && isTeamCreated && (
                              <button
                                onClick={() => setViewProduct(tp)}
                                className="p-2 rounded-xl hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canEditSelected && (
                              <button
                                onClick={() => setPushingProduct(tp)}
                                className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Đẩy ra kho tổng"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteSelected && (
                              <button
                                onClick={() => {
                                  setDeletingProductId(tp.id)
                                  setDeletingProductName(tp.name)
                                }}
                                className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                title="Xóa khỏi kho team"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deletingProductId}
        title="Xóa sản phẩm khỏi kho team"
        message={`Xóa "${deletingProductName}" khỏi kho team? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa sản phẩm"
        danger
        isLoading={removeMut.isPending}
        onConfirm={() => deletingProductId && removeMut.mutate(deletingProductId)}
        onCancel={() => setDeletingProductId(null)}
      />

      <ConfirmDialog
        open={!!pushingProduct}
        title="Đẩy sản phẩm ra kho tổng"
        message={`Đẩy "${pushingProduct?.name ?? 'sản phẩm này'}" và các source liên kết ra kho tổng? Sản phẩm sẽ xuất hiện cho toàn bộ hệ thống.`}
        confirmLabel="Đẩy ra kho tổng"
        isLoading={pushMut.isPending}
        onConfirm={() => pushingProduct && pushMut.mutate(pushingProduct.id)}
        onCancel={() => setPushingProduct(null)}
      />

      {viewProduct && (
        <ProductViewModal
          open
          item={viewProduct as any}
          catalogType="team"
          teamId={selectedTeamId ?? undefined}
          canEdit={canEditSelected && viewProduct.source_product_id === null}
          canDelete={canDeleteSelected}
          canPushToGlobal={canEditSelected}
          onClose={() => setViewProduct(null)}
          onEdit={() => { setEditingProduct(viewProduct); setViewProduct(null) }}
          onDelete={() => { setDeletingProductId(viewProduct.id); setDeletingProductName(viewProduct.name); setViewProduct(null) }}
          onPushToGlobal={() => { setPushingProduct(viewProduct); setViewProduct(null) }}
        />
      )}

      {showAdd && selectedTeamId && (
        <AddProductModal
          open={showAdd}
          teamId={selectedTeamId}
          existingSkus={existingSkus}
          userId={userId}
          initialBrandType={brandType}
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}

      {editingProduct && selectedTeamId && (
        <TeamProductFormModal
          open
          teamId={selectedTeamId}
          teamProduct={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null)
            qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', selectedTeamId, brandType] })
          }}
        />
      )}
    </div>
  )
}
