'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useScrollLock } from '@/hooks/useScrollLock'
import toast from 'react-hot-toast'
import { Loader2, Zap, XCircle, CheckCircle2, Play, ExternalLink } from 'lucide-react'
import {
  getTask, approveTask, cancelTask, getSources, getTeamSources,
  getProduct, getContent, startTask,
  updateTask, getProducts, getContents, getTeam, getApprovals,
} from '@/lib/api/task-auto'
import { SubmitModal, RejectModal } from './TaskModals'
import { StatusTimeline } from './detail/StatusTimeline'
import { TaskPanelHeader } from './detail/TaskPanelHeader'
import { TaskPanelFooter } from './detail/TaskPanelFooter'
import { TaskMetaStrip } from './detail/TaskMetaStrip'
import { ContentSection } from './detail/ContentSection'
import { SourcesSection } from './detail/SourcesSection'
import { ProductSection } from './detail/ProductSection'
import { VideoPreviewOverlay } from './detail/VideoPreviewOverlay'
import type { Source, TeamSource } from '@/types/task-auto'

interface Props {
  taskId: string
  onClose: () => void
  userRoles: string[]
  currentUserId?: string
}

export function TaskDetailPanel({ taskId, onClose, userRoles, currentUserId }: Props) {
  useScrollLock()
  const qc = useQueryClient()
  const [showSubmit, setShowSubmit]         = useState(false)
  const [showReject, setShowReject]         = useState(false)
  const [showResubmit, setShowResubmit]     = useState(false)
  const [showVideoPreview, setShowVideoPreview] = useState(false)
  const [editMode, setEditMode]             = useState(false)
  const [editForm, setEditForm] = useState({
    product_id: '',
    content_id: '',
    source_outro_id: '',
    source_collected_id: '',
    source_workshop_id: '',
    source_huyk_id: '',
    assignee_id: '',
  })
  const [productSearch, setProductSearch] = useState('')
  const [contentSearch, setContentSearch] = useState('')

  const { data: task, isLoading } = useQuery({
    queryKey: ['task-auto', 'task', taskId],
    queryFn: () => getTask(taskId),
    enabled: !!taskId,
    refetchOnWindowFocus: true,
  })

  // ✅ Query từ bất kỳ content ID nào available
  const contentIdToQuery = task?.content_id ?? task?.editor_content_id ?? task?.team_content_id
  const { data: fullContent } = useQuery({
    queryKey: ['task-auto', 'content', contentIdToQuery],
    queryFn: () => getContent(contentIdToQuery!),
    enabled: !!contentIdToQuery,
  })

  // ✅ Query từ bất kỳ product ID nào available
  const productIdToQuery = task?.product_id ?? task?.editor_product_id ?? task?.team_product_id
  const { data: fullProduct } = useQuery({
    queryKey: ['task-auto', 'product', productIdToQuery],
    queryFn: () => getProduct(productIdToQuery!),
    enabled: !!productIdToQuery,
  })

  const { data: productSourcesData } = useQuery({
    queryKey: ['task-auto', 'sources', task?.product_id],
    queryFn: () => getSources({ product_id: task!.product_id!, is_active: true, limit: 50 }),
    enabled: !!task?.product_id,
  })
  const productSources: Source[] = productSourcesData?.data ?? []

  useEffect(() => {
    if (task && editMode) {
      setEditForm({
        product_id:          task.product_id          ?? '',
        content_id:          task.content_id          ?? '',
        source_outro_id:     task.source_outro_id     ?? '',
        source_collected_id: task.source_extra_id     ?? '',
        source_workshop_id:  task.source_workshop_id  ?? '',
        source_huyk_id:      task.source_huyk_id      ?? '',
        assignee_id:         task.assignee_id         ?? '',
      })
    }
  }, [task?.id, editMode])

  const { data: editProductsData, isLoading: loadingEditProducts } = useQuery({
    queryKey: ['task-auto', 'detail-products', productSearch],
    queryFn: () => getProducts({ search: productSearch || undefined, limit: 50 }),
    enabled: editMode,
  })

  const { data: editContentsData, isLoading: loadingEditContents } = useQuery({
    queryKey: ['task-auto', 'detail-contents', contentSearch],
    queryFn: () => getContents({ search: contentSearch || undefined, limit: 50 }),
    enabled: editMode,
  })

  const { data: editPersonalSrcs } = useQuery({
    queryKey: ['task-auto', 'detail-src-personal', currentUserId],
    queryFn: () => getSources({ owner: 'editor', user_id: currentUserId, is_active: true, limit: 200 }),
    enabled: editMode && !!currentUserId,
  })
  const { data: editTeamSrcsRaw } = useQuery({
    queryKey: ['task-auto', 'detail-src-team', task?.team_id],
    queryFn: () => getTeamSources(task!.team_id!, { is_active: true }),
    enabled: editMode && !!task?.team_id,
  })
  const editTeamSrcs = { data: (editTeamSrcsRaw ?? [])
    .filter((ts: TeamSource) => !!ts.source_source_id)
    .map((ts: TeamSource) => ({
      ...ts, id: ts.source_source_id!, user_id: null,
      lark_record_id: null, created_at: ts.added_at,
    } as unknown as Source)) }
  const { data: editGlobalSrcs } = useQuery({
    queryKey: ['task-auto', 'detail-src-global'],
    queryFn: () => getSources({ owner: 'global', is_active: true, limit: 200 }),
    enabled: editMode,
  })

  const editAllSources: Source[] = useMemo(() => {
    const seen = new Set<string>()
    const result: Source[] = []
    for (const s of [
      ...(editPersonalSrcs?.data ?? []),
      ...(editTeamSrcs?.data ?? []),
      ...(editGlobalSrcs?.data ?? []),
    ]) {
      if (!seen.has(s.id)) { seen.add(s.id); result.push(s) }
    }
    return result
  }, [editPersonalSrcs, editTeamSrcs, editGlobalSrcs])

  const outroSources  = editAllSources.filter(s => s.type === 'OUTRO')
  const collectedSrcs = editAllSources.filter(s => s.type === 'COLLECTED')
  const workshopSrcs  = editAllSources.filter(s => s.type === 'WORKSHOP')
  const huykSrcs      = editAllSources.filter(s => s.type === 'HUYK')

  const updateMut = useMutation({
    mutationFn: () => updateTask(taskId, {
      product_id:         editForm.product_id         || undefined,
      content_id:         editForm.content_id         || undefined,
      source_outro_id:    editForm.source_outro_id    || null,
      source_extra_id:    editForm.source_collected_id || null,
      source_workshop_id: editForm.source_workshop_id || null,
      source_huyk_id:     editForm.source_huyk_id     || null,
      ...(canAssign && task?.status === 'PENDING' && {
        assignee_id: editForm.assignee_id || null,
      }),
    } as any),
    onSuccess: (updatedTask) => {
      toast.success('Đã cập nhật task')
      qc.setQueryData(['task-auto', 'task', taskId], updatedTask)
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      setEditMode(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể cập nhật task'),
  })

  const isAssignee       = task?.assignee_id === currentUserId
  const canApproveReject = userRoles.some(r => ['ADMIN', 'MANAGER', 'LEADER'].includes(r))
  const canCancel        = userRoles.some(r => ['ADMIN', 'MANAGER'].includes(r))
  const canAssign        = userRoles.some(r => ['ADMIN', 'MANAGER', 'LEADER'].includes(r))
  const canStart         = task?.status === 'ASSIGNED' && isAssignee

  const assignEnabled = editMode && canAssign && task?.status === 'PENDING'
  const { data: taskTeam } = useQuery({
    queryKey: ['task-auto', 'team', task?.team_id],
    queryFn: () => getTeam(task!.team_id!),
    enabled: assignEnabled && !!task?.team_id,
  })
  const { data: approvedEditors } = useQuery({
    queryKey: ['task-auto', 'approvals', 'APPROVED'],
    queryFn: () => getApprovals('APPROVED'),
    enabled: assignEnabled,
  })
  const editorUsers = useMemo(() => {
    if (!taskTeam?.members || !approvedEditors) return []
    const approvedIds = new Set(approvedEditors.map(a => a.user_id))
    return taskTeam.members
      .filter(m => m.user && approvedIds.has(m.user_id))
      .map(m => m.user!)
  }, [taskTeam, approvedEditors])

  const startMut = useMutation({
    mutationFn: () => startTask(taskId),
    onSuccess: () => {
      toast.success('Task đã bắt đầu!')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', taskId] })
    },
    onError: () => toast.error('Thao tác thất bại'),
  })
  const approveMut = useMutation({
    mutationFn: () => approveTask(taskId),
    onSuccess: () => {
      toast.success('Đã duyệt task!')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', taskId] })
    },
    onError: () => toast.error('Thao tác thất bại'),
  })
  const cancelMut = useMutation({
    mutationFn: () => cancelTask(taskId),
    onSuccess: () => {
      toast.success('Đã huỷ task')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', taskId] })
    },
    onError: () => toast.error('Huỷ task thất bại'),
  })

  // ✅ Content fallback - đầy đủ từ fullContent đến các relations
  const contentTitle  = fullContent?.title 
    ?? task?.editor_content?.title 
    ?? task?.team_content?.title 
    ?? task?.content?.title

  const contentMarket = fullContent?.market 
    ?? task?.editor_content?.market
    ?? task?.team_content?.market
    ?? task?.content?.market

  const contentLine   = fullContent?.content_line?.name 
    ?? task?.editor_content?.content_line?.name
    ?? task?.team_content?.content_line?.name
    ?? task?.content?.content_line?.name 
    ?? task?.content_line?.name

  const fileUrl       = fullContent?.file_content_url 
    ?? task?.editor_content?.file_content_url
    ?? task?.team_content?.file_content_url
    ?? task?.content?.file_content_url

  const scriptText    = fullContent?.body 
    || fullContent?.script 
    || task?.editor_content?.body
    || task?.editor_content?.script
    || task?.team_content?.body
    || task?.team_content?.script
    || task?.content?.script

  const voiceUrl = fullContent?.voice_url
    ?? task?.editor_content?.voice_url
    ?? task?.team_content?.voice_url
    

  // ✅ Product fallback - đầy đủ từ fullProduct đến các relations
  const resolvedProduct = fullProduct
    ?? (task?.editor_product ? task.editor_product as unknown as typeof fullProduct : undefined)
    ?? (task?.team_product   ? task.team_product   as unknown as typeof fullProduct : undefined)
    ?? (task?.product        ? task.product        as unknown as typeof fullProduct : undefined)

  const productName   = resolvedProduct?.name

  const productSku    = resolvedProduct?.sku

  const primaryImage  = resolvedProduct?.image_url
    ?? resolvedProduct?.image_urls?.[0]

  const extraImages   = (resolvedProduct?.image_urls ?? [])
    .filter(u => u !== primaryImage)
    .slice(0, 3)

  const isDriveUrl   = task?.result_url?.includes('drive.google.com')
  const isLegacyPath = task?.result_url?.startsWith('/task-auto/tasks/')

  return (
    <>
      <div className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-5xl max-h-[92vh] bg-gray-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/8">

          <TaskPanelHeader
            task={task}
            editMode={editMode}
            contentTitle={contentTitle}
            productName={productName}
            productSku={productSku}
            onToggleEdit={() => setEditMode(v => !v)}
            onClose={onClose}
          />

          {task && (
            <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-gray-100 shrink-0">
              <div className="flex-1 overflow-x-auto min-w-0">
                <StatusTimeline status={task.status} />
              </div>
              {task.result_url && (
                <div className="shrink-0 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-800 leading-none mb-1.5">Kết quả đã nộp</p>
                    {isDriveUrl ? (
                      <button
                        onClick={() => setShowVideoPreview(true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 whitespace-nowrap transition-colors"
                      >
                        <Play className="w-3 h-3 fill-emerald-700 shrink-0" />
                        Xem video kết quả
                      </button>
                    ) : (
                      <a href={task.result_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 whitespace-nowrap transition-colors"
                      >
                        Xem kết quả <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                  </div>
                  {(isDriveUrl || isLegacyPath) && task.status === 'SUBMITTED' && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-full whitespace-nowrap">
                      Chờ duyệt
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : !task ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400">Không tìm thấy task</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">

                {/* Lý do từ chối */}
                {task.reject_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">Lý do từ chối</p>
                      <p className="text-sm text-red-700">{task.reject_reason}</p>
                    </div>
                  </div>
                )}

                {/* Task sáng tạo */}
                {task.is_extra && (
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
                      <Zap className="w-7 h-7 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-bold text-violet-800 text-base">Task sáng tạo</p>
                      <p className="text-sm text-violet-600 mt-1">
                        Task này không có nội dung cụ thể. Hãy bắt đầu làm và nộp link kết quả khi hoàn thành.
                      </p>
                    </div>
                    {task.result_url && !task.result_url.startsWith('/task-auto/tasks/') && (
                      <a href={task.result_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-violet-700 hover:underline flex items-center gap-1.5 font-medium">
                        Xem kết quả đã nộp <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Task thường: 2 cột + meta */}
                {!task.is_extra && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">

                      {/* LEFT: Content + Sources */}
                      <div className="flex flex-col gap-4">
                        <ContentSection
                          editMode={editMode}
                          edit={{
                            contentId: editForm.content_id,
                            onChange: v => setEditForm(f => ({ ...f, content_id: v })),
                            items: (editContentsData?.data ?? []).map(c => ({
                              value: c.id,
                              label: c.title || c.id,
                              sublabel: c.content_line?.name ?? undefined,
                            })),
                            searchValue: contentSearch,
                            onSearchChange: setContentSearch,
                            loading: loadingEditContents,
                            currentContentId: task.content_id ?? undefined,
                            currentContentTitle: contentTitle,
                          }}
                          view={{
                            contentTitle,
                            contentMarket,
                            contentLine,
                            scriptText,
                            fileUrl,
                            voiceUrl,
                          }}
                        />

                        <SourcesSection
                          editMode={editMode}
                          task={task}
                          //productSources={productSources}
                          edit={{
                            form: {
                              source_outro_id:     editForm.source_outro_id,
                              source_collected_id: editForm.source_collected_id,
                              source_workshop_id:  editForm.source_workshop_id,
                              source_huyk_id:      editForm.source_huyk_id,
                            },
                            onChange: patch => setEditForm(f => ({ ...f, ...patch })),
                            outroSources,
                            collectedSrcs,
                            workshopSrcs,
                            huykSrcs,
                            productSources,
                            hasProduct: !!(
                              task?.product ||
                              task?.editor_product ||
                              task?.team_product ||
                              task?.product_id ||
                              task?.editor_product_id ||
                              task?.team_product_id
                            )
                          }}
                        />
                      </div>

                      {/* RIGHT: Product */}
                      <ProductSection
                        editMode={editMode}
                        edit={{
                          productId: editForm.product_id,
                          onChange: v => setEditForm(f => ({ ...f, product_id: v })),
                          items: (editProductsData?.data ?? []).map(p => ({
                            value: p.id,
                            label: p.name,
                            sublabel: p.sku ?? undefined,
                          })),
                          searchValue: productSearch,
                          onSearchChange: setProductSearch,
                          loading: loadingEditProducts,
                          currentProductId: task.product_id ?? undefined,
                          currentProductName: productName,
                        }}
                        view={{
                          hasProduct: !!(
                            task?.product ||
                            task?.editor_product ||
                            task?.team_product ||
                            task?.product_id ||
                            task?.editor_product_id ||
                            task?.team_product_id
                          ),
                          fullProduct: resolvedProduct,
                          productName,
                          productSku,
                          primaryImage,
                          extraImages,
                        }}
                      />
                    </div>

                    <TaskMetaStrip
                      task={task}
                      assigneeEdit={editMode && canAssign && task.status === 'PENDING' ? {
                        value: editForm.assignee_id,
                        onChange: v => setEditForm(f => ({ ...f, assignee_id: v })),
                        options: editorUsers ?? [],
                      } : undefined}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {task && (
            <TaskPanelFooter
              task={task}
              editMode={editMode}
              isAssignee={isAssignee}
              canApproveReject={canApproveReject}
              canCancel={canCancel}
              canStart={!!canStart}
              isPendingStart={startMut.isPending}
              isPendingApprove={approveMut.isPending}
              isPendingCancel={cancelMut.isPending}
              isPendingUpdate={updateMut.isPending}
              onClose={onClose}
              onCancelEdit={() => { setEditMode(false); setProductSearch(''); setContentSearch('') }}
              onSaveEdit={() => updateMut.mutate()}
              onStart={() => startMut.mutate()}
              onSubmit={() => setShowSubmit(true)}
              onApprove={() => approveMut.mutate()}
              onReject={() => setShowReject(true)}
              onCancel={() => cancelMut.mutate()}
              onResubmit={() => setShowResubmit(true)}
            />
          )}
        </div>
      </div>

      {showSubmit && task && (
        <SubmitModal task={task} onClose={() => setShowSubmit(false)} onSuccess={() => setShowSubmit(false)} />
      )}
      {showResubmit && task && (
        <SubmitModal task={task} isResubmit onClose={() => setShowResubmit(false)} onSuccess={() => setShowResubmit(false)} />
      )}
      {showReject && task && (
        <RejectModal task={task} onClose={() => setShowReject(false)} onSuccess={() => setShowReject(false)} />
      )}
      {showVideoPreview && task?.result_url && (
        <VideoPreviewOverlay resultUrl={task.result_url} onClose={() => setShowVideoPreview(false)} />
      )}
    </>
  )
}