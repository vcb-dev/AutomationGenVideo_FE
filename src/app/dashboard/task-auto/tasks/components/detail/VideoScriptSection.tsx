'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp, Film, Megaphone, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Section } from './Section'

interface Scene {
  timestamp: string
  visual: string
  voiceover: string
}

interface VideoScript {
  hook: string
  scenes: Scene[]
  cta: string
  hashtags: string[]
}

export interface VideoScriptSectionProps {
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

  async function generate() {
    setLoading(true)
    setError(null)
    setOpen(true)
    try {
      const res = await fetch('/api/ai/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setScript(data.script)
    } catch (e: any) {
      setError(e.message ?? 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  function copyAll() {
    if (!script) return
    const text = [
      `🎬 HOOK: ${script.hook}`,
      '',
      '📽️ KỊCH BẢN:',
      ...script.scenes.map(
        (s, i) => `Cảnh ${i + 1} (${s.timestamp})\n  📷 ${s.visual}\n  🎙️ ${s.voiceover}`,
      ),
      '',
      `📣 CTA: ${script.cta}`,
      '',
      `#️⃣ ${script.hashtags.join(' ')}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasContent = !!(props.contentTitle || props.scriptText || props.fileUrl)
  const hasProduct = !!props.productName
  const canGenerate = hasContent && hasProduct

  return (
    <Section
      icon={<Sparkles className="w-4 h-4" />}
      title="Kịch bản video AI"
      bgColor="bg-violet-50"
      iconColor="text-violet-600"
    >
      <div className="p-4 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {!canGenerate && (
            <p className="text-xs text-gray-400 italic flex-1">
              Cần có đủ thông tin nội dung và sản phẩm để sinh kịch bản.
            </p>
          )}
          {canGenerate && !script && !loading && (
            <p className="text-xs text-gray-400 flex-1">
              {props.fileUrl
                ? 'AI sẽ đọc file đính kèm và thông tin sản phẩm để sinh kịch bản.'
                : 'AI sẽ dùng script và thông tin sản phẩm để sinh kịch bản.'}
            </p>
          )}
          {script && (
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 flex-1"
            >
              {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {open ? 'Thu gọn' : 'Xem kịch bản'}
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
              onClick={generate}
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
                : <><Sparkles className="w-3.5 h-3.5" /> {script ? 'Sinh lại' : 'Sinh kịch bản'}</>
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

            {/* Hook */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-4">
              <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Film className="w-3.5 h-3.5" /> Hook mở đầu
              </p>
              <p className="text-base font-semibold text-violet-900 leading-relaxed">"{script.hook}"</p>
            </div>

            {/* Scenes */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Kịch bản chi tiết
              </p>
              <div className="space-y-3">
                {script.scenes.map((scene, i) => (
                  <div key={i} className="flex gap-3">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                        <span className="text-xs font-black text-gray-500">{i + 1}</span>
                      </div>
                      {i < script.scenes.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 mt-1 mb-0.5" />
                      )}
                    </div>

                    <div className="flex-1 pb-2">
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {scene.timestamp}
                      </span>
                      <div className="mt-2 bg-gray-50 rounded-xl px-4 py-3 space-y-2.5">
                        <div>
                          <p className="text-xs text-gray-400 font-semibold mb-1">📷 Cảnh quay</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{scene.visual}</p>
                        </div>
                        <div className="border-t border-gray-200 pt-2.5">
                          <p className="text-xs text-gray-400 font-semibold mb-1">🎙️ Voiceover / Text</p>
                          <p className="text-sm font-semibold text-gray-900 leading-relaxed">{scene.voiceover}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex gap-3 items-start">
              <Megaphone className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1.5">Call-to-action</p>
                <p className="text-base font-semibold text-amber-900 leading-relaxed">{script.cta}</p>
              </div>
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
          </div>
        )}
      </div>
    </Section>
  )
}
