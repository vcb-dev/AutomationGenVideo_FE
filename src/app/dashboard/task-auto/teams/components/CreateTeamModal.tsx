'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, Loader2, Search, X, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { createTeam, getUsers } from '@/lib/api/task-auto'
import type { BrandType, Team } from '@/types/task-auto'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess?: (team: Team) => void
}

export function CreateTeamModal({ open, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [brandType, setBrandType] = useState<BrandType>('TRANG_SUC')
  const [leaderId, setLeaderId] = useState('')
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const { data: leaders } = useQuery({
    queryKey: ['task-auto', 'users', 'LEADER'],
    queryFn: () => getUsers('LEADER'),
    enabled: open,
  })

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['task-auto', 'users'],
    queryFn: () => getUsers(),
    enabled: open,
  })

  // Leader được backend tự thêm làm thành viên nên loại khỏi danh sách chọn thành viên
  const q = search.trim().toLowerCase()
  const candidates = (users ?? []).filter(u =>
    u.id !== leaderId &&
    (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  )

  const toggleMember = (id: string) =>
    setMemberIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const createMut = useMutation({
    mutationFn: () => createTeam({
      name: name.trim(),
      brand_type: brandType,
      leader_id: leaderId || undefined,
      member_ids: Array.from(memberIds),
    }),
    onSuccess: (team) => {
      toast.success(`Đã tạo đội "${team.name}"`)
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
      onSuccess?.(team)
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Tạo đội thất bại'),
  })

  // Tên team dùng dấu phẩy làm ký tự phân cách multi-team ở User.team — backend sẽ từ chối
  const nameError = name.includes(',') ? 'Tên đội không được chứa dấu phẩy' : ''
  const canSubmit = name.trim() !== '' && !nameError && !createMut.isPending

  useEffect(() => {
    if (!open) { setName(''); setBrandType('TRANG_SUC'); setLeaderId(''); setMemberIds(new Set()); setSearch('') }
  }, [open])

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title="Tạo đội mới"
      subtitle="Leader sẽ tự động là thành viên của đội"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
            Hủy
          </button>
          <button
            onClick={() => createMut.mutate()}
            disabled={!canSubmit}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Tạo đội
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Tên đội <span className="text-rose-500">*</span>
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Team Kim Cương"
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
          {nameError && <p className="text-xs text-rose-500 mt-1">{nameError}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Thương hiệu</label>
          <div className="flex gap-2">
            {(['TRANG_SUC', 'DO_DA'] as BrandType[]).map(b => (
              <button key={b} type="button" onClick={() => setBrandType(b)}
                className={cn('px-4 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  brandType === b ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-slate-500 hover:border-slate-400')}>
                {b === 'DO_DA' ? 'Đồ da' : 'Trang sức'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Leader</label>
          <div className="relative">
            <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
            <select
              value={leaderId}
              onChange={e => { const id = e.target.value; setLeaderId(id); setMemberIds(prev => { const n = new Set(prev); n.delete(id); return n }) }}
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors appearance-none"
            >
              <option value="">— Chưa chọn leader —</option>
              {(leaders ?? []).map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Thành viên
            {memberIds.size > 0 && <span className="ml-1.5 text-indigo-600">({memberIds.size} đã chọn)</span>}
          </label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-1.5">
            {loadingUsers ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
            ) : candidates.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8 italic">
                {search ? 'Không tìm thấy nhân sự phù hợp' : 'Chưa có nhân sự nào'}
              </p>
            ) : (
              candidates.map(u => {
                const selected = memberIds.has(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleMember(u.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left',
                      selected ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                      selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'
                    )}>
                      {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{u.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </DarkModal>
  )
}
