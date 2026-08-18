'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  X, Mic, Loader2, Wand2, Download, AudioLines, ExternalLink, AlertTriangle,
} from 'lucide-react'
import {
  isUsableVoice, pickDefaultVoice, type Voice,
} from '@/lib/voice/voice-selection'
import { TTS_LANGUAGES, TTS_LANGUAGE_TO_MINIMAX } from '@/lib/voice/tts-languages'
import {
  listVoices, generateVoiceTts, buildTtsPlayUrl, buildTtsDownloadUrl, type TtsResult,
} from '@/lib/api/voice-tts'

const MAX_CHARS = 5000

function extractErrorMessage(e: any, fallback: string): string {
  const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message
  if (Array.isArray(msg)) return msg.join(', ')
  return msg || fallback
}

interface Props {
  open: boolean
  /** Content hiện tại của task — nạp sẵn vào ô văn bản mỗi khi mở modal, vẫn sửa được trước khi tạo. */
  content: string
  onClose: () => void
}

// Tái dùng thẳng backend TTS của Tiện ích → Clone Voice (POST /ai/voice/tts + GET /ai/voice/list)
// ngay trong task — không lưu lại voice vào task (chỉ tạo nhanh để nghe/tải), theo đúng phạm vi
// tách riêng khỏi trang Clone Voice đầy đủ (trang đó còn có clone giọng mới + dịch kịch bản).
export function TtsVoiceModal({ open, content, onClose }: Props) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [voicesFetched, setVoicesFetched] = useState(false)
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState('')

  const [text, setText] = useState('')
  const [ttsLang, setTtsLang] = useState<string>(TTS_LANGUAGES[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [result, setResult] = useState<TtsResult | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState<string | null>(null)

  const usableVoices = voices.filter(isUsableVoice)

  useEffect(() => {
    if (!open) return
    setText(content)
    setError(null)
    setResult(null)
    setDownloadUrl(null)
    setDownloadName(null)
    if (voicesFetched) return
    setLoadingVoices(true)
    listVoices()
      .then(data => {
        const list = data.voices ?? []
        setVoices(list)
        setSelectedVoiceId(current => pickDefaultVoice(list, current))
      })
      .catch(e => setError(extractErrorMessage(e, 'Không tải được danh sách giọng đã clone')))
      .finally(() => { setLoadingVoices(false); setVoicesFetched(true) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleGenerate() {
    if (!text.trim()) { setError('Vui lòng nhập nội dung cần đọc'); return }
    if (!isUsableVoice(voices.find(v => v.voice_id === selectedVoiceId))) {
      setError('Vui lòng chọn một giọng đã clone'); return
    }
    setIsGenerating(true)
    setError(null)
    setResult(null)
    try {
      const data = await generateVoiceTts({
        text,
        voice_id: selectedVoiceId,
        speed: 1.0,
        pitch: 0,
        volume: 100,
        language: TTS_LANGUAGE_TO_MINIMAX[ttsLang],
      })
      if (!data.success || !(data.audio_url || data.audio_file_id || data.audio_file_name)) {
        setError(data.error || 'Tạo giọng nói thất bại')
        return
      }
      const voiceName = (voices.find(v => v.voice_id === selectedVoiceId)?.name || 'voice')
        .replace(/[\/\\:*?"<>|]+/g, ' ')
        .trim()
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
      const fileName = `${voiceName}_${stamp}.mp3`
      setResult(data)
      setDownloadUrl(buildTtsDownloadUrl(data, fileName))
      setDownloadName(fileName)
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Không thể tạo giọng nói'))
    } finally {
      setIsGenerating(false)
    }
  }

  if (!open) return null

  const playUrl = result ? buildTtsPlayUrl(result) : null
  const charCount = text.length

  return (
    <div className="fixed inset-0 z-[1005] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <AudioLines className="w-4.5 h-4.5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Tạo voice từ content</h3>
              <p className="text-xs text-slate-400">Minimax AI · dùng giọng đã clone ở Tiện ích</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4">
          {/* Text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-400">Văn bản cần đọc</p>
              <p className="text-xs text-slate-400">{charCount} / {MAX_CHARS} ký tự</p>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
              rows={7}
              placeholder="Nhập văn bản cần đọc..."
              className="w-full text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
            />
          </div>

          {/* Voice + language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">Giọng đã clone</p>
              <select
                value={selectedVoiceId}
                onChange={e => setSelectedVoiceId(e.target.value)}
                disabled={loadingVoices || usableVoices.length === 0}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 disabled:bg-gray-50 disabled:text-gray-400"
              >
                {loadingVoices && <option>Đang tải...</option>}
                {!loadingVoices && usableVoices.length === 0 && <option>Chưa có giọng nào</option>}
                {usableVoices.map(v => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.name}{v.gender ? ` · ${v.gender}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">Ngôn ngữ đọc</p>
              <select
                value={ttsLang}
                onChange={e => setTtsLang(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
              >
                {TTS_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {!loadingVoices && usableVoices.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                Chưa có giọng đã clone nào.{' '}
                <Link
                  href="/dashboard/ai/clone-voice"
                  target="_blank"
                  className="font-semibold underline underline-offset-2 hover:text-amber-900 inline-flex items-center gap-1"
                >
                  Clone giọng ở Tiện ích <ExternalLink className="w-3 h-3" />
                </Link>{' '}
                trước, rồi quay lại đây.
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim() || usableVoices.length === 0}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors ${
              !isGenerating && text.trim() && usableVoices.length > 0
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo giọng nói...</>
              : <><Wand2 className="w-4 h-4" /> Tạo giọng nói</>
            }
          </button>

          {result && playUrl && (
            <div className="p-3.5 bg-violet-50 border border-violet-200 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <Mic className="w-4 h-4 text-violet-600" />
                  </div>
                  <p className="text-xs font-semibold text-gray-800 truncate">{downloadName ?? 'voice.mp3'}</p>
                </div>
                <a
                  href={downloadUrl ?? playUrl}
                  download={downloadName ?? 'voice.mp3'}
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition-colors shrink-0"
                  title="Tải xuống"
                >
                  <Download className="w-3.5 h-3.5 text-violet-600" />
                </a>
              </div>
              <audio src={playUrl} controls autoPlay className="w-full mt-3 h-10" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
