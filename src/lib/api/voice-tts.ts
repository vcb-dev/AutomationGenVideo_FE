import { apiClient } from '@/lib/api-client'
import type { Voice } from '@/lib/voice/voice-selection'

export interface VoiceListResponse {
  success: boolean
  voices: Voice[]
  pricing?: { vnd_per_1k_chars: number }
}

export interface TtsPayload {
  text: string
  voice_id: string
  speed?: number
  pitch?: number
  volume?: number
  language?: string
}

export interface TtsResult {
  success: boolean
  audio_url?: string
  audio_file_id?: string | null
  audio_file_name?: string | null
  srt_content?: string | null
  srt_file_name?: string | null
  srt_filename?: string | null
  srt_url?: string | null
  usage_characters?: number
  duration?: number
  error?: string
}

export interface DuplicateCheckResult {
  is_duplicate: boolean
  existing_item?: {
    id: string
    voice_id?: string | null
    voice_name?: string | null
    created_at: string
    input_text?: string | null
    audio_play_url?: string | null
    audio_download_url?: string | null
    srt_download_url?: string | null
    srt_content?: string | null
    characters?: number
  }
}

export const listVoices = () =>
  apiClient.get<VoiceListResponse>('/ai/voice/list').then(r => r.data)

export const generateVoiceTts = (payload: TtsPayload) =>
  apiClient.post<TtsResult>('/ai/voice/tts', payload).then(r => r.data)

export const checkDuplicateVoice = (text: string, voiceId?: string) =>
  apiClient.post<DuplicateCheckResult>('/ai/voice/check-duplicate', { text, voice_id: voiceId }).then(r => r.data)

const apiBaseUrl = () => (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

/**
 * URL phát/tải audio TTS vừa tạo — 2 route stream ở BE (`voice/tts/audio/:fileId`,
 * `voice/tts/stream/:filename`) cố tình KHÔNG có JwtAuthGuard vì thẻ <audio>/<a> không
 * gửi được header Authorization, nên chỉ cần build URL thẳng, không qua apiClient.
 */
export function buildTtsPlayUrl(result: TtsResult): string | null {
  if (result.audio_file_id) return `${apiBaseUrl()}/ai/voice/tts/audio/${result.audio_file_id}`
  if (result.audio_file_name) return `${apiBaseUrl()}/ai/voice/tts/stream/${result.audio_file_name}`
  return result.audio_url ?? null
}

export function buildTtsDownloadUrl(result: TtsResult, fileName: string): string {
  const playUrl = buildTtsPlayUrl(result)
  if (!playUrl) return result.audio_url ?? ''
  const hasStreamRoute = !!(result.audio_file_id || result.audio_file_name)
  return hasStreamRoute ? `${playUrl}?download=1&filename=${encodeURIComponent(fileName)}` : playUrl
}

/**
 * Tải file phụ đề .SRT về máy client với UTF-8 BOM (\uFEFF)
 * BOM đảm bảo các phần mềm dựng video như CapCut, Premiere, Notepad không bị lỗi font tiếng Việt.
 */
export function downloadSrtFile(srtContent: string, fileName: string = 'subtitles.srt'): void {
  if (!srtContent) return
  const safeName = fileName || 'subtitles.srt'
  const name = safeName.endsWith('.srt') ? safeName : `${safeName}.srt`
  const blob = new Blob(['\uFEFF', srtContent], { type: 'application/x-subrip;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/**
 * URL tải phụ đề SRT qua BE route stream (fallback nếu không tải trực tiếp từ memory)
 */
export function buildSrtDownloadUrl(result: TtsResult, fileName: string = 'subtitles.srt'): string | null {
  const srtFileName = result.srt_file_name || result.srt_filename
  if (srtFileName) {
    const safeName = fileName || 'subtitles.srt'
    const name = safeName.endsWith('.srt') ? safeName : `${safeName}.srt`
    return `${apiBaseUrl()}/ai/voice/tts/stream/${srtFileName}?download=1&filename=${encodeURIComponent(name)}`
  }
  return result.srt_url ?? null
}

