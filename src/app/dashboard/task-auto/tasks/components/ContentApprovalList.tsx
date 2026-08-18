'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileClock, CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { NumberedPagination } from '@/components/task-auto/NumberedPagination'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { formatDateTime } from '@/components/task-auto/helpers'
import { getContentApprovals, reviewTaskContentApproval } from '@/lib/api/task-auto'
import type { TaskContentApproval } from '@/types/task-auto'

interface Props {
  teamId?: string
  search?: string
  assigneeId?: string
  page: number
  onPageChange: (page: number) => void
  canApproveReject: boolean
}

const LIMIT = 10

// Tiêu đề content của task đính kèm yêu cầu duyệt: editor → team (own→FK) → global (own→FK)
// — cùng logic fallback với resolveContentTitle() trong TasksTable.tsx, áp dụng lên field `task`
// rút gọn mà getContentApprovals() trả về.
function resolveApprovalTaskTitle(task: TaskContentApproval['task']): string | null {
  const g_tc = task?.content?.source_team_content
  return (
    task?.editor_content?.title ??
    task?.team_content?.title ??
    task?.team_content?.source_editor_content?.title ??
    task?.content?.title ??
    g_tc?.title ??
    g_tc?.source_editor_content?.title ??
    null
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-gray-100 last:border-0">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
        </div>
      ))}
    </>
  )
}

export function ContentApprovalList({ teamId, search, assigneeId, page, onPageChange, canApproveReject }: Props) {
  const qc = useQueryClient()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  // Xem nội dung đầy đủ của 1 yêu cầu duyệt — chỉ hiện đúng phần content cần duyệt,
  // không mở TaskDetailPanel đầy đủ (khác với click ở "Danh sách task"/"Video chờ duyệt"/"Video đã nộp").
  const [viewing, setViewing] = useState<TaskContentApproval | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'content-approvals', { teamId, search, assigneeId, page }],
    queryFn: () => getContentApprovals({
      status: 'PENDING',
      team_id: teamId,
      assignee_id: assigneeId,
      search: search || undefined,
      page,
      limit: LIMIT,
    }),
    refetchOnWindowFocus: true,
  })

  const reviewMut = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'APPROVED' | 'REJECTED'; reason?: string }) =>
      reviewTaskContentApproval(id, action, reason),
    onSuccess: (_data, variables) => {
      toast.success('Đã cập nhật yêu cầu duyệt content')
      qc.invalidateQueries({ queryKey: ['task-auto', 'content-approvals'] })
      setRejectingId(null)
      setRejectReason('')
      setViewing(v => (v?.id === variables.id ? null : v))
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Thao tác thất bại'),
  })

  const approvals = data?.data || []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  // Nút Duyệt/Từ chối — dùng chung cho row trong danh sách và modal xem nội dung đầy đủ.
  function renderActions(approvalId: string) {
    const isReviewing = reviewMut.isPending && reviewMut.variables?.id === approvalId
    const isRejectingThis = rejectingId === approvalId

    return !isRejectingThis ? (
      <div className="flex items-center gap-2">
        <button
          onClick={() => reviewMut.mutate({ id: approvalId, action: 'APPROVED' })}
          disabled={isReviewing}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          {isReviewing && reviewMut.variables?.action === 'APPROVED'
            ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Duyệt
        </button>
        <button
          onClick={() => { setRejectingId(approvalId); setRejectReason('') }}
          className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          <XCircle className="w-4 h-4" /> Từ chối
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-2 w-full min-w-[280px]">
        <input
          type="text"
          autoFocus
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          placeholder="Lý do từ chối (tuỳ chọn)..."
          className="flex-1 text-sm bg-white border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <button
          onClick={() => reviewMut.mutate({ id: approvalId, action: 'REJECTED', reason: rejectReason.trim() || undefined })}
          disabled={isReviewing}
          className="bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-lg px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          {isReviewing && reviewMut.variables?.action === 'REJECTED' && <Loader2 className="w-4 h-4 animate-spin" />}
          Xác nhận
        </button>
        <button
          onClick={() => setRejectingId(null)}
          className="text-sm font-semibold px-2 py-2 text-slate-500 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
        >
          Huỷ
        </button>
      </div>
    )
  }

  return (
    <>
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <SkeletonRows />
        ) : approvals.length === 0 ? (
          <EmptyState
            icon={FileClock}
            title="Không có yêu cầu duyệt content nào"
            description="Yêu cầu duyệt content mới của editor sẽ hiện ở đây để duyệt"
          />
        ) : (
          approvals.map(approval => {
            const title = resolveApprovalTaskTitle(approval.task)

            return (
              <div
                key={approval.id}
                onClick={() => setViewing(approval)}
                className="px-5 py-4 hover:bg-indigo-50/60 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {title ?? <span className="text-slate-400 italic">Không có tiêu đề</span>}
                      </p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 shrink-0">
                        <Clock className="w-3 h-3" /> Chờ duyệt
                      </span>
                      {approval.task?.team && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 shrink-0">
                          {approval.task.team.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 max-w-2xl">{approval.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <AvatarInitials name={approval.requested_by?.full_name} size="xs" />
                      <span className="text-xs font-medium text-slate-600">{approval.requested_by?.full_name ?? 'Ẩn danh'}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">Gửi lúc {formatDateTime(approval.created_at)}</span>
                    </div>
                  </div>

                  {canApproveReject && (
                    <div className="flex flex-col items-end gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {renderActions(approval.id)}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <NumberedPagination
        page={page}
        totalPages={totalPages}
        total={total}
        itemLabel="yêu cầu"
        onPageChange={onPageChange}
        className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50"
      />
    </div>

    {viewing && (
      <DarkModal
        open
        onClose={() => setViewing(null)}
        title={resolveApprovalTaskTitle(viewing.task) ?? 'Content chờ duyệt'}
        subtitle={[viewing.task?.team?.name, viewing.requested_by?.full_name && `Gửi bởi ${viewing.requested_by.full_name}`]
          .filter(Boolean).join(' · ')}
        size="lg"
        footer={canApproveReject ? renderActions(viewing.id) : undefined}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
              <Clock className="w-3 h-3" /> Chờ duyệt
            </span>
            <span className="text-xs text-slate-400">Gửi lúc {formatDateTime(viewing.created_at)}</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 max-h-[50vh] overflow-y-auto">
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{viewing.content}</p>
          </div>
        </div>
      </DarkModal>
    )}
    </>
  )
}
