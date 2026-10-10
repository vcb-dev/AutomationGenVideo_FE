'use client'

import { useState, useEffect, useId, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, ChevronDown, Library, PenLine, X } from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { toVNDatetimeLocalInput, vnDate } from '@/components/task-auto/helpers'
import { DarkInput, CustomSelect, ServerSearchSelect, type SearchItem } from '@/components/task-auto/DarkInput'
import { ContentFormModal, MARKET_LABEL } from '@/components/task-auto/ContentFormModal'
import { ProductFormModal } from '@/components/task-auto/ProductFormModal'
import { NewContentFields } from './NewContentFields'
import {
  createTask, getContents, getSources,
  getEditorContents, getEditorProducts, getEditorSources,
  getTeamContents, getTeamProducts, getTeamSources,
  searchOmsProducts, getOmsProductDetail,
  createEditorContent, getContentLines, getContentClassifications, createContentClassification,
} from '@/lib/api/task-auto'
import type { BrandType, Content, ContentClassification, ContentLine, DailyPlan, Product, Source, Task, Team, TeamSource, OmsProductSummary } from '@/types/task-auto'

type Scope = 'personal' | 'global' | 'team'

/** Lấy content có sẵn trong kho, hay viết content mới ngay trong modal */
type ContentMode = 'pick' | 'new'

/** Sản phẩm chọn xong gán vào đâu: ô chung (chọn 1), 1 dòng, bản nháp content mới, hay mọi dòng chưa có SP */
type ProductTarget = { kind: 'shared' } | { kind: 'row'; id: string } | { kind: 'draft' } | { kind: 'bulk' }

type SourceField = 'source_outro_id' | 'source_collected_id' | 'source_workshop_id' | 'source_huyk_id'

interface CreateForm {
  team_id: string
  assignee_id: string
  deadline: string
  source_outro_id: string
  source_collected_id: string
  source_workshop_id: string
  source_huyk_id: string
}

/** Content đã chọn — giữ kèm kho của nó để đổi tab kho không mất lựa chọn, và chọn nhiều content từ nhiều kho. */
interface PickedContent {
  id: string
  scope: Scope
  title: string
  code?: string
  line?: string
  /** Chọn nhiều: sản phẩm đi kèm RIÊNG content này (không bắt buộc). Chọn 1 thì dùng ô Sản phẩm chung. */
  product?: PickedProduct | null
}

/**
 * Sản phẩm đã chọn. `value` = giá trị dòng trong dropdown (source_product_id ?? id, hoặc id OMS),
 * `actualId` = id gửi lên BE theo `scope`.
 */
export interface PickedProduct {
  scope: Scope
  value: string
  actualId: string
  oms?: { oms_product_id: string; oms_variant_id: string }
  item: SearchItem
}

/** Điền sẵn modal: nhân bản từ task có sẵn, hoặc mở từ Kế hoạch ngày. */
export interface CreateTaskPrefill {
  team_id?: string
  assignee_id?: string
  /** 'YYYY-MM-DDTHH:mm' theo giờ máy — đúng định dạng <input type="datetime-local"> */
  deadline?: string
  /** Lọc sẵn danh sách content theo tuyến — người dùng bỏ lọc được */
  content_line?: { id: string; name: string }
  product?: PickedProduct
  sources?: Partial<Pick<CreateForm, SourceField>>
  /** Dòng phụ dưới tiêu đề modal — modal được mở từ đâu */
  origin?: string
}

interface Props {
  teams: Team[]
  userId?: string
  isLeader?: boolean
  isAdminOrManager?: boolean
  isMember?: boolean
  prefill?: CreateTaskPrefill
  onClose: () => void
  onSuccess: () => void
}

/** Chặn tạo hàng loạt quá tay — mỗi task là 1 request tuần tự */
const MAX_BATCH = 20

const scopeLabel: Record<Scope, string> = { personal: 'cá nhân', global: 'kho tổng', team: 'kho team' }
const scopeTitle: Record<Scope, string> = { personal: 'Cá nhân', global: 'Kho tổng', team: 'Kho team' }

function SectionHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center flex-wrap gap-3 gap-y-2">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">{label}</p>
      <div className="flex-1 h-px bg-gray-100" />
      {children}
    </div>
  )
}

function ScopeSwitch({ value, onChange, hasTeam }: {
  value: Scope
  onChange: (s: Scope) => void
  hasTeam: boolean
}) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg ml-auto">
      {([
        { key: 'personal' as Scope, label: 'Cá nhân',  disabled: false },
        { key: 'global'   as Scope, label: 'Kho tổng', disabled: false },
        { key: 'team'     as Scope, label: 'Kho team', disabled: !hasTeam },
      ]).map(({ key, label, disabled }) => (
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

/** Lựa chọn nằm ở kho khác với tab kho đang xem — nói rõ để không tưởng đã mất. */
function ScopeNote({ scope }: { scope: Scope }) {
  return <p className="pl-1 text-xs text-slate-500">Đang chọn từ <span className="font-semibold text-slate-700">{scopeTitle[scope]}</span></p>
}

const NON_TEXT_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'color', 'range'])

/**
 * Enter trần có được dùng để tạo nhiệm vụ ở phần tử này không: ô nhập 1 dòng trong modal, hoặc ô
 * chọn Content / Sản phẩm chung (đánh dấu data-enter-submit — chọn xong focus quay về ô này).
 * Nút khác → Enter là bấm nút đó; textarea → xuống dòng; danh sách thả xuống nằm ngoài modal (portal).
 */
function acceptsPlainEnter(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement) || !target.closest('[data-dark-modal]')) return false
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(target.type)
  return target instanceof HTMLButtonElement && !!target.closest('[data-enter-submit]')
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded border border-gray-200 bg-white font-sans text-[11px] font-semibold text-slate-600">
      {children}
    </kbd>
  )
}

// ── Fallback helpers cho FK references ──
// Hỗ trợ cả 3 tầng: editor item (source_editor_*), team item (source_editor_*), global item (source_team_* → source_editor_*)
function getProductName(p: any): string {
  return p.name
    || p.source_editor_product?.name      // TeamProduct FK → EditorProduct
    || p.source_team_product?.name        // Product FK → TeamProduct
    || p.source_team_product?.source_editor_product?.name  // Product → TeamProduct → EditorProduct
    || 'Unknown'
}

function getProductSku(p: any): string | undefined {
  return p.sku
    || p.source_editor_product?.sku
    || p.source_team_product?.sku
    || p.source_team_product?.source_editor_product?.sku
    || undefined
}

// Ưu tiên image_urls[0] (mảng, giống ProductCard) trước image_url đơn ở từng tầng FK, rồi mới
// rơi xuống tầng kế — vì sản phẩm thêm thủ công thường chỉ set image_urls, image_url có thể rỗng.
// Ảnh trong hệ thống này phần lớn là link Google Drive share (không nhúng <img> trực tiếp được)
// nên phải convert qua driveImageUrl() thành dạng thumbnail mới hiển thị được.
function getProductImage(p: any): string | null {
  const raw = p.image_urls?.[0]
    || p.source_editor_product?.image_urls?.[0]
    || p.source_team_product?.image_urls?.[0]
    || p.source_team_product?.source_editor_product?.image_urls?.[0]
    || p.image_url
    || p.source_editor_product?.image_url
    || p.source_team_product?.image_url
    || p.source_team_product?.source_editor_product?.image_url
    || null
  return driveImageUrl(raw)
}

function getContentTitle(c: any): string {
  return c.title
    || c.source_editor_content?.title     // TeamContent FK → EditorContent
    || c.source_team_content?.title       // Content FK → TeamContent
    || c.source_team_content?.source_editor_content?.title  // Content → TeamContent → EditorContent
    || 'Unknown'
}

function getContentCode(c: any): string | undefined {
  return c.code
    || c.source_editor_content?.code
    || c.source_team_content?.code
    || c.source_team_content?.source_editor_content?.code
    || undefined
}

function getContentLine(c: any): string | undefined {
  if (!c) return undefined
  return c.content_line?.name
    || c.source_editor_content?.content_line?.name
    || c.source_team_content?.content_line?.name
    || c.source_team_content?.source_editor_content?.content_line?.name
    || undefined
}

// Tuyến hiệu lực của content kho team: record tham chiếu từ kho cá nhân có thể chưa có
// content_line_id riêng → lấy theo EditorContent gốc (giống BE listTeamContents).
function getContentLineId(c: any): string | undefined {
  return c.content_line_id
    ?? c.content_line?.id
    ?? c.source_editor_content?.content_line_id
    ?? c.source_editor_content?.content_line?.id
    ?? undefined
}

// "Số lần được làm" (BE trả qua _count.tasks) — hiện căn phải mỗi dòng dropdown chọn content.
function contentTaskMeta(c: any): React.ReactNode {
  const n = c?._count?.tasks
  if (typeof n !== 'number') return undefined
  return n === 0
    ? <span className="text-emerald-600">Chưa làm</span>
    : <>Đã làm {n} lần</>
}

// ── Ngày giờ hạn chót ──
// Mặc định deadline 17h50 hôm nay — giờ chốt nộp phổ biến nhất, giảm thao tác chọn tay mỗi lần tạo task.
const DEFAULT_DEADLINE_TIME = '17:50'

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

const QUICK_DAYS = [
  { label: 'Hôm qua', offset: -1 },
  { label: 'Hôm nay', offset: 0 },
  { label: 'Ngày mai', offset: 1 },
  { label: '+2 ngày', offset: 2 },
] as const

// ── Nhớ lựa chọn lần trước (chỉ trên trình duyệt này) ──
const PREFS_KEY = 'task-auto:create-task-prefs:v1'

