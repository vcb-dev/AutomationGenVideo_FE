'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { FileText, Mic, Loader2, ChevronDown, Plus, Edit2, Globe, Trash2, Minus, GripVertical, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarInitials } from '@/components/task-auto/AvatarInitials'
import { formatDate } from '@/components/task-auto/helpers'
import { parseMarkets } from '@/components/task-auto/ContentFormModal'
import { getContentLines, getTeamContents, updateTeamContent } from '@/lib/api/task-auto'
import { useLoadMoreScroll } from '@/hooks/useLoadMoreScroll'
import type { ContentLine, TeamContent } from '@/types/task-auto'
import { MARKET_LABELS, MARKET_COLORS } from './constants'

const PAGE_SIZE = 10
// Sentinel dùng làm "id cột" cho content chưa gán tuyến — BE lọc where content_line_id IS NULL
// khi nhận đúng giá trị này (xem teams.service.ts listTeamContents), không thể dùng chuỗi rỗng
// vì chuỗi rỗng bị coi là "không lọc" (trả về tất cả).
const UNASSIGNED_KEY = '__unassigned__'

// Bảng màu xoay vòng cho các cột tuyến — tuyến không có màu cố định trong dữ liệu (name tự do,
// không phải enum) nên gán màu theo thứ tự cột để mỗi cột dễ phân biệt bằng mắt.
const LINE_COLORS = [
  { badge: 'bg-blue-500 text-white',    accent: 'border-t-blue-400',    count: 'bg-blue-50 text-blue-700' },
  { badge: 'bg-emerald-500 text-white', accent: 'border-t-emerald-400', count: 'bg-emerald-50 text-emerald-700' },
  { badge: 'bg-amber-500 text-white',   accent: 'border-t-amber-400',   count: 'bg-amber-50 text-amber-700' },
  { badge: 'bg-rose-500 text-white',    accent: 'border-t-rose-400',    count: 'bg-rose-50 text-rose-700' },
  { badge: 'bg-violet-500 text-white',  accent: 'border-t-violet-400',  count: 'bg-violet-50 text-violet-700' },
  { badge: 'bg-sky-500 text-white',     accent: 'border-t-sky-400',     count: 'bg-sky-50 text-sky-700' },
]
const UNASSIGNED_COLOR = { badge: 'bg-gray-300 text-gray-600', accent: 'border-t-gray-300', count: 'bg-gray-100 text-gray-500' }

const CLASSIFICATION_COLORS = [
  'bg-blue-50 text-blue-600',
  'bg-amber-50 text-amber-600',
  'bg-emerald-50 text-emerald-600',
  'bg-violet-50 text-violet-600',
  'bg-rose-50 text-rose-600',
  'bg-cyan-50 text-cyan-600',
]
function classificationColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return CLASSIFICATION_COLORS[hash % CLASSIFICATION_COLORS.length]
}

interface ColumnDef {
  key: string
  name: string
  label: string
  isUnassigned: boolean
  color: typeof UNASSIGNED_COLOR
}

interface Filters {
  teamId: string
  brandType: 'DO_DA' | 'TRANG_SUC'
  month: string
  search: string
  classificationId: string
  market: string
}

interface CardActions {
  canManage: boolean
  canPush: boolean
  onSelect: (tc: TeamContent) => void
  onEdit: (tc: TeamContent) => void
  onRemove: (tc: TeamContent) => void
  onPush: (tc: TeamContent) => void
}

function currentColumnKey(tc: TeamContent): string {
  return tc.content_line_id ?? UNASSIGNED_KEY
}

