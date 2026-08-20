'use client'

import { useEffect, useRef, useState } from 'react'
import {
  FileText, Link2, Mic, Download, X, ChevronDown, ChevronUp,
  Sparkles, Loader2, Copy, Check, Languages, Save, Send, Clock, CheckCircle2, XCircle, PenLine, Wand2, AudioLines, Gauge,
} from 'lucide-react'
import { cn, drivePreviewUrl, cleanContentText } from '@/lib/utils'
import { ServerSearchSelect } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { TtsVoiceModal } from '@/components/task-auto/TtsVoiceModal'
import { PaastScoreModal } from '@/components/task-auto/PaastScoreModal'
import type { PaastAnalysisHistory } from '@/lib/api/paast-analyzer'
import { Section } from './Section'
import {
  getTaskVideoScript,
  generateTaskVideoScript,
  updateTaskVideoScript,
  translateTaskVideoScript,
  getTaskContentApproval,
  requestTaskContentApproval,
  reviewTaskContentApproval,
  type VideoScript,
} from '@/lib/api/task-auto'
import type { TaskContentApproval, ContentTranslation } from '@/types/task-auto'

const PAAST_MIN_LENGTH = 100

const MARKET_LABEL: Record<string, string> = { VIETNAM: 'Việt Nam', INDONESIA: 'Indonesia', JAPAN: 'Nhật Bản', THAILAND: 'Thái Lan' }

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// Người dùng hay copy-paste content từ Word/Zalo/Facebook mang theo format xấu (nbsp, nhiều
// dòng trống, khoảng trắng thừa...) — dọn sạch phần vừa dán, chèn đúng vị trí con trỏ thay vì
// ghi đè cả ô, để không mất phần đang gõ dở trước/sau đoạn dán.
function handleCleanPaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  currentValue: string,
  setValue: (v: string) => void,
) {
  e.preventDefault()
  const cleaned = cleanContentText(e.clipboardData.getData('text/plain'))
  const el = e.currentTarget
  const start = el.selectionStart
  const end = el.selectionEnd
  setValue(currentValue.slice(0, start) + cleaned + currentValue.slice(end))
  requestAnimationFrame(() => {
    const pos = start + cleaned.length
    el.setSelectionRange(pos, pos)
  })
}

// Khớp logic phía AI service (task_script_service.py): market rỗng hoặc chỉ gồm VN/Vietnam thì không cần dịch.
function isForeignMarket(market?: string | null): boolean {
  if (!market) return false
  const parts = market.split(',').map(m => m.trim().toUpperCase()).filter(Boolean)
  if (parts.length === 0) return false
  return !parts.every(m => m === 'VIETNAM' || m === 'VN')
}

function isVNMarket(market?: string | null): boolean {
  if (!market) return true
  const v = market.trim().toUpperCase()
  return v === 'VIETNAM' || v === 'VN'
}

interface EditContentProps {
  contentId: string
  onChange: (id: string) => void
  items: { value: string; label: string; sublabel?: string }[]
  searchValue: string
  onSearchChange: (v: string) => void
  loading: boolean
  currentContentTitle?: string | null
  currentContentId?: string | null
  filterSlot?: React.ReactNode
}

interface ViewContentProps {
  contentTitle?: string | null
  contentMarket?: string | null
  contentLine?: string | null
  scriptText?: string | null
  fileUrl?: string | null
  voiceUrl?: string | null
}

interface Props {
  editMode: boolean
  edit: EditContentProps
  view: ViewContentProps
  taskId: string
  isAssignee?: boolean
  canApproveReject?: boolean
  productName?: string | null
  productSku?: string | null
  productPrice?: string | null
  productMaterial?: string | null
  productPriceSegment?: string | null
  productLine?: string | null
  productMarket?: string | null
  /** Thị trường của team đang xử lý task (Team.market) — dùng để gợi ý/dịch content nguồn (VN) sang đúng thị trường editor đang làm. */
  editorMarket?: string | null
  /** Bản dịch đã lưu sẵn ở tab Content (ContentTranslation) của content nguồn — chỉ có khi content lấy từ kho tổng. */
  sourceTranslations?: ContentTranslation[]
  /** Báo cho parent (TaskDetailPanel) biết còn thay đổi chưa lưu — để chặn đóng panel mất dữ liệu. */
  onDirtyChange?: (dirty: boolean) => void
}

export function ContentSection({
  editMode, edit, view, taskId, isAssignee, canApproveReject,
  productName, productSku, productPrice, productMaterial, productPriceSegment, productLine, productMarket,
  editorMarket, sourceTranslations,
  onDirtyChange,
}: Props) {
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [filePreviewOpen, setFilePreviewOpen] = useState(false)

  // ── Content sau chỉnh sửa (duyệt / viết lại / dịch / chấm điểm) — gộp từ VideoScriptSection.tsx ──
  const [script, setScript] = useState<VideoScript | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedContent, setCopiedContent] = useState(false)
  const [copiedTranslation, setCopiedTranslation] = useState(false)
  const [rewriteMode, setRewriteMode] = useState(false)

  // Bản nháp đang sửa trên UI — chỉ đồng bộ với `script` khi script thực sự đổi
  // (load lần đầu, sinh/sinh lại, lưu, hoặc dịch lại), không phải mỗi lần gõ phím.
  const [editedContent, setEditedContent] = useState('')
  const [editedHashtags, setEditedHashtags] = useState<string[]>([])
  const [editedTranslationContent, setEditedTranslationContent] = useState('')
  const [editedTranslationHashtags, setEditedTranslationHashtags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)

  // Yêu cầu duyệt content (editor gửi → leader/admin/manager duyệt) — xem tasks.controller.ts content-approval
  const [approval, setApproval] = useState<TaskContentApproval | null>(null)
  const [requestingApproval, setRequestingApproval] = useState(false)
  const [reviewing, setReviewing] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Chấm điểm PAAST — công cụ học hỏi/cải thiện, mọi role đều dùng được, không phải bước duyệt.
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [scoreCache, setScoreCache] = useState<{ content: string; result: PaastAnalysisHistory } | null>(null)

  // Tạo voice nhanh từ content hiện tại (tái dùng TTS Minimax của Tiện ích → Clone Voice) — chỉ
  // tạo để nghe/tải tại chỗ, không lưu lại vào task.
  const [showVoiceModal, setShowVoiceModal] = useState(false)

  // "Sinh lại" ghi đè toàn bộ ô content — hỏi lại nếu đang có sửa tay chưa lưu để tránh mất trắng.
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  // "Dùng bản dịch này" (từ tab Content) ghi đè toàn bộ ô content — hỏi lại nếu đang có sửa tay chưa lưu.
  const [showApplyTranslationConfirm, setShowApplyTranslationConfirm] = useState(false)
  // Bản dịch có sẵn ở tab Content — mặc định rút gọn, cho "Xem thêm" để đọc hết trước khi quyết định dùng.
  const [translationPreviewExpanded, setTranslationPreviewExpanded] = useState(false)

  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const translationTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const rejectReasonRef = useRef<HTMLTextAreaElement | null>(null)
  // true khi người dùng đã tự gõ tay — chặn không cho pre-fill mặc định ghi đè lên bản đang gõ dở.
  const userTouchedRef = useRef(false)

  // Content mặc định gắn với task = script gốc (view.scriptText). Nếu task chưa từng lưu bản viết lại
  // (`script` null), hiển thị + cho gửi duyệt luôn bằng nội dung mặc định này — không bắt buộc phải
  // copy sang rồi mới gửi được.
  useEffect(() => {
    if (script) {
      setEditedContent(script.content)
      setEditedHashtags(script.hashtags)
      userTouchedRef.current = false
    } else if (!userTouchedRef.current) {
      setEditedContent(view.scriptText ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, view.scriptText])

  useEffect(() => {
    setEditedTranslationContent(script?.translation?.content ?? '')
    setEditedTranslationHashtags(script?.translation?.hashtags ?? [])
  }, [script])

  // Co giãn textarea theo nội dung — chạy lại cả khi gõ tay lẫn khi content được nạp/sinh AI/dịch.
  useEffect(() => { autoResize(contentTextareaRef.current) }, [editedContent, rewriteMode])
  useEffect(() => { autoResize(translationTextareaRef.current) }, [editedTranslationContent])
  useEffect(() => { autoResize(rejectReasonRef.current) }, [rejectReason, showRejectInput])

  // So với baseline hiện có (bản đã lưu, hoặc mặc định = script gốc nếu chưa từng lưu) — không phải
  // so với '' — để tránh báo "Chưa lưu" ngay khi vừa mở task mới chưa ai đụng vào.
  const baselineContent = script?.content ?? view.scriptText ?? ''
  const contentDirty =
    editedContent !== baselineContent || !arraysEqual(editedHashtags, script?.hashtags ?? [])
  const translationDirty = !!script?.translation && (
    editedTranslationContent !== script.translation.content ||
    !arraysEqual(editedTranslationHashtags, script.translation.hashtags)
  )
  const dirty = contentDirty || translationDirty

  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

  // Nạp content AI đã cache cho task này (nếu có) — không tốn token vì không gọi lại DeepSeek
  useEffect(() => {
    let cancelled = false
    getTaskVideoScript(taskId)
      .then(cached => { if (!cancelled && cached) setScript(cached) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [taskId])

  useEffect(() => {
    let cancelled = false
    getTaskContentApproval(taskId)
      .then(current => { if (!cancelled) setApproval(current) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [taskId])

  async function persistEdits(withTranslation: boolean) {
    const result = await updateTaskVideoScript(taskId, {
      content: editedContent,
      hashtags: editedHashtags,
      ...(withTranslation && translationDirty
        ? { translation: { content: editedTranslationContent, hashtags: editedTranslationHashtags } }
        : {}),
    })
    setScript(result)
    return result
  }

  async function handleRequestApproval() {
    setRequestingApproval(true)
    setError(null)
    try {
      // Chưa từng lưu (content mặc định) hoặc đang có sửa dở — tự lưu trước rồi gửi luôn,
      // không bắt người dùng phải bấm Lưu riêng trước khi gửi duyệt.
      if (dirty || !script) await persistEdits(true)
      const result = await requestTaskContentApproval(taskId)
      setApproval(result)
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Không thể gửi yêu cầu duyệt')
    } finally {
      setRequestingApproval(false)
    }
  }

  async function handleReview(action: 'APPROVED' | 'REJECTED') {
    if (!approval) return
    setReviewing(action)
    setError(null)
    try {
      const result = await reviewTaskContentApproval(
        approval.id, action, action === 'REJECTED' ? rejectReason.trim() || undefined : undefined,
      )
      setApproval(result)
      setShowRejectInput(false)
      setRejectReason('')
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Thao tác thất bại')
    } finally {
      setReviewing(null)
    }
  }

  async function generate(force = false) {
    setLoading(true)
    setError(null)
    try {
      const { script: result } = await generateTaskVideoScript(taskId, {
        fileUrl:            view.fileUrl,
        scriptText:         view.scriptText,
        contentTitle:       view.contentTitle,
        contentLine:        view.contentLine,
        contentMarket:      view.contentMarket,
        productName,
        productSku,
        productPrice,
        productMaterial,
        productPriceSegment,
        productLine,
        productMarket,
      }, force)
      setScript(result)
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  // "Sinh content AI" lần đầu (chưa có gì để mất) chạy thẳng; "Sinh lại" khi đang có sửa tay
  // chưa lưu (dirty) phải hỏi lại trước vì generate() sẽ ghi đè editedContent qua effect đồng bộ script.
  function handleGenerateClick() {
    if (script && dirty) { setShowRegenConfirm(true); return }
    generate(!!script)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    // Chỉ tự động dịch lại bằng AI nếu content đổi mà bản dịch KHÔNG được người dùng tự sửa tay
    // (tránh ghi đè lên bản dịch họ vừa chỉnh thủ công).
    const shouldAutoTranslate = contentDirty && !!script?.translation && !translationDirty
    try {
      await persistEdits(true)
      if (shouldAutoTranslate) {
        setTranslating(true)
        try {
          const translated = await translateTaskVideoScript(taskId, targetMarket)
          setScript(translated)
        } finally {
          setTranslating(false)
        }
      }
      setRewriteMode(false)
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Có lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  function onContentPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    userTouchedRef.current = true
    handleCleanPaste(e, editedContent, setEditedContent)
  }

  function onTranslationPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    handleCleanPaste(e, editedTranslationContent, setEditedTranslationContent)
  }

  function formatContent() {
    userTouchedRef.current = true
    setEditedContent(prev => cleanContentText(prev))
  }

  function cancelRewrite() {
    setEditedContent(baselineContent)
    setEditedHashtags(script?.hashtags ?? [])
    userTouchedRef.current = false
    setRewriteMode(false)
  }

  async function handleTranslate() {
    setTranslating(true)
    setError(null)
    try {
      if (contentDirty || !script) await persistEdits(false)
      const result = await translateTaskVideoScript(taskId, targetMarket)
      setScript(result)
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Có lỗi khi dịch')
    } finally {
      setTranslating(false)
    }
  }

  function removeHashtag(tag: string) {
    setEditedHashtags(prev => prev.filter(t => t !== tag))
  }

  function removeTranslationHashtag(tag: string) {
    setEditedTranslationHashtags(prev => prev.filter(t => t !== tag))
  }

  function copyContent() {
    if (!editedContent && editedHashtags.length === 0) return
    const parts = [editedContent, '', `#️⃣ ${editedHashtags.join(' ')}`]
    navigator.clipboard.writeText(parts.join('\n'))
    setCopiedContent(true)
    setTimeout(() => setCopiedContent(false), 2000)
  }

  function copyTranslation() {
    if (!script?.translation) return
    const parts = [editedTranslationContent, '', `#️⃣ ${editedTranslationHashtags.join(' ')}`]
    navigator.clipboard.writeText(parts.join('\n'))
    setCopiedTranslation(true)
    setTimeout(() => setCopiedTranslation(false), 2000)
  }

  const hasContent = !!(view.contentTitle || view.scriptText || view.fileUrl)
  const hasProduct = !!productName
  const canGenerate = hasContent && hasProduct
  // Ưu tiên market gắn thẳng vào content/sản phẩm nếu là thị trường nước ngoài (content/sản phẩm
  // được gắn nhãn rõ cho thị trường đó); nếu cả hai đều trống hoặc là VN (vd. content lấy từ kho
  // tổng vốn mặc định VIETNAM) thì rơi về market của team đang xử lý task (editorMarket) — đây là
  // trường hợp editor ở thị trường khác đang dùng content gốc tiếng Việt, vẫn cần dịch.
  const targetMarket = !isVNMarket(view.contentMarket) ? view.contentMarket
    : !isVNMarket(productMarket) ? productMarket
    : !isVNMarket(editorMarket) ? editorMarket
    : (view.contentMarket || productMarket || editorMarket || null)
  const foreignMarket = isForeignMarket(targetMarket)
  const canSubmitApproval = isAssignee && (!approval || approval.status === 'REJECTED')

  // Content nguồn (kho tổng) là tiếng Việt nhưng editor đang làm task cho thị trường khác —
  // gợi ý dùng bản dịch đã có sẵn ở tab Content (ContentTranslation) thay vì dịch AI lại từ đầu.
  const needsEditorMarketTranslation = !isVNMarket(editorMarket) && isVNMarket(view.contentMarket)
  const savedMarketTranslation = needsEditorMarketTranslation
    ? sourceTranslations?.find(t => t.market === editorMarket && (t.body || t.script || t.title))
    : undefined

  function applySavedTranslation() {
    if (!savedMarketTranslation) return
    userTouchedRef.current = true
    setRewriteMode(true)
    setEditedContent(savedMarketTranslation.body || savedMarketTranslation.script || '')
  }

  function handleApplySavedTranslationClick() {
    if (dirty) { setShowApplyTranslationConfirm(true); return }
    applySavedTranslation()
  }

  return (
    <Section icon={<FileText className="w-4 h-4" />} title="Nội dung" bgColor="bg-indigo-50" iconColor="text-indigo-600">
      {editMode ? (
        <div className="p-4">
          <ServerSearchSelect
            label="Script / Content"
            value={edit.contentId}
            onChange={edit.onChange}
            items={edit.items}
            searchValue={edit.searchValue}
            onSearchChange={edit.onSearchChange}
            loading={edit.loading}
            placeholder="Tìm content..."
            clearLabel="-- Không chọn --"
            searchPlaceholder="Tìm theo tiêu đề..."
            filterSlot={edit.filterSlot}
          />
          {edit.contentId && edit.contentId === edit.currentContentId && edit.currentContentTitle && (
            <p className="mt-2 text-xs text-slate-400 pl-1">
              Hiện tại: <span className="font-medium text-slate-600">{edit.currentContentTitle}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div>
            <p className="text-base font-bold text-gray-900 leading-snug">
              {view.contentTitle || <span className="text-gray-400 font-normal italic">Chưa có tiêu đề</span>}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {view.contentMarket && (
                <span className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
                  view.contentMarket === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
                )}>
                  {view.contentMarket}
                </span>
              )}
              {view.contentLine && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {view.contentLine}
                </span>
              )}
            </div>
          </div>

          {/* Content nguồn tiếng Việt (kho tổng) nhưng editor đang làm cho thị trường khác — nếu tab
              Content đã có sẵn bản dịch cho đúng thị trường này, gợi ý dùng luôn thay vì dịch AI lại. */}
          {needsEditorMarketTranslation && savedMarketTranslation && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">
                    Đã có bản dịch {MARKET_LABEL[editorMarket!] ?? editorMarket} cho content này trong tab Content
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplySavedTranslationClick}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0"
                >
                  Dùng bản dịch này
                </button>
              </div>
              {(savedMarketTranslation.body || savedMarketTranslation.script) && (
                <>
                  <p className={cn(
                    'text-sm text-emerald-900 whitespace-pre-wrap leading-relaxed',
                    !translationPreviewExpanded && 'line-clamp-2',
                  )}>
                    {savedMarketTranslation.body || savedMarketTranslation.script}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTranslationPreviewExpanded(v => !v)}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
                  >
                    {translationPreviewExpanded
                      ? <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</>
                      : <><ChevronDown className="w-3.5 h-3.5" /> Xem thêm</>
                    }
                  </button>
                </>
              )}
            </div>
          )}

          {/* Thanh hành động: gửi duyệt / lưu / chấm điểm / dịch / copy / viết lại */}
          <div className="flex items-center gap-2 flex-wrap">
            {canSubmitApproval && (
              <button
                type="button"
                onClick={handleRequestApproval}
                disabled={requestingApproval || saving || !editedContent.trim()}
                title={!editedContent.trim() ? 'Cần có content trước khi gửi duyệt' : undefined}
                className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white transition-colors"
              >
                {requestingApproval
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
                  : <><Send className="w-4 h-4" /> {approval?.status === 'REJECTED' ? 'Gửi lại yêu cầu duyệt' : 'Gửi yêu cầu duyệt content'}</>
                }
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className={cn(
                'flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors',
                dirty && !saving
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...</>
                : <><Save className="w-3.5 h-3.5" /> Lưu</>
              }
            </button>
            <button
              type="button"
              onClick={() => setShowScoreModal(true)}
              disabled={editedContent.trim().length < PAAST_MIN_LENGTH}
              title={editedContent.trim().length < PAAST_MIN_LENGTH ? `Cần ít nhất ${PAAST_MIN_LENGTH} ký tự để chấm điểm` : undefined}
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors',
                editedContent.trim().length >= PAAST_MIN_LENGTH
                  ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed',
              )}
            >
              <Gauge className="w-3.5 h-3.5" /> Chấm điểm content
            </button>
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              disabled={!editedContent.trim()}
              title={!editedContent.trim() ? 'Cần có content để tạo voice' : undefined}
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors',
                editedContent.trim()
                  ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed',
              )}
            >
              <AudioLines className="w-3.5 h-3.5" /> Tạo voice
            </button>
            {(foreignMarket || script?.translation) && (
              <button
                type="button"
                onClick={handleTranslate}
                disabled={translating || !editedContent.trim()}
                title={targetMarket ? `Thị trường: ${targetMarket}` : undefined}
                className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 disabled:opacity-50 transition-colors"
              >
                {translating
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang dịch...</>
                  : <><Languages className="w-3.5 h-3.5" /> {script?.translation ? 'Dịch lại' : 'Dịch'}</>
                }
              </button>
            )}
            {(editedContent || editedHashtags.length > 0) && (
              <button
                type="button"
                onClick={copyContent}
                className={cn(
                  'flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors',
                  copiedContent
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {copiedContent ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedContent ? 'Đã copy' : 'Copy'}
              </button>
            )}
            {!rewriteMode && (
              <button
                type="button"
                onClick={() => setRewriteMode(true)}
                className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <PenLine className="w-3.5 h-3.5" /> Viết lại content
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Trạng thái duyệt content */}
          {approval?.status === 'PENDING' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Đang chờ duyệt</p>
                  <p className="text-sm text-amber-800 mt-0.5">Yêu cầu duyệt content đã được gửi, đang chờ leader xác nhận.</p>
                </div>
              </div>
              {canApproveReject && !showRejectInput && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReview('APPROVED')}
                    disabled={!!reviewing}
                    className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
                  >
                    {reviewing === 'APPROVED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(true)}
                    disabled={!!reviewing}
                    className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Từ chối
                  </button>
                </div>
              )}
              {canApproveReject && showRejectInput && (
                <div className="w-full space-y-2 pt-1">
                  <textarea
                    ref={rejectReasonRef}
                    autoFocus
                    rows={2}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Lý do từ chối (tuỳ chọn)..."
                    className="w-full text-sm bg-white border border-red-200 rounded-lg px-3 py-2 resize-none overflow-y-auto max-h-[200px] focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview('REJECTED')}
                      disabled={!!reviewing}
                      className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors shrink-0"
                    >
                      {reviewing === 'REJECTED' && <Loader2 className="w-4 h-4 animate-spin" />} Xác nhận từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowRejectInput(false); setRejectReason('') }}
                      className="text-sm font-semibold px-3.5 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {approval?.status === 'APPROVED' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Đã duyệt</p>
                <p className="text-sm text-emerald-800 mt-0.5">
                  Content đã được{approval.reviewed_by?.full_name ? ` ${approval.reviewed_by.full_name}` : ''} duyệt
                  {approval.reviewed_at ? ` · ${new Date(approval.reviewed_at).toLocaleDateString('vi-VN')}` : ''}.
                </p>
              </div>
            </div>
          )}

          {approval?.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-3">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Content bị từ chối</p>
                <p className="text-sm text-red-800 mt-0.5">{approval.reject_reason || 'Không có lý do cụ thể.'}</p>
              </div>
            </div>
          )}

          {!approval && isAssignee && (
            <p className="text-sm text-gray-400">Content này chưa được gửi duyệt.</p>
          )}

          {/* Script / Content — xem tại chỗ hoặc viết lại tại chỗ */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-medium text-gray-400">Script / Nội dung</p>
              {dirty && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Chưa lưu
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2 animate-pulse bg-gray-50 rounded-xl px-4 py-3">
                <div className="h-4 bg-indigo-100 rounded-lg w-3/4" />
                <div className="h-4 bg-indigo-100 rounded-lg w-full" />
                <div className="h-4 bg-indigo-100 rounded-lg w-2/3" />
              </div>
            ) : !rewriteMode ? (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {editedContent || <span className="text-gray-400 italic">Chưa có content — bấm "Viết lại content" để tự gõ, hoặc để AI sinh giúp.</span>}
                </p>
                {editedHashtags.length > 0 && (
                  <div className="flex items-center flex-wrap gap-2 pt-3">
                    <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest shrink-0">Hashtag gợi ý</span>
                    {editedHashtags.map((tag, i) => (
                      <span key={`${tag}-${i}`} className="text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-3">
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleGenerateClick}
                    disabled={!canGenerate || loading}
                    className={cn(
                      'flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors',
                      canGenerate && !loading
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                    )}
                    title={!canGenerate ? "Cần có đủ thông tin nội dung và sản phẩm để dùng 'Sinh content AI'" : undefined}
                  >
                    {loading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang sinh...</>
                      : <><Sparkles className="w-3.5 h-3.5" /> {script ? 'Sinh lại' : 'Sinh content AI'}</>
                    }
                  </button>
                  <button
                    type="button"
                    onClick={formatContent}
                    disabled={!editedContent.trim()}
                    title="Dọn khoảng trắng/dòng trống thừa do copy-paste, không đổi nội dung chữ"
                    className={cn(
                      'flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors',
                      editedContent.trim()
                        ? 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed',
                    )}
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Định dạng lại
                  </button>
                  <button
                    type="button"
                    onClick={cancelRewrite}
                    className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Huỷ
                  </button>
                </div>
                <textarea
                  ref={contentTextareaRef}
                  value={editedContent}
                  onChange={e => { userTouchedRef.current = true; setEditedContent(e.target.value) }}
                  onPaste={onContentPaste}
                  rows={5}
                  autoFocus
                  placeholder="Gõ content tại đây, hoặc bấm 'Sinh content AI' để AI viết giúp..."
                  className="w-full min-h-[120px] text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-3 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                />
                {editedHashtags.length > 0 && (
                  <div className="flex items-center flex-wrap gap-2 pt-1">
                    <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest shrink-0">Hashtag gợi ý</span>
                    {editedHashtags.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="flex items-center gap-1 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 pl-3 pr-1.5 py-1 rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          className="text-indigo-400 hover:text-indigo-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {(view.fileUrl || view.voiceUrl) && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {view.fileUrl && (
                  <button
                    onClick={() => setFilePreviewOpen(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-lg transition-colors">
                    <Link2 className="w-3.5 h-3.5 text-indigo-500" /> Xem File Content
                  </button>
                )}
                {view.voiceUrl && (
                  <>
                    <button
                      onClick={() => setVoiceOpen(v => !v)}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-sm font-medium border px-3.5 py-2 rounded-lg transition-colors',
                        voiceOpen
                          ? 'bg-purple-50 border-purple-200 text-purple-700'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                      )}>
                      <Mic className="w-3.5 h-3.5 text-purple-500" />
                      {voiceOpen ? 'Đóng player' : 'Nghe voice'}
                      {voiceOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <a href={view.voiceUrl} download
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5 text-gray-500" /> Tải voice
                    </a>
                  </>
                )}
              </div>

              {voiceOpen && view.voiceUrl && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Voice Preview</p>
                  <iframe
                    src={drivePreviewUrl(view.voiceUrl) ?? view.voiceUrl}
                    className="w-full rounded-lg border-0 items-center"
                    style={{ height: '60px' }}
                    allow="autoplay"
                    title="Voice Preview"
                  />
                </div>
              )}
            </div>
          )}

          {filePreviewOpen && view.fileUrl && (
            <div className="fixed inset-0 z-[1010] flex flex-col bg-black/80" onClick={() => setFilePreviewOpen(false)}>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-900 shrink-0" onClick={e => e.stopPropagation()}>
                <p className="text-sm font-semibold text-white truncate">File Content Preview</p>
                <div className="flex items-center gap-2">
                  <a href={view.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button type="button" onClick={() => setFilePreviewOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                <iframe
                  src={drivePreviewUrl(view.fileUrl) ?? view.fileUrl}
                  className="w-full h-full border-0"
                  title="File Content Preview"
                  allow="autoplay"
                />
              </div>
            </div>
          )}

          {/* Bản dịch — editable, luôn hiện nếu đã có translation; có thể sửa tay hoặc bấm "Dịch lại" ở thanh hành động */}
          {script?.translation && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-sky-500 uppercase tracking-widest flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5" /> Bản dịch — {script.translation.language}
                  </p>
                  {translationDirty && (
                    <span className="text-[11px] font-semibold text-amber-600">Chưa lưu</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={copyTranslation}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                    copiedTranslation
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-white/70 border-sky-200 text-sky-600 hover:bg-white',
                  )}
                >
                  {copiedTranslation ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedTranslation ? 'Đã copy' : 'Copy'}
                </button>
              </div>
              <textarea
                ref={translationTextareaRef}
                value={editedTranslationContent}
                onChange={e => setEditedTranslationContent(e.target.value)}
                onPaste={onTranslationPaste}
                rows={3}
                className="w-full text-sm text-sky-900 leading-relaxed whitespace-pre-line bg-white/70 border border-sky-200 rounded-lg px-3 py-2 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              {editedTranslationHashtags.length > 0 && (
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-sky-400 uppercase tracking-widest shrink-0">Hashtag gợi ý</span>
                  {editedTranslationHashtags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="flex items-center gap-1 text-sm font-medium text-sky-700 bg-white border border-sky-200 pl-3 pr-1.5 py-1 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTranslationHashtag(tag)}
                        className="text-sky-400 hover:text-sky-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <PaastScoreModal
        open={showScoreModal}
        content={editedContent}
        onClose={() => setShowScoreModal(false)}
        cachedResult={scoreCache?.content === editedContent ? scoreCache.result : null}
        onAnalyzed={result => setScoreCache({ content: editedContent, result })}
        onApply={(upgradedContent, result) => {
          // Đưa bản nâng cấp vào content như 1 lần sửa tay — vẫn cần bấm "Lưu" để lưu thật sự.
          userTouchedRef.current = true
          setRewriteMode(true)
          setEditedContent(upgradedContent)
          setScoreCache({ content: upgradedContent, result })
        }}
      />

      <TtsVoiceModal
        open={showVoiceModal}
        content={editedContent}
        onClose={() => setShowVoiceModal(false)}
      />

      <ConfirmDialog
        open={showRegenConfirm}
        title="Sinh lại content bằng AI?"
        message="Bạn đang có nội dung sửa tay chưa lưu. Sinh lại sẽ ghi đè toàn bộ nội dung đang gõ và không thể hoàn tác."
        confirmLabel="Sinh lại, ghi đè"
        danger
        onConfirm={() => { setShowRegenConfirm(false); generate(true) }}
        onCancel={() => setShowRegenConfirm(false)}
      />

      <ConfirmDialog
        open={showApplyTranslationConfirm}
        title="Dùng bản dịch có sẵn?"
        message="Bạn đang có nội dung sửa tay chưa lưu. Áp dụng bản dịch từ tab Content sẽ ghi đè toàn bộ nội dung đang gõ và không thể hoàn tác."
        confirmLabel="Dùng bản dịch, ghi đè"
        danger
        onConfirm={() => { setShowApplyTranslationConfirm(false); applySavedTranslation() }}
        onCancel={() => setShowApplyTranslationConfirm(false)}
      />
    </Section>
  )
}
