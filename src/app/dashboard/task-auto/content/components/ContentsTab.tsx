'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2, Loader2, Search, Tags, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { ContentFormModal } from '@/components/task-auto/ContentFormModal'
import {
  getContent, deleteContent,
  getContentLines, createContentLine, deleteContentLine,
  getContentClassifications, createContentClassification, deleteContentClassification,
  getTeams, isContentTeamMember,
} from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { Content } from '@/types/task-auto'
import { ContentViewModal } from '@/components/task-auto/ContentViewModal'
import { ContentsBoard } from './ContentsBoard'

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
  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  // Nới quyền tạo/sửa cho content-team member — backend POST/PUT /contents vốn không role-gate,
  // chỉ FE tự giới hạn qua canDelete trước đây (nhầm dùng chung với quyền Xóa, vốn chặt hơn ở BE).
  const canCreateOrEdit = canDelete || isContentTeamMember(teams, user?.id)
  const [search, setSearch] = useState('')
  const [classificationFilter, setClassificationFilter] = useState('')
  const [marketFilter, setMarketFilter] = useState('')
  const [showCatalogPanel, setShowCatalogPanel] = useState(false)
  const [presetLineId, setPresetLineId] = useState<string | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Content | null>(null)
  const [detailItem, setDetailItem] = useState<Content | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: contentLines } = useQuery({ queryKey: ['task-auto', 'content-lines'], queryFn: getContentLines })
  const { data: contentClassifications } = useQuery({ queryKey: ['task-auto', 'content-classifications'], queryFn: getContentClassifications })
  const classificationOptions = (contentClassifications ?? []).map(c => ({ value: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label, 'vi'))

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
  const createClassificationMut = useMutation({
    mutationFn: createContentClassification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'content-classifications'] }),
    onError: () => toast.error('Không thể thêm phân loại nội dung'),
  })
  const deleteClassificationMut = useMutation({
    mutationFn: deleteContentClassification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-auto', 'content-classifications'] }),
    onError: () => toast.error('Không thể xóa phân loại nội dung'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteContent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'contents'] }); toast.success('Đã xóa content'); setDeletingId(null) },
    onError: () => { toast.error('Không thể xóa content'); setDeletingId(null) },
  })

  const openCreate = () => { setEditing(null); setPresetLineId(undefined); setShowModal(true) }
  // Danh sách chỉ trả về field rút gọn (không có body/script) để nhẹ payload — mở sửa phải lấy
  // lại bản đầy đủ, không thì form hiện trống dù content đã có nội dung.
  const openEdit = (c: Content) => {
    setEditing(c)
    setShowModal(true)
    getContent(c.id).then(setEditing).catch(() => toast.error('Không thể tải nội dung content'))
  }
  const openDetail = (c: Content) => {
    setDetailItem(c)
    getContent(c.id).then(setDetailItem).catch(() => toast.error('Không thể tải nội dung content'))
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Main board */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm mã, tiêu đề content..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            <input
              type="month"
              value={month}
              onChange={e => onMonthChange(e.target.value)}
              className="px-3 py-3.5 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />

            <CustomSelect
              value={marketFilter}
              onChange={setMarketFilter}
              options={[
                { value: '', label: 'Tất cả thị trường' },
                { value: 'VIETNAM',   label: 'Việt Nam' },
                { value: 'INDONESIA', label: 'Indonesia' },
                { value: 'JAPAN',     label: 'Nhật Bản' },
                { value: 'THAILAND',  label: 'Thái Lan' },
              ]}
              className="min-w-[160px]"
            />

            <CustomSelect
              value={classificationFilter}
              onChange={setClassificationFilter}
              options={[{ value: '', label: 'Tất cả phân loại' }, ...classificationOptions]}
              className="min-w-[170px]"
              compact
            />

            <button
              onClick={() => setShowCatalogPanel(v => !v)}
              className={cn(
                'rounded-xl px-4 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0 border',
                canCreateOrEdit ? 'ml-0' : 'ml-auto',
                showCatalogPanel
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-gray-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600',
              )}
            >
              <Tags className="w-4 h-4" /> Tuyến & phân loại
            </button>

            {canCreateOrEdit && (
              <button
                onClick={openCreate}
                className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
              >
                <Plus className="w-5 h-5" /> Thêm content
              </button>
            )}
          </div>
        </div>

        {/* Board theo tuyến */}
        <ContentsBoard
          brandType={brandType}
          month={month}
          search={search}
          classificationId={classificationFilter}
          market={marketFilter}
          canEdit={canCreateOrEdit}
          canDelete={canDelete}
          onSelect={openDetail}
          onEdit={openEdit}
          onDelete={c => setDeletingId(c.id)}
          onAdd={contentLineId => { setPresetLineId(contentLineId); setEditing(null); setShowModal(true) }}
        />
      </div>

      {/* Panel quản lý danh mục — thu gọn mặc định để nhường chỗ cho board, chỉ mở khi cần sửa Tuyến/Phân loại */}
      {showCatalogPanel && (
        <div className="lg:w-64 lg:shrink-0 space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Danh mục nội dung</p>
            <button
              onClick={() => setShowCatalogPanel(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-gray-100 transition-colors"
              title="Thu gọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <MiniList
            title="Tuyến nội dung"
            items={contentLines ?? []}
            addLabel="Tên tuyến nội dung..."
            onAdd={name => createLineMut.mutateAsync(name)}
            onDelete={id => deleteLineMut.mutate(id)}
          />
          <MiniList
            title="Phân loại nội dung"
            items={contentClassifications ?? []}
            addLabel="Tên phân loại nội dung..."
            onAdd={name => createClassificationMut.mutateAsync(name)}
            onDelete={id => deleteClassificationMut.mutate(id)}
          />
        </div>
      )}

      {detailItem && (
        <ContentViewModal
          open
          item={detailItem as any}
          catalogType="global"
          canEdit={canCreateOrEdit}
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
        initialContentLineId={presetLineId}
        onClose={() => { setShowModal(false); setPresetLineId(undefined) }}
        onSuccess={() => { setShowModal(false); setPresetLineId(undefined) }}
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
