'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Loader2, FileText, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ContentStatusBadge } from '@/components/task-auto/StatusBadge'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { ContentFormModal, parseMarkets } from '@/components/task-auto/ContentFormModal'
import {
  getContents, deleteContent,
  getContentLines, createContentLine, deleteContentLine,
} from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { Content, ContentUsageStatus } from '@/types/task-auto'
import { ContentViewModal } from '@/components/task-auto/ContentViewModal'

// ── Helpers ──────────────────────────────────────────

const MARKET_COLOR: Record<string, string> = {
  VIETNAM:   'bg-emerald-100 text-emerald-700',
  INDONESIA: 'bg-amber-100 text-amber-700',
  JAPAN:     'bg-rose-100 text-rose-700',
  THAILAND:  'bg-sky-100 text-sky-700',
}
const MARKET_SHORT: Record<string, string> = { VIETNAM: 'VN', INDONESIA: 'ID', JAPAN: 'JP', THAILAND: 'TH' }
const MarketBadge = ({ market }: { market: string }) =>
  <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold', MARKET_COLOR[market] ?? 'bg-gray-100 text-gray-600')}>
    {MARKET_SHORT[market] ?? market}
  </span>

// ── Pagination ────────────────────────────────────────

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="p-2 rounded-xl hover:bg-gray-100 text-slate-500 disabled:opacity-40 transition-colors">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-base text-slate-600 font-medium">Trang {page} / {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="p-2 rounded-xl hover:bg-gray-100 text-slate-500 disabled:opacity-40 transition-colors">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

function LoadingRows({ cols }: { cols: number }) {
  return <>
    {Array.from({ length: 5 }).map((_, i) => (
      <tr key={i}>{Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
      ))}</tr>
    ))}
  </>
}

// ── MiniList sidebar ──────────────────────────────────

