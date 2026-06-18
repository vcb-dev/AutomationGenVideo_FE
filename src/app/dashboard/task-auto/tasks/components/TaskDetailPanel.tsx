'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  X, Loader2, Zap, XCircle, CheckCircle2, Upload, Ban, ExternalLink,
  Check, FileText, Package, Link2, Mic, Download, Play,
  User, Star, ShoppingBag, RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskStatusBadge } from '@/components/task-auto/StatusBadge'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { formatDateTime, isOverdue } from '@/components/task-auto/helpers'
import {
  getTask, approveTask, cancelTask, getSources,
  getProduct, getContent, startTask,
} from '@/lib/api/task-auto'
import { SubmitModal, RejectModal } from './TaskModals'
import type { TaskStatus, Source, SourceType } from '@/types/task-auto'
import { SOURCE_TYPE_LABELS } from '@/types/task-auto'
import { formatPrice } from '../../catalog/components/ProductsTab/product-utils'

// ── Status Timeline ──────────────────────────────────────────────────────────

const TIMELINE_STEPS: { status: TaskStatus; label: string }[] = [
  { status: 'PENDING',     label: 'Tạo task' },
  { status: 'ASSIGNED',    label: 'Đã giao' },
  { status: 'IN_PROGRESS', label: 'Đang làm' },
  { status: 'SUBMITTED',   label: 'Đã nộp' },
  { status: 'APPROVED',    label: 'Hoàn thành' },
]
const STATUS_ORDER: Record<string, number> = {
  PENDING: 0, ASSIGNED: 1, IN_PROGRESS: 2, SUBMITTED: 3, APPROVED: 4,
  REJECTED: 3, CANCELLED: 3,
}