function ContentCardBody({ tc }: { tc: TeamContent }) {
  const ec = tc.source_editor_content
  const code = tc.code ?? ec?.code ?? null
  const title = tc.title ?? ec?.title ?? null
  const market = tc.market ?? ec?.market ?? null
  const markets = parseMarkets(market)
  const voiceUrl = tc.voice_url ?? ec?.voice_url ?? null
  const fileUrl = tc.file_content_url ?? ec?.file_content_url ?? null
  const classificationName = tc.classification?.name ?? ec?.classification?.name ?? null

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {classificationName && (
            <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap', classificationColor(classificationName))}>
              {classificationName}
            </span>
          )}
          {markets.map(m => (
            <span key={m} className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap', MARKET_COLORS[m] ?? 'bg-gray-100 text-gray-600')}>
              {MARKET_LABELS[m] ?? m}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {typeof tc._count?.tasks === 'number' && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-semibold"
              title="Số task đã tạo trực tiếp từ content này"
            >
              <ClipboardList className="w-3 h-3" aria-hidden="true" /> {tc._count.tasks}
            </span>
          )}
          {voiceUrl && (
            <span className="inline-flex items-center gap-1 text-[11px] text-purple-500 font-semibold">
              <Mic className="w-3 h-3" /> Voice
            </span>
          )}
          {fileUrl && (
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-500 font-semibold">
              <FileText className="w-3 h-3" /> File
            </span>
          )}
        </div>
      </div>

      <p className={cn(
        'mt-2 text-sm font-bold leading-snug line-clamp-2',
        title ? 'text-slate-800' : 'text-slate-400 italic font-normal',
      )}>
        {title || 'Chưa đặt tên'}
      </p>
      {code && <p className="text-[10px] text-slate-300 font-mono mt-0.5">{code}</p>}
      {tc.source_editor_content_id && (
        <p className="text-[11px] text-violet-400 italic mt-0.5">· từ kho cá nhân</p>
      )}
    </>
  )
}

function ContentCard({ tc, actions, cardAccent }: { tc: TeamContent; actions: CardActions; cardAccent: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tc.id,
    data: { tc },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => actions.onSelect(tc)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); actions.onSelect(tc) } }}
      style={transform ? { transform: CSS.Translate.toString(transform), touchAction: 'none' } : undefined}
      className={cn(
        'group relative bg-white border border-l-4 border-gray-100 rounded-xl p-3.5 shadow-sm cursor-grab active:cursor-grabbing transition-all',
        'hover:shadow-md hover:border-indigo-200',
        cardAccent,
        isDragging && 'opacity-30',
      )}
    >
      <GripVertical className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      <ContentCardBody tc={tc} />

      {(actions.canManage || actions.canPush) && (
        <div
          className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          {actions.canManage && (
            <button
              type="button"
              onClick={() => actions.onEdit(tc)}
              title="Chỉnh sửa"
              className="p-1.5 rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {actions.canPush && (
            <button
              type="button"
              onClick={() => actions.onPush(tc)}
              title="Đẩy ra kho tổng"
              className="p-1.5 rounded-lg text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>
          )}
          {actions.canManage && (
            <button
              type="button"
              onClick={() => actions.onRemove(tc)}
              title="Xóa khỏi kho team"
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className={cn('flex items-center justify-between gap-2', !(actions.canManage || actions.canPush) && 'mt-2.5 pt-2.5 border-t border-gray-50')}>
        <div className="flex items-center gap-1.5 min-w-0">
          <AvatarInitials name={tc.added_by?.full_name} size="xs" />
          <span className="text-xs text-slate-500 truncate max-w-[110px]">{tc.added_by?.full_name ?? '—'}</span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{formatDate(tc.added_at)}</span>
      </div>
    </div>
  )
}

function ContentColumn({
  column, filters, isDropDisabled, isValidTarget, actions, onAdd, onTotalChange,
}: {
  column: ColumnDef
  filters: Filters
  isDropDisabled: boolean
  isValidTarget: boolean
  actions: CardActions
  onAdd: (contentLineId: string | undefined) => void
  onTotalChange: (key: string, total: number) => void
}) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.key, disabled: isDropDisabled })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['task-auto', 'team-contents', 'kanban', filters.teamId, filters.brandType, filters.month, filters.search, filters.classificationId, filters.market, column.key, limit],
    queryFn: () => getTeamContents(filters.teamId, filters.brandType, filters.month, {
      page: 1, limit,
      search: filters.search || undefined,
      classification_id: filters.classificationId || undefined,
      market: filters.market,
      content_line_id: column.key,
    }),
    enabled: !!filters.teamId,
    // Bấm "Xem thêm" chỉ tăng `limit` → queryKey đổi. Không giữ data cũ thì useQuery trả về
    // isLoading=true, cả cột bị thay bằng skeleton, chiều cao co lại và scroll của cột nhảy về
    // đầu. keepPreviousData giữ nguyên các thẻ đang hiển thị (key theo id), chỉ nối thêm thẻ mới
    // xuống dưới nên vị trí cuộn không đổi.
    placeholderData: keepPreviousData,
  })

  const contents = data?.data ?? []
  const total = data?.total ?? 0
  const hasMore = contents.length < total

  const { listRef, markLoadMore } = useLoadMoreScroll(contents.map(c => c.id), isFetching)

  useEffect(() => {
    if (!isLoading) onTotalChange(column.key, total)
  }, [column.key, total, isLoading, onTotalChange])

  return (
    <div
      ref={setDropRef}
      className={cn(
        'flex flex-col rounded-2xl border border-t-4 flex-1 min-w-[270px] shadow-sm shadow-slate-200/50 transition-colors',
        column.color.accent,
        isValidTarget
          ? isOver
            ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400'
            : 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200'
          : 'bg-gray-50/70 border-gray-200',
        isDropDisabled && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-3.5 shrink-0">
        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black', column.color.badge)}>
          {column.isUnassigned ? <Minus className="w-3.5 h-3.5" /> : column.name.slice(0, 2)}
        </span>
        <h3 className="text-sm font-bold text-gray-700 truncate">{column.label}</h3>
        <span className={cn('ml-auto inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold', column.color.count)}>
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : total}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-2 space-y-2.5 max-h-[calc(100vh-290px)] min-h-[140px]">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-2 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))
        ) : contents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-8 px-3 text-center border border-dashed border-gray-200 rounded-xl bg-white/40">
            <p className="text-xs font-medium text-gray-400">Chưa có content tuyến này</p>
            <p className="text-[11px] text-gray-300">Kéo thẻ vào đây</p>
          </div>
        ) : (
          <>
            {contents.map(tc => (
              <ContentCard key={tc.id} tc={tc} actions={actions} cardAccent={cn('border-l-4', column.color.accent.replace('border-t-', 'border-l-'))} />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={() => { markLoadMore(); setLimit(l => l + PAGE_SIZE) }}
                disabled={isFetching}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Xem thêm {Math.min(PAGE_SIZE, total - contents.length)}
              </button>
            )}
          </>
        )}
      </div>

      {actions.canManage && (
        <button
          type="button"
          onClick={() => onAdd(column.isUnassigned ? undefined : column.key)}
          className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-white/60 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm content
        </button>
      )}
    </div>
  )
}

