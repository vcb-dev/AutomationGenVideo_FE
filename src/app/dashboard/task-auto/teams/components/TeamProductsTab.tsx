'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ShoppingBag, Plus, Search, X } from 'lucide-react'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { Pagination } from '@/components/task-auto/Pagination'
import { HeaderFilterDropdown } from '@/components/task-auto/HeaderFilterDropdown'

import type { TeamProduct } from '@/types/task-auto'
import { getTeamProducts, getTeams, removeTeamProduct, getProductLines, getProductClassifications } from '@/lib/api/task-auto'
import { AddProductModal } from './products/AddProductModal'
import { ProductCard } from './products/ProductCard'
import { TeamProductFormModal } from './products/TeamProductFormModal'

const PAGE_SIZE = 12

interface TeamProductsTabProps {
  isAdminOrManager: boolean
  userId?: string
  brandType: 'DO_DA' | 'TRANG_SUC'
  selectedTeamId: string
  setSelectedTeamId: (id: string) => void
  month: string
  setMonth: (month: string) => void
}

export function TeamProductsTab({ isAdminOrManager, userId, brandType, selectedTeamId, setSelectedTeamId, month, setMonth }: TeamProductsTabProps) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingProduct, setEditingProduct] = useState<TeamProduct | null>(null)
  const [search, setSearch] = useState('')
  const [productLineFilter, setProductLineFilter] = useState('')
  const [classificationFilter, setClassificationFilter] = useState('')
  const [page, setPage] = useState(1)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [deletingProductName, setDeletingProductName] = useState('')

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

  // Các team mà user này thuộc (leader hoặc member)
  const myTeams = (teams ?? []).filter(t =>
    t.leader_id === userId || t.members?.some((m: any) => m.user_id === userId)
  )
  const showTeamPicker = isAdminOrManager || myTeams.length > 1
  const teamPickerOptions = isAdminOrManager
    ? [{ value: '', label: 'Tất cả đội nhóm' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]
    : myTeams.map(t => ({ value: t.id, label: t.name }))

  const { data: page1Data, isLoading } = useQuery({
    queryKey: ['task-auto', 'team-products', selectedTeamId, brandType, month, search, productLineFilter, classificationFilter, page],
    queryFn: () => getTeamProducts(selectedTeamId, brandType, month, {
      page, limit: PAGE_SIZE, search: search || undefined,
      product_line_id: productLineFilter || undefined, classification_id: classificationFilter || undefined,
    }),
    enabled: !!selectedTeamId,
  })
  const teamProducts = page1Data?.data ?? []
  const total = page1Data?.total ?? 0

  // Danh sách SKU đầy đủ trong kho team (không phân trang) — chỉ dùng để loại sản phẩm đã có
  // ra khỏi danh sách "chọn từ kho tổng" trong AddProductModal, không dùng để hiển thị bảng.
  const { data: allTeamProducts } = useQuery({
    queryKey: ['task-auto', 'team-products-all-skus', selectedTeamId, brandType],
    queryFn: () => getTeamProducts(selectedTeamId, brandType),
    enabled: !!selectedTeamId && showAdd,
  })

  // Danh sách dòng SP/phân loại toàn hệ thống — dùng làm option cho dropdown lọc (không kèm
  // số đếm theo kho team nữa vì bảng chính giờ đã phân trang server, không còn toàn bộ dữ liệu
  // trong bộ nhớ để đếm).
  const { data: allProductLines } = useQuery({ queryKey: ['task-auto', 'product-lines'], queryFn: getProductLines })
  const { data: allClassifications } = useQuery({ queryKey: ['task-auto', 'product-classifications'], queryFn: getProductClassifications })
  const productLineOptions = (allProductLines ?? []).map(l => ({ value: l.id, label: l.name })).sort((a, b) => a.label.localeCompare(b.label, 'vi'))
  const classificationOptions = (allClassifications ?? []).map(c => ({ value: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label, 'vi'))

  const removeMut = useMutation({
    mutationFn: (productId: string) => removeTeamProduct(selectedTeamId, productId),
    onSuccess: () => {
      toast.success('Đã xóa sản phẩm khỏi kho team')
      setDeletingProductId(null)
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', selectedTeamId, brandType] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xóa thất bại'),
  })

  const existingSkus = (allTeamProducts ?? []).map(tp => tp.sku ?? tp.source_editor_product?.sku ?? '').filter(Boolean)

  useEffect(() => { setPage(1) }, [selectedTeamId, brandType, month, search, productLineFilter, classificationFilter])

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {showTeamPicker ? (
            <CustomSelect
              value={selectedTeamId}
              onChange={setSelectedTeamId}
              options={teamPickerOptions}
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

          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-3.5 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

          {selectedTeamId && (
            <>
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <HeaderFilterDropdown
                  label="Dòng SP"
                  value={productLineFilter}
                  onChange={setProductLineFilter}
                  options={productLineOptions}
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <HeaderFilterDropdown
                  label="Phân loại"
                  value={classificationFilter}
                  onChange={setClassificationFilter}
                  options={classificationOptions}
                />
              </div>
            </>
          )}

          {selectedTeamId && page1Data && (
            <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
              {total} sản phẩm
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
        <>
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="aspect-square bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-4/5" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && teamProducts.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              {total === 0 && !search && !productLineFilter && !classificationFilter ? (
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
            </div>
          )}

          {!isLoading && teamProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {teamProducts.map((tp: TeamProduct) => {
                const isTeamCreated = tp.source_product_id === null
                return (
                  <ProductCard
                    key={tp.id}
                    teamProduct={tp}
                    canRemove={canDeleteSelected}
                    onRemove={() => {
                      setDeletingProductId(tp.id)
                      setDeletingProductName(tp.name ?? tp.source_editor_product?.name ?? '')
                    }}
                    onEdit={canEditSelected && isTeamCreated ? () => setEditingProduct(tp) : undefined}
                  />
                )
              })}
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <Pagination page={page} pageSize={PAGE_SIZE} totalItems={total} onPageChange={setPage} />
            </div>
          )}
        </>
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
