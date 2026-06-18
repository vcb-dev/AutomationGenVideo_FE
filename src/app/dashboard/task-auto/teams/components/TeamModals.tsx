'use client'

import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, DarkSelect } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { Team, UserBasic } from '@/types/task-auto'
import { createTeam, deleteTeam, updateTeam } from '@/lib/api/task-auto'

// ── Create / Edit ──────────────────────────────────

interface TeamFormModalProps {
  open: boolean
  team?: Team
  users: UserBasic[]
  onClose: () => void
  onSuccess: () => void
}

export function TeamFormModal({ open, team, users, onClose, onSuccess }: TeamFormModalProps) {
  const qc = useQueryClient()
  const isEdit = !!team
  const [name, setName] = useState(team?.name || '')
  const [leaderId, setLeaderId] = useState(team?.leader_id || '')

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateTeam(team!.id, { name, leader_id: leaderId || null })
        : createTeam({ name, leader_id: leaderId || undefined }),
    onSuccess: () => {
      toast.success(isEdit ? 'Đã cập nhật team' : 'Tạo team thành công!')
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
      onSuccess()
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  // Reset form when modal opens with new data
  const handleOpen = () => {
    setName(team?.name || '')
    setLeaderId(team?.leader_id || '')
  }

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa team' : 'Tạo đội mới'}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo team'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <DarkInput
          label="Tên team *"
          placeholder="Nhập tên team..."
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <DarkSelect
          label="Leader"
          value={leaderId}
          onChange={e => setLeaderId(e.target.value)}
        >
          <option value="">-- Chọn leader --</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </DarkSelect>
      </div>
    </DarkModal>
  )
}

// ── Delete Confirm ─────────────────────────────────

interface DeleteTeamModalProps {
  open: boolean
  team: Team | null
  onClose: () => void
  onSuccess: () => void
}

export function DeleteTeamModal({ open, team, onClose, onSuccess }: DeleteTeamModalProps) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteTeam(team!.id),
    onSuccess: () => {
      toast.success('Đã xoá team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'teams'] })
      onSuccess()
    },
    onError: () => toast.error('Xoá team thất bại'),
  })

  return (
    <ConfirmDialog
      open={open && !!team}
      title="Xoá team"
      message={`Xoá team "${team?.name}"? Thao tác này không thể hoàn tác.`}
      confirmLabel="Xoá team"
      isLoading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
      onCancel={onClose}
      danger
    />
  )
}
