'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileText, Search, Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { addTeamContent, getContents } from '@/lib/api/task-auto'
import type { BrandType } from '@/types/task-auto'

interface Props {
  open: boolean
  teamId: string
  existingContentIds: string[]
  onClose: () => void
  onSuccess: () => void
  initialBrandType?: BrandType
}

export function AddContentModal({ open, teamId, existingContentIds, onClose, onSuccess, initialBrandType = 'DO_DA' }: Props) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [brandType, setBrandType] = useState<BrandType>(initialBrandType)
  const [selectedId, setSelectedId] = useState('')

  const { data: contentsData, isLoading } = useQuery({
    queryKey: ['task-auto', 'contents-catalog', brandType, search],
    queryFn: () => getContents({ owner: 'global', brand_type: brandType, search: search || undefined, limit: 50, status: 'AVAILABLE' } as any),
    enabled: open,
  })

  const available = (contentsData?.data ?? []).filter(c => !existingContentIds.includes(c.id))

  const mutation = useMutation({
    mutationFn: () => addTeamContent(teamId, selectedId),
    onSuccess: () => {
      toast.success('Đã thêm content vào kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', teamId] })
      setSelectedId('')
      onSuccess()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Thêm content thất bại'),
  })

  useEffect(() => { if (!open) { setSearch(''); setSelectedId(''); setBrandType(initialBrandType) } }, [open, initialBrandType])

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title="Thêm từ kho tổng"
      subtitle="Chọn content từ catalog để thêm vào kho team"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!selectedId || mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Thêm vào kho
          </button>
        </>
      }
    >
      <div className="flex gap-2 mb-3">
        {(['DO_DA', 'TRANG_SUC'] as BrandType[]).map(b => (
          <button key={b} onClick={() => { setBrandType(b); setSelectedId('') }}
            className={cn('px-4 py-1.5 rounded-full text-xs font-semibold border transition-all',
              brandType === b ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-slate-500 hover:border-slate-400')}>
            {b === 'DO_DA' ? 'Đồ da' : 'Trang sức'}
          </button>
        ))}
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tiêu đề content..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
        ) : available.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10 italic">
            {search ? 'Không tìm thấy content phù hợp' : 'Tất cả content sẵn sàng đã có trong kho team'}
          </p>
        ) : (
          available.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                selectedId === c.id
                  ? 'bg-indigo-50 border border-indigo-300'
                  : 'hover:bg-gray-50 border border-transparent'
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {c.title || <span className="text-slate-400 italic font-normal">Chưa đặt tên</span>}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {c.content_line?.name ?? 'Chưa có tuyến nội dung'}
                </p>
              </div>
              {selectedId === c.id && <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-1" />}
            </button>
          ))
        )}
      </div>
    </DarkModal>
  )
}
