'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Package, FileText, Users, Check, X, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { Pagination, PAGE_SIZE } from '@/components/task-auto/Pagination'
import { getTeams, getTeamPushRequests, reviewPushRequest } from '@/lib/api/task-auto'
import type { TeamPushRequest } from '@/types/task-auto'

const STATUS_BADGE: Record<TeamPushRequest['status'], { label: string; cls: string }> = {
  PENDING:  { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Đã duyệt',  cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Từ chối',   cls: 'bg-red-100 text-red-600' },
}

function RejectModal({ request, onClose }: { request: TeamPushRequest; onClose: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const reject = useMutation({
    mutationFn: () => reviewPushRequest(request.id, 'REJECTED', note || undefined),
    onSuccess: () => {
      toast.success('Đã từ chối yêu cầu')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-push-requests'] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể từ chối yêu cầu'),
  })
  const itemName = request.type === 'PRODUCT'
    ? (request.editor_product?.name ?? 'Sản phẩm')
    : (request.editor_content?.title || 'Content không tiêu đề')
  return (
    <DarkModal open onClose={onClose} title="Từ chối yêu cầu" size="sm"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button disabled={reject.isPending} onClick={() => reject.mutate()}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {reject.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Từ chối
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Từ chối <strong className="text-slate-800">{itemName}</strong> của{' '}
          <strong className="text-slate-800">{request.requested_by?.full_name ?? '—'}</strong>?
          Người gửi có thể gửi lại yêu cầu mới sau khi chỉnh sửa.
        </p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder="Lý do từ chối (tuỳ chọn)..."
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none transition-colors"
        />
      </div>
    </DarkModal>
  )
}

interface Props {
  isAdminOrManager: boolean
  userId?: string
  selectedTeamId: string
  setSelectedTeamId: (id: string) => void
}

export function TeamPushRequestsTab({ isAdminOrManager, userId, selectedTeamId, setSelectedTeamId }: Props) {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('PENDING')
  const [page, setPage] = useState(1)
  const [rejecting, setRejecting] = useState<TeamPushRequest | null>(null)

  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  // Leader chỉ được xem team mình là leader
  const selectableTeams = isAdminOrManager
    ? (teams ?? [])
    : (teams ?? []).filter(t => t.leader_id === userId)
  const effectiveTeamId = selectableTeams.some(t => t.id === selectedTeamId)
    ? selectedTeamId
    : (selectableTeams[0]?.id ?? '')

  const { data: requests, isLoading } = useQuery({
    queryKey: ['task-auto', 'team-push-requests', effectiveTeamId, statusFilter],
    queryFn: () => getTeamPushRequests(effectiveTeamId, statusFilter || undefined),
    enabled: !!effectiveTeamId,
  })

  useEffect(() => { setPage(1) }, [effectiveTeamId, statusFilter])
  const paginated = (requests ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const approve = useMutation({
    mutationFn: (id: string) => reviewPushRequest(id, 'APPROVED'),
    onSuccess: () => {
      toast.success('Đã duyệt — item đã vào kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-push-requests'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể duyệt yêu cầu'),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {selectableTeams.length > 1 ? (
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
            <CustomSelect
              value={effectiveTeamId}
              onChange={setSelectedTeamId}
              options={selectableTeams.map(t => ({ value: t.id, label: t.name }))}
              className="min-w-[220px]"
              searchable={isAdminOrManager}
            />
          </div>
        ) : selectableTeams[0] ? (
          <p className="text-sm text-slate-500">
            Yêu cầu đẩy vào kho team{' '}
            <span className="font-semibold text-slate-700">{selectableTeams[0].name}</span>
          </p>
        ) : (
          <p className="text-sm text-amber-600">Bạn không phải leader của team nào</p>
        )}
        <CustomSelect
          value={statusFilter}
          onChange={v => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: 'PENDING',  label: 'Chờ duyệt' },
            { value: 'APPROVED', label: 'Đã duyệt' },
            { value: 'REJECTED', label: 'Từ chối' },
            { value: '',         label: 'Tất cả' },
          ]}
          className="min-w-[160px] ml-auto"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Loại</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[35%]">Tên</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tuyến / Dòng</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Người gửi</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ngày gửi</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Trạng thái</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin inline" /></td></tr>
              )}
              {!isLoading && !requests?.length && (
                <tr><td colSpan={7}><EmptyState icon={Inbox} title="Không có yêu cầu nào" /></td></tr>
              )}
              {paginated.map(r => {
                const isProduct = r.type === 'PRODUCT'
                const name = isProduct
                  ? (r.editor_product?.name ?? '—')
                  : (r.editor_content?.title || 'Content không tiêu đề')
                const lineName = isProduct
                  ? r.editor_product?.product_line?.name
                  : r.editor_content?.content_line?.name
                const badge = STATUS_BADGE[r.status]
                return (
                  <tr key={r.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                        isProduct ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700',
                      )}>
                        {isProduct ? <Package className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        {isProduct ? 'Sản phẩm' : 'Content'}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-0">
                      <span className="text-sm font-semibold text-slate-800 truncate block" title={name}>{name}</span>
                      {r.status === 'REJECTED' && r.note && (
                        <span className="text-xs text-red-500 truncate block" title={r.note}>Lý do: {r.note}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">{lineName ?? <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">{r.requested_by?.full_name ?? '—'}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-500">{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', badge.cls)}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {r.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            disabled={approve.isPending}
                            onClick={() => approve.mutate(r.id)}
                            title="Duyệt"
                            className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRejecting(r)}
                            title="Từ chối"
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && !!requests?.length && (
          <Pagination page={page} totalItems={requests.length} onPageChange={setPage} />
        )}
      </div>

      {rejecting && <RejectModal request={rejecting} onClose={() => setRejecting(null)} />}
    </div>
  )
}
