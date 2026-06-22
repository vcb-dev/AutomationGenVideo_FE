'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ShoppingBag, Plus, Search, X } from 'lucide-react'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect } from '@/components/task-auto/DarkInput'

import type { TeamProduct } from '@/types/task-auto'
import { getTeamProducts, getTeams, removeTeamProduct } from '@/lib/api/task-auto'
import { AddProductModal } from './products/AddProductModal'
import { ProductCard } from './products/ProductCard'

interface TeamProductsTabProps {
  isAdminOrManager: boolean
  userId?: string
  brandType: 'DO_DA' | 'TRANG_SUC'
}

export function TeamProductsTab({ isAdminOrManager, userId, brandType }: TeamProductsTabProps) {
  const qc = useQueryClient()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  useEffect(() => {
    if (!isAdminOrManager && userId && teams) {
      const myTeam =
        teams.find(t => t.leader_id === userId) ||
        teams.find(t => t.members?.some(m => m.user_id === userId))
      if (myTeam) setSelectedTeamId(myTeam.id)
    }
  }, [isAdminOrManager, userId, teams])

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const isLeaderOfSelected = selectedTeam?.leader_id === userId
  const isMemberOfSelected = selectedTeam?.members?.some(m => m.user_id === userId) ?? false
  const canManageSelected = isAdminOrManager || isLeaderOfSelected || isMemberOfSelected

  const { data: teamProducts, isLoading } = useQuery({
    queryKey: ['task-auto', 'team-products', selectedTeamId, brandType],
    queryFn: () => getTeamProducts(selectedTeamId, brandType),
    enabled: !!selectedTeamId,
  })

  const removeMut = useMutation({
    mutationFn: (productId: string) => removeTeamProduct(selectedTeamId, productId),
    onSuccess: () => {
      toast.success('Đã xóa sản phẩm khỏi kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', selectedTeamId, brandType] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xóa thất bại'),
  })

  const existingProductIds = (teamProducts ?? []).map(tp => tp.product_id)

  const filtered = (teamProducts ?? []).filter(tp => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      tp.product?.name?.toLowerCase().includes(q) ||
      tp.product?.sku?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
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
              placeholder="Tìm trong kho team..."
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

          {selectedTeamId && canManageSelected && (
            <button
              onClick={() => setShowAdd(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors ml-auto shrink-0"
            >
              <Plus className="w-5 h-5" /> Thêm sản phẩm
            </button>
          )}
        </div>
      </div>

      {!selectedTeamId ? (
        <EmptyState icon={ShoppingBag} title="Chọn đội nhóm để xem kho sản phẩm" />
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="h-32 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl">
          {teamProducts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-indigo-300" />
              </div>
              <p className="font-semibold text-slate-600">Kho team chưa có sản phẩm</p>
              <p className="text-sm text-slate-400">
                {canManageSelected ? 'Nhấn "Thêm sản phẩm" để chọn từ kho tổng' : 'Leader chưa thêm sản phẩm nào'}
              </p>
              {canManageSelected && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Thêm sản phẩm đầu tiên
                </button>
              )}
            </div>
          ) : search ? (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm italic">Không tìm thấy sản phẩm "{search}"</p>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm italic">Kho team chưa có sản phẩm nhóm này</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((tp: TeamProduct) => (
            <ProductCard
              key={tp.id}
              teamProduct={tp}
              canRemove={canManageSelected}
              onRemove={() => {
                if (confirm(`Xóa "${tp.product?.name}" khỏi kho team?`)) {
                  removeMut.mutate(tp.product_id)
                }
              }}
            />
          ))}
        </div>
      )}

      {showAdd && selectedTeamId && (
        <AddProductModal
          open={showAdd}
          teamId={selectedTeamId}
          existingProductIds={existingProductIds}
          userId={userId}
          initialBrandType={brandType}
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
