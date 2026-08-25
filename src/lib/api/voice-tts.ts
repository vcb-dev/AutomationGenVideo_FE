import { apiClient } from '@/lib/api-client'
import type { Voice } from '@/lib/voice/voice-selection'

export interface VoiceListResponse {
  success: boolean
  voices: Voice[]
  pricing?: { vnd_per_1k_chars: number; vnd_per_clone?: number }
}

export interface TtsPayload {
  text: string
  voice_id: string
  speed?: number
  pitch?: number
  volume?: number
  language?: string
  model?: string
}

export interface TtsResult {
  success: boolean
  audio_url?: string
  audio_file_id?: string | null
  audio_file_name?: string | null
  usage_characters?: number
  duration?: number
  model?: string
  error?: string
}

export const listVoices = () =>
  apiClient.get<VoiceListResponse>('/ai/voice/list').then(r => r.data)

export const generateVoiceTts = (payload: TtsPayload) =>
  apiClient.post<TtsResult>('/ai/voice/tts', payload).then(r => r.data)

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