function MiniList({
  title, items, onAdd, onDelete, addLabel,
}: {
  title: string
  items: { id: string; name: string; _count?: Record<string, number> }[]
  onAdd: (name: string) => void
  onDelete?: (id: string) => void
  addLabel: string
}) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try { onAdd(newName.trim()); setNewName('') }
    finally { setAdding(false) }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-4">{title}</h3>
      <div className="space-y-0.5 max-h-56 overflow-y-auto mb-4">
        {items.length === 0 && <p className="text-sm text-slate-400 py-3 text-center">Chưa có dữ liệu</p>}
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 group">
            <span className="text-base text-slate-700 truncate">{item.name}</span>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {item._count && (
                <span className="text-sm text-slate-400">
                  ({Object.values(item._count).reduce((a, b) => a + b, 0)})
                </span>
              )}
              {onDelete && (
                <button onClick={() => onDelete(item.id)} className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={addLabel}
          className="w-3/4 bg-white border border-gray-200 rounded-xl p-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button onClick={handleAdd} disabled={adding || !newName.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// ── Contents Tab ──────────────────────────────────────

type BrandType = 'DO_DA' | 'TRANG_SUC'

export function ContentsTab({ brandType, month, onMonthChange }: { brandType: BrandType; month: string; onMonthChange: (month: string) => void }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canDelete = user?.roles?.some((r: string) => ['ADMIN', 'MANAGER'].includes(r)) ?? false
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContentUsageStatus | ''>('')
  const [contentLineFilter, setContentLineFilter] = useState('')
  const [marketFilter, setMarketFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Content | null>(null)
  const [detailItem, setDetailItem] = useState<Content | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: contentLines } = useQuery({ queryKey: ['task-auto', 'content-lines'], queryFn: getContentLines })
  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'contents', brandType, search, statusFilter, contentLineFilter, marketFilter, month, page],
    queryFn: () => getContents({
      brand_type: brandType,
      search: search || undefined,
      status: statusFilter || undefined,
      content_line_id: contentLineFilter || undefined,
      market: marketFilter || undefined,
      month: month || undefined,
      page, limit: 10,
    }),
  })

  const createLineMut = useMutation({
    mutationFn: createContentLine,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'content-lines'] }),
    onError: () => toast.error('Không thể thêm tuyến nội dung'),
  })
  const deleteLineMut = useMutation({
    mutationFn: deleteContentLine,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'content-lines'] }),
    onError: () => toast.error('Không thể xóa tuyến nội dung'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteContent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'contents'] }); toast.success('Đã xóa content'); setDeletingId(null) },
    onError: () => { toast.error('Không thể xóa content'); setDeletingId(null) },
  })

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit = (c: Content) => { setEditing(c); setShowModal(true) }

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Main table */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Tìm kiếm tiêu đề content..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
            {/* <CustomSelect
              value={statusFilter}
              onChange={v => { setStatusFilter(v as ContentUsageStatus | ''); setPage(1) }}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                ...(Object.keys(CONTENT_STATUS_LABELS) as ContentUsageStatus[]).map(k => ({ value: k, label: CONTENT_STATUS_LABELS[k] })),
              ]}
              className="min-w-[175px]"
            /> */}
            <CustomSelect
              value={contentLineFilter}
              onChange={v => { setContentLineFilter(v); setPage(1) }}
              options={[
                { value: '', label: 'Tất cả tuyến nội dung' },
                ...(contentLines?.map(l => ({ value: l.id, label: l.name })) ?? []),
              ]}
              className="min-w-[200px]"
              searchable
            />
            <CustomSelect
              value={marketFilter}
              onChange={v => { setMarketFilter(v); setPage(1) }}
              options={[
                { value: '', label: 'Tất cả thị trường' },
                { value: 'VIETNAM',   label: 'Việt Nam' },
                { value: 'INDONESIA', label: 'Indonesia' },
                { value: 'JAPAN',     label: 'Nhật Bản' },
                { value: 'THAILAND',  label: 'Thái Lan' },
              ]}
              className="min-w-[160px]"
            />
            <input
              type="month"
              value={month}
              onChange={e => { onMonthChange(e.target.value); setPage(1) }}
              className="px-3 py-3.5 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {canDelete && (
              <button
                onClick={openCreate}
                className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
              >
                <Plus className="w-5 h-5" /> Thêm content
              </button>
            )}
          </div>
        </div>

        {data && data.total > 0 && (
          <p className="text-sm text-slate-500 px-1">
            Tổng <span className="font-bold text-slate-700">{data.total}</span> content
            {search && <span> · kết quả cho "<span className="font-semibold text-indigo-600">{search}</span>"</span>}
          </p>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-gray-200">
                  <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide w-[35%]">Tiêu đề</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[15%]">Tuyến ND</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[9%]">Thị trường</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[13%]">Trạng thái</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[7%]">Lượt xem</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap w-[11%]">Người thêm</th>
                  <th className="text-left px-4 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Ngày thêm</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && <LoadingRows cols={8} />}

                {!isLoading && (!data?.data || data.data.length === 0) && (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState icon={FileText} title="Không có content nào" />
                    </td>
                  </tr>
                )}

                {data?.data.map(c => {
                  const tc = c.source_team_content
                  const tc_ec = tc?.source_editor_content
                  const rTitle = c.title || tc?.title || tc_ec?.title || null
                  const rContentLine = c.content_line ?? tc?.content_line ?? tc_ec?.content_line ?? null
                  const rMarket = c.market || tc?.market || tc_ec?.market || null
                  return (<tr key={c.id} className="hover:bg-indigo-50/20 transition-colors group cursor-pointer" onClick={() => setDetailItem(c)}>

                    {/* Tiêu đề */}
                    <td className="px-5 py-4 max-w-0">
                      <span className="text-base font-semibold text-slate-800 truncate block hover:text-indigo-600 transition-colors" title={rTitle ?? ''}>
                        {rTitle || <span className="text-slate-400 italic font-normal text-sm">Chưa đặt tên</span>}
                      </span>
                    </td>

                    {/* Tuyến ND */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {rContentLine?.name
                        ? <span className="text-sm font-medium text-slate-700">{rContentLine.name}</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>

                    {/* Thị trường */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1.5">
                        {parseMarkets(rMarket).map(m => <MarketBadge key={m} market={m} />)}
                        {!rMarket && <span className="text-slate-300 text-sm">—</span>}
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <ContentStatusBadge status={c.status} />
                    </td>

                    {/* Lượt xem */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-500">{c.view_count ?? '0'}</span>
                    </td>

                    {/* Người thêm */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-500">
                        {c.added_by?.full_name ?? <span className="text-slate-300">—</span>}
                      </span>
                    </td>

                    {/* Ngày thêm */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-500">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : <span className="text-slate-300">—</span>}
                      </span>
                    </td>

                    {/* Hành động */}
                    <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canDelete && (
                          <>
                            <button
                              onClick={() => openEdit(c)}
                              className="p-2 rounded-xl hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {c.status === 'IN_TASK' ? (
                              <button
                                disabled
                                title="Content đang được dùng trong task chưa duyệt"
                                className="p-2 rounded-xl text-slate-200 cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setDeletingId(c.id)}
                                className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>)
                })}
              </tbody>
            </table>
          </div>

          {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:w-64 lg:shrink-0">
        <MiniList
          title="Tuyến nội dung"
          items={contentLines ?? []}
          addLabel="Tên tuyến nội dung..."
          onAdd={name => createLineMut.mutateAsync(name)}
          onDelete={id => deleteLineMut.mutate(id)}
        />
      </div>

      {detailItem && (
        <ContentViewModal
          open
          item={detailItem as any}
          catalogType="global"
          canEdit={canDelete}
          canDelete={canDelete && detailItem.status !== 'IN_TASK'}
          onClose={() => setDetailItem(null)}
          onEdit={() => { openEdit(detailItem); setDetailItem(null) }}
          onDelete={() => { setDeletingId(detailItem.id); setDetailItem(null) }}
        />
      )}

      <ContentFormModal
        open={showModal}
        editing={editing}
        brandType={brandType}
        onClose={() => setShowModal(false)}
        onSuccess={() => setShowModal(false)}
      />

      <ConfirmDialog
        open={!!deletingId}
        title="Xóa content"
        message="Content sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xóa content"
        danger
        isLoading={deleteMut.isPending}
        onConfirm={() => deletingId && deleteMut.mutate(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
