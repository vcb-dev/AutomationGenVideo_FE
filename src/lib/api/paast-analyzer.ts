import { apiClient } from '@/lib/api-client'

export type PaastPreferStatus = 'primary' | 'secondary' | 'off'
export type PaastCriterionStatus = 'pass' | 'miss' | 'na'
export type PaastHistoryStatus = 'PENDING' | 'SUCCESS' | 'FAILED'
export type PaastWowStrength = 'strong' | 'moderate' | 'weak'
export type PaastFeasibility = 'realistic' | 'needs-adjustment' | 'high-risk'
export type PaastScoreBand = 'ready' | 'close' | 'needs-work' | 'not-ready'

/** Mức độ triển khai 1 tiêu chí — 0 (Không có) tới 5 (Xuất sắc). */
export type PaastLevel = 0 | 1 | 2 | 3 | 4 | 5

export const PAAST_LEVEL_LABELS: Record<PaastLevel, string> = {
  0: 'Không có', 1: 'Rất yếu', 2: 'Yếu', 3: 'Khá', 4: 'Mạnh', 5: 'Xuất sắc',
}

export interface PaastInsight {
  code: string
  name_en: string
  name_vi: string
  status: PaastPreferStatus
  /** Mức insight này là động lực chính; hệ thống chọn primary/secondary theo field này. */
  level?: PaastLevel
  level_label?: string
  description: string
  reasoning?: string
  evidence_sentences: string[]
}

export interface PaastCriterion {
  code: string
  name_en: string
  name_vi: string
  status: PaastCriterionStatus
  /** `status='pass'` khi level ≥ 3; `null` khi `status='na'`. */
  level?: PaastLevel | null
  level_label?: string | null
  evidence: string
  reasoning?: string
}

/** Content có giữ đúng 1 trọng tâm từ hook đến payoff không. */
export interface PaastCoherence {
  is_coherent: boolean
  warning?: string
}

export interface PaastLayerInsights {
  score: number
  max?: number
  primary_count: number
  secondary_count: number
  insights: PaastInsight[]
  takeaway_statement?: string
  wow_strength?: PaastWowStrength
  coherence?: PaastCoherence
}

export interface PaastLayerCriteria {
  score: number
  max?: number
  pass_count: number
  text_detectable_count?: number
  criteria: PaastCriterion[]
}

/** Mô phỏng "xem như video thật" — độc lập với 5 lớp PAAST, luôn xuất hiện. */
export interface PaastVideoRealism {
  opening_beat: string
  pacing_note: string
  show_vs_tell: string
  payoff_note: string
  overall_feasibility: PaastFeasibility
}

export interface PaastChangeAdded {
  layer: string
  criterion: string
  text: string
}

export type PaastLayerKey = 'prefer' | 'action' | 'acknowledge' | 'stick' | 'trust'

/**
 * Đạt chuẩn PAAST khi cả 5 lớp đều có ≥1 tiêu chí đạt (Prefer cần ≥1 insight `primary`) —
 * không dùng ngưỡng điểm tổng, xem `compute_verdict` ở AI service (business doc §1.3/§5.2).
 */
export interface PaastVerdict {
  passed: boolean
  passed_layers: PaastLayerKey[]
  missing_layers: PaastLayerKey[]
}

export interface PaastAnalysisResult {
  layers: {
    prefer: PaastLayerInsights
    action: PaastLayerCriteria
    acknowledge: PaastLayerCriteria
    stick: PaastLayerCriteria
    trust: PaastLayerCriteria
  }
  video_realism?: PaastVideoRealism
  score_band?: PaastScoreBand
  verdict: PaastVerdict
  cta_warning: { detected: boolean; matches: string[] }
  /** Chỉ có ở bản ghi là kết quả của 1 lần nâng cấp (`upgraded_from_id` != null). */
  changes_added?: PaastChangeAdded[]
}

export interface PaastAnalysisHistory {
  id: string
  status: PaastHistoryStatus
  input_text: string
  analysis_result: PaastAnalysisResult | null
  total_score: number | null
  error_message: string | null
  upgraded_from_id: string | null
  created_at: string
}

export const analyzePaastContent = (content: string) =>
  apiClient.post<PaastAnalysisHistory>('/ai/paast/analyze', { content }).then(r => r.data)

/** Tìm bản phân tích PAAST gần nhất khớp đúng nội dung này — null nếu content chưa từng được chấm. */
export const findPaastAnalysisByContent = (content: string) =>
  apiClient.post<PaastAnalysisHistory | null>('/ai/paast/find-by-content', { content }).then(r => r.data)

// BE chờ tới 420s cho /upgrade (2 lệnh LLM nối tiếp); apiClient mặc định 180s nên override ở đây.
export const upgradePaastAnalysis = (analysisId: string) =>
  apiClient
    .post<PaastAnalysisHistory>(`/ai/paast/upgrade/${analysisId}`, undefined, { timeout: 420000 })
    .then(r => r.data)
