'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, Loader2, Copy, Check, Languages, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Section } from './Section'
import {
  getTaskVideoScript,
  generateTaskVideoScript,
  updateTaskVideoScript,
  translateTaskVideoScript,
  type VideoScript,
} from '@/lib/api/task-auto'

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// Khớp logic phía AI service (task_script_service.py): market rỗng hoặc chỉ gồm VN/Vietnam thì không cần dịch.
function isForeignMarket(market?: string | null): boolean {
  if (!market) return false
  const parts = market.split(',').map(m => m.trim().toUpperCase()).filter(Boolean)
  if (parts.length === 0) return false
  return !parts.every(m => m === 'VIETNAM' || m === 'VN')
}

export interface VideoScriptSectionProps {
  taskId: string
  fileUrl?: string | null
  scriptText?: string | null
  contentTitle?: string | null
  contentLine?: string | null
  contentMarket?: string | null
  productName?: string | null
  productSku?: string | null
  productPrice?: string | null
  productMaterial?: string | null
  productPriceSegment?: string | null
  productLine?: string | null
  productMarket?: string | null
}

export function VideoScriptSection(props: VideoScriptSectionProps) {
  const [script, setScript] = useState<VideoScript | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedContent, setCopiedContent] = useState(false)
  const [copiedTranslation, setCopiedTranslation] = useState(false)

  // Bản nháp đang sửa trên UI — chỉ đồng bộ với `script` khi script thực sự đổi
  // (load lần đầu, sinh/sinh lại, lưu, hoặc dịch lại), không phải mỗi lần gõ phím.
  const [editedContent, setEditedContent] = useState('')
  const [editedHashtags, setEditedHashtags] = useState<string[]>([])
  const [editedTranslationContent, setEditedTranslationContent] = useState('')
  const [editedTranslationHashtags, setEditedTranslationHashtags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)

  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const translationTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    setEditedContent(script?.content ?? '')
    setEditedHashtags(script?.hashtags ?? [])
    setEditedTranslationContent(script?.translation?.content ?? '')
    setEditedTranslationHashtags(script?.translation?.hashtags ?? [])
  }, [script])

  // Co giãn textarea theo nội dung — chạy lại cả khi gõ tay lẫn khi content được nạp/sinh AI/dịch.
  useEffect(() => { autoResize(contentTextareaRef.current) }, [editedContent])
  useEffect(() => { autoResize(translationTextareaRef.current) }, [editedTranslationContent])

  // Không gate theo `!!script` — người dùng có thể gõ tay content từ đầu, chưa từng sinh AI lần nào.
  const contentDirty =
    editedContent !== (script?.content ?? '') || !arraysEqual(editedHashtags, script?.hashtags ?? [])
  const translationDirty = !!script?.translation && (
    editedTranslationContent !== script.translation.content ||
    !arraysEqual(editedTranslationHashtags, script.translation.hashtags)
  )
  const dirty = contentDirty || translationDirty

  // Nạp content AI đã cache cho task này (nếu có) — không tốn token vì không gọi lại DeepSeek
  useEffect(() => {
    let cancelled = false
    getTaskVideoScript(props.taskId)
      .then(cached => { if (!cancelled && cached) setScript(cached) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [props.taskId])

  async function generate(force = false) {
    setLoading(true)
    setError(null)
    try {
      const { script: result } = await generateTaskVideoScript(props.taskId, {
        fileUrl:            props.fileUrl,
        scriptText:         props.scriptText,
        contentTitle:       props.contentTitle,
        contentLine:        props.contentLine,
        contentMarket:      props.contentMarket,
        productName:        props.productName,
        productSku:         props.productSku,
        productPrice:       props.productPrice,
        productMaterial:    props.productMaterial,
        productPriceSegment: props.productPriceSegment,
        productLine:        props.productLine,
        productMarket:      props.productMarket,
      }, force)
      setScript(result)
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  // withTranslation=false: dùng khi sắp gọi AI dịch đè lên ngay sau đó (vd nút "Dịch lại"),
  // nên không cần gửi bản dịch tay đang dở lên trước.
  async function persistEdits(withTranslation: boolean) {
    const result = await updateTaskVideoScript(props.taskId, {
      content: editedContent,
      hashtags: editedHashtags,
      ...(withTranslation && translationDirty
        ? { translation: { content: editedTranslationContent, hashtags: editedTranslationHashtags } }
        : {}),
    })
    setScript(result)
    return result
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
          const translated = await translateTaskVideoScript(props.taskId, targetMarket)
          setScript(translated)
        } finally {
          setTranslating(false)
        }
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Có lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  async function handleTranslate() {
    setTranslating(true)
    setError(null)
    try {
      if (contentDirty) await persistEdits(false)
      const result = await translateTaskVideoScript(props.taskId, targetMarket)
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

  const hasContent = !!(props.contentTitle || props.scriptText || props.fileUrl)
  const hasProduct = !!props.productName
  const canGenerate = hasContent && hasProduct
  const targetMarket = props.contentMarket || props.productMarket || null
  const foreignMarket = isForeignMarket(targetMarket)

  return (
    <Section
      icon={<Sparkles className="w-4 h-4" />}
      title="Content sau chỉnh sửa"
      bgColor="bg-violet-50"
      iconColor="text-violet-600"
    >
      <div className="p-4 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {!canGenerate && (
            <p className="text-xs text-gray-400 italic flex-1">
              Cần có đủ thông tin nội dung và sản phẩm để dùng nút Sinh content AI (vẫn có thể tự gõ tay content bên dưới).
            </p>
          )}
          {canGenerate && !script && !loading && (
            <p className="text-xs text-gray-400 flex-1">
              {props.fileUrl
                ? 'AI sẽ đọc file đính kèm (content đã win) và áp dụng cho sản phẩm này — hoặc bạn tự gõ tay bên dưới.'
                : 'AI sẽ dùng script gốc (đã win) và áp dụng cho sản phẩm này — hoặc bạn tự gõ tay bên dưới.'}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-violet-100 rounded-lg w-3/4" />
            <div className="h-4 bg-violet-100 rounded-lg w-full" />
            <div className="h-4 bg-violet-100 rounded-lg w-5/6" />
            <div className="h-4 bg-violet-100 rounded-lg w-2/3" />
          </div>
        )}

        {/* Content sau chỉnh sửa — luôn hiển thị để gõ tay, không cần chờ sinh AI trước */}
        {!loading && (
          <div className="space-y-3">

            {/* Content + Hashtags (editable) */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                    Content
                  </p>
                  {contentDirty && (
                    <span className="text-[11px] font-semibold text-amber-600">Chưa lưu</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors',
                      dirty && !saving
                        ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed',
                    )}
                  >
                    {saving
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...</>
                      : <><Save className="w-3.5 h-3.5" /> Lưu</>
                    }
                  </button>
                  {(editedContent || editedHashtags.length > 0) && (
                    <button
                      type="button"
                      onClick={copyContent}
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                        copiedContent
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-white/70 border-violet-200 text-violet-600 hover:bg-white',
                      )}
                    >
                      {copiedContent ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedContent ? 'Đã copy' : 'Copy'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => generate(!!script)}
                    disabled={!canGenerate || loading}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                      canGenerate && !loading
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                    )}
                  >
                    {loading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang sinh...</>
                      : <><Sparkles className="w-3.5 h-3.5" /> {script ? 'Sinh lại' : 'Sinh content AI'}</>
                    }
                  </button>
                </div>
              </div>
              <textarea
                ref={contentTextareaRef}
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                rows={3}
                placeholder="Gõ content tại đây, hoặc bấm 'Sinh content AI' để AI viết giúp..."
                className="w-full text-sm text-violet-900 leading-relaxed whitespace-pre-line bg-white/70 border border-violet-200 rounded-lg px-3 py-2 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              {editedHashtags.length > 0 && (
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-violet-400 uppercase tracking-widest shrink-0">Hashtag gợi ý</span>
                  {editedHashtags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="flex items-center gap-1 text-sm font-medium text-violet-700 bg-white border border-violet-200 pl-3 pr-1.5 py-1 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="text-violet-400 hover:text-violet-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Thị trường nước ngoài nhưng chưa từng dịch lần nào — cho bấm "Dịch" để AI tự xác định ngôn ngữ */}
            {foreignMarket && !script?.translation && (
              <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                <p className="text-xs text-sky-700">
                  Thị trường mục tiêu {targetMarket ? `(${targetMarket})` : ''} không phải Việt Nam — có thể dịch content sang ngôn ngữ phù hợp.
                </p>
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={translating || !editedContent.trim()}
                  className="flex items-center gap-1.5 shrink-0 ml-3 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:bg-gray-200 disabled:text-gray-400 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {translating
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang dịch...</>
                    : <><Languages className="w-3.5 h-3.5" /> Dịch</>
                  }
                </button>
              </div>
            )}

            {/* Translation (editable — có thể sửa tay hoặc bấm "Dịch lại" để AI dịch lại theo content mới) */}
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
                  <div className="flex items-center gap-2 shrink-0">
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
                    <button
                      type="button"
                      onClick={handleTranslate}
                      disabled={translating}
                      className="flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 disabled:opacity-50"
                    >
                      {translating
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang dịch...</>
                        : <><Languages className="w-3.5 h-3.5" /> Dịch lại</>
                      }
                    </button>
                  </div>
                </div>
                <textarea
                  ref={translationTextareaRef}
                  value={editedTranslationContent}
                  onChange={e => setEditedTranslationContent(e.target.value)}
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
      </div>
    </Section>
  )
}