function StatusTimeline({ status }: { status: TaskStatus }) {
  const currentIdx = STATUS_ORDER[status] ?? 0
  const isTerminal = status === 'REJECTED' || status === 'CANCELLED'
  const isApproved  = status === 'APPROVED'
  return (
    <div className="flex items-start overflow-x-auto">
      {TIMELINE_STEPS.map((step, idx) => {
        const isDone    = !isTerminal && (isApproved ? idx <= currentIdx : idx < currentIdx)
        const isCurrent = !isTerminal && !isApproved && idx === currentIdx
        return (
          <div key={step.status} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                isDone    ? 'bg-emerald-500 border-emerald-500 text-white'
                : isCurrent ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-200 text-gray-400',
              )}>
                {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : <span>{idx + 1}</span>}
              </div>
              <span className={cn(
                'text-xs whitespace-nowrap font-medium',
                isCurrent ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-gray-400',
              )}>
                {step.label}
              </span>
            </div>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 w-10 sm:w-16 mx-2 mb-5 rounded-full flex-shrink-0',
                idx < currentIdx && !isTerminal ? 'bg-emerald-400' : 'bg-gray-200',
              )} />
            )}
          </div>
        )
      })}
      {isTerminal && (
        <>
          <div className={cn('h-0.5 w-10 sm:w-16 mx-2 mt-4 rounded-full flex-shrink-0',
            status === 'REJECTED' ? 'bg-red-200' : 'bg-gray-200')} />
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className={cn('w-8 h-8 rounded-full border-2 flex items-center justify-center',
              status === 'REJECTED' ? 'bg-red-500 border-red-500 text-white' : 'bg-gray-400 border-gray-400 text-white')}>
              <X className="w-4 h-4" />
            </div>
            <span className={cn('text-xs whitespace-nowrap font-semibold',
              status === 'REJECTED' ? 'text-red-500' : 'text-gray-500')}>
              {status === 'REJECTED' ? 'Từ chối' : 'Đã huỷ'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Source type styles ────────────────────────────────────────────────────────

const SOURCE_STYLES: Record<SourceType, { dot: string; text: string; hover: string; badge: string }> = {
  PRODUCT_STOCK: { dot: 'bg-indigo-400',  text: 'text-indigo-700',  hover: 'hover:bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-700' },
  COLLECTED:     { dot: 'bg-emerald-400', text: 'text-emerald-700', hover: 'hover:bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  OUTRO:         { dot: 'bg-purple-400',  text: 'text-purple-700',  hover: 'hover:bg-purple-50',  badge: 'bg-purple-100 text-purple-700' },
  WORKSHOP:      { dot: 'bg-amber-400',   text: 'text-amber-700',   hover: 'hover:bg-amber-50',   badge: 'bg-amber-100 text-amber-700' },
  HUYK:          { dot: 'bg-rose-400',    text: 'text-rose-700',    hover: 'hover:bg-rose-50',    badge: 'bg-rose-100 text-rose-700' },
}

function SourceRow({
  source,
  showType,
  label,
}: {
  source: Pick<Source, 'id' | 'name' | 'link' | 'type'>
  showType?: boolean
  label?: string
}) {
  const style = SOURCE_STYLES[source.type] ?? SOURCE_STYLES.PRODUCT_STOCK
  return (
    <a href={source.link} target="_blank" rel="noopener noreferrer"
      className={cn('flex items-center gap-2.5 group px-3 py-2 rounded-lg transition-colors', style.hover)}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', style.dot)} />
      <span className={cn('text-sm group-hover:underline flex-1 min-w-0 truncate', style.text)}>
        {label ? <span className="font-semibold mr-1.5">[{label}]</span> : null}
        {source.name}
      </span>
      {showType && (
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', style.badge)}>
          {SOURCE_TYPE_LABELS[source.type]}
        </span>
      )}
      <ExternalLink className={cn('w-3.5 h-3.5 opacity-50 shrink-0', style.text)} />
    </a>
  )
}

// ── Section Card ─────────────────────────────────────────────────────────────

function Section({
  icon, title, iconColor = 'text-indigo-500', bgColor = 'bg-indigo-50',
  children,
}: {
  icon: React.ReactNode
  title: string
  iconColor?: string
  bgColor?: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bgColor)}>
          <span className={iconColor}>{icon}</span>
        </div>
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      </div>
      {children}
    </div>
  )
}

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

  const primaryImage  = fullProduct?.image_url ?? task?.product?.image_url
  const extraImages   = fullProduct?.image_urls?.filter(u => u !== primaryImage).slice(0, 3) ?? []

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
            <button onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
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

                {/* ── 2-column grid — chỉ cho task thường ── */}
                {!task.is_extra && <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

                  {/* ─── LEFT: Content + Sources ─── */}
                  <div className="space-y-4">

                    {/* Content */}
                    <Section icon={<FileText className="w-4 h-4" />} title="Nội dung" bgColor="bg-indigo-50" iconColor="text-indigo-600">
                      <div className="p-5 space-y-4">

                        {/* Title */}
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

                        {/* Script */}
                        {scriptText && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Script / Nội dung</p>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 max-h-40 overflow-y-auto">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{scriptText}</p>
                            </div>
                          </div>
                        )}

                        {/* File & voice links */}
                        {(fileUrl || fullContent?.voice_url) && (
                          <div className="flex flex-wrap gap-2">
                            {fileUrl && (
                              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl transition-colors">
                                <Link2 className="w-4 h-4" /> File Content
                              </a>
                            )}
                            {fullContent?.voice_url && (
                              <>
                                <a href={fullContent.voice_url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-4 py-2 rounded-xl transition-colors">
                                  <Mic className="w-4 h-4" /> Nghe voice
                                </a>
                                <a href={fullContent.voice_url} download
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-4 py-2 rounded-xl transition-colors">
                                  <Download className="w-4 h-4" /> Tải về
                                </a>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </Section>

                    {/* Sources */}
                    <Section icon={<Link2 className="w-4 h-4" />} title="Sources" bgColor="bg-teal-50" iconColor="text-teal-600">
                      <div className="p-3 space-y-4">

                        {/* Sources liên kết với sản phẩm */}
                        {task.product_id && (
                          <div>
                            {productSources.length === 0 ? (
                              <p className="text-sm text-gray-400 italic">Chưa có source nào gắn với sản phẩm này</p>
                            ) : (
                              <div className="space-y-1.5">
                                {productSources.map(s => (
                                  <SourceRow key={s.id} source={s} showType />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Task-level sources: Outro + Extra */}
                        {(task.source_outro || task.source_extra) && (
                          <div className={task.product_id && productSources.length > 0 ? 'pt-3 border-t border-gray-100' : ''}>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sources gắn với task</p>
                            <div className="space-y-1.5">
                              {task.source_outro && (
                                <SourceRow source={task.source_outro} label="Outro" />
                              )}
                              {task.source_extra && (
                                <SourceRow source={task.source_extra} label="Bổ sung" />
                              )}
                            </div>
                          </div>
                        )}

                        {!task.product_id && !task.source_outro && !task.source_extra && (
                          <p className="text-sm text-gray-400 italic">Task chưa gắn source nào</p>
                        )}
                      </div>
                    </Section>

                    {/* Task meta */}
                    <Section icon={<User className="w-4 h-4" />} title="Thông tin giao việc" bgColor="bg-slate-100" iconColor="text-slate-600">
                      <div className="px-5 py-4 flex flex-wrap items-center gap-6">
                        {/* Assignee */}
                        {task.assignee ? (
                          <div className="flex items-center gap-2.5">
                            <AvatarInitials name={task.assignee.full_name} size="md" />
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Người thực hiện</p>
                              <p className="text-sm font-bold text-gray-800">{task.assignee.full_name}</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Người thực hiện</p>
                            <p className="text-sm text-gray-400 italic">Chưa giao</p>
                          </div>
                        )}

                        {/* Divider */}
                        <div className="h-10 w-px bg-gray-200 hidden sm:block" />

                        {/* Deadline */}
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Deadline</p>
                          <p className={cn(
                            'text-sm font-bold',
                            isOverdue(task.deadline) && task.status !== 'APPROVED' ? 'text-red-600' : 'text-gray-800',
                          )}>
                            {formatDateTime(task.deadline) || '—'}
                          </p>
                        </div>

                        {/* Team */}
                        {task.team?.name && (
                          <>
                            <div className="h-10 w-px bg-gray-200 hidden sm:block" />
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Đội nhóm</p>
                              <p className="text-sm font-semibold text-gray-800">{task.team.name}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </Section>
                  </div>

                  {/* ─── RIGHT: Product only ─── */}
                  <div className="space-y-4">

                    {/* Product */}
                    <Section icon={<Package className="w-4 h-4" />} title="Sản phẩm" bgColor="bg-orange-50" iconColor="text-orange-600">
                      {!task.product_id ? (
                        <p className="px-5 py-4 text-sm text-gray-400 italic">Không gắn sản phẩm</p>
                      ) : (
                        <div className="p-5 space-y-4">
                          {/* Primary image */}
                          {primaryImage && (
                            <a href={primaryImage} target="_blank" rel="noopener noreferrer" className="block">
                              <img src={primaryImage} alt={productName ?? ''}
                                className="w-full h-44 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity" />
                            </a>
                          )}
                          {/* Extra images */}
                          {extraImages.length > 0 && (
                            <div className="flex gap-2">
                              {extraImages.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt=""
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                                </a>
                              ))}
                              {(fullProduct?.image_urls?.length ?? 0) > 4 && (
                                <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                  <span className="text-xs text-gray-400 font-semibold">
                                    +{(fullProduct?.image_urls?.length ?? 0) - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Name + SKU */}
                          <div>
                            <p className="text-base font-bold text-gray-900 leading-snug">
                              {productName ?? '—'}
                            </p>
                            {productSku && (
                              <span className="inline-block mt-1 font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                                {productSku}
                              </span>
                            )}
                          </div>

                          {/* Attributes */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 border-t border-gray-100">
                            {formatPrice(fullProduct?.price) && (
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Giá</p>
                                <p className="text-sm font-semibold text-emerald-700">{formatPrice(fullProduct?.price)}</p>
                              </div>
                            )}
                            {fullProduct?.material?.name && (
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Chất liệu</p>
                                <p className="text-sm font-semibold text-gray-800">{fullProduct.material.name}</p>
                              </div>
                            )}
                            {fullProduct?.product_line?.name && (
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Dòng SP</p>
                                <p className="text-sm font-semibold text-gray-800">{fullProduct.product_line.name}</p>
                              </div>
                            )}
                            {fullProduct?.price_segment && (
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Phân khúc</p>
                                <p className="text-sm font-semibold text-gray-800">{fullProduct.price_segment}</p>
                              </div>
                            )}
                            {fullProduct?.priority_score !== undefined && (
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Độ ưu tiên</p>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                  <span className="text-sm font-bold text-amber-600">{fullProduct.priority_score}</span>
                                </div>
                              </div>
                            )}
                            {fullProduct?.market && (
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Market</p>
                                <span className={cn(
                                  'inline-flex px-2 py-0.5 rounded-full text-xs font-bold',
                                  fullProduct.market === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
                                )}>
                                  {fullProduct.market}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Section>

                  </div>
                </div>}
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
