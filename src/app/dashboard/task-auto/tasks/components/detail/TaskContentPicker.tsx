'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, FileText, Library, Loader2, PenLine, Plus, RotateCw, Search, Target, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebounced } from '@/hooks/useDebounced'
import { ContentFormModal, MARKET_LABEL } from '@/components/task-auto/ContentFormModal'
import {
  updateTask, getContents, getEditorContents, getTeamContents, getTeam,
  createEditorContent, getContentLines, getContentClassifications, createContentClassification,
} from '@/lib/api/task-auto'
import { NewContentFields } from '../NewContentFields'
import {
  EMPTY_DRAFT, Kbd, getContentCode, getContentLine, getContentTitle, normalizeTitle, prefillDraft, titleFromText,
  type ContentDraft, type DraftHints,
} from '../CreateTaskModal'
import { Section } from './Section'
import type { Content, ContentClassification, Task } from '@/types/task-auto'

type Scope = 'personal' | 'team' | 'global'
type Mode = 'pick' | 'new'

interface PickItem {
  key: string
  id: string
  scope: Scope
  title: string
  code?: string
  line?: string
  uses?: number
}

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'personal', label: 'Kho cá nhân' },
  { key: 'team', label: 'Kho team' },
  { key: 'global', label: 'Kho tổng' },
]

const LIST_LIMIT = 50

const PREFS_KEY = 'task-auto:auto-task-content:v1'

interface PickerPrefs {
  scope?: Scope
  mode?: Mode
}

const isScope = (v: unknown): v is Scope => v === 'personal' || v === 'team' || v === 'global'

function loadPrefs(): PickerPrefs {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function savePrefs(prefs: PickerPrefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {}
}

const keyOf = (scope: Scope, id: string) => `${scope === 'personal' ? 'editor' : scope}:${id}`

function toItem(c: any, scope: Scope): PickItem {
  const uses = c?._count?.tasks
  return {
    key: keyOf(scope, c.id),
    id: c.id,
    scope,
    title: getContentTitle(c),
    code: getContentCode(c),
    line: getContentLine(c),
    uses: typeof uses === 'number' ? uses : undefined,
  }
}

function contentFields(scope: Scope, id: string): Partial<Task> {
  return {
    content_id:        scope === 'global'   ? id : null,
    editor_content_id: scope === 'personal' ? id : null,
    team_content_id:   scope === 'team'     ? id : null,
  }
}

function errorMessage(err: any, fallback: string): string {
  const msg = err?.response?.data?.message || err?.message || fallback
  return Array.isArray(msg) ? msg.join(', ') : String(msg)
}

const shorten = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s)

const NON_TEXT_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'color', 'range'])

interface Props {
  task: Task
  ownerId: string
  ownerName?: string
  currentKey?: string
  onCancel?: () => void
  onAssigned?: (task: Task) => void
  onDirtyChange?: (dirty: boolean) => void
}

