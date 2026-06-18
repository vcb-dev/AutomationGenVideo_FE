'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, Check, X, Loader2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { ApprovalStatusBadge } from '@/components/task-auto/StatusBadge'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkTextarea } from '@/components/task-auto/DarkInput'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { formatDateTime } from '@/components/task-auto/helpers'
import { ApprovalStatus, EditorApproval } from '@/types/task-auto'
import { getApprovals, updateApproval } from '@/lib/api/task-auto'

type ApprovalFilter = ApprovalStatus | 'ALL'

const APPROVAL_FILTERS: { value: ApprovalFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
]

// ── Action Modal ────────────────────────────────────

function ApprovalActionModal({
  open,
  approval,
  action,
  onClose,
  onSuccess,
}: {
  open: boolean
  approval: EditorApproval | null
  action: 'APPROVED' | 'REJECTED'
  onClose: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: () => updateApproval(approval!.id, { status: action, note: note || undefined }),
    onSuccess: () => {
      toast.success(action === 'APPROVED' ? 'Đã phê duyệt editor' : 'Đã từ chối editor')
      qc.invalidateQueries({ queryKey: ['task-auto', 'approvals'] })
      onSuccess()
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  const isApprove = action === 'APPROVED'

  return (
    <DarkModal
      open={open && !!approval}
      onClose={onClose}
      title={isApprove ? 'Phê duyệt Editor' : 'Từ chối Editor'}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={(!isApprove && !note.trim()) || mutation.isPending}
            className={cn(
              'rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60 text-white',
              isApprove ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
            )}
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isApprove ? 'Phê duyệt' : 'Từ chối'}
          </button>
        </>
      }
    >
      {approval && (
        <div className="space-y-4">
          {/* User preview */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <AvatarInitials name={approval.user?.full_name} size="md" />
            <div>
              <p className="font-semibold text-slate-800">{approval.user?.full_name}</p>
              <p className="text-xs text-slate-400">{approval.user?.email}</p>
            </div>
          </div>

          <DarkTextarea
            label={`Ghi chú${!isApprove ? ' *' : ''}`}
            rows={3}
            placeholder={!isApprove ? 'Nhập lý do từ chối...' : 'Ghi chú (tuỳ chọn)...'}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      )}
    </DarkModal>
  )
}

// ── Main Tab ────────────────────────────────────────

export function ApprovalsTab({ canApprove }: { canApprove: boolean }) {
  const [filterStatus, setFilterStatus] = useState<ApprovalFilter>('ALL')
  const [actionModal, setActionModal] = useState<{
    approval: EditorApproval
    action: 'APPROVED' | 'REJECTED'
  } | null>(null)

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['task-auto', 'approvals', filterStatus],
    queryFn: () => getApprovals(filterStatus === 'ALL' ? undefined : filterStatus),
    refetchOnWindowFocus: true,
  })

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {APPROVAL_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors',
              filterStatus === f.value
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-500/40'
                : 'bg-gray-100 text-slate-500 hover:bg-gray-200 hover:text-slate-700 border border-transparent'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : !approvals || approvals.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Không có yêu cầu phê duyệt" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Editor</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ngày yêu cầu</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ghi chú</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Người duyệt</th>
                  {canApprove && (
                    <th className="text-center px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Hành động</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approvals.map(approval => (
                  <tr key={approval.id} className="hover:bg-gray-50 transition-colors text-slate-700">
                    <td className="px-5 py-4 text-sm">
                      <div className="flex items-center gap-2.5">
                        <AvatarInitials name={approval.user?.full_name} />
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{approval.user?.full_name}</p>
                          <p className="text-xs text-slate-500">{approval.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">
                      {formatDateTime(approval.created_at)}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <ApprovalStatusBadge status={approval.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 max-w-[200px] truncate">
                      {approval.note || <span className="text-slate-600 italic">—</span>}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {approval.approved_by ? (
                        <div className="flex items-center gap-1.5">
                          <AvatarInitials name={approval.approved_by.full_name} />
                          <span className="text-xs text-slate-700">{approval.approved_by.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    {canApprove && (
                      <td className="px-5 py-4 text-sm">
                        {approval.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setActionModal({ approval, action: 'APPROVED' })}
                              className="p-1.5 hover:bg-emerald-50 text-emerald-500 rounded-lg transition-colors"
                              title="Phê duyệt"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setActionModal({ approval, action: 'REJECTED' })}
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                              title="Từ chối"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            {approval.status === 'APPROVED' ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <X className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ApprovalActionModal
        open={!!actionModal}
        approval={actionModal?.approval ?? null}
        action={actionModal?.action ?? 'APPROVED'}
        onClose={() => setActionModal(null)}
        onSuccess={() => setActionModal(null)}
      />
    </div>
  )
}
