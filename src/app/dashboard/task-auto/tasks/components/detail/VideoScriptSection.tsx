'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp, Hash, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Section } from './Section'
import { getTaskVideoScript, generateTaskVideoScript, type VideoScript } from '@/lib/api/task-auto'

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
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

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
    setOpen(true)
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

  function copyAll() {
    if (!script) return
    const parts = [
      script.content,
      '',
      `#️⃣ ${script.hashtags.join(' ')}`,
    ]
    if (script.translation) {
      parts.push(
        '',
        `— Bản dịch (${script.translation.language}) —`,
        script.translation.content,
        '',
        `#️⃣ ${script.translation.hashtags.join(' ')}`,
      )
    }
    navigator.clipboard.writeText(parts.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasContent = !!(props.contentTitle || props.scriptText || props.fileUrl)
  const hasProduct = !!props.productName
  const canGenerate = hasContent && hasProduct

  return (
    <Section
      icon={<Sparkles className="w-4 h-4" />}
      title="Content AI"
      bgColor="bg-violet-50"
      iconColor="text-violet-600"
    >
      <div className="p-4 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {!canGenerate && (
            <p className="text-xs text-gray-400 italic flex-1">
              Cần có đủ thông tin nội dung và sản phẩm để sinh content.
            </p>
          )}
          {canGenerate && !script && !loading && (
            <p className="text-xs text-gray-400 flex-1">
              {props.fileUrl
                ? 'AI sẽ đọc file đính kèm (content đã win) và áp dụng cho sản phẩm này.'
                : 'AI sẽ dùng script gốc (đã win) và áp dụng cho sản phẩm này.'}
            </p>
          )}
          {script && (
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 flex-1"
            >
              {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {open ? 'Thu gọn' : 'Xem content'}
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {script && (
              <button
                type="button"
                onClick={copyAll}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                  copied
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100',
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã copy' : 'Copy'}
              </button>
            )}
            <button
              type="button"
              onClick={() => generate(!!script)}
              disabled={!canGenerate || loading}
              className={cn(
                'flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors',
                canGenerate && !loading
                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang sinh...</>
                : <><Sparkles className="w-3.5 h-3.5" /> {script ? 'Sinh lại' : 'Sinh content'}</>
              }
            </button>
          </div>
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

        {/* Result */}
        {script && open && !loading && (
          <div className="space-y-3">

            {/* Content */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-4">
              <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-2">
                Content
              </p>
              <p className="text-sm text-violet-900 leading-relaxed whitespace-pre-line">{script.content}</p>
            </div>

            {/* Hashtags */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Hashtags
              </p>
              <div className="flex flex-wrap gap-2">
                {script.hashtags.map((tag, i) => (
                  <span key={i} className="text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Translation */}
            {script.translation && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-4 space-y-3">
                <p className="text-xs font-bold text-sky-500 uppercase tracking-widest flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" /> Bản dịch — {script.translation.language}
                </p>
                <p className="text-sm text-sky-900 leading-relaxed whitespace-pre-line">{script.translation.content}</p>
                <div className="flex flex-wrap gap-2">
                  {script.translation.hashtags.map((tag, i) => (
                    <span key={i} className="text-sm font-medium text-sky-700 bg-white border border-sky-200 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}