export function TaskContentPicker({ task, ownerId, ownerName, currentKey, onCancel, onAssigned, onDirtyChange }: Props) {
  const qc = useQueryClient()
  const [prefs] = useState(loadPrefs)
  const [mode, setMode] = useState<Mode>(prefs.mode === 'new' ? 'new' : 'pick')
  const [scope, setScope] = useState<Scope>(isScope(prefs.scope) ? prefs.scope : 'personal')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search.trim(), 250)
  const taskLine = task.content_line ?? null
  const [lineOnly, setLineOnly] = useState(!!taskLine)
  const [activeIndex, setActiveIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`
  const optionId = (i: number) => `${baseId}-opt-${i}`

  const lineId = lineOnly && taskLine ? taskLine.id : undefined

  const teamQuery = useQuery({
    queryKey: ['task-auto', 'team', task.team_id],
    queryFn: () => getTeam(task.team_id),
    enabled: !!task.team_id,
  })
  const brandType = teamQuery.data?.brand_type
  const market = task.team?.market ?? teamQuery.data?.market ?? 'VIETNAM'

  const listQuery = useQuery({
    queryKey: ['task-auto', 'auto-pick-contents', scope, scope === 'personal' ? ownerId : task.team_id, brandType, debouncedSearch, lineId],
    queryFn: async (): Promise<{ items: PickItem[]; total: number }> => {
      const q = { search: debouncedSearch || undefined, content_line_id: lineId, limit: LIST_LIMIT }
      if (scope === 'personal') {
        const r = await getEditorContents(ownerId, q)
        return { items: r.data.map(c => toItem(c, 'personal')), total: r.total }
      }
      if (scope === 'team') {
        const r = await getTeamContents(task.team_id, brandType, undefined, { ...q, page: 1 })
        return { items: r.data.map(c => toItem(c, 'team')), total: r.total }
      }
      const r = await getContents({ ...q, brand_type: brandType })
      return { items: r.data.map(c => toItem(c, 'global')), total: r.total }
    },
    enabled: mode === 'pick' && (scope !== 'global' || !!brandType || teamQuery.isError),
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === scope ? prev : undefined),
  })
  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const loadingList = listQuery.isLoading || (scope === 'global' && !brandType && teamQuery.isLoading)
  const listStale = search.trim() !== debouncedSearch || listQuery.isPlaceholderData
  const active = Math.min(activeIndex, Math.max(items.length - 1, 0))

  useEffect(() => { setActiveIndex(0) }, [scope, debouncedSearch, lineId])

  useEffect(() => {
    if (mode === 'pick' && items[active]) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, mode])

  useEffect(() => {
    const frame = requestAnimationFrame(() => (mode === 'pick' ? searchRef : titleRef).current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [mode])

  function invalidateCatalog() {
    for (const key of ['my-contents', 'my-contents-titles', 'contents', 'create-contents-personal', 'detail-editor-contents', 'auto-pick-dup']) {
      qc.invalidateQueries({ queryKey: ['task-auto', key] })
    }
  }

  function afterAssigned(updated: Task, title: string) {
    qc.setQueryData(['task-auto', 'task', task.id], updated)
    qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
    qc.invalidateQueries({ queryKey: ['task-auto', 'daily-plans'] })
    qc.invalidateQueries({ queryKey: ['task-auto', 'auto-pick-contents'] })
    savePrefs({ scope, mode })
    toast.success(`Đã gắn content “${shorten(title)}”`)
    onAssigned?.(updated)
  }

  const assignMut = useMutation({
    mutationFn: (item: PickItem) => updateTask(task.id, contentFields(item.scope, item.id)),
    onSuccess: (updated, item) => afterAssigned(updated, item.title),
    onError: (err: any) => toast.error(`Không gắn được content: ${errorMessage(err, 'lỗi không xác định')}`),
  })

  function showSavedContent(title: string) {
    setScope('personal')
    setLineOnly(false)
    setSearch(title)
    setMode('pick')
  }

  function choose(item: PickItem) {
    if (item.key === currentKey || assignMut.isPending || saveNewMut.isPending) return
    assignMut.mutate(item)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(Math.min(active + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(Math.max(active - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (listStale) return
      if (items[active]) choose(items[active])
      else if (search.trim()) startNew()
    } else if (e.key === 'Escape') {
      if (search) { e.preventDefault(); setSearch('') }
      else if (onCancel) { e.preventDefault(); onCancel() }
    }
  }

  const [initialDraft] = useState(() => prefillDraft(EMPTY_DRAFT, {}, { search: '', lines: undefined, planLine: taskLine }))
  const [draft, setDraft] = useState<ContentDraft>(initialDraft.draft)
  const [hints, setHints] = useState<DraftHints>(initialDraft.hints)
  const [fullFormInit, setFullFormInit] = useState<ContentDraft | null>(null)

  const { data: contentLines, isLoading: loadingLines } = useQuery({
    queryKey: ['task-auto', 'content-lines'],
    queryFn: getContentLines,
  })
  const { data: classifications, isLoading: loadingClassifications } = useQuery({
    queryKey: ['task-auto', 'content-classifications'],
    queryFn: getContentClassifications,
    enabled: mode === 'new',
  })

  useEffect(() => {
    if (!contentLines || !draft.content_line_id) return
    if (!contentLines.some(l => l.id === draft.content_line_id)) {
      setDraft(d => ({ ...d, content_line_id: '' }))
      setHints(h => ({ ...h, line: undefined }))
    }
  }, [contentLines, draft.content_line_id])

  const draftDirty = mode === 'new' && !!(draft.title.trim() || draft.body.trim() || draft.code.trim())
  useEffect(() => { onDirtyChange?.(draftDirty) }, [draftDirty, onDirtyChange])
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

  const debouncedTitle = useDebounced(draft.title, 400)
  const dupKey = normalizeTitle(debouncedTitle)
  const { data: dupCandidates } = useQuery({
    queryKey: ['task-auto', 'auto-pick-dup', ownerId, dupKey],
    queryFn: () => getEditorContents(ownerId, { search: debouncedTitle.trim(), limit: 20 }),
    enabled: mode === 'new' && dupKey.length >= 4,
  })
  const duplicate = mode === 'new' && dupKey.length >= 4 && normalizeTitle(draft.title) === dupKey
    ? (dupCandidates?.data ?? []).find(c => normalizeTitle(getContentTitle(c)) === dupKey) ?? null
    : null

  function startNew() {
    const next = prefillDraft(draft, hints, { search, lines: contentLines, planLine: taskLine })
    setDraft(next.draft)
    setHints(next.hints)
    setMode('new')
  }

  function updateDraft(patch: Partial<ContentDraft>) {
    setDraft(d => ({ ...d, ...patch }))
    setHints(h => ({
      ...h,
      ...('title' in patch ? { title: undefined } : {}),
      ...('code' in patch ? { code: undefined } : {}),
      ...('content_line_id' in patch ? { line: undefined } : {}),
    }))
  }

  function handleBodyPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (draft.title.trim()) return
    const title = titleFromText(e.clipboardData.getData('text'))
    if (!title) return
    setDraft(d => (d.title.trim() ? d : { ...d, title }))
    setHints(h => ({ ...h, title: 'body' }))
  }

  const draftBody = (d: ContentDraft) => ({
    title: d.title.normalize('NFC').replace(/\s+/g, ' ').trim(),
    code: d.code.trim() || undefined,
    body: d.body.trim() ? d.body : undefined,
    content_line_id: d.content_line_id || undefined,
    classification_id: d.classification_id || undefined,
    market,
    brand_type: brandType,
  }) as Partial<Content>

  const saveNewMut = useMutation({
    mutationFn: async (d: ContentDraft) => {
      let created: Content
      try {
        created = await createEditorContent(ownerId, draftBody(d))
      } catch (err) {
        throw new Error(`Không lưu được content: ${errorMessage(err, 'lỗi không xác định')}`)
      }
      try {
        return { created, updated: await updateTask(task.id, contentFields('personal', created.id)) }
      } catch (err) {
        throw Object.assign(new Error(errorMessage(err, 'lỗi không xác định')), { created })
      }
    },
    onSuccess: ({ created, updated }) => {
      invalidateCatalog()
      afterAssigned(updated, getContentTitle(created))
    },
    onError: (err: any) => {
      if (!err?.created) { toast.error(err.message); return }
      invalidateCatalog()
      setDraft({ ...EMPTY_DRAFT, content_line_id: draft.content_line_id })
      setHints({})
      showSavedContent(getContentTitle(err.created))
      toast.error(`Đã lưu content vào kho cá nhân nhưng chưa gắn được vào task: ${err.message}. Bấm vào content trong danh sách để gắn lại.`)
    },
  })

  const brandReady = !!brandType || teamQuery.isError
  const busy = assignMut.isPending || saveNewMut.isPending
  const canSaveNew = !!draft.title.trim() && brandReady && !busy

  function saveNew() {
    if (canSaveNew) saveNewMut.mutate(draft)
  }

  function handleNewKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Enter' || e.defaultPrevented || e.nativeEvent.isComposing || e.altKey || e.shiftKey) return
    const t = e.target
    if (!(t instanceof HTMLElement) || !e.currentTarget.contains(t)) return
    const plainInput = t instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(t.type)
    if (!(e.metaKey || e.ctrlKey) && !plainInput) return
    e.preventDefault()
    saveNew()
  }

  const scopeTitle = SCOPES.find(s => s.key === scope)!.label
  const countText = loadingList ? 'Đang tải…'
    : total > items.length ? `${items.length}/${total} content — gõ để lọc thêm`
    : `${total} content`

  return (
    <Section
      icon={<FileText className="w-4 h-4" />}
      title="Nội dung"
      bgColor="bg-indigo-50"
      iconColor="text-indigo-600"
      className="overflow-clip"
      headerExtra={onCancel ? (
        <>
          <span className="text-xs font-semibold text-slate-500">{currentKey ? 'Đang đổi content' : 'Đang chọn content'}</span>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-slate-600 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" /> Huỷ
          </button>
        </>
      ) : (
        <span
          title="Task tự động: sản phẩm đã được hệ thống gắn sẵn, chỉ cần chọn hoặc viết content — bấm vào là gắn luôn, không cần “Sửa”."
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 truncate"
        >
          <Target className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Chưa có content
        </span>
      )}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div role="group" aria-label="Cách lấy content" className="inline-flex gap-0.5 p-0.5 bg-gray-100 rounded-xl">
            {([
              { key: 'pick' as const, label: 'Chọn từ kho', Icon: Library },
              { key: 'new' as const, label: 'Viết content mới', Icon: PenLine },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                onClick={() => (key === 'pick' ? setMode('pick') : mode !== 'new' && startNew())}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                  mode === key ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {mode === 'pick' && (
            <div role="group" aria-label="Kho content" className="inline-flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
              {SCOPES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={scope === key}
                  onClick={() => { setScope(key); searchRef.current?.focus() }}
                  className={cn(
                    'h-8 px-2.5 rounded-md text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    scope === key ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === 'pick' ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-expanded={items.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={items[active] ? optionId(active) : undefined}
                aria-label={`Tìm content trong ${scopeTitle.toLowerCase()}`}
                placeholder={`Tìm content${taskLine && lineOnly ? ` tuyến ${taskLine.name}` : ''} theo tiêu đề hoặc mã — bấm 1 dòng là gắn vào task`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full h-10 pl-9 pr-10 rounded-xl border border-gray-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); searchRef.current?.focus() }}
                  aria-label="Xoá chữ đang tìm"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500">
              <div className="flex items-center gap-2 flex-wrap">
                {taskLine && (
                  <button
                    type="button"
                    aria-pressed={lineOnly}
                    onClick={() => setLineOnly(v => !v)}
                    title={lineOnly ? 'Bấm để xem content mọi tuyến' : `Bấm để chỉ xem content tuyến ${taskLine.name}`}
                    className={cn(
                      'inline-flex items-center gap-1 h-7 px-2.5 rounded-full border font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      lineOnly ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-indigo-300',
                    )}
                  >
                    {lineOnly && <Check className="w-3 h-3" aria-hidden="true" />}
                    Chỉ tuyến {taskLine.name}
                  </button>
                )}
                <span aria-live="polite">
                  {countText}
                  {scope === 'personal' && ownerName && <> · kho của <span className="font-semibold text-slate-700">{ownerName}</span></>}
                </span>
              </div>
              <span className="hidden lg:inline-flex items-center gap-1" aria-hidden="true">
                <Kbd>↑</Kbd><Kbd>↓</Kbd><span className="ml-0.5 mr-2">chọn</span>
                <Kbd>Enter</Kbd><span className="ml-0.5">gắn vào task</span>
              </span>
            </div>

            {listQuery.isError ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Không tải được danh sách content.
                <button
                  type="button"
                  onClick={() => listQuery.refetch()}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Thử lại
                </button>
              </div>
            ) : loadingList ? (
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100" aria-busy="true">
                {[0, 1, 2].map(i => (
                  <div key={i} className="px-3.5 py-3 space-y-2 animate-pulse motion-reduce:animate-none">
                    <div className="h-3.5 w-2/3 rounded bg-gray-100" />
                    <div className="h-3 w-1/4 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  {debouncedSearch
                    ? <>Không có content nào khớp “{shorten(debouncedSearch, 40)}”{lineId && taskLine ? ` trong tuyến ${taskLine.name}` : ''}</>
                    : <>{scopeTitle} chưa có content{lineId && taskLine ? ` tuyến ${taskLine.name}` : ''}</>}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {lineId && (
                    <button
                      type="button"
                      onClick={() => setLineOnly(false)}
                      className="h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      Xem mọi tuyến
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={startNew}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    <PenLine className="w-4 h-4" aria-hidden="true" />
                    {search.trim() ? `Viết content mới “${shorten(search.trim(), 30)}”` : 'Viết content mới'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <ul
                  id={listId}
                  role="listbox"
                  aria-label="Content trong kho"
                  aria-busy={busy}
                  className={cn(
                    'max-h-[340px] overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 transition-opacity',
                    listQuery.isPlaceholderData && 'opacity-60',
                  )}
                >
                  {items.map((item, i) => {
                    const isActive = i === active
                    const isCurrent = item.key === currentKey
                    const assigning = assignMut.isPending && assignMut.variables?.key === item.key
                    return (
                      <li
                        key={item.key}
                        id={optionId(i)}
                        role="option"
                        aria-selected={isActive}
                        aria-disabled={isCurrent || undefined}
                        onMouseDown={e => e.preventDefault()}
                        onMouseMove={() => { if (!isActive) setActiveIndex(i) }}
                        onClick={() => choose(item)}
                        className={cn(
                          'flex items-center gap-3 px-3.5 py-2.5 select-none transition-colors',
                          isCurrent ? 'cursor-default' : 'cursor-pointer',
                          isActive ? 'bg-indigo-50' : 'bg-white',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 line-clamp-2 break-words" title={item.title}>{item.title}</p>
                          {(item.code || (!lineId && item.line)) && (
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                              {!lineId && item.line && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold leading-none">{item.line}</span>
                              )}
                              {item.code && <span className="font-mono truncate">{item.code}</span>}
                            </div>
                          )}
                        </div>
                        {item.uses !== undefined && (
                          <span className={cn('shrink-0 text-xs tabular-nums', item.uses === 0 ? 'font-medium text-emerald-600' : 'text-slate-500')}>
                            {item.uses === 0 ? 'Chưa làm' : `Đã làm ${item.uses} lần`}
                          </span>
                        )}
                        <span
                          aria-hidden={!isActive && !assigning && !isCurrent}
                          className={cn(
                            'shrink-0 items-center justify-center gap-1 h-7 min-w-[4.5rem] px-2.5 rounded-lg text-xs font-semibold transition-opacity',
                            isCurrent ? 'bg-gray-100 text-slate-500' : 'bg-indigo-600 text-white',
                            isActive || assigning || isCurrent ? 'inline-flex opacity-100' : 'hidden sm:inline-flex opacity-0',
                          )}
                        >
                          {isCurrent ? 'Đang dùng'
                            : assigning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Đang gắn</>
                            : 'Chọn'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <button
                  type="button"
                  onClick={startNew}
                  className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Không thấy content cần? Viết content mới{search.trim() ? ` “${shorten(search.trim(), 30)}”` : ''}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3" onKeyDown={handleNewKeyDown}>
            <NewContentFields
              ref={titleRef}
              draft={draft}
              hints={hints}
              onChange={updateDraft}
              onBodyPaste={handleBodyPaste}
              lines={contentLines}
              loadingLines={loadingLines}
              classifications={classifications?.map(c => ({ value: c.id, label: c.name })) ?? []}
              loadingClassifications={loadingClassifications}
              onCreateClassification={async name => {
                const created = await createContentClassification(name)
                qc.setQueryData<ContentClassification[]>(['task-auto', 'content-classifications'], old => [...(old ?? []), created])
                return { id: created.id, label: created.name }
              }}
              planLineName={taskLine?.name}
              planLineHint={taskLine ? `Theo tuyến của task (${taskLine.name})` : undefined}
              ownerName={ownerName}
              marketLabel={MARKET_LABEL[market] ?? market}
              duplicate={duplicate ? { title: getContentTitle(duplicate), code: getContentCode(duplicate) } : null}
              onUseDuplicate={() => { if (duplicate) choose(toItem(duplicate, 'personal')) }}
              onOpenFullForm={() => setFullFormInit({ ...draft })}
              submitSlot={
                <button
                  type="button"
                  onClick={saveNew}
                  disabled={!canSaveNew}
                  aria-busy={saveNewMut.isPending}
                  aria-keyshortcuts="Enter"
                  title={!draft.title.trim() ? 'Nhập tiêu đề content trước' : 'Hoặc nhấn Enter ở ô tiêu đề'}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:hover:bg-indigo-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  {saveNewMut.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Đang lưu...</>
                    : <><Check className="w-4 h-4" aria-hidden="true" /> Lưu & gắn vào task</>}
                </button>
              }
            />
          </div>
        )}
      </div>

      {fullFormInit && (
        <ContentFormModal
          open
          userId={ownerId}
          brandType={brandType}
          initialMarket={market}
          initialValues={fullFormInit}
          onClose={() => setFullFormInit(null)}
          onSuccess={(content: Content) => {
            setFullFormInit(null)
            setDraft({ ...EMPTY_DRAFT, content_line_id: draft.content_line_id })
            setHints({})
            invalidateCatalog()
            const item = toItem(content, 'personal')
            assignMut.mutate(item, { onError: () => showSavedContent(item.title) })
          }}
        />
      )}
    </Section>
  )
}