interface CreatePrefs {
  content_scope?: Scope
  product_scope?: Scope
  /** 'HH:mm' */
  deadline_time?: string
  team_id?: string
  /** Người được giao lần trước theo từng team (chỉ leader/admin/manager mới chọn người) */
  assignee_by_team?: Record<string, string>
  /** Lần trước tạo bằng "Chọn từ kho" hay "Viết content mới" — mở lại đúng chế độ đó */
  content_mode?: ContentMode
  /** Tuyến của content viết mới lần trước — tự điền cho lần viết sau */
  new_content_line_id?: string
}

const isScope = (v: unknown): v is Scope => v === 'personal' || v === 'global' || v === 'team'
const isTime = (v: unknown): v is string => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)

function loadPrefs(): CreatePrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function savePrefs(prefs: CreatePrefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Chế độ ẩn danh / bị chặn lưu trữ — chỉ mất phần ghi nhớ, không ảnh hưởng tạo task
  }
}

// ── Điền sẵn ──
function prefixedSource(globalId?: string | null, editorId?: string | null, teamId?: string | null): string {
  if (globalId) return `global:${globalId}`
  if (editorId) return `editor:${editorId}`
  if (teamId) return `team:${teamId}`
  return ''
}

function productFromTask(task: Task): PickedProduct | undefined {
  if (task.editor_product_id) {
    const p = task.editor_product ?? {}
    const value = task.editor_product_id
    return {
      scope: 'personal', value, actualId: value,
      item: { value, label: getProductName(p), sublabel: getProductSku(p), image: getProductImage(p) },
    }
  }
  if (task.team_product_id) {
    const p = task.team_product ?? {}
    const value = task.team_product_id
    return {
      scope: 'team', value, actualId: value,
      item: { value, label: getProductName(p), sublabel: getProductSku(p), image: getProductImage(p) },
    }
  }
  if (task.oms_product_id && task.oms_variant_id) {
    const value = task.oms_product_id
    return {
      scope: 'global', value, actualId: value,
      oms: { oms_product_id: task.oms_product_id, oms_variant_id: task.oms_variant_id },
      item: { value, label: 'Sản phẩm kho tổng (OMS)', image: null },
    }
  }
  // product_id (Product local cũ) không chọn lại được ở modal — kho tổng giờ đọc thẳng OMS
  return undefined
}

/**
 * Nhân bản task: chép team, người được giao, sản phẩm, nguồn và GIỜ hạn chót (sang ngày hôm nay).
 * Không chép content — BE chặn trùng cặp content + sản phẩm của cùng 1 editor, nên content luôn
 * phải chọn mới (modal focus sẵn ô Content).
 */
export function prefillFromTask(task: Task): CreateTaskPrefill {
  const content = task.editor_content ?? task.team_content ?? task.content
  const title = content ? getContentTitle(content) : null
  const time = task.deadline ? toVNDatetimeLocalInput(task.deadline).slice(11) : DEFAULT_DEADLINE_TIME
  return {
    team_id: task.team_id,
    assignee_id: task.assignee_id ?? '',
    deadline: `${vnDate(0)}T${time}`,
    product: productFromTask(task),
    sources: {
      source_outro_id:     prefixedSource(task.source_outro_id,    task.editor_source_outro_id,    task.team_source_outro_id),
      source_collected_id: prefixedSource(task.source_extra_id,    task.editor_source_extra_id,    task.team_source_extra_id),
      source_workshop_id:  prefixedSource(task.source_workshop_id, task.editor_source_workshop_id, task.team_source_workshop_id),
      source_huyk_id:      prefixedSource(task.source_huyk_id,     task.editor_source_huyk_id,     task.team_source_huyk_id),
    },
    origin: title && title !== 'Unknown'
      ? `Nhân bản từ: ${title.length > 80 ? `${title.slice(0, 80)}…` : title} — chọn content mới`
      : 'Nhân bản nhiệm vụ — chọn content mới',
  }
}

/** Mở từ Kế hoạch ngày: đúng team + hạn chót của kế hoạch, lọc sẵn content theo tuyến. */
export function prefillFromDailyPlan(plan: DailyPlan, userId?: string): CreateTaskPrefill {
  const deadline = toVNDatetimeLocalInput(plan.deadline)
  return {
    team_id: plan.team.id,
    assignee_id: userId,
    deadline,
    content_line: plan.content_line,
    origin: `Theo kế hoạch ${plan.content_line.name} · hạn ${shortDate(deadline)}`,
  }
}

/** Content viết mới ngay trong modal tạo nhiệm vụ (lưu vào kho cá nhân lúc bấm tạo). */
export interface ContentDraft {
  title: string
  code: string
  body: string
  content_line_id: string
  classification_id: string
}

export const EMPTY_DRAFT: ContentDraft = { title: '', code: '', body: '', content_line_id: '', classification_id: '' }

/** Ô nào được tự điền và lấy từ đâu — hiện dưới ô để người dùng biết mà kiểm tra lại. */
export interface DraftHints {
  title?: 'search' | 'body'
  code?: 'search'
  line?: 'search' | 'plan' | 'last'
}

const MAX_TITLE = 150

/** Độ tin cậy của tuyến tự điền: từ khoá người dùng vừa gõ > kế hoạch đang mở > thói quen lần trước */
const LINE_SOURCE_RANK: Record<NonNullable<DraftHints['line']>, number> = { last: 1, plan: 2, search: 3 }

/** So khớp tiêu đề: chuẩn Unicode NFC (chữ Việt dán từ nguồn khác hay ở dạng NFD), gộp khoảng trắng, không phân biệt hoa thường. */
export function normalizeTitle(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Từ khoá tìm trông như MÃ content (vd. "CT-101", "C101", "101") chứ không phải tiêu đề: 1 cụm
 * không khoảng trắng, có chữ số, chỉ gồm chữ/số nối bằng - _ . /
 */
export function looksLikeCode(s: string): boolean {
  return s.length <= 20 && !/\s/.test(s) && /\d/.test(s) && /^[\p{L}\d]+(?:[-_./][\p{L}\d]+)*$/u.test(s)
}

/**
 * Tiêu đề lấy từ dòng có chữ đầu tiên của nội dung vừa dán: bỏ hashtag, gạch đầu dòng/đánh số,
 * nhãn "Tiêu đề:", dấu ** bao quanh; dài quá 150 ký tự thì cắt ở ranh giới từ.
 */
export function titleFromText(text: string): string {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw
      .normalize('NFC')
      .replace(/(^|\s)#[^\s#]+/gu, '$1')
      .replace(/^\s*(?:[-*•–—>]+|\d{1,2}[.)])\s+/u, '')
      .replace(/^\s*(?:tiêu đề|title)\s*[:：]\s*/iu, '')
      .replace(/^\*\*(.+)\*\*$/u, '$1')
      .replace(/\s+/g, ' ')
      .trim()
    if (!line) continue
    if (line.length <= MAX_TITLE) return line
    const cut = line.slice(0, MAX_TITLE)
    const lastSpace = cut.lastIndexOf(' ')
    return (lastSpace > MAX_TITLE * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–—-]+$/u, '')
  }
  return ''
}

/**
 * Điền sẵn content viết mới khi người dùng bấm "Viết content mới". Nguyên tắc: KHÔNG BAO GIỜ ghi đè
 * thứ người dùng tự gõ/tự chọn (ô không có ghi chú tự điền). Chỉ điền ô trống, hoặc thay 1 giá trị
 * do chính hàm này tự điền trước đó bằng nguồn đáng tin hơn.
 * - Từ khoá đang tìm (không ra kết quả nên mới viết mới): trùng tên tuyến → chọn tuyến đó; trông như
 *   mã → ô Mã; còn lại → ô Tiêu đề.
 * - Tuyến: từ khoá trùng tên tuyến > tuyến của kế hoạch đang lọc > tuyến lần tạo content trước.
 *   Tuyến không có trong danh sách (đã xoá) thì bỏ qua; danh sách chưa tải thì tạm nhận, kiểm lại sau.
 */
export function prefillDraft(
  draft: ContentDraft,
  hints: DraftHints,
  opts: {
    search: string
    lines: ContentLine[] | undefined
    planLine?: { id: string; name: string } | null
    lastLineId?: string
  },
): { draft: ContentDraft; hints: DraftHints } {
  const next = { ...draft }
  const h = { ...hints }
  const search = opts.search.normalize('NFC').replace(/\s+/g, ' ').trim()
  const searchLine = search
    ? opts.lines?.find(l => l.name.trim().toLowerCase() === search.toLowerCase())
    : undefined

  if (search && !searchLine) {
    if (looksLikeCode(search)) {
      // Ô trống, hoặc đang giữ từ khoá của lần tìm trước (chưa ai sửa) → thay bằng từ khoá mới
      if (!next.code.trim() || h.code === 'search') { next.code = search; h.code = 'search' }
    } else if (!next.title.trim() || h.title === 'search') {
      next.title = search
      h.title = 'search'
    }
  }

  const known = (id?: string): id is string => !!id && (!opts.lines || opts.lines.some(l => l.id === id))
  const candidate: { id: string; source: NonNullable<DraftHints['line']> } | undefined =
    searchLine ? { id: searchLine.id, source: 'search' }
    : known(opts.planLine?.id) ? { id: opts.planLine!.id, source: 'plan' }
    : known(opts.lastLineId) ? { id: opts.lastLineId, source: 'last' }
    : undefined
  // Ô trống = 0; tự điền theo độ tin cậy; người dùng tự chọn (không có ghi chú) = không bao giờ thay
  const currentRank = !next.content_line_id ? 0 : h.line ? LINE_SOURCE_RANK[h.line] : Infinity
  if (candidate && LINE_SOURCE_RANK[candidate.source] > currentRank) {
    next.content_line_id = candidate.id
    h.line = candidate.source
  }

  return { draft: next, hints: h }
}