interface TeamContentsBoardProps {
  teamId: string
  brandType: 'DO_DA' | 'TRANG_SUC'
  month: string
  search: string
  classificationId: string
  market: string
  canManage: boolean
  canPush: boolean
  onSelect: (tc: TeamContent) => void
  onEdit: (tc: TeamContent) => void
  onRemove: (tc: TeamContent) => void
  onPush: (tc: TeamContent) => void
  onAdd: (contentLineId: string | undefined) => void
}

export function TeamContentsBoard({
  teamId, brandType, month, search, classificationId, market, canManage, canPush,
  onSelect, onEdit, onRemove, onPush, onAdd,
}: TeamContentsBoardProps) {
  const qc = useQueryClient()
  const [draggingContent, setDraggingContent] = useState<TeamContent | null>(null)
  const [columnTotals, setColumnTotals] = useState<Record<string, number>>({})

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const { data: contentLines } = useQuery({ queryKey: ['task-auto', 'content-lines'], queryFn: getContentLines })

  // Probe riêng (limit: 1) chỉ để biết CÓ content chưa gán tuyến hay không — chạy độc lập với việc
  // cột "Chưa gán tuyến" có đang hiển thị hay không, để quyết định ẩn/hiện cột mà không rơi vào
  // vòng luẩn quẩn "phải hiện cột mới biết tổng, mà biết tổng rồi mới quyết định hiện cột".
  const { data: unassignedProbe } = useQuery({
    queryKey: ['task-auto', 'team-contents', 'kanban-unassigned-probe', teamId, brandType, month, search, classificationId, market],
    queryFn: () => getTeamContents(teamId, brandType, month, {
      page: 1, limit: 1,
      search: search || undefined,
      classification_id: classificationId || undefined,
      market,
      content_line_id: UNASSIGNED_KEY,
    }),
    enabled: !!teamId,
  })
  const unassignedTotal = unassignedProbe?.total ?? 0

  // Sort tự nhiên (numeric-aware) để "A1, A2, ... A10" đúng thứ tự thay vì theo bảng chữ cái thô
  // ("A10" < "A2" nếu so sánh chuỗi thường) — tuyến đặt tên tự do nên không hardcode A1-A5.
  const lineColumns: ColumnDef[] = [...(contentLines ?? [])]
    .sort((a: ContentLine, b: ContentLine) => a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' }))
    .map((l, i) => ({ key: l.id, name: l.name, label: `Tuyến ${l.name}`, isUnassigned: false, color: LINE_COLORS[i % LINE_COLORS.length] }))
  const unassignedColumn: ColumnDef = { key: UNASSIGNED_KEY, name: '—', label: 'Chưa gán tuyến', isUnassigned: true, color: UNASSIGNED_COLOR }
  // Ẩn cột "Chưa gán tuyến" khi không có content nào thuộc cột đó — chỉ vẫn hiện trong lúc đang
  // kéo 1 thẻ đi (kể cả khi cột đang trống) để người dùng có chỗ thả vào nếu muốn bỏ tuyến.
  const columns: ColumnDef[] = (unassignedTotal > 0 || !!draggingContent) ? [...lineColumns, unassignedColumn] : lineColumns

  const moveMutation = useMutation({
    mutationFn: ({ id, content_line_id }: { id: string; content_line_id: string | null }) =>
      updateTeamContent(teamId, id, { content_line_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents'] })
      toast.success('Đã chuyển tuyến')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể chuyển tuyến'),
  })

  const handleTotalChange = useCallback((key: string, total: number) => {
    setColumnTotals(prev => (prev[key] === total ? prev : { ...prev, [key]: total }))
  }, [])

  function handleDragStart(event: DragStartEvent) {
    setDraggingContent((event.active.data.current?.tc as TeamContent) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingContent(null)
    const { active, over } = event
    if (!over) return
    const tc = active.data.current?.tc as TeamContent | undefined
    if (!tc) return
    const toKey = over.id as string
    if (currentColumnKey(tc) === toKey) return
    moveMutation.mutate({ id: tc.id, content_line_id: toKey === UNASSIGNED_KEY ? null : toKey })
  }

  const filters: Filters = { teamId, brandType, month, search, classificationId, market }
  const draggingKey = draggingContent ? currentColumnKey(draggingContent) : null

  const cardActions: CardActions = { canManage, canPush, onSelect, onEdit, onRemove, onPush }
  // Cộng riêng unassignedTotal (từ probe, luôn có) thay vì đọc columnTotals[UNASSIGNED_KEY] — cột
  // đó có thể đang bị ẩn (không mount) nên không kịp báo total qua onTotalChange.
  const totalAll = lineColumns.reduce((s, c) => s + (columnTotals[c.key] ?? 0), 0) + unassignedTotal

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDraggingContent(null)}>
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <GripVertical className="w-3.5 h-3.5 shrink-0" />
          Bấm thẻ để xem chi tiết · kéo thẻ sang cột bên để chuyển tuyến nội dung
          <span className="ml-auto font-medium text-slate-400">{totalAll} content</span>
        </p>

        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 items-start">
          {columns.map(col => (
            <ContentColumn
              key={col.key}
              column={col}
              filters={filters}
              isValidTarget={!!draggingKey && draggingKey !== col.key}
              isDropDisabled={!!draggingKey && draggingKey === col.key}
              actions={cardActions}
              onAdd={onAdd}
              onTotalChange={handleTotalChange}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {draggingContent && (
          <div className="w-[270px] bg-white border border-indigo-300 border-l-4 rounded-xl p-3.5 shadow-2xl rotate-2 cursor-grabbing">
            <ContentCardBody tc={draggingContent} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
