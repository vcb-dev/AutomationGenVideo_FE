'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useScrollLock } from '@/hooks/useScrollLock'
import toast from 'react-hot-toast'
import { Loader2, XCircle, CheckCircle2, Play, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getTask, approveTask, cancelTask, getSources, getTeamSources,
  getProduct, getContent, startTask,
  updateTask, getProducts, getContents, getTeam, getApprovals,
  getEditorProducts, getEditorContents, getTeamProducts, getTeamContents,
  getEditorSources,
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
import { VideoScriptSection } from './detail/VideoScriptSection'
import type { Source, TeamSource } from '@/types/task-auto'

type CatalogScope = 'personal' | 'global' | 'team'
type SourceScope = CatalogScope | 'all'

function ScopeSwitch({ value, onChange, hasTeam, includeAll = false }: {
  value: CatalogScope | SourceScope
  onChange: (s: any) => void
  hasTeam: boolean
  includeAll?: boolean
}) {
  const options = [
    ...(includeAll ? [{ key: 'all' as const, label: 'Tất cả', disabled: false }] : []),
    { key: 'personal' as const, label: 'Cá nhân',  disabled: false },
    { key: 'global'   as const, label: 'Kho tổng', disabled: false },
    { key: 'team'     as const, label: 'Kho team', disabled: !hasTeam },
  ]
  return (
    <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg ml-auto shrink-0">
      {options.map(({ key, label, disabled }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(key)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
            value === key
              ? 'bg-white shadow-sm text-indigo-700'
              : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

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
  const [productScope, setProductScope] = useState<'personal' | 'global' | 'team'>('global')
  const [contentScope, setContentScope] = useState<'personal' | 'global' | 'team'>('global')
  const [sourceScope, setSourceScope] = useState<SourceScope>('all')

  const { data: task, isLoading } = useQuery({
    queryKey: ['task-auto', 'task', taskId],
    queryFn: () => getTask(taskId),
    enabled: !!taskId,
    refetchOnWindowFocus: true,
  })

  // ✅ Chỉ query full content khi có content_id toàn cục (endpoint /task-auto/contents/:id
  // chỉ tìm trong bảng content global). editor_content/team_content đã được include sẵn trong
  // `task` và được resolve qua fallback chain bên dưới.
  const { data: fullContent } = useQuery({
    queryKey: ['task-auto', 'content', task?.content_id],
    queryFn: () => getContent(task!.content_id!),
    enabled: !!task?.content_id,
  })

  // ✅ Chỉ query full product khi có product_id toàn cục (endpoint /task-auto/products/:id
  // chỉ tìm trong bảng `products`). editor_product/team_product đã được include sẵn trong
  // `task` và được resolve qua fallback chain bên dưới (teamProductResolved/globalProductResolved).
  const { data: fullProduct } = useQuery({
    queryKey: ['task-auto', 'product', task?.product_id],
    queryFn: () => getProduct(task!.product_id!),
    enabled: !!task?.product_id,
  })

  const { data: productSourcesData } = useQuery({
    queryKey: ['task-auto', 'sources', task?.product_id],
    queryFn: () => getSources({ product_id: task!.product_id!, is_active: true, limit: 50 }),
    enabled: !!task?.product_id,
  })
  const productSources: Source[] = productSourcesData?.data ?? []

  useEffect(() => {
    if (task && editMode) {
      const prefixedProductId = task.product_id
        ? `global:${task.product_id}`
        : task.editor_product_id
        ? `editor:${task.editor_product_id}`
        : task.team_product_id
        ? `team:${task.team_product_id}`
        : ''
      const prefixedContentId = task.content_id
        ? `global:${task.content_id}`
        : task.editor_content_id
        ? `editor:${task.editor_content_id}`
        : task.team_content_id
        ? `team:${task.team_content_id}`
        : ''
      setEditForm({
        product_id:          prefixedProductId,
        content_id:          prefixedContentId,
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

  const { data: editEditorProductsData, isLoading: loadingEditEditorProducts } = useQuery({
    queryKey: ['task-auto', 'detail-editor-products', currentUserId, productSearch],
    queryFn: () => getEditorProducts(currentUserId!, { search: productSearch || undefined, limit: 50 }),
    enabled: editMode && !!currentUserId,
  })

  const { data: editTeamProductsData } = useQuery({
    queryKey: ['task-auto', 'detail-team-products', task?.team_id],
    queryFn: () => getTeamProducts(task!.team_id!),
    enabled: editMode && !!task?.team_id,
  })

  const { data: editContentsData, isLoading: loadingEditContents } = useQuery({
    queryKey: ['task-auto', 'detail-contents', contentSearch],
    queryFn: () => getContents({ search: contentSearch || undefined, limit: 50 }),
    enabled: editMode,
  })

  const { data: editEditorContentsData, isLoading: loadingEditEditorContents } = useQuery({
    queryKey: ['task-auto', 'detail-editor-contents', currentUserId, contentSearch],
    queryFn: () => getEditorContents(currentUserId!, { search: contentSearch || undefined, limit: 50 }),
    enabled: editMode && !!currentUserId,
  })

  const { data: editTeamContentsData } = useQuery({
    queryKey: ['task-auto', 'detail-team-contents', task?.team_id],
    queryFn: () => getTeamContents(task!.team_id!),
    enabled: editMode && !!task?.team_id,
  })

  const { data: editPersonalSrcsRaw } = useQuery({
    queryKey: ['task-auto', 'detail-src-personal', currentUserId],
    queryFn: () => getEditorSources(currentUserId!, { is_active: true, limit: 200 }),
    enabled: editMode && !!currentUserId,
  })
  // EditorSource là bảng riêng — form sửa lưu bằng source_*_id (kho tổng) nên chỉ dùng bản có FK về kho tổng
  const editPersonalSrcs = { data: (editPersonalSrcsRaw?.data ?? [])
    .filter((es: any) => !!es.source_source_id)
    .map((es: any) => ({ ...es, id: es.source_source_id } as Source)) }
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
    queryFn: () => getSources({ is_active: true, limit: 200 }),
    enabled: editMode,
  })

  const currentProductPrefixedId = useMemo(() => {
    if (!task) return ''
    if (task.product_id) return `global:${task.product_id}`
    if (task.editor_product_id) return `editor:${task.editor_product_id}`
    if (task.team_product_id) return `team:${task.team_product_id}`
    return ''
  }, [task?.product_id, task?.editor_product_id, task?.team_product_id])

  const currentContentPrefixedId = useMemo(() => {
    if (!task) return ''
    if (task.content_id) return `global:${task.content_id}`
    if (task.editor_content_id) return `editor:${task.editor_content_id}`
    if (task.team_content_id) return `team:${task.team_content_id}`
    return ''
  }, [task?.content_id, task?.editor_content_id, task?.team_content_id])

  const allProductItems = useMemo(() => {
    if (productScope === 'global') {
      return (editProductsData?.data ?? []).map(p => ({
        value: `global:${p.id}`, label: p.name, sublabel: p.sku ?? undefined,
      }))
    }
    if (productScope === 'personal') {
      return (editEditorProductsData?.data ?? []).map(p => ({
        value: `editor:${p.id}`, label: p.name, sublabel: p.sku ?? undefined,
      }))
    }
    // team
    const q = productSearch.toLowerCase()
    return (editTeamProductsData ?? [])
      .filter(p => {
        const n = p.name ?? p.source_editor_product?.name ?? ''
        const s = p.sku ?? p.source_editor_product?.sku ?? ''
        return !q || n.toLowerCase().includes(q) || s.toLowerCase().includes(q)
      })
      .map(p => ({
        value: `team:${p.id}`,
        label: p.name ?? p.source_editor_product?.name ?? '—',
        sublabel: (p.sku ?? p.source_editor_product?.sku) ?? undefined,
      }))
  }, [editProductsData, editEditorProductsData, editTeamProductsData, productSearch, productScope])

  const allContentItems = useMemo(() => {
    if (contentScope === 'global') {
      return (editContentsData?.data ?? []).map(c => ({
        value: `global:${c.id}`, label: c.title || c.id, sublabel: c.content_line?.name ?? undefined,
      }))
    }
    if (contentScope === 'personal') {
      return (editEditorContentsData?.data ?? []).map(c => ({
        value: `editor:${c.id}`, label: c.title || c.id, sublabel: c.content_line?.name ?? undefined,
      }))
    }
    // team
    const q = contentSearch.toLowerCase()
    return (editTeamContentsData ?? [])
      .filter(c => !q || (c.title ?? c.source_editor_content?.title ?? '').toLowerCase().includes(q))
      .map(c => ({
        value: `team:${c.id}`,
        label: c.title ?? c.source_editor_content?.title ?? c.id,
        sublabel: c.content_line?.name ?? c.source_editor_content?.content_line?.name ?? undefined,
      }))
  }, [editContentsData, editEditorContentsData, editTeamContentsData, contentSearch, contentScope])

  const loadingAllProducts =
    productScope === 'personal' ? loadingEditEditorProducts : loadingEditProducts
  const loadingAllContents =
    contentScope === 'personal' ? loadingEditEditorContents : loadingEditContents

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

  const sourceScopedList: Source[] = useMemo(() => {
    if (sourceScope === 'personal') return editPersonalSrcs?.data ?? []
    if (sourceScope === 'team') return editTeamSrcs?.data ?? []
    if (sourceScope === 'global') return editGlobalSrcs?.data ?? []
    return editAllSources
  }, [sourceScope, editPersonalSrcs, editTeamSrcs, editGlobalSrcs, editAllSources])

  const outroSources  = sourceScopedList.filter(s => s.type === 'OUTRO')
  const collectedSrcs = sourceScopedList.filter(s => s.type === 'COLLECTED')
  const workshopSrcs  = sourceScopedList.filter(s => s.type === 'WORKSHOP')
  const huykSrcs      = sourceScopedList.filter(s => s.type === 'HUYK')

  const updateMut = useMutation({
    mutationFn: () => {
      const [productSource, rawProductId] = editForm.product_id.includes(':')
        ? editForm.product_id.split(':', 2)
        : ['', editForm.product_id]
      const [contentSource, rawContentId] = editForm.content_id.includes(':')
        ? editForm.content_id.split(':', 2)
        : ['', editForm.content_id]
      return updateTask(taskId, {
        product_id:        productSource === 'global' ? rawProductId || null : null,
        editor_product_id: productSource === 'editor' ? rawProductId || null : null,
        team_product_id:   productSource === 'team'   ? rawProductId || null : null,
        content_id:        contentSource === 'global' ? rawContentId || null : null,
        editor_content_id: contentSource === 'editor' ? rawContentId || null : null,
        team_content_id:   contentSource === 'team'   ? rawContentId || null : null,
        source_outro_id:    editForm.source_outro_id    || null,
        source_extra_id:    editForm.source_collected_id || null,
        source_workshop_id: editForm.source_workshop_id || null,
        source_huyk_id:     editForm.source_huyk_id     || null,
        ...(canAssign && task?.status === 'PENDING' && {
          assignee_id: editForm.assignee_id || null,
        }),
      } as any)
    },
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

  // ✅ Content fallback chain: fullContent → editor → team (own→FK) → global (own→team FK→editor FK)
  const tc_ec  = task?.team_content?.source_editor_content
  const g_tc   = task?.content?.source_team_content
  const g_tc_ec = g_tc?.source_editor_content

  const contentTitle  = fullContent?.title
    ?? task?.editor_content?.title
    ?? task?.team_content?.title ?? tc_ec?.title
    ?? task?.content?.title ?? g_tc?.title ?? g_tc_ec?.title

  const contentMarket = fullContent?.market
    ?? task?.editor_content?.market
    ?? task?.team_content?.market ?? tc_ec?.market
    ?? task?.content?.market ?? g_tc?.market ?? g_tc_ec?.market

  const contentLine   = fullContent?.content_line?.name
    ?? task?.editor_content?.content_line?.name
    ?? task?.team_content?.content_line?.name ?? tc_ec?.content_line?.name
    ?? task?.content?.content_line?.name ?? g_tc?.content_line?.name ?? g_tc_ec?.content_line?.name
    ?? task?.content_line?.name

  const fileUrl       = fullContent?.file_content_url
    ?? task?.editor_content?.file_content_url
    ?? task?.team_content?.file_content_url ?? tc_ec?.file_content_url
    ?? task?.content?.file_content_url ?? g_tc?.file_content_url ?? g_tc_ec?.file_content_url

  const scriptText    = fullContent?.body
    || fullContent?.script
    || task?.editor_content?.body
    || task?.editor_content?.script
    || task?.team_content?.body || tc_ec?.body
    || task?.team_content?.script || tc_ec?.script
    || task?.content?.script
    || g_tc?.body || g_tc_ec?.body || g_tc?.script || g_tc_ec?.script

  const voiceUrl = fullContent?.voice_url
    ?? task?.editor_content?.voice_url
    ?? task?.team_content?.voice_url ?? tc_ec?.voice_url
    ?? g_tc?.voice_url ?? g_tc_ec?.voice_url

  // ✅ Product fallback chain: fullProduct → editor → team (own→FK) → global (own→team FK→editor FK)
  const tp    = task?.team_product
  const tp_ep = tp?.source_editor_product
  const teamProductResolved = tp ? {
    ...tp,
    sku:           tp.sku           ?? tp_ep?.sku           ?? null,
    name:          tp.name          ?? tp_ep?.name          ?? null,
    image_url:     tp.image_url     ?? tp_ep?.image_url     ?? null,
    image_urls:    tp.image_urls?.length ? tp.image_urls : (tp_ep?.image_urls ?? []),
    price:         tp.price         ?? tp_ep?.price         ?? null,
    market:        tp.market        ?? tp_ep?.market        ?? null,
    price_segment: tp.price_segment ?? tp_ep?.price_segment ?? null,
    priority_score: tp.priority_score ?? tp_ep?.priority_score ?? 0,
    material:      tp.material      ?? tp_ep?.material      ?? null,
    product_line:  tp.product_line  ?? tp_ep?.product_line  ?? null,
  } : undefined

  const g_tp    = task?.product?.source_team_product
  const g_tp_ep = g_tp?.source_editor_product
  const globalProductResolved = task?.product ? {
    ...task.product,
    name:          task.product.name || g_tp?.name || g_tp_ep?.name || null,
    sku:           task.product.sku  || g_tp?.sku  || g_tp_ep?.sku  || null,
    image_url:     task.product.image_url ?? g_tp?.image_url ?? g_tp_ep?.image_url ?? null,
    image_urls:    task.product.image_urls?.length ? task.product.image_urls : (g_tp?.image_urls?.length ? g_tp.image_urls : (g_tp_ep?.image_urls ?? [])),
    price:         task.product.price ?? g_tp?.price ?? g_tp_ep?.price ?? null,
    market:        task.product.market || g_tp?.market || g_tp_ep?.market || null,
    price_segment: task.product.price_segment || g_tp?.price_segment || g_tp_ep?.price_segment || null,
    priority_score: task.product.priority_score ?? g_tp?.priority_score ?? g_tp_ep?.priority_score ?? 0,
    material:      task.product.material ?? g_tp?.material ?? g_tp_ep?.material ?? null,
    product_line:  task.product.product_line ?? g_tp?.product_line ?? g_tp_ep?.product_line ?? null,
  } : undefined

  const resolvedProduct = fullProduct
    ?? (task?.editor_product ? task.editor_product as unknown as typeof fullProduct : undefined)
    ?? (teamProductResolved  ? teamProductResolved  as unknown as typeof fullProduct : undefined)
    ?? (globalProductResolved ? globalProductResolved as unknown as typeof fullProduct : undefined)

  // resolvedProduct có thể vẫn là FK reference (own fields rỗng) → resolve thêm qua source_team_product
  const rp_tp    = resolvedProduct?.source_team_product
  const rp_tp_ep = rp_tp?.source_editor_product

  const rp_imageUrls = resolvedProduct?.image_urls?.length ? resolvedProduct.image_urls
    : rp_tp?.image_urls?.length ? rp_tp.image_urls
    : rp_tp_ep?.image_urls?.length ? rp_tp_ep.image_urls : []
  const rp_imageUrl  = resolvedProduct?.image_url ?? rp_tp?.image_url ?? rp_tp_ep?.image_url ?? null

  // mergedProduct: object đã resolve hoàn toàn — dùng cho ProductSection
  const mergedProduct = resolvedProduct ? {
    ...resolvedProduct,
    name:           resolvedProduct.name           || rp_tp?.name           || rp_tp_ep?.name           || null,
    sku:            resolvedProduct.sku            || rp_tp?.sku            || rp_tp_ep?.sku            || null,
    image_url:      rp_imageUrl,
    image_urls:     rp_imageUrls,
    price:          resolvedProduct.price          ?? rp_tp?.price          ?? rp_tp_ep?.price          ?? null,
    market:         resolvedProduct.market         || rp_tp?.market         || rp_tp_ep?.market         || null,
    price_segment:  resolvedProduct.price_segment  || rp_tp?.price_segment  || rp_tp_ep?.price_segment  || null,
    priority_score: resolvedProduct.priority_score ?? rp_tp?.priority_score ?? rp_tp_ep?.priority_score ?? 0,
    material:       resolvedProduct.material       ?? rp_tp?.material       ?? rp_tp_ep?.material       ?? null,
    product_line:   resolvedProduct.product_line   ?? rp_tp?.product_line   ?? rp_tp_ep?.product_line   ?? null,
  } as typeof resolvedProduct : undefined

  const productName  = mergedProduct?.name  ?? null
  const productSku   = mergedProduct?.sku   ?? null
  const primaryImage = rp_imageUrl ?? rp_imageUrls[0] ?? null
  const extraImages  = rp_imageUrls.filter(u => u !== primaryImage).slice(0, 3)

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

                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">

                    {/* LEFT: Content + Sources */}
                    <div className="flex flex-col gap-4">
                      <ContentSection
                        editMode={editMode}
                        edit={{
                          contentId: editForm.content_id,
                          onChange: v => setEditForm(f => ({ ...f, content_id: v })),
                          items: allContentItems,
                          searchValue: contentSearch,
                          onSearchChange: setContentSearch,
                          loading: loadingAllContents,
                          currentContentId: currentContentPrefixedId || undefined,
                          currentContentTitle: contentTitle,
                          filterSlot: (
                            <ScopeSwitch
                              value={contentScope}
                              onChange={s => { setContentScope(s); setEditForm(f => ({ ...f, content_id: '' })) }}
                              hasTeam={!!task?.team_id}
                            />
                          ),
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
                          scopeSwitch: (
                            <ScopeSwitch
                              value={sourceScope}
                              onChange={setSourceScope}
                              hasTeam={!!task?.team_id}
                              includeAll
                            />
                          ),
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
                        items: allProductItems,
                        searchValue: productSearch,
                        onSearchChange: setProductSearch,
                        loading: loadingAllProducts,
                        currentProductId: currentProductPrefixedId || undefined,
                        currentProductName: productName,
                        filterSlot: (
                          <ScopeSwitch
                            value={productScope}
                            onChange={s => { setProductScope(s); setEditForm(f => ({ ...f, product_id: '' })) }}
                            hasTeam={!!task?.team_id}
                          />
                        ),
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
                        fullProduct: mergedProduct,
                        productName,
                        productSku,
                        primaryImage,
                        extraImages,
                      }}
                    />
                  </div>

                  <VideoScriptSection
                    taskId={task.id}
                    fileUrl={fileUrl}
                    scriptText={scriptText}
                    contentTitle={contentTitle}
                    contentLine={contentLine}
                    contentMarket={contentMarket}
                    productName={productName}
                    productSku={productSku}
                    productPrice={mergedProduct?.price ?? null}
                    productMaterial={mergedProduct?.material?.name ?? null}
                    productPriceSegment={mergedProduct?.price_segment ?? null}
                    productLine={mergedProduct?.product_line?.name ?? null}
                    productMarket={mergedProduct?.market ?? null}
                  />

                  <TaskMetaStrip
                    task={task}
                    assigneeEdit={editMode && canAssign && task.status === 'PENDING' ? {
                      value: editForm.assignee_id,
                      onChange: v => setEditForm(f => ({ ...f, assignee_id: v })),
                      options: editorUsers ?? [],
                    } : undefined}
                  />
                </div>
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