'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  X, Loader2, Zap, XCircle, CheckCircle2, Upload, Ban,
  FileText, Package, Link2, Mic, Download, Play,
  Star, ShoppingBag, RotateCcw,
  ExternalLink, Edit2, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskStatusBadge } from '@/components/task-auto/StatusBadge'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { formatDateTime, isOverdue } from '@/components/task-auto/helpers'
import { ServerSearchSelect, CustomSelect } from '@/components/task-auto/DarkInput'
import {
  getTask, approveTask, cancelTask, getSources,
  getProduct, getContent, startTask,
  updateTask, getProducts, getContents,
} from '@/lib/api/task-auto'
import { SubmitModal, RejectModal } from './TaskModals'
import { formatPrice } from '../../catalog/components/ProductsTab/product-utils'
import { StatusTimeline } from './detail/StatusTimeline'
import { SourceRow } from './detail/SourceRow'
import { Section } from './detail/Section'
import { Source } from '@/types/task-auto'

// ── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  taskId: string
  onClose: () => void
  userRoles: string[]
  currentUserId?: string
}

export function TaskDetailPanel({ taskId, onClose, userRoles, currentUserId }: Props) {
  const qc = useQueryClient()
  const [showSubmit, setShowSubmit] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showResubmit, setShowResubmit] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    product_id: '',
    content_id: '',
    source_outro_id: '',
    source_extra_id: '',
    extra_source_type: '' as 'COLLECTED' | 'WORKSHOP' | 'HUYK' | '',
  })
  const [productSearch, setProductSearch] = useState('')
  const [contentSearch, setContentSearch] = useState('')

  const { data: task, isLoading } = useQuery({
    queryKey: ['task-auto', 'task', taskId],
    queryFn: () => getTask(taskId),
    enabled: !!taskId,
    refetchOnWindowFocus: true,
  })

  const { data: fullProduct } = useQuery({
    queryKey: ['task-auto', 'product', task?.product_id],
    queryFn: () => getProduct(task!.product_id!),
    enabled: !!task?.product_id,
  })

  const { data: fullContent } = useQuery({
    queryKey: ['task-auto', 'content', task?.content_id],
    queryFn: () => getContent(task!.content_id!),
    enabled: !!task?.content_id,
  })

  const { data: productSourcesData } = useQuery({
    queryKey: ['task-auto', 'sources', task?.product_id],
    queryFn: () => getSources({ product_id: task!.product_id!, is_active: true, limit: 50 }),
    enabled: !!task?.product_id,
  })

  const productSources: Source[] = productSourcesData?.data ?? []

  // ── Edit mode: initialize form when task loads or mode opens ──
  useEffect(() => {
    if (task && editMode) {
      setEditForm({
        product_id: task.product_id ?? '',
        content_id: task.content_id ?? '',
        source_outro_id: task.source_outro_id ?? '',
        source_extra_id: task.source_extra_id ?? '',
        extra_source_type: (['COLLECTED', 'WORKSHOP', 'HUYK'].includes(task.source_extra?.type ?? '')
          ? task.source_extra!.type
          : '') as any,
      })
    }
  }, [task?.id, editMode])

  // ── Edit mode: product / content search queries ──
  const { data: editProductsData, isLoading: loadingEditProducts } = useQuery({
    queryKey: ['task-auto', 'detail-products', productSearch],
    queryFn: () => getProducts({ owner: 'all', search: productSearch || undefined, limit: 50 }),
    enabled: editMode,
  })
  const { data: editContentsData, isLoading: loadingEditContents } = useQuery({
    queryKey: ['task-auto', 'detail-contents', contentSearch],
    queryFn: () => getContents({ owner: 'all', search: contentSearch || undefined, limit: 50 }),
    enabled: editMode,
  })

  // ── Edit mode: source options ──
  const { data: editPersonalSrcs } = useQuery({
    queryKey: ['task-auto', 'detail-src-personal', currentUserId],
    queryFn: () => getSources({ owner: 'editor', user_id: currentUserId, is_active: true, limit: 200 }),
    enabled: editMode && !!currentUserId,
  })
  const { data: editTeamSrcs } = useQuery({
    queryKey: ['task-auto', 'detail-src-team', task?.team_id],
    queryFn: () => getSources({ owner: 'team', team_id: task!.team_id!, is_active: true, limit: 200 }),
    enabled: editMode && !!task?.team_id,
  })
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

  const outroSources   = editAllSources.filter(s => s.type === 'OUTRO')
  const collectedSrcs  = editAllSources.filter(s => s.type === 'COLLECTED')
  const workshopSrcs   = editAllSources.filter(s => s.type === 'WORKSHOP')
  const huykSrcs       = editAllSources.filter(s => s.type === 'HUYK')

  // ── Edit mode: save mutation ──
  const updateMut = useMutation({
    mutationFn: () => updateTask(taskId, {
      product_id:      editForm.product_id      || undefined,
      content_id:      editForm.content_id      || undefined,
      source_outro_id: editForm.source_outro_id || null,
      source_extra_id: editForm.source_extra_id || null,
    } as any),
    onSuccess: () => {
      toast.success('Đã cập nhật task')
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', taskId] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      setEditMode(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể cập nhật task'),
  })

  const isAssignee       = task?.assignee_id === currentUserId
  const canApproveReject = userRoles.some(r => ['ADMIN', 'MANAGER', 'LEADER'].includes(r))
  const canCancel        = userRoles.some(r => ['ADMIN', 'MANAGER'].includes(r))
  const canStart         = task?.status === 'ASSIGNED' && isAssignee

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

  // Derived display values
  const contentTitle  = fullContent?.title  || task?.content?.title
  const contentMarket = fullContent?.market ?? task?.content?.market
  const contentLine   = fullContent?.content_line?.name ?? task?.content?.content_line?.name ?? task?.content_line?.name
  const fileUrl       = fullContent?.file_content_url ?? task?.content?.file_content_url
  const scriptText    = fullContent?.body || fullContent?.script || task?.content?.script
  const productName   = fullProduct?.name ?? task?.product?.name
  const productSku    = fullProduct?.sku  ?? task?.product?.sku

  const primaryImage  = fullProduct?.image_url ?? fullProduct?.image_urls?.[0] ?? task?.product?.image_url
  const extraImages   = (fullProduct?.image_urls ?? []).filter(u => u !== primaryImage).slice(0, 3)

  return (
    <>
      <div className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-5xl max-h-[92vh] bg-gray-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/8">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-start gap-4 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {task && <TaskStatusBadge status={task.status} />}
                {task?.is_auto && !task?.is_extra && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
                    <Zap className="w-3.5 h-3.5" /> Auto
                  </span>
                )}
                {task?.is_extra && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-violet-100 text-violet-700">
                    <Zap className="w-3.5 h-3.5" /> Sáng tạo
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {task?.is_extra
                  ? 'Task sáng tạo'
                  : contentTitle || 'Chi tiết Task'}
              </h2>
              {task?.is_extra ? (
                task?.deadline && (
                  <p className="text-sm text-violet-600 mt-0.5 font-medium">
                    Deadline: {new Date(task.deadline).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}
                  </p>
                )
              ) : (
                productName && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    <ShoppingBag className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    {productName}
                    {productSku && <span className="font-mono ml-1.5 text-gray-400">({productSku})</span>}
                  </p>
                )
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              {task && !task.is_extra && (
                <button
                  onClick={() => setEditMode(v => !v)}
                  title={editMode ? 'Thoát chỉnh sửa' : 'Chỉnh sửa task'}
                  className={cn(
                    'p-2 rounded-xl transition-colors text-sm font-semibold flex items-center gap-1.5',
                    editMode
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                  )}
                >
                  <Edit2 className="w-4 h-4" />
                  {editMode && <span className="text-xs">Đang sửa</span>}
                </button>
              )}
              <button onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Timeline ───────────────────────────────────────────────────── */}
          {task && (
            <div className="px-6 py-3.5 bg-white border-b border-gray-100 shrink-0 overflow-x-auto">
              <StatusTimeline status={task.status} />
            </div>
          )}

          {/* ── Body ───────────────────────────────────────────────────────── */}
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

                {/* Alert banners */}
                {task.reject_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">Lý do từ chối</p>
                      <p className="text-sm text-red-700">{task.reject_reason}</p>
                    </div>
                  </div>
                )}
                {task.result_url && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Kết quả đã nộp</p>
                      <a href={task.result_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-emerald-700 hover:underline flex items-center gap-1.5 break-all">
                        {task.result_url} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  </div>
                )}

                {/* ── Extra task placeholder ── */}
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
                    {task.result_url && (
                      <a href={task.result_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-violet-700 hover:underline flex items-center gap-1.5 font-medium">
                        Xem kết quả đã nộp <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* ── Layout task thường: 2 cột + meta strip ── */}
                {!task.is_extra && (
                  <div className="space-y-4">

                    {/* Row 1: Content/Sources | Product */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">

                      {/* LEFT: Content + Sources */}
                      <div className="flex flex-col gap-4">
                        <Section icon={<FileText className="w-4 h-4" />} title="Nội dung" bgColor="bg-indigo-50" iconColor="text-indigo-600">
                          {editMode ? (
                            <div className="p-4">
                              <ServerSearchSelect
                                label="Script / Content"
                                value={editForm.content_id}
                                onChange={v => setEditForm(f => ({ ...f, content_id: v }))}
                                items={(editContentsData?.data ?? []).map(c => ({
                                  value: c.id,
                                  label: c.title || c.id,
                                  sublabel: c.content_line?.name ?? undefined,
                                }))}
                                searchValue={contentSearch}
                                onSearchChange={setContentSearch}
                                loading={loadingEditContents}
                                placeholder="Tìm content..."
                                clearLabel="-- Không chọn --"
                                searchPlaceholder="Tìm theo tiêu đề..."
                              />
                              {editForm.content_id && editForm.content_id === task?.content_id && contentTitle && (
                                <p className="mt-2 text-xs text-slate-400 pl-1">Hiện tại: <span className="font-medium text-slate-600">{contentTitle}</span></p>
                              )}
                            </div>
                          ) : (
                            <div className="p-5 space-y-4">
                              <div>
                                <p className="text-base font-bold text-gray-900 leading-snug">
                                  {contentTitle || <span className="text-gray-400 font-normal italic">Chưa có tiêu đề</span>}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {contentMarket && (
                                    <span className={cn(
                                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
                                      contentMarket === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
                                    )}>
                                      {contentMarket}
                                    </span>
                                  )}
                                  {contentLine && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                      {contentLine}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {scriptText && (
                                <div>
                                  <p className="text-xs font-medium text-gray-400 mb-2">Script / Nội dung</p>
                                  <div className="bg-gray-50 rounded-xl px-4 py-3 max-h-40 overflow-y-auto">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{scriptText}</p>
                                  </div>
                                </div>
                              )}

                              {(fileUrl || fullContent?.voice_url) && (
                                <div className="flex flex-wrap gap-2">
                                  {fileUrl && (
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-lg transition-colors">
                                      <Link2 className="w-3.5 h-3.5 text-indigo-500" /> File Content
                                    </a>
                                  )}
                                  {fullContent?.voice_url && (
                                    <>
                                      <a href={fullContent.voice_url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-lg transition-colors">
                                        <Mic className="w-3.5 h-3.5 text-purple-500" /> Nghe voice
                                      </a>
                                      <a href={fullContent.voice_url} download
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-lg transition-colors">
                                        <Download className="w-3.5 h-3.5 text-gray-500" /> Tải về
                                      </a>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Section>

                        <Section icon={<Link2 className="w-4 h-4" />} title="Sources" bgColor="bg-teal-50" iconColor="text-teal-600" className="flex-1">
                          {editMode ? (
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <CustomSelect
                                  label="Outro"
                                  value={editForm.source_outro_id}
                                  onChange={v => setEditForm(f => ({ ...f, source_outro_id: v }))}
                                  options={[{ value: '', label: '-- Không chọn --' }, ...outroSources.map(s => ({ value: s.id, label: s.name }))]}
                                  searchable
                                />
                                <CustomSelect
                                  label="Sưu tầm"
                                  value={editForm.extra_source_type === 'COLLECTED' ? editForm.source_extra_id : ''}
                                  onChange={v => setEditForm(f => ({ ...f, source_extra_id: v, extra_source_type: v ? 'COLLECTED' : '' }))}
                                  options={[{ value: '', label: '-- Không chọn --' }, ...collectedSrcs.map(s => ({ value: s.id, label: s.name }))]}
                                  searchable
                                />
                                <CustomSelect
                                  label="Chế tác"
                                  value={editForm.extra_source_type === 'WORKSHOP' ? editForm.source_extra_id : ''}
                                  onChange={v => setEditForm(f => ({ ...f, source_extra_id: v, extra_source_type: v ? 'WORKSHOP' : '' }))}
                                  options={[{ value: '', label: '-- Không chọn --' }, ...workshopSrcs.map(s => ({ value: s.id, label: s.name }))]}
                                  searchable
                                />
                                <CustomSelect
                                  label="Huy-K"
                                  value={editForm.extra_source_type === 'HUYK' ? editForm.source_extra_id : ''}
                                  onChange={v => setEditForm(f => ({ ...f, source_extra_id: v, extra_source_type: v ? 'HUYK' : '' }))}
                                  options={[{ value: '', label: '-- Không chọn --' }, ...huykSrcs.map(s => ({ value: s.id, label: s.name }))]}
                                  searchable
                                />
                              </div>
                              {task.product_id && productSources.length > 0 && (
                                <div className="pt-2 border-t border-gray-100">
                                  <p className="text-xs font-medium text-gray-400 mb-1.5 px-1">Source gắn sản phẩm</p>
                                  <div className="space-y-1">
                                    {productSources.map(s => <SourceRow key={s.id} source={s} showType />)}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 space-y-3">
                              {task.product_id && (
                                productSources.length === 0
                                  ? <p className="text-sm text-gray-400 italic px-1">Chưa có source nào gắn với sản phẩm này</p>
                                  : <div className="space-y-1">
                                      {productSources.map(s => <SourceRow key={s.id} source={s} showType />)}
                                    </div>
                              )}
                              {(task.source_outro || task.source_extra) && (
                                <div className={task.product_id && productSources.length > 0 ? 'pt-3 border-t border-gray-100' : ''}>
                                  <p className="text-xs font-medium text-gray-400 mb-2 px-1">Sources gắn với task</p>
                                  <div className="space-y-1">
                                    {task.source_outro && <SourceRow source={task.source_outro} label="Outro" />}
                                    {task.source_extra && <SourceRow source={task.source_extra} label="Bổ sung" />}
                                  </div>
                                </div>
                              )}
                              {!task.product_id && !task.source_outro && !task.source_extra && (
                                <p className="text-sm text-gray-400 italic px-1">Task chưa gắn source nào</p>
                              )}
                            </div>
                          )}
                        </Section>
                      </div>

                      {/* RIGHT: Product */}
                      <Section icon={<Package className="w-4 h-4" />} title="Sản phẩm" bgColor="bg-orange-50" iconColor="text-orange-600">
                        {editMode ? (
                          <div className="p-4">
                            <ServerSearchSelect
                              label="Sản phẩm"
                              value={editForm.product_id}
                              onChange={v => setEditForm(f => ({ ...f, product_id: v }))}
                              items={(editProductsData?.data ?? []).map(p => ({
                                value: p.id,
                                label: p.name,
                                sublabel: p.sku,
                              }))}
                              searchValue={productSearch}
                              onSearchChange={setProductSearch}
                              loading={loadingEditProducts}
                              placeholder="Tìm sản phẩm..."
                              clearLabel="-- Không chọn --"
                              searchPlaceholder="Tìm theo tên hoặc SKU..."
                            />
                            {editForm.product_id && editForm.product_id === task?.product_id && productName && (
                              <p className="mt-2 text-xs text-slate-400 pl-1">Hiện tại: <span className="font-medium text-slate-600">{productName}</span></p>
                            )}
                          </div>
                        ) : !task.product_id ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                            <Package className="w-10 h-10 text-gray-200" />
                            <p className="text-sm italic">Không gắn sản phẩm</p>
                          </div>
                        ) : (
                          <div>
                            {/* Image */}
                            {primaryImage ? (
                              <a href={primaryImage} target="_blank" rel="noopener noreferrer" className="block">
                                <img src={primaryImage} alt={productName ?? ''}
                                  className="w-full h-56 object-cover hover:opacity-95 transition-opacity" />
                              </a>
                            ) : (
                              <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                                <Package className="w-12 h-12 text-gray-300" />
                              </div>
                            )}

                            {/* Thumbnails */}
                            {extraImages.length > 0 && (
                              <div className="flex gap-1.5 px-4 pt-3">
                                {extraImages.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt="" className="w-12 h-12 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                                  </a>
                                ))}
                                {(fullProduct?.image_urls?.length ?? 0) > 4 && (
                                  <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    <span className="text-xs text-gray-400 font-semibold">+{(fullProduct?.image_urls?.length ?? 0) - 4}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Info */}
                            <div className="px-5 pt-4 pb-5 space-y-3">
                              {/* Badges + name */}
                              <div>
                                <div className="flex flex-wrap gap-1.5 mb-1.5">
                                  {fullProduct?.market && (
                                    <span className={cn(
                                      'px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
                                      fullProduct.market === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
                                    )}>
                                      {fullProduct.market}
                                    </span>
                                  )}
                                  {fullProduct?.product_line?.name && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                      {fullProduct.product_line.name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-base font-bold text-gray-900 leading-snug">{productName ?? '—'}</p>
                                {productSku && (
                                  <span className="inline-block mt-1 font-mono text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                    {productSku}
                                  </span>
                                )}
                              </div>

                              {/* Price row */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-400 mb-0.5">Giá bán</p>
                                  <p className="text-xl font-black text-red-600">
                                    {formatPrice(fullProduct?.price) ?? <span className="text-gray-400 text-sm font-normal italic">Chưa có giá</span>}
                                  </p>
                                </div>
                                {(fullProduct?.priority_score ?? 0) > 0 && (
                                  <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-100">
                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    <span className="text-sm font-bold text-amber-600">{fullProduct?.priority_score}</span>
                                  </div>
                                )}
                              </div>

                              {/* Attributes */}
                              {(fullProduct?.material?.name || fullProduct?.price_segment) && (
                                <div className="flex gap-6 pt-2 border-t border-gray-100">
                                  {fullProduct?.material?.name && (
                                    <div>
                                      <p className="text-xs text-gray-400 mb-0.5">Chất liệu</p>
                                      <p className="text-sm font-semibold text-gray-800">{fullProduct.material.name}</p>
                                    </div>
                                  )}
                                  {fullProduct?.price_segment && (
                                    <div>
                                      <p className="text-xs text-gray-400 mb-0.5">Phân khúc</p>
                                      <p className="text-sm font-semibold text-gray-800">{fullProduct.price_segment}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Section>
                    </div>

                    {/* Row 2: Task meta */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                      <div className="grid grid-cols-3 divide-x divide-gray-100">
                        <div className="px-5 py-4">
                          <p className="text-xs text-gray-400 mb-2">Người thực hiện</p>
                          {task.assignee ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <AvatarInitials name={task.assignee.full_name} size="xs" />
                              <span className="text-sm font-semibold text-gray-800 truncate">{task.assignee.full_name}</span>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Chưa giao</p>
                          )}
                        </div>

                        <div className="px-5 py-4">
                          <p className="text-xs text-gray-400 mb-2">Deadline</p>
                          <p className={cn(
                            'text-sm font-semibold',
                            isOverdue(task.deadline) && task.status !== 'APPROVED' ? 'text-red-600' : 'text-gray-800',
                          )}>
                            {formatDateTime(task.deadline) || '—'}
                          </p>
                        </div>

                        <div className="px-5 py-4">
                          <p className="text-xs text-gray-400 mb-2">Đội nhóm</p>
                          <p className="text-sm font-semibold text-gray-800">{task.team?.name || '—'}</p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          {task && (
            <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white border-t border-gray-200 shrink-0">
              <button onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                Đóng
              </button>

              {editMode ? (
                /* Edit mode footer */
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditMode(false); setProductSearch(''); setContentSearch('') }}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={() => updateMut.mutate()}
                    disabled={updateMut.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Lưu thay đổi
                  </button>
                </div>
              ) : (
                /* Normal footer */
                <div className="flex flex-wrap justify-end gap-2">
                  {canStart && (
                    <button onClick={() => startMut.mutate()} disabled={startMut.isPending}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                      {startMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Bắt đầu làm
                    </button>
                  )}
                  {(task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && (
                    <button onClick={() => setShowSubmit(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                      <Upload className="w-4 h-4" /> Nộp task
                    </button>
                  )}
                  {task.status === 'SUBMITTED' && canApproveReject && !task.is_extra && (
                    <>
                      <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                        {approveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Duyệt
                      </button>
                      <button onClick={() => setShowReject(true)}
                        className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                        <XCircle className="w-4 h-4" /> Từ chối
                      </button>
                    </>
                  )}
                  {task.status === 'REJECTED' && isAssignee && (
                    <button onClick={() => setShowResubmit(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                      <RotateCcw className="w-4 h-4" /> Nộp lại
                    </button>
                  )}
                  {!['APPROVED', 'REJECTED', 'CANCELLED'].includes(task.status) && canCancel && (
                    <button
                      onClick={() => { if (confirm('Bạn có chắc muốn huỷ task này?')) cancelMut.mutate() }}
                      disabled={cancelMut.isPending}
                      className="border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
                      {cancelMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                      Huỷ task
                    </button>
                  )}
                </div>
              )}
            </div>
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
    </>
  )
}
