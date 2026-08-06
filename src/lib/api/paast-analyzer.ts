import { apiClient } from '@/lib/api-client'

export type PaastPreferStatus = 'primary' | 'secondary' | 'off'
export type PaastCriterionStatus = 'pass' | 'miss' | 'na'
export type PaastHistoryStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

export interface PaastInsight {
  code: string
  name_en: string
  name_vi: string
  status: PaastPreferStatus
  description: string
  evidence_sentences: string[]
}

export interface PaastCriterion {
  code: string
  name_en: string
  name_vi: string
  status: PaastCriterionStatus
  evidence: string
}

export interface PaastLayerInsights {
  score: number
  primary_count: number
  secondary_count: number
  insights: PaastInsight[]
}

export interface PaastLayerCriteria {
  score: number
  pass_count: number
  text_detectable_count?: number
  criteria: PaastCriterion[]
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
  apiClient.post<PaastAnalysisHistory>('/paast-analyzer/analyze', { content }).then(r => r.data)

/** Tìm bản phân tích PAAST gần nhất khớp đúng nội dung này — null nếu content chưa từng được chấm. */
export const findPaastAnalysisByContent = (content: string) =>
  apiClient.post<PaastAnalysisHistory | null>('/paast-analyzer/find-by-content', { content }).then(r => r.data)

export const upgradePaastAnalysis = (analysisId: string) =>
  apiClient.post<PaastAnalysisHistory>(`/paast-analyzer/upgrade/${analysisId}`).then(r => r.data)