export function CreateTaskModal({ teams, userId, isLeader, isAdminOrManager, isMember, prefill, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [prefs] = useState(loadPrefs)

  // Tất cả team mà user thuộc (leader hoặc member), dùng cho non-admin
  const myTeams = !isAdminOrManager && userId
    ? teams.filter(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))
    : []
  // Nếu chỉ thuộc 1 team → khóa cứng; nếu thuộc nhiều team → cho chọn
  const lockedTeam = myTeams.length === 1 ? myTeams[0] : undefined
  const allowedTeams = isAdminOrManager ? teams : myTeams

  // Người được giao lần trước của team này — chỉ dùng nếu người đó vẫn còn trong team
  function rememberedAssignee(teamId: string, from: CreatePrefs = loadPrefs()): string {
    const id = from.assignee_by_team?.[teamId]
    if (isMember || !id) return ''
    return teams.find(t => t.id === teamId)?.members?.some(m => m.user_id === id) ? id : ''
  }

  const [form, setForm] = useState<CreateForm>(() => {
    const allowed = (id?: string) => !!id && allowedTeams.some(t => t.id === id)
    const team_id = (allowed(prefill?.team_id) ? prefill!.team_id! : undefined)
      ?? lockedTeam?.id
      ?? (allowed(prefs.team_id) ? prefs.team_id! : undefined)
      ?? myTeams[0]?.id
      ?? ''
    const inTeam = (uid?: string) => !!uid && !!teams.find(t => t.id === team_id)?.members?.some(m => m.user_id === uid)
    const assignee_id = isMember ? ''
      : prefill?.assignee_id !== undefined ? (inTeam(prefill.assignee_id) ? prefill.assignee_id : '')
      : rememberedAssignee(team_id, prefs)
    return {
      team_id,
      assignee_id,
      deadline: prefill?.deadline
        ?? `${vnDate(0)}T${isTime(prefs.deadline_time) ? prefs.deadline_time : DEFAULT_DEADLINE_TIME}`,
      source_outro_id:     prefill?.sources?.source_outro_id     ?? '',
      source_collected_id: prefill?.sources?.source_collected_id ?? '',
      source_workshop_id:  prefill?.sources?.source_workshop_id  ?? '',
      source_huyk_id:      prefill?.sources?.source_huyk_id      ?? '',
    }
  })

  // brandType derive từ team đang chọn (hoặc team duy nhất của user)
  const selectedTeam = teams.find(t => t.id === form.team_id)
  const brandType: BrandType = selectedTeam?.brand_type ?? lockedTeam?.brand_type ?? 'DO_DA'
  // market của người tạo — lấy từ team đang chọn (hoặc team duy nhất của user), dùng làm mặc định
  // khi tạo content mới ngay trong modal này, thay vì luôn mặc định Việt Nam.
  const creatorMarket = selectedTeam?.market ?? lockedTeam?.market ?? 'VIETNAM'
  // team dùng để load kho team (kho team của team đang chọn, không phải myTeams[0])
  const activeTeamForWarehouse = selectedTeam ?? lockedTeam

  const [contentScope, setContentScope] = useState<Scope>(() =>
    isScope(prefs.content_scope) && (prefs.content_scope !== 'team' || activeTeamForWarehouse)
      ? prefs.content_scope
      : 'personal')
  // Mặc định "Kho team" — nhưng nếu chưa xác định được team nào (ví dụ Admin/Manager chưa chọn
  // team) thì fallback về "Kho tổng" để không mặc định vào 1 scope đang bị khoá (xem ScopeSwitch).
  // Lần trước chọn kho khác thì mở lại đúng kho đó.
  const [productScope, setProductScope] = useState<Scope>(() => {
    if (prefill?.product) return prefill.product.scope
    if (isScope(prefs.product_scope) && (prefs.product_scope !== 'team' || activeTeamForWarehouse)) return prefs.product_scope
    return activeTeamForWarehouse ? 'team' : 'global'
  })
  const [contentSearch, setContentSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showContentModal, setShowContentModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [lineFilter, setLineFilter] = useState(prefill?.content_line ?? null)
  // Chọn nhiều content → mỗi content 1 task, dùng chung sản phẩm/người được giao/deadline/nguồn
  const [multiMode, setMultiMode] = useState(false)
  const [picked, setPicked] = useState<PickedContent[]>([])
  // Sản phẩm chọn "Kho tổng" giờ đọc trực tiếp từ OMS (không còn Product local) — cần thêm
  // oms_product_id/oms_variant_id (resolve lúc chọn, xem handleProductChange) để gửi kèm khi tạo
  // task; hệ thống tự materialize vào kho cá nhân của editor được giao (xem TasksService).
  const [product, setProduct] = useState<PickedProduct | null>(prefill?.product ?? null)
  const [resolvingOmsVariant, setResolvingOmsVariant] = useState(false)
  // Chọn nhiều + viết content mới: sản phẩm đi kèm content đang viết
  const [draftProduct, setDraftProduct] = useState<PickedProduct | null>(null)
  // "Tạo sản phẩm mới..." bấm từ ô nào thì sản phẩm vừa tạo gán vào đúng ô đó
  const [productModalTarget, setProductModalTarget] = useState<ProductTarget>({ kind: 'shared' })
  const [sourceScope, setSourceScope] = useState<'personal' | 'team' | 'global' | 'all'>('all')
  // Khối "Nguồn source" gồm 4 field tuỳ chọn, ít khi dùng hết — đóng mặc định để giảm
  // chiều cao/scroll cho luồng phổ biến (chỉ chọn content + sản phẩm + phân công). Nhân bản task
  // có nguồn thì mở sẵn để thấy đã chép những gì.
  const [sourcesOpen, setSourcesOpen] = useState(() => Object.values(prefill?.sources ?? {}).some(Boolean))
  const [prevBrandType, setPrevBrandType] = useState<BrandType>(brandType)
  const [createdCount, setCreatedCount] = useState(0)
  const [progress, setProgress] = useState<{ done: number; total: number; phase: 'content' | 'tasks' } | null>(null)
  const contentFieldRef = useRef<HTMLDivElement>(null)
  // "Viết content mới" ngay trong modal (không mở modal thứ 2): lưu vào kho cá nhân lúc bấm tạo rồi
  // tạo task luôn. Tuyến điền sẵn theo kế hoạch / lần viết trước (xem prefillDraft).
  const [initialDraft] = useState(() => prefillDraft(EMPTY_DRAFT, {}, {
    search: '', lines: undefined, planLine: prefill?.content_line, lastLineId: prefs.new_content_line_id,
  }))
  const [contentMode, setContentMode] = useState<ContentMode>(prefs.content_mode === 'new' && userId ? 'new' : 'pick')
  const [draft, setDraft] = useState<ContentDraft>(initialDraft.draft)
  const [draftHints, setDraftHints] = useState<DraftHints>(initialDraft.hints)
  // Ảnh chụp bản nháp lúc mở "Form đầy đủ" — object ổn định, ContentFormModal reset form khi identity đổi
  const [fullFormInit, setFullFormInit] = useState<ContentDraft | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [debouncedTitle, setDebouncedTitle] = useState('')
  const deadlineId = useId()

  useEffect(() => {
    if (lockedTeam && !form.team_id) setForm(f => ({ ...f, team_id: lockedTeam.id }))
  }, [lockedTeam?.id])

  // Reset content/product/sources khi brandType thay đổi (do đổi team)
  useEffect(() => {
    if (brandType !== prevBrandType) {
      setPrevBrandType(brandType)
      setPicked([])
      setProduct(null)
      setDraftProduct(null)
      setForm(f => ({
        ...f,
        source_outro_id: '', source_collected_id: '', source_workshop_id: '', source_huyk_id: '',
      }))
    }
  }, [brandType])

  // Đổi tab kho KHÔNG xoá lựa chọn: content/sản phẩm đã chọn mang theo kho của nó (PickedContent/PickedProduct).

  // useState initializer ở trên chỉ đúng cho Member/Leader (đã có team ngay lúc mount). Admin/
  // Manager thì team_id rỗng lúc mở modal nên productScope khởi tạo về 'global' — effect này bù
  // lại: ngay khi họ vừa chọn xong team đầu tiên ở "Đội nhóm", tự chuyển sang "Kho team". Chỉ áp
  // dụng 1 LẦN (ref) — đổi sang team khác sau đó không ép quay lại 'team' nếu người dùng đã chủ
  // động bấm sang tab khác; lần trước đã chọn kho khác (ghi nhớ) hoặc nhân bản thì cũng không ép.
  const autoTeamScopeApplied = useRef(
    !!activeTeamForWarehouse || !!prefill?.product || (isScope(prefs.product_scope) && prefs.product_scope !== 'team'),
  )
  useEffect(() => {
    if (activeTeamForWarehouse && !autoTeamScopeApplied.current) {
      autoTeamScopeApplied.current = true
      setProductScope('team')
    }
  }, [activeTeamForWarehouse])

  const { data: personalContentsData, isLoading: loadingPersonalContents } = useQuery({
    queryKey: ['task-auto', 'create-contents-personal', brandType, contentSearch, userId, lineFilter?.id],
    queryFn: () => getEditorContents(userId!, { brand_type: brandType, search: contentSearch || undefined, content_line_id: lineFilter?.id, limit: 50 }),
    enabled: !!userId && contentScope === 'personal',
  })
  const { data: globalContentsData, isLoading: loadingGlobalContents } = useQuery({
    queryKey: ['task-auto', 'create-contents-global', brandType, contentSearch, lineFilter?.id],
    queryFn: () => getContents({ brand_type: brandType, search: contentSearch || undefined, content_line_id: lineFilter?.id, limit: 50 }),
    enabled: contentScope === 'global',
  })
  const { data: teamContentsRaw, isLoading: loadingTeamContents } = useQuery({
    queryKey: ['task-auto', 'create-contents-team', activeTeamForWarehouse?.id, brandType],
    queryFn: () => getTeamContents(activeTeamForWarehouse!.id, brandType),
    enabled: !!activeTeamForWarehouse?.id && contentScope === 'team',
  })

  const { data: personalProductsData, isLoading: loadingPersonalProducts } = useQuery({
    queryKey: ['task-auto', 'create-products-personal', brandType, productSearch, userId],
    queryFn: () => getEditorProducts(userId!, { brand_type: brandType, search: productSearch || undefined, limit: 50 }),
    enabled: !!userId && productScope === 'personal',
  })
  // Kho tổng giờ là proxy trực tiếp OMS (không lọc theo brandType — OMS là 1 danh mục chung).
  const { data: omsProductsData, isLoading: loadingOmsProducts } = useQuery({
    queryKey: ['task-auto', 'create-products-oms', productSearch],
    queryFn: () => searchOmsProducts({ q: productSearch || undefined, page: 1, page_size: 50 }),
    enabled: productScope === 'global',
  })
  const { data: teamProductsRaw, isLoading: loadingTeamProducts } = useQuery({
    queryKey: ['task-auto', 'create-products-team', activeTeamForWarehouse?.id, brandType],
    queryFn: () => getTeamProducts(activeTeamForWarehouse!.id, brandType),
    enabled: !!activeTeamForWarehouse?.id && productScope === 'team',
  })

  const { data: productSourcesData } = useQuery({
    queryKey: ['task-auto', 'product-sources', product?.scope, product?.actualId, product?.value, form.team_id, userId],
    queryFn: async () => {
      const p = product!
      if (p.scope === 'personal' && userId)
        return getEditorSources(userId, { editor_product_id: p.actualId, is_active: true, limit: 50 } as any)
      if (p.scope === 'team' && form.team_id) {
        const data = await getTeamSources(form.team_id, { team_product_id: p.actualId, is_active: true })
        return { data: data as unknown as Source[], total: data.length }
      }
      return getSources({ product_id: p.value, is_active: true, limit: 50 })
    },
    enabled: !!product,
  })
  const { data: personalSourcesData } = useQuery({
    queryKey: ['task-auto', 'sources-personal', userId, brandType],
    queryFn: () => getEditorSources(userId!, { brand_type: brandType, is_active: true, limit: 200 }),
    enabled: !!userId,
  })
  const { data: teamSourcesRaw } = useQuery({
    queryKey: ['task-auto', 'team-sources-select', form.team_id, brandType],
    queryFn: () => getTeamSources(form.team_id, { brand_type: brandType, is_active: true }),
    enabled: !!form.team_id,
  })
  const { data: globalSourcesData } = useQuery({
    queryKey: ['task-auto', 'sources-global', brandType],
    queryFn: () => getSources({ brand_type: brandType, is_active: true, limit: 200 }),
  })

  // Danh mục tuyến luôn tải (nhẹ, dùng chung cache với ContentFormModal) — cần cả khi bấm "Viết
  // content mới" từ dropdown để nhận ra từ khoá đang tìm là tên tuyến.
  const { data: contentLines, isLoading: loadingContentLines } = useQuery({
    queryKey: ['task-auto', 'content-lines'],
    queryFn: getContentLines,
  })
  const { data: contentClassifications, isLoading: loadingClassifications } = useQuery({
    queryKey: ['task-auto', 'content-classifications'],
    queryFn: getContentClassifications,
    enabled: contentMode === 'new',
  })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTitle(draft.title), 400)
    return () => clearTimeout(t)
  }, [draft.title])
  const dupKey = normalizeTitle(debouncedTitle)
  const { data: dupCandidates } = useQuery({
    queryKey: ['task-auto', 'create-content-dup', userId, brandType, dupKey],
    queryFn: () => getEditorContents(userId!, { brand_type: brandType, search: debouncedTitle.trim(), limit: 20 }),
    enabled: contentMode === 'new' && !!userId && dupKey.length >= 4,
  })
  // Chỉ báo khi tiêu đề đang gõ đã ổn định (khớp bản debounce) và trùng TRỌN tiêu đề 1 content có sẵn
  const duplicateContent = contentMode === 'new' && dupKey.length >= 4 && normalizeTitle(draft.title) === dupKey
    ? (dupCandidates?.data ?? []).find(c => normalizeTitle(getContentTitle(c)) === dupKey) ?? null
    : null

  // Tuyến tự điền (nhớ từ lần trước / kế hoạch) không còn trong danh mục → bỏ, không gửi id chết lên BE
  useEffect(() => {
    if (!contentLines || !draft.content_line_id) return
    if (!contentLines.some(l => l.id === draft.content_line_id)) {
      setDraft(d => ({ ...d, content_line_id: '' }))
      setDraftHints(h => ({ ...h, line: undefined }))
    }
  }, [contentLines, draft.content_line_id])

  // Kho team trả nguyên mảng (không phân trang) nên lọc tìm kiếm + tuyến ở FE
  const teamContents: Content[] = (teamContentsRaw ?? [])
    .map(tc => tc as unknown as Content)
    .filter(c => !contentSearch ||
      getContentTitle(c).toLowerCase().includes(contentSearch.toLowerCase()) ||
      getContentCode(c)?.toLowerCase().includes(contentSearch.toLowerCase()))
    .filter(c => !lineFilter || getContentLineId(c) === lineFilter.id || getContentLine(c) === lineFilter.name)

  const contents: Content[] =
    contentScope === 'personal' ? (personalContentsData?.data ?? []) :
    contentScope === 'global'   ? (globalContentsData?.data ?? []) :
    teamContents

  const loadingContents =
    contentScope === 'personal' ? loadingPersonalContents :
    contentScope === 'global'   ? loadingGlobalContents :
    loadingTeamContents

  const teamProducts: Product[] = (teamProductsRaw ?? [])
    .map(tp => tp as unknown as Product)
    .filter(p => !productSearch ||
      getProductName(p).toLowerCase().includes(productSearch.toLowerCase()) ||  // ✅
      getProductSku(p)?.toLowerCase().includes(productSearch.toLowerCase()))
  // 'global' (kho tổng/OMS) không dùng mảng Product[] này — xem omsProducts bên dưới, render
  // riêng vì cấu trúc dữ liệu OMS khác hẳn (product có nhiều variant, không phải 1 sku/record).
  const products: Product[] =
    productScope === 'personal' ? (personalProductsData?.data ?? []) :
    productScope === 'team'     ? teamProducts : []

  const omsProducts: OmsProductSummary[] = omsProductsData?.data ?? []

  const loadingProducts =
    productScope === 'personal' ? loadingPersonalProducts :
    productScope === 'global'   ? loadingOmsProducts :
    loadingTeamProducts

  // Mỗi source được tag với prefix để phân biệt kho khi submit
  // value: 'editor:${id}' | 'team:${id}' | 'global:${id}'
  const personalSrcs: Source[] = (personalSourcesData?.data ?? [])
    .map((es: any) => ({ ...es, id: `editor:${es.id}` } as unknown as Source))
  const teamSrcs: Source[] = (teamSourcesRaw ?? [])
    .map((ts: TeamSource) => ({
      ...ts, id: `team:${ts.id}`, user_id: null,
      lark_record_id: null, created_at: ts.added_at,
    } as unknown as Source))
  const globalSrcs: Source[] = (globalSourcesData?.data ?? [])
    .map((s: Source) => ({ ...s, id: `global:${s.id}` }))

  const seenSourceIds = new Set<string>()
  const allSources: Source[] = []
  for (const s of [...personalSrcs, ...teamSrcs, ...globalSrcs]) {
    if (!seenSourceIds.has(s.id)) { seenSourceIds.add(s.id); allSources.push(s) }
  }

  const scopedSources =
    sourceScope === 'personal' ? personalSrcs :
    sourceScope === 'team'     ? teamSrcs :
    sourceScope === 'global'   ? globalSrcs :
    allSources

  const productSources = (productSourcesData?.data ?? []).filter(s => s.type === 'PRODUCT_STOCK')
  const outroSources   = scopedSources.filter(s => s.type === 'OUTRO')
  const collectedSrcs  = scopedSources.filter(s => s.type === 'COLLECTED')
  const workshopSrcs   = scopedSources.filter(s => s.type === 'WORKSHOP')
  const huykSrcs       = scopedSources.filter(s => s.type === 'HUYK')

  const teamMembers     = selectedTeam?.members ?? []
  const selectedSourceCount = [form.source_outro_id, form.source_collected_id, form.source_workshop_id, form.source_huyk_id]
    .filter(Boolean).length

  // ── Content ──
  const pickedIds = picked.map(c => c.id)
  const singlePicked = !multiMode ? picked[0] : undefined

  function toPicked(c: any, scope: Scope): PickedContent {
    return { id: c.id, scope, title: getContentTitle(c), code: getContentCode(c), line: getContentLine(c) }
  }

  function handleContentChange(v: string) {
    if (!v) { setPicked([]); return }
    const c = contents.find(x => x.id === v)
    if (!c) return
    if (!multiMode) { setPicked([toPicked(c, contentScope)]); return }
    if (pickedIds.includes(v)) { setPicked(picked.filter(p => p.id !== v)); return }
    if (picked.length >= MAX_BATCH) { toast.error(`Tối đa ${MAX_BATCH} nhiệm vụ mỗi lần tạo`); return }
    setPicked([...picked, { ...toPicked(c, contentScope), product: null }])
  }

  // Sản phẩm luôn đi theo 1 content cụ thể — bật/tắt chọn nhiều thì chuyển SP sang/khỏi content đang
  // chọn, KHÔNG áp 1 SP cho mọi content.
  function toggleMultiMode() {
    if (multiMode) {
      // Tắt: giữ content đầu tiên, SP của nó về ô Sản phẩm chung (đang viết mới thì lấy SP của bản nháp)
      if (contentMode === 'new') setProduct(draftProduct)
      else if (picked.length) setProduct(picked[0].product ?? null)
      setPicked(p => p.slice(0, 1).map(c => ({ ...c, product: undefined })))
      setDraftProduct(null)
    } else if (contentMode === 'new') {
      // Bật khi đang viết content mới: SP chung đang chọn là của content đang viết
      setDraftProduct(product)
    } else {
      setPicked(p => p.map((c, i) => (i === 0 ? { ...c, product } : { ...c, product: c.product ?? null })))
    }
    setMultiMode(m => !m)
  }

  function focusContentField() {
    requestAnimationFrame(() => contentFieldRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus())
  }

  function focusTitle() {
    requestAnimationFrame(() => titleInputRef.current?.focus())
  }

  // ── Sản phẩm ──
  const clearProductSources = () =>
    setForm(f => ({ ...f, source_collected_id: '', source_workshop_id: '', source_huyk_id: '' }))

  /** Dòng trong dropdown sản phẩm (theo tab kho đang xem) → PickedProduct. null = lỗi, đã báo. */
  async function resolveProduct(v: string): Promise<PickedProduct | null> {
    if (productScope === 'global') {
      // Kho tổng (OMS): 1 "product" có thể có nhiều SKU/variant — dùng luôn variant
      // trùng default_sku (SKU đại diện) để giữ luồng tạo task 1 bước; muốn chọn 1
      // variant khác thì kéo sản phẩm đó về kho team trước (có bước chọn variant riêng).
      const summary = omsProducts.find(p => p.id === v)
      setResolvingOmsVariant(true)
      try {
        const detail = await getOmsProductDetail(v)
        const variant = detail.variants.find(vr => vr.sku === summary?.default_sku) ?? detail.variants[0]
        if (!variant) { toast.error('Sản phẩm OMS này không có biến thể nào'); return null }
        return {
          scope: 'global', value: v, actualId: v,
          oms: { oms_product_id: detail.id, oms_variant_id: variant.id },
          item: { value: v, label: summary?.name ?? detail.name, sublabel: variant.sku, image: driveImageUrl(summary?.image_url ?? detail.image_url) },
        }
      } catch {
        toast.error('Không thể lấy chi tiết sản phẩm từ OMS')
        return null
      } finally {
        setResolvingOmsVariant(false)
      }
    }
    const scopedProduct = products.find(p => (p.source_product_id ?? p.id) === v)
    return {
      scope: productScope, value: v, actualId: scopedProduct?.id ?? v,
      item: scopedProduct
        ? { value: v, label: getProductName(scopedProduct), sublabel: getProductSku(scopedProduct), image: getProductImage(scopedProduct) }
        : { value: v, label: v },
    }
  }

  const rowsWithoutProduct = picked.filter(c => !c.product).length

  function applyProduct(target: ProductTarget, p: PickedProduct | null) {
    if (target.kind === 'shared') {
      setProduct(p)
      clearProductSources()
    } else if (target.kind === 'row') {
      setPicked(prev => prev.map(c => (c.id === target.id ? { ...c, product: p } : c)))
    } else if (target.kind === 'draft') {
      setDraftProduct(p)
    } else if (p) {
      // Gán nhanh: chỉ điền dòng CHƯA có SP — dòng đã chọn SP riêng giữ nguyên
      setPicked(prev => prev.map(c => (c.product ? c : { ...c, product: p })))
      toast.success(`Đã gán "${p.item.label}" cho ${rowsWithoutProduct} content chưa có sản phẩm`)
    }
  }

  // Sản phẩm chọn ở kho khác tab đang xem: dùng khoá riêng để dòng trùng giá trị ở kho này không bị
  // tô là "đã chọn" (vd. cùng 1 SP gốc có ở cả kho cá nhân lẫn kho team) — ô chọn vẫn hiện qua selectedItem.
  const productValueOf = (p: PickedProduct | null | undefined) =>
    !p ? '' : p.scope === productScope ? p.value : `${p.scope}:${p.value}`

  const productItems: SearchItem[] = productScope === 'global'
    ? omsProducts.map(p => ({
        value: p.id,
        label: p.name,
        sublabel: p.default_sku + (p.variant_count > 1 ? ` (+${p.variant_count - 1} biến thể khác)` : ''),
        image: driveImageUrl(p.image_url),
      }))
    : products.map(p => ({
        value: p.source_product_id ?? p.id,
        label: getProductName(p),  // ✅ Dùng helper
        sublabel: getProductSku(p),  // ✅ Cũng fix SKU
        image: getProductImage(p),
      }))

  // Hàm render (không phải component con) để dropdown không bị remount mỗi lần modal render lại.
  // Mọi ô chọn SP dùng chung 1 bộ tìm kiếm/tab kho — mỗi lúc chỉ mở được 1 dropdown.
  function renderProductPicker({ value, target, label, ariaLabel, placeholder, compact }: {
    value: PickedProduct | null | undefined
    target: ProductTarget
    label?: string
    ariaLabel?: string
    placeholder?: string
    compact?: boolean
  }) {
    const v = productValueOf(value)
    return (
      <ServerSearchSelect
        label={label}
        ariaLabel={ariaLabel}
        compact={compact}
        value={v}
        onChange={async raw => {
          if (!raw) { applyProduct(target, null); return }
          const next = await resolveProduct(raw)
          if (next) applyProduct(target, next)
        }}
        items={productItems}
        selectedItem={value ? { ...value.item, value: v } : null}
        searchValue={productSearch}
        onSearchChange={setProductSearch}
        loading={loadingProducts || resolvingOmsVariant}
        placeholder={placeholder ?? `Tìm trong ${scopeLabel[productScope]}...`}
        clearLabel={target.kind === 'bulk' ? undefined : '-- Không chọn --'}
        searchPlaceholder="Tìm theo tên hoặc SKU..."
        createLabel="Tạo sản phẩm mới..."
        onCreateClick={() => { setProductModalTarget(target); setShowProductModal(true) }}
        filterSlot={<ScopeSwitch value={productScope} onChange={setProductScope} hasTeam={!!activeTeamForWarehouse} />}
      />
    )
  }

  // ── Phân công / hạn chót ──
  // Đổi team: bỏ những gì thuộc kho team cũ (content/SP/nguồn kho team), giữ phần kho cá nhân/tổng
  function changeTeam(teamId: string) {
    setForm(f => {
      const dropTeam = (id: string) => (id.startsWith('team:') ? '' : id)
      return {
        ...f,
        team_id: teamId,
        assignee_id: rememberedAssignee(teamId),
        source_outro_id: dropTeam(f.source_outro_id),
        source_collected_id: dropTeam(f.source_collected_id),
        source_workshop_id: dropTeam(f.source_workshop_id),
        source_huyk_id: dropTeam(f.source_huyk_id),
      }
    })
    setPicked(p => p.filter(c => c.scope !== 'team').map(c => (c.product?.scope === 'team' ? { ...c, product: null } : c)))
    setProduct(p => (p?.scope === 'team' ? null : p))
    setDraftProduct(p => (p?.scope === 'team' ? null : p))
  }

  function setDeadlineDate(date: string) {
    setForm(f => ({ ...f, deadline: `${date}T${f.deadline.slice(11, 16) || DEFAULT_DEADLINE_TIME}` }))
  }

  const deadlineDate = form.deadline.slice(0, 10)
  const deadlinePassed = !!form.deadline && new Date(`${form.deadline}:00+07:00`).getTime() < Date.now()

  // ── Tạo ──
  function resolveSourceField(prefixedId: string, fieldBase: 'outro' | 'extra' | 'workshop' | 'huyk'): Record<string, string | undefined> {
    if (!prefixedId) return {}
    const [prefix, rawId] = prefixedId.split(':', 2)
    if (!rawId) return {}
    if (prefix === 'global')  return { [`source_${fieldBase}_id`]: rawId }
    if (prefix === 'editor')  return { [`editor_source_${fieldBase}_id`]: rawId }
    if (prefix === 'team')    return { [`team_source_${fieldBase}_id`]: rawId }
    return {}
  }

  function buildPayload(content: PickedContent, product: PickedProduct | null | undefined): Partial<Task> {
    const payload: Partial<Task> = {
      team_id:     form.team_id     || undefined,
      assignee_id: form.assignee_id || undefined,
      deadline:    form.deadline    || undefined,
      ...resolveSourceField(form.source_outro_id,     'outro'),
      ...resolveSourceField(form.source_collected_id, 'extra'),
      ...resolveSourceField(form.source_workshop_id,  'workshop'),
      ...resolveSourceField(form.source_huyk_id,      'huyk'),
    }
    if (content.scope === 'personal') payload.editor_content_id = content.id
    else if (content.scope === 'team') payload.team_content_id = content.id
    else payload.content_id = content.id
    if (product) {
      if (product.scope === 'personal') {
        payload.editor_product_id = product.actualId
      } else if (product.scope === 'team') {
        payload.team_product_id = product.actualId
      } else if (product.oms) {
        // Kho tổng (OMS) — không có Product local để trỏ vào; BE tự materialize vào kho cá
        // nhân của editor được giao (ngay lúc tạo nếu đã biết assignee, hoặc lúc gán sau).
        payload.oms_product_id = product.oms.oms_product_id
        payload.oms_variant_id = product.oms.oms_variant_id
      }
    }
    return payload
  }

  function rememberPrefs(mode: ContentMode) {
    const current = loadPrefs()
    const assignee_by_team = { ...current.assignee_by_team }
    if (!isMember && form.team_id) assignee_by_team[form.team_id] = form.assignee_id
    savePrefs({
      ...current,
      content_mode: mode,
      content_scope: contentScope,
      product_scope: productScope,
      deadline_time: isTime(form.deadline.slice(11, 16)) ? form.deadline.slice(11, 16) : current.deadline_time,
      team_id: form.team_id || current.team_id,
      assignee_by_team,
    })
  }

  const errorMessage = (err: any, fallback = 'Tạo nhiệm vụ thất bại') => {
    const msg = err?.response?.data?.message || fallback
    return Array.isArray(msg) ? msg.join(', ') : String(msg)
  }

  // ── Viết content mới ──
  /** Sang "Viết content mới": điền sẵn ô còn trống từ từ khoá đang tìm / tuyến kế hoạch / tuyến lần trước */
  function startNewContent() {
    const next = prefillDraft(draft, draftHints, {
      search: contentSearch,
      lines: contentLines,
      planLine: lineFilter,
      lastLineId: loadPrefs().new_content_line_id,
    })
    setDraft(next.draft)
    setDraftHints(next.hints)
    setContentMode('new')
    focusTitle()
  }

  function updateDraft(patch: Partial<ContentDraft>) {
    setDraft(d => ({ ...d, ...patch }))
    // Người dùng tự sửa ô nào thì bỏ ghi chú "tự điền" của ô đó
    setDraftHints(h => ({
      ...h,
      ...('title' in patch ? { title: undefined } : {}),
      ...('code' in patch ? { code: undefined } : {}),
      ...('content_line_id' in patch ? { line: undefined } : {}),
    }))
  }

  // Dán nội dung khi tiêu đề còn trống → tiêu đề = dòng đầu (bỏ hashtag, gạch đầu dòng). Không chặn
  // việc dán: nội dung vẫn vào ô như bình thường.
  function handleBodyPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (draft.title.trim()) return
    const title = titleFromText(e.clipboardData.getData('text'))
    if (!title) return
    setDraft(d => (d.title.trim() ? d : { ...d, title }))
    setDraftHints(h => ({ ...h, title: 'body' }))
  }

  const draftBody = (d: ContentDraft) => ({
    title: d.title.normalize('NFC').replace(/\s+/g, ' ').trim(),
    code: d.code.trim() || undefined,
    body: d.body.trim() ? d.body : undefined,
    content_line_id: d.content_line_id || undefined,
    classification_id: d.classification_id || undefined,
    market: creatorMarket,
    brand_type: brandType,
  }) as Partial<Content>

  /**
   * Content viết mới đã LƯU vào kho cá nhân → thành 1 lựa chọn bình thường (task lỗi thì bấm tạo lại
   * không tạo trùng content), dọn bản nháp nhưng giữ tuyến cho content viết tiếp, nhớ tuyến cho lần sau.
   */
  function commitCreatedContent(created: Content, lineId: string, rowProduct?: PickedProduct | null): PickedContent {
    const next: PickedContent = {
      ...toPicked(created, 'personal'),
      line: getContentLine(created) ?? contentLines?.find(l => l.id === lineId)?.name,
      ...(multiMode ? { product: rowProduct ?? null } : {}),
    }
    if (multiMode) setDraftProduct(null)
    setPicked(prev => (multiMode ? [...prev.filter(p => p.id !== next.id), next] : [next]))
    setDraft({ ...EMPTY_DRAFT, content_line_id: lineId })
    setDraftHints(lineId ? { line: 'last' } : {})
    setContentSearch('')
    if (lineId) savePrefs({ ...loadPrefs(), new_content_line_id: lineId })
    for (const key of ['create-contents-personal', 'my-contents', 'my-contents-titles', 'contents', 'create-content-dup']) {
      qc.invalidateQueries({ queryKey: ['task-auto', key] })
    }
    return next
  }

  // Chọn nhiều: "Lưu & viết tiếp" — lưu ngay content này thành 1 dòng trong danh sách rồi viết cái khác
  const saveDraftMut = useMutation({
    mutationFn: async ({ d, product }: { d: ContentDraft; product: PickedProduct | null }) =>
      ({ created: await createEditorContent(userId!, draftBody(d)), lineId: d.content_line_id, product }),
    onSuccess: ({ created, lineId, product }) => {
      commitCreatedContent(created, lineId, product)
      toast.success('Đã lưu content vào kho cá nhân')
      focusTitle()
    },
    onError: (err: any) => toast.error(`Không lưu được content: ${errorMessage(err, 'lỗi không xác định')}`),
  })

  function addDraftToList() {
    if (!draft.title.trim() || saveDraftMut.isPending) return
    if (picked.length >= MAX_BATCH) { toast.error(`Tối đa ${MAX_BATCH} nhiệm vụ mỗi lần tạo`); return }
    saveDraftMut.mutate({ d: draft, product: draftProduct })
  }

  function openFullForm() {
    setFullFormInit({ ...draft })
    setShowContentModal(true)
  }

  // Tiêu đề trùng content đã có trong kho cá nhân → dùng luôn content đó thay vì tạo bản trùng
  function pickDuplicate() {
    if (!duplicateContent) return
    const next = toPicked(duplicateContent, 'personal')
    if (multiMode) {
      if (!pickedIds.includes(next.id)) {
        if (picked.length >= MAX_BATCH) { toast.error(`Tối đa ${MAX_BATCH} nhiệm vụ mỗi lần tạo`); return }
        setPicked([...picked, { ...next, product: draftProduct }])
        setDraftProduct(null)
      }
      focusTitle()
    } else {
      setPicked([next])
      setContentMode('pick')
    }
    setDraft(d => ({ ...EMPTY_DRAFT, content_line_id: d.content_line_id }))
    setDraftHints(h => (h.line ? { line: h.line } : {}))
  }

  const draftReady = contentMode === 'new' && !!userId && !!draft.title.trim()
  // Số task sẽ tạo: chọn 1 → theo chế độ đang mở; chọn nhiều → danh sách + bản nháp (nếu đã có tiêu đề)
  const batchCount = (multiMode || contentMode === 'pick' ? picked.length : 0) + (draftReady ? 1 : 0)

  const mutation = useMutation({
    mutationFn: async (_vars: { andContinue: boolean }) => {
      const modeAtSubmit = contentMode
      const draftAtSubmit = draft
      const multiAtSubmit = multiMode
      const draftProductAtSubmit = draftProduct
      let batch = multiMode || modeAtSubmit === 'pick' ? picked : []
      let savedNewContent = false
      if (draftReady) {
        setProgress({ done: 0, total: batch.length + 1, phase: 'content' })
        let createdContent: Content
        try {
          createdContent = await createEditorContent(userId!, draftBody(draftAtSubmit))
        } catch (err) {
          // Chưa tạo task nào, bản nháp còn nguyên — báo lỗi lưu content (xem onError)
          throw Object.assign(new Error(errorMessage(err, 'lỗi không xác định')), { contentSave: true })
        }
        const savedPick = commitCreatedContent(createdContent, draftAtSubmit.content_line_id, draftProductAtSubmit)
        if (!multiMode) setContentMode('pick')
        batch = [...batch, savedPick]
        savedNewContent = true
      }
      const created: PickedContent[] = []
      const failed: { content: PickedContent; message: string }[] = []
      setProgress({ done: 0, total: batch.length, phase: 'tasks' })
      // Tuần tự, không bắn song song: SP kho tổng (OMS) được BE materialize vào kho cá nhân của
      // editor ở lần tạo đầu tiên — song song dễ tạo trùng bản materialize.
      for (const content of batch) {
        try {
          // Chọn nhiều: mỗi content đi với SP riêng của nó; chọn 1: ô Sản phẩm chung
          await createTask(buildPayload(content, multiAtSubmit ? content.product : product))
          created.push(content)
        } catch (err) {
          failed.push({ content, message: errorMessage(err) })
        }
        setProgress(p => p && { ...p, done: p.done + 1 })
      }
      return { created, failed, savedNewContent, modeAtSubmit }
    },
    onSuccess: ({ created, failed, savedNewContent, modeAtSubmit }, { andContinue }) => {
      setProgress(null)
      if (created.length) {
        toast.success(created.length === 1 ? 'Tạo nhiệm vụ thành công!' : `Đã tạo ${created.length} nhiệm vụ`)
        qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
        // Task tạo tay có hạn trong ngày cũng tính vào Kế hoạch ngày; "Đã làm N lần" của content đổi
        qc.invalidateQueries({ queryKey: ['task-auto', 'daily-plans'] })
        qc.invalidateQueries({ queryKey: ['task-auto', 'create-contents-personal'] })
        qc.invalidateQueries({ queryKey: ['task-auto', 'create-contents-global'] })
        qc.invalidateQueries({ queryKey: ['task-auto', 'create-contents-team'] })
        rememberPrefs(modeAtSubmit)
        setCreatedCount(n => n + created.length)
      }
      if (failed.length) {
        const messages = [...new Set(failed.map(f => f.message))].join(' · ')
        const total = created.length + failed.length
        // Content viết mới đã lưu dù task lỗi — nói rõ để người dùng không viết lại lần nữa
        const saved = savedNewContent ? ' (content mới đã lưu vào kho cá nhân — bấm tạo lại không bị trùng)' : ''
        toast.error(total === 1 ? `${messages}${saved}` : `${failed.length}/${total} nhiệm vụ chưa tạo được: ${messages}${saved}`)
        // Giữ lại content lỗi để sửa rồi bấm tạo lại; đã tạo được thì bỏ khỏi danh sách
        setPicked(failed.map(f => f.content))
        return
      }
      if (andContinue) {
        // Giữ team / người được giao / deadline / sản phẩm / nguồn — chỉ chọn (hoặc viết) content tiếp
        setPicked([])
        if (modeAtSubmit === 'new') {
          setContentMode('new')
          focusTitle()
        } else {
          focusContentField()
        }
        return
      }
      onSuccess()
    },
    // mutationFn tự bắt lỗi từng task nên nhánh này chỉ còn lỗi bất ngờ ngoài request
    onError: (err: any) => {
      setProgress(null)
      toast.error(err?.contentSave ? `Không lưu được content: ${err.message}` : errorMessage(err))
    },
  })

  const canSubmit = batchCount > 0 && batchCount <= MAX_BATCH && !!form.team_id
    && !mutation.isPending && !resolvingOmsVariant && !saveDraftMut.isPending

  function submit(andContinue: boolean) {
    if (canSubmit) mutation.mutate({ andContinue })
  }

  // Enter = Tạo nhiệm vụ, Shift+Enter = Tạo & tạo tiếp — chỉ khi form đã đủ và đang ở ô nhập 1 dòng / ô chọn
  // Content-Sản phẩm (xem acceptsPlainEnter). Ô đã tự dùng Enter thì preventDefault trước → bỏ qua.
  // ⌘/Ctrl+Enter tạo được ở mọi ô.
  const submitRef = useRef(submit)
  submitRef.current = submit
  const canSubmitRef = useRef(false)
  canSubmitRef.current = canSubmit
  const childModalOpenRef = useRef(false)
  childModalOpenRef.current = showContentModal || showProductModal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.repeat || e.altKey) return
      // Bộ gõ tiếng Việt (Telex/VNI) đang ghép chữ: Enter là để chốt chữ
      if (e.isComposing || e.keyCode === 229) return
      if (e.defaultPrevented || childModalOpenRef.current || !canSubmitRef.current) return
      if (!(e.metaKey || e.ctrlKey) && !acceptsPlainEnter(e.target)) return
      e.preventDefault()
      submitRef.current(e.shiftKey)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const pendingLabel = progress?.phase === 'content' ? 'Đang lưu content...'
    : progress && progress.total > 1 ? `Đang tạo ${progress.done}/${progress.total}...` : 'Đang tạo...'

  return (
    <>
    <DarkModal
      open
      onClose={onClose}
      title="Tạo nhiệm vụ thủ công"
      subtitle={prefill?.origin}
      size="2xl"
      footer={
        <div className="w-full flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="mr-auto min-w-0 flex items-center gap-4 text-xs text-slate-500">
            <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
              {createdCount > 0 && (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Đã tạo {createdCount} nhiệm vụ
                </>
              )}
            </span>
            {/* Gợi ý phím tắt — trình đọc màn hình đã có aria-keyshortcuts trên 2 nút tạo */}
            <span className="hidden lg:inline-flex items-center gap-1" aria-hidden="true">
              <Kbd>Enter</Kbd>
              <span className="ml-0.5 mr-2">tạo</span>
              <Kbd>⇧</Kbd><Kbd>Enter</Kbd>
              <span className="ml-0.5">tạo & tạo tiếp</span>
            </span>
          </div>
          <button type="button" onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Huỷ
          </button>
          <button type="button" onClick={() => submit(true)} disabled={!canSubmit}
            aria-keyshortcuts="Shift+Enter"
            title="Tạo xong giữ nguyên team, người được giao, deadline, sản phẩm — chỉ chọn content tiếp"
            className="bg-white border border-indigo-200 hover:bg-indigo-50 disabled:opacity-60 disabled:hover:bg-white text-indigo-700 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Tạo & tạo tiếp
          </button>
          <button type="button" onClick={() => submit(false)} disabled={!canSubmit}
            aria-keyshortcuts="Enter"
            aria-busy={mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
            {mutation.isPending ? pendingLabel : batchCount > 1 ? `Tạo ${batchCount} nhiệm vụ` : 'Tạo nhiệm vụ'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* ── Nhóm sản phẩm ── chỉ hiển thị với admin/manager, tự động theo team */}
        {!isMember && !isLeader && (
          <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">Nhóm sản phẩm</span>
            <span className={cn(
              'px-3 py-1 rounded-lg text-sm font-semibold border',
              brandType === 'DO_DA'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            )}>
              {brandType === 'DO_DA' ? 'Đồ da' : 'Trang sức'}
            </span>
            {!form.team_id && (
              <span className="text-xs text-slate-400 italic">Chọn team để xác định nhóm sản phẩm</span>
            )}
          </div>
        )}

        {/* ── Nội dung ── */}
        <div className="space-y-3">
          <SectionHeader label="Nội dung">
            {lineFilter && (
              <span className="inline-flex items-center gap-0.5 pl-2.5 pr-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                Lọc tuyến {lineFilter.name}
                <button
                  type="button"
                  onClick={() => setLineFilter(null)}
                  aria-label={`Bỏ lọc tuyến ${lineFilter.name}`}
                  className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </span>
            )}
            {/* Nút gạt bật/tắt: trạng thái lấy thẳng từ multiMode, hiệu ứng trượt chỉ để nhìn */}
            <button
              type="button"
              role="switch"
              aria-checked={multiMode}
              onClick={toggleMultiMode}
              title="Bật để tạo nhiều nhiệm vụ cùng lúc — mỗi content đi với sản phẩm riêng"
              className="inline-flex items-center gap-2 h-8 px-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Tạo nhiều
              <span
                aria-hidden="true"
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors motion-reduce:transition-none',
                  multiMode ? 'bg-indigo-600' : 'bg-gray-300',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none',
                    multiMode && 'translate-x-4',
                  )}
                />
              </span>
            </button>
          </SectionHeader>
          <div role="group" aria-label="Cách lấy content" className="inline-flex gap-0.5 p-0.5 bg-gray-100 rounded-xl">
            {([
              { key: 'pick' as const, label: 'Chọn từ kho', Icon: Library },
              { key: 'new' as const, label: 'Viết content mới', Icon: PenLine },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={contentMode === key}
                disabled={key === 'new' && !userId}
                onClick={() => {
                  if (key === 'pick') setContentMode('pick')
                  else if (contentMode !== 'new') startNewContent()
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40',
                  contentMode === key ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {contentMode === 'pick' ? (
          <>
          <div ref={contentFieldRef} data-enter-submit>
            <ServerSearchSelect
              label={multiMode ? 'Content * (chọn nhiều)' : 'Content *'}
              value={singlePicked?.id ?? ''}
              onChange={handleContentChange}
              items={contents.map(c => ({
                value: c.id,
                label: getContentTitle(c),
                sublabel: getContentCode(c),
                meta: contentTaskMeta(c),
              }))}
              selectedItem={singlePicked ? { value: singlePicked.id, label: singlePicked.title, sublabel: singlePicked.code } : null}
              selectedValues={multiMode ? pickedIds : undefined}
              keepOpenOnSelect={multiMode}
              autoFocus
              searchValue={contentSearch}
              onSearchChange={setContentSearch}
              loading={loadingContents}
              placeholder={multiMode
                ? (picked.length ? `Đã chọn ${picked.length} content — bấm để chọn thêm` : `Chọn nhiều content trong ${scopeLabel[contentScope]}...`)
                : `Tìm trong ${scopeLabel[contentScope]}${lineFilter ? ` · tuyến ${lineFilter.name}` : ''}...`}
              clearLabel={multiMode ? undefined : '-- Không chọn --'}
              searchPlaceholder="Tìm theo mã hoặc tiêu đề..."
              createLabel={contentSearch.trim()
                ? `Viết content mới “${contentSearch.trim().length > 40 ? `${contentSearch.trim().slice(0, 40)}…` : contentSearch.trim()}”`
                : 'Viết content mới...'}
              onCreateClick={startNewContent}
              filterSlot={<ScopeSwitch value={contentScope} onChange={setContentScope} hasTeam={!!activeTeamForWarehouse} />}
            />
          </div>
          {singlePicked && (singlePicked.line || singlePicked.scope !== contentScope) && (
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap pl-1">
              {singlePicked.line && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Tuyến:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                    {singlePicked.line}
                  </span>
                </div>
              )}
              {singlePicked.scope !== contentScope && <ScopeNote scope={singlePicked.scope} />}
            </div>
          )}
          </>
          ) : (
            <NewContentFields
              ref={titleInputRef}
              draft={draft}
              hints={draftHints}
              onChange={updateDraft}
              onBodyPaste={handleBodyPaste}
              lines={contentLines}
              loadingLines={loadingContentLines}
              classifications={contentClassifications?.map(c => ({ value: c.id, label: c.name })) ?? []}
              loadingClassifications={loadingClassifications}
              onCreateClassification={async name => {
                const created = await createContentClassification(name)
                qc.setQueryData<ContentClassification[]>(['task-auto', 'content-classifications'], old => [...(old ?? []), created])
                return { id: created.id, label: created.name }
              }}
              planLineName={lineFilter?.name ?? prefill?.content_line?.name}
              marketLabel={MARKET_LABEL[creatorMarket] ?? creatorMarket}
              duplicate={duplicateContent ? { title: getContentTitle(duplicateContent), code: getContentCode(duplicateContent) } : null}
              onUseDuplicate={pickDuplicate}
              onOpenFullForm={openFullForm}
              onAddToList={multiMode ? addDraftToList : undefined}
              adding={saveDraftMut.isPending}
              productSlot={multiMode ? renderProductPicker({
                value: draftProduct,
                target: { kind: 'draft' },
                label: 'Sản phẩm cho content này',
                placeholder: 'Không bắt buộc — tìm sản phẩm...',
              }) : undefined}
            />
          )}
          {multiMode && picked.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3 pl-1">
                <p className="text-xs text-slate-500">
                  Mỗi dòng tạo 1 nhiệm vụ với sản phẩm của chính dòng đó (không bắt buộc). Phân công, deadline và nguồn dùng chung.
                </p>
                <button
                  type="button"
                  onClick={() => setPicked([])}
                  className="shrink-0 text-xs font-semibold text-slate-500 hover:text-red-600 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
              <ul aria-label="Content đã chọn" className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {picked.map(c => (
                  // Mobile: tiêu đề + nút bỏ ở hàng 1, ô SP cả hàng 2; ≥sm: 1 hàng 3 cột. Đặt vị trí tường
                  // minh vì auto-placement không quay lại ô trống phía trước.
                  <li key={c.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)_auto] items-center gap-x-3 gap-y-2 px-3 py-2">
                    <div className="col-start-1 row-start-1 min-w-0 flex items-center gap-1.5 text-sm text-slate-800">
                      {c.line && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-bold leading-none">{c.line}</span>
                      )}
                      <span className="truncate" title={c.title}>{c.title}</span>
                      {c.code && <span className="shrink-0 font-mono text-xs text-slate-500">{c.code}</span>}
                    </div>
                    <div className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 min-w-0">
                      {renderProductPicker({
                        value: c.product,
                        target: { kind: 'row', id: c.id },
                        ariaLabel: `Sản phẩm cho content ${c.title}`,
                        placeholder: 'Sản phẩm (không bắt buộc)',
                        compact: true,
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPicked(picked.filter(p => p.id !== c.id))}
                      aria-label={`Bỏ content ${c.title}`}
                      className="col-start-2 row-start-1 sm:col-start-3 w-8 h-8 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              {picked.length > 1 && rowsWithoutProduct > 0 && (
                <div className="flex items-center gap-x-3 gap-y-2 flex-wrap pl-1">
                  <span className="text-xs text-slate-500">
                    Gán nhanh 1 sản phẩm cho <span className="font-semibold text-slate-700 tabular-nums">{rowsWithoutProduct}</span> content chưa có:
                  </span>
                  <div className="w-full sm:w-72">
                    {renderProductPicker({
                      value: null,
                      target: { kind: 'bulk' },
                      ariaLabel: `Gán nhanh sản phẩm cho ${rowsWithoutProduct} content chưa có sản phẩm`,
                      placeholder: 'Chọn sản phẩm để gán nhanh...',
                      compact: true,
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sản phẩm ── */}
        <div className="space-y-3">
          <SectionHeader label="Sản phẩm" />
          {multiMode ? (
            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-slate-500">
              Đang bật Tạo nhiều: mỗi content chọn sản phẩm riêng ở danh sách phía trên.
            </p>
          ) : (
          <>
          <div data-enter-submit>
            {renderProductPicker({ value: product, target: { kind: 'shared' }, label: 'Sản phẩm' })}
          </div>
          {product && product.scope !== productScope && <ScopeNote scope={product.scope} />}
          {product && productSources.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-1">
              <span className="text-xs text-slate-400 self-center">Source kèm:</span>
              {productSources.map(s => (
                <a key={s.id} href={s.link ?? undefined} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-full transition-colors">
                  {s.name}
                </a>
              ))}
            </div>
          )}
          </>
          )}
        </div>

        {/* ── Phân công ── */}
        <div className="space-y-3">
          <SectionHeader label="Phân công" />
          <div className={!isMember ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
            {lockedTeam ? (
              <div className="space-y-2">
                <label className="block text-base font-semibold text-slate-700">Đội nhóm *</label>
                <div className="flex items-center gap-2 px-4 py-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-700">
                  {lockedTeam.name}
                  <span className="ml-auto text-xs font-normal text-indigo-400">Team của bạn</span>
                </div>
              </div>
            ) : (
              <CustomSelect
                label="Đội nhóm *"
                value={form.team_id}
                onChange={changeTeam}
                options={[
                  { value: '', label: '-- Chọn team --' },
                  ...(myTeams.length > 1 ? myTeams : teams).map(t => ({ value: t.id, label: t.name })),
                ]}
                searchable
              />
            )}
            {!isMember && (
              <CustomSelect
                label="Người được giao"
                value={form.assignee_id}
                onChange={v => setForm(f => ({ ...f, assignee_id: v }))}
                options={[
                  { value: '', label: form.team_id ? '-- Không chỉ định --' : '-- Chọn team trước --' },
                  ...teamMembers.map(m => ({ value: m.user_id, label: m.user?.full_name ?? m.user_id })),
                ]}
              />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-x-3 gap-y-2 flex-wrap">
              <label htmlFor={deadlineId} className="block text-base font-semibold text-slate-700">Deadline</label>
              <div role="group" aria-label="Chọn nhanh ngày hạn chót" className="flex flex-wrap gap-1.5">
                {QUICK_DAYS.map(q => {
                  const date = vnDate(q.offset)
                  const active = deadlineDate === date
                  return (
                    <button
                      key={q.offset}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDeadlineDate(date)}
                      className={cn(
                        'inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                        active
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-gray-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700',
                      )}
                    >
                      {q.label}
                      <span className={cn('font-normal tabular-nums', active ? 'text-indigo-100' : 'text-slate-500')}>
                        {shortDate(date)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <DarkInput
              id={deadlineId}
              type="datetime-local"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              aria-describedby={deadlinePassed ? `${deadlineId}-past` : undefined}
            />
            {deadlinePassed && (
              <p id={`${deadlineId}-past`} className="flex items-center gap-1.5 pl-1 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Hạn chót đã qua — nhiệm vụ sẽ hiện là quá hạn ngay khi tạo.
              </p>
            )}
          </div>
        </div>

        {/* ── Nguồn source (tuỳ chọn) — đóng mặc định để giảm scroll, hiếm khi dùng hết cả 4 ── */}
        <div className="space-y-3">
          <SectionHeader label="Nguồn source (tuỳ chọn)">
            {sourcesOpen && (
              <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
                {([
                  { key: 'personal', label: 'Cá nhân',  disabled: false },
                  { key: 'team',     label: 'Kho team',  disabled: !form.team_id },
                  { key: 'global',   label: 'Kho chung', disabled: false },
                  { key: 'all',      label: 'Tất cả',    disabled: false },
                ] as const).map(({ key, label, disabled }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSourceScope(key)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                      sourceScope === key
                        ? 'bg-white shadow-sm text-indigo-700'
                        : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSourcesOpen(v => !v)}
              aria-expanded={sourcesOpen}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0"
            >
              {selectedSourceCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  {selectedSourceCount} đã chọn
                </span>
              )}
              {sourcesOpen ? 'Thu gọn' : 'Chọn nguồn'}
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', sourcesOpen && 'rotate-180')} aria-hidden="true" />
            </button>
          </SectionHeader>
          {sourcesOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Outro
                  {outroSources.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{outroSources.length}</span>}
                </label>
                <CustomSelect
                  value={form.source_outro_id}
                  onChange={v => setForm(f => ({ ...f, source_outro_id: v }))}
                  options={[{ value: '', label: '-- Không chọn --' }, ...outroSources.map(s => ({ value: s.id, label: s.name }))]}
                  searchable
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Sưu tầm
                  {collectedSrcs.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{collectedSrcs.length}</span>}
                </label>
                <CustomSelect
                  value={form.source_collected_id}
                  onChange={v => setForm(f => ({ ...f, source_collected_id: v }))}
                  options={[{ value: '', label: '-- Không chọn --' }, ...collectedSrcs.map(s => ({ value: s.id, label: s.name }))]}
                  searchable
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Chế tác
                  {workshopSrcs.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{workshopSrcs.length}</span>}
                </label>
                <CustomSelect
                  value={form.source_workshop_id}
                  onChange={v => setForm(f => ({ ...f, source_workshop_id: v }))}
                  options={[{ value: '', label: '-- Không chọn --' }, ...workshopSrcs.map(s => ({ value: s.id, label: s.name }))]}
                  searchable
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Huy-K
                  {huykSrcs.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{huykSrcs.length}</span>}
                </label>
                <CustomSelect
                  value={form.source_huyk_id}
                  onChange={v => setForm(f => ({ ...f, source_huyk_id: v }))}
                  options={[{ value: '', label: '-- Không chọn --' }, ...huykSrcs.map(s => ({ value: s.id, label: s.name }))]}
                  searchable
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </DarkModal>

    {showContentModal && (
      <ContentFormModal
        open
        userId={userId}
        brandType={brandType}
        initialMarket={creatorMarket}
        initialValues={fullFormInit ?? undefined}
        onClose={() => setShowContentModal(false)}
        onSuccess={(content: Content) => {
          commitCreatedContent(content, content.content_line_id ?? fullFormInit?.content_line_id ?? '')
          setContentScope('personal')
          if (!multiMode) setContentMode('pick')
          setShowContentModal(false)
        }}
      />
    )}

    {showProductModal && (
      <ProductFormModal
        open
        userId={userId}
        defaultBrandType={brandType}
        initialMarket={creatorMarket}
        onClose={() => setShowProductModal(false)}
        onSuccess={(created: Product) => {
          qc.invalidateQueries({ queryKey: ['task-auto', 'create-products-personal'] })
          const value = created.source_product_id ?? created.id
          applyProduct(productModalTarget, {
            scope: 'personal', value, actualId: created.id,
            item: { value, label: getProductName(created), sublabel: getProductSku(created), image: getProductImage(created) },
          })
          setProductScope('personal')
          setShowProductModal(false)
        }}
      />
    )}
    </>
  )
}
