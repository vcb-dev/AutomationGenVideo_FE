import { apiClient } from '@/lib/api-client'

export type PaastPreferStatus = 'primary' | 'secondary' | 'off'
export type PaastCriterionStatus = 'pass' | 'miss' | 'na'
export type PaastHistoryStatus = 'PENDING' | 'SUCCESS' | 'FAILED'
export type PaastWowStrength = 'strong' | 'moderate' | 'weak'
export type PaastFeasibility = 'realistic' | 'needs-adjustment' | 'high-risk'
export type PaastScoreBand = 'ready' | 'close' | 'needs-work' | 'not-ready'

/** Mức độ triển khai 1 tiêu chí (patch v4) — 0 (Không có) tới 5 (Xuất sắc). */
export type PaastLevel = 0 | 1 | 2 | 3 | 4 | 5

/** Nhãn hiển thị cho từng mức `PaastLevel` — khớp đúng LEVEL_LABELS phía AI service (Python). */
export const PAAST_LEVEL_LABELS: Record<PaastLevel, string> = {
  0: 'Không có', 1: 'Rất yếu', 2: 'Yếu', 3: 'Khá', 4: 'Mạnh', 5: 'Xuất sắc',
}

export interface PaastInsight {
  code: string
  name_en: string
  name_vi: string
  status: PaastPreferStatus
  /**
   * MỚI patch v4 — mức độ insight này thực sự là động lực chính (không chỉ "có nhắc tới"); hệ
   * thống chọn primary/secondary dựa trên field này. Optional: bản ghi cũ (trước patch v4) chưa có.
   */
  level?: PaastLevel
  level_label?: string
  description: string
  /** 1-2 câu TẠI SAO — dựa trên đọc hiểu toàn bài. Optional: bản ghi cũ (trước patch v2.1) chưa có field này. */
  reasoning?: string
  evidence_sentences: string[]
}

export interface PaastCriterion {
  code: string
  name_en: string
  name_vi: string
  status: PaastCriterionStatus
  /**
   * MỚI patch v4 — mức độ triển khai thật (0-5); `status` = "pass" khi level ≥ 3 ("Khá"). `null`
   * khi `status === 'na'`. Optional: bản ghi cũ (trước patch v4) chưa có field này.
   */
  level?: PaastLevel | null
  level_label?: string | null
  evidence: string
  /** 1-2 câu TẠI SAO đạt/miss. Optional: bản ghi cũ (trước patch v2.1) chưa có field này. */
  reasoning?: string
}

/** Coherence check (patch v2.1) — content có giữ đúng 1 trọng tâm từ hook đến payoff không. */
export interface PaastCoherence {
  is_coherent: boolean
  warning?: string
}

export interface PaastLayerInsights {
  score: number
  /** Điểm tối đa của lớp Prefer — 25 kể từ patch v2.1 (trước đó là 20). Optional: bản ghi cũ. */
  max?: number
  primary_count: number
  secondary_count: number
  insights: PaastInsight[]
  /** Điều đọng lại sau khi xem hết. Optional: bản ghi cũ (trước patch v2.1) chưa có field này. */
  takeaway_statement?: string
  wow_strength?: PaastWowStrength
  /** Optional: bản ghi cũ (trước patch v2.1) chưa có coherence check. */
  coherence?: PaastCoherence
}

export interface PaastLayerCriteria {
  score: number
  /** Điểm tối đa của lớp — 25/20/15 tuỳ lớp kể từ patch v2.1. Optional: bản ghi cũ (mặc định 20). */
  max?: number
  pass_count: number
  text_detectable_count?: number
  criteria: PaastCriterion[]
}

/**
 * Video Realism Check (MỚI, patch v2.1) — mô phỏng "xem như video thật", độc lập với 5 lớp
 * PAAST, luôn xuất hiện kể cả khi verdict = "Đạt chuẩn". Optional trên toàn bộ interface: bản
 * ghi cũ (trước patch v2.1) không có lớp này.
 */
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
  /** Optional: bản ghi cũ (trước patch v2.1) không có Video Realism Check. */
  video_realism?: PaastVideoRealism
  /** Optional: bản ghi cũ (trước patch v2.1) không có band. */
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

/**
 * Nâng cấp tốn 2 lệnh gọi DeepSeek NỐI TIẾP ở AI service (viết bản mới → chấm lại) — BE giờ
 * chờ tới 420s (`PaastService.PAAST_UPGRADE_TIMEOUT_MS`, khớp mốc content-transform đã kiểm
 * chứng). `apiClient` mặc định chỉ 180s nên phải tự override ở đây, không thì FE tự bỏ cuộc
 * trước khi BE kịp trả lời dù request phía sau vẫn đang chạy.
 */
export const upgradePaastAnalysis = (analysisId: string) =>
  apiClient
    .post<PaastAnalysisHistory>(`/ai/paast/upgrade/${analysisId}`, undefined, { timeout: 420000 })
    .then(r => r.data)
