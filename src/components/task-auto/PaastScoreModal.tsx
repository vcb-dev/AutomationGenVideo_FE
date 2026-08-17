'use client'

import { useEffect, useState } from 'react'
import {
  X, Loader2, Gauge, AlertTriangle, CheckCircle2, Circle, MinusCircle, RefreshCw,
  Sparkles, Copy, Check, ArrowLeft, Plus,
} from 'lucide-react'
import {
  analyzePaastContent,
  findPaastAnalysisByContent,
  upgradePaastAnalysis,
  type PaastAnalysisHistory,
  type PaastCriterion,
  type PaastVerdict,
} from '@/lib/api/paast-analyzer'

interface Props {
  open: boolean
  content: string
  onClose: () => void
  /** Kết quả đã chấm trước đó cho đúng nội dung này (do component cha cache) — nếu có thì hiển thị lại,
   *  không gọi phân tích lại. Truyền `null`/`undefined` khi content chưa từng được chấm hoặc đã bị sửa. */
  cachedResult?: PaastAnalysisHistory | null
  /** Gọi lại sau mỗi lần phân tích (mới hoặc chấm lại) thành công để component cha lưu cache. */
  onAnalyzed?: (result: PaastAnalysisHistory) => void
  /** Gọi khi user bấm "Sử dụng bản này" ở màn nâng cấp — component cha tự quyết định thay nội dung vào đâu.
   *  `result` đi kèm để cha có thể cache luôn (đã re-analyze khớp đúng nội dung mới, không cần chấm lại). */
  onApply?: (upgradedContent: string, result: PaastAnalysisHistory) => void
}

/** Bỏ marker <add>...</add> mà AI dùng để đánh dấu đoạn vừa thêm — trả về plain text để copy/áp dụng. */
function stripAddTags(text: string): string {
  return text.replace(/<\/?add>/g, '')
}

/** Tách text theo marker <add>...</add>, trả về mảng node để render — đoạn trong <add> được highlight xanh. */
function renderHighlighted(text: string) {
  const parts = text.split(/(<add>[\s\S]*?<\/add>)/g)
  return parts.map((part, idx) => {
    const match = part.match(/^<add>([\s\S]*?)<\/add>$/)
    if (match) {
      return (
        <mark key={idx} className="bg-emerald-100 text-emerald-900 rounded px-0.5 box-decoration-clone">
          {match[1]}
        </mark>
      )
    }
    return <span key={idx}>{part}</span>
  })
}

const LAYER_META = {
  prefer: { label: 'Prefer (Thích)', sub: 'CRAVES', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  action: { label: 'Action (Hành động)', sub: 'S-FACES', color: 'text-lime-700', bg: 'bg-lime-50', border: 'border-lime-200' },
  acknowledge: { label: 'Acknowledge (Biết)', sub: 'BRANDS', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  stick: { label: 'Stick (Nhớ)', sub: 'STICKS', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  trust: { label: 'Trust (Tin)', sub: 'TRUSTS', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
} as const

const CRITERIA_LAYERS = ['action', 'acknowledge', 'stick', 'trust'] as const

function extractErrorMessage(e: any, fallback: string): string {
  const msg = e?.response?.data?.message ?? e?.message
  if (Array.isArray(msg)) return msg.join(', ')
  return msg || fallback
}

export function PaastScoreModal({ open, content, onClose, cachedResult, onAnalyzed, onApply }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PaastAnalysisHistory | null>(null)
  const [fromCache, setFromCache] = useState(false)

  // Màn "nâng cấp content" — tách riêng khỏi state chấm điểm, chỉ có khi user chủ động bấm nâng cấp.
  const [view, setView] = useState<'score' | 'upgraded'>('score')
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [upgradeResult, setUpgradeResult] = useState<PaastAnalysisHistory | null>(null)
  const [copied, setCopied] = useState(false)

  function runAnalyze() {
    setResult(null)
    setError(null)
    setLoading(true)
    setFromCache(false)
    analyzePaastContent(content)
      .then(r => {
        if (r.status === 'FAILED' || !r.analysis_result) {
          setError(r.error_message || 'Không chấm điểm được content này')
        } else {
          setResult(r)
          onAnalyzed?.(r)
        }
      })
      .catch(e => setError(extractErrorMessage(e, 'Không chấm điểm được content này')))
      .finally(() => setLoading(false))
  }

  // Chưa có cache trong session (vd vừa reload trang, component vừa mount lại) — hỏi BE xem content
  // này đã từng được chấm chưa trước khi phân tích mới, để không tốn LLM cho content không đổi.
  function checkExistingThenAnalyze() {
    setResult(null)
    setError(null)
    setLoading(true)
    setFromCache(false)
    findPaastAnalysisByContent(content)
      .then(existing => {
        if (existing && existing.analysis_result) {
          setResult(existing)
          setFromCache(true)
          setLoading(false)
          onAnalyzed?.(existing)
        } else {
          runAnalyze()
        }
      })
      .catch(() => runAnalyze()) // Tra cứu lỗi thì cứ phân tích mới, đừng chặn người dùng
  }

  async function handleUpgrade() {
    if (!result) return
    setUpgrading(true)
    setUpgradeError(null)
    try {
      const r = await upgradePaastAnalysis(result.id)
      if (r.status === 'FAILED' || !r.analysis_result) {
        setUpgradeError(r.error_message || 'Không nâng cấp được content này')
      } else {
        setUpgradeResult(r)
        setView('upgraded')
      }
    } catch (e: any) {
      setUpgradeError(extractErrorMessage(e, 'Không nâng cấp được content này'))
    } finally {
      setUpgrading(false)
    }
  }

  function handleCopyUpgraded() {
    if (!upgradeResult) return
    navigator.clipboard.writeText(stripAddTags(upgradeResult.input_text))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleApplyUpgraded() {
    if (!upgradeResult) return
    const stripped = stripAddTags(upgradeResult.input_text)
    onApply?.(stripped, { ...upgradeResult, input_text: stripped })
    onClose()
  }

  useEffect(() => {
    if (!open) return
    setView('score')
    setUpgradeResult(null)
    setUpgradeError(null)
    // Content này đã được chấm điểm trước đó (component cha cache theo đúng nội dung hiện tại)
    // — hiển thị lại kết quả cũ, không gọi phân tích lại tốn LLM.
    if (cachedResult) {
      setResult(cachedResult)
      setError(null)
      setLoading(false)
      setFromCache(true)
      return
    }
    checkExistingThenAnalyze()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, content, cachedResult])

  if (!open) return null

  const analysis = result?.analysis_result
  const upgradedAnalysis = upgradeResult?.analysis_result

  return (
    <div className="fixed inset-0 z-[1005] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Gauge className="w-4.5 h-4.5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {view === 'upgraded' ? 'Content sau nâng cấp' : 'Chấm điểm PAAST'}
              </h3>
              <p className="text-xs text-slate-400">
                {view === 'upgraded'
                  ? 'AI đã bổ sung phần còn thiếu theo gợi ý, giữ nguyên văn phong gốc'
                  : fromCache ? 'Đã chấm điểm trước đó — hiển thị lại kết quả cũ' : 'Prefer · Action · Acknowledge · Stick · Trust'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {view === 'score' && fromCache && !loading && (
              <button
                type="button"
                onClick={runAnalyze}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Chấm điểm lại
              </button>
            )}
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4">
          {view === 'score' && loading && (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              <p className="text-sm text-gray-400">Đang phân tích qua 5 lăng kính PAAST...</p>
            </div>
          )}

          {view === 'score' && !loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {view === 'score' && !loading && analysis && result && (
            <>
              {/* Tổng điểm */}
              <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-bold text-violet-500 uppercase tracking-wide">Tổng điểm</p>
                  <p className="text-3xl font-extrabold text-violet-700 mt-0.5 leading-none">
                    {result.total_score}<span className="text-base font-semibold text-violet-400">/100</span>
                  </p>
                  {analysis.verdict && <VerdictBadge verdict={analysis.verdict} className="mt-2" />}
                </div>
                <div className="flex gap-2">
                  {(['prefer', 'action', 'acknowledge', 'stick', 'trust'] as const).map(key => (
                    <div key={key} className="text-center">
                      <div
                        className={`w-9 h-9 rounded-lg ${LAYER_META[key].bg} border ${LAYER_META[key].border} flex items-center justify-center text-xs font-bold ${LAYER_META[key].color}`}
                        title={`${LAYER_META[key].label}: ${analysis.layers[key].score}/20`}
                      >
                        {analysis.layers[key].score}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase">{key[0]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA warning */}
              {analysis.cta_warning?.detected && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">CTA lệch chuẩn New Media</p>
                    <p className="text-sm text-orange-800 mt-0.5">
                      Phát hiện CTA thương mại ép hành vi — nên chuyển sang mời chia sẻ / lưu giữ giá trị.
                    </p>
                  </div>
                </div>
              )}

              {/* Prefer — đánh giá tổng thể */}
              <LayerBlock
                title={LAYER_META.prefer.label} sub={LAYER_META.prefer.sub} score={analysis.layers.prefer.score}
                color={LAYER_META.prefer.color} bg={LAYER_META.prefer.bg} border={LAYER_META.prefer.border}
              >
                <div className="flex flex-wrap gap-1.5">
                  {analysis.layers.prefer.insights.map(i => (
                    <span
                      key={i.code}
                      title={i.description || undefined}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        i.status === 'primary'
                          ? 'bg-amber-600 border-amber-600 text-white'
                          : i.status === 'secondary'
                            ? 'bg-white border-amber-400 text-amber-700'
                            : 'bg-white border-gray-200 text-gray-400'
                      }`}
                    >
                      {i.name_en} · {i.name_vi}
                    </span>
                  ))}
                </div>
                {analysis.layers.prefer.insights
                  .filter(i => i.status !== 'off' && i.evidence_sentences.length > 0)
                  .map(i => (
                    <div key={i.code} className="mt-2.5 space-y-1">
                      <p className="text-xs font-semibold text-gray-600">{i.name_en} · {i.name_vi} — {i.description}</p>
                      {i.evidence_sentences.map((s, idx) => (
                        <p key={idx} className="text-xs italic text-gray-500 border-l-2 border-amber-300 bg-amber-50/50 px-2.5 py-1.5 rounded-r">
                          &ldquo;{s}&rdquo;
                        </p>
                      ))}
                    </div>
                  ))}
              </LayerBlock>

              {/* Action / Acknowledge / Stick / Trust — đánh giá từng tiêu chí */}
              {CRITERIA_LAYERS.map(key => (
                <LayerBlock
                  key={key}
                  title={LAYER_META[key].label} sub={LAYER_META[key].sub} score={analysis.layers[key].score}
                  color={LAYER_META[key].color} bg={LAYER_META[key].bg} border={LAYER_META[key].border}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.layers[key].criteria.map(c => <CriterionCard key={c.code} criterion={c} />)}
                  </div>
                </LayerBlock>
              ))}
            </>
          )}

          {view === 'upgraded' && upgradeResult && upgradedAnalysis && (
            <>
              {/* Điểm trước → sau — không giả định điểm chắc chắn tăng, luôn hiển thị số thật */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Điểm trước → sau nâng cấp</p>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-0.5 leading-none flex items-baseline gap-2">
                    <span className="text-gray-400 text-lg font-semibold">{result?.total_score ?? '—'}</span>
                    <span className="text-gray-300">→</span>
                    {upgradeResult.total_score}<span className="text-sm font-semibold text-emerald-400">/100</span>
                  </p>
                  {upgradedAnalysis.verdict && <VerdictBadge verdict={upgradedAnalysis.verdict} className="mt-2" />}
                </div>
              </div>

              {/* Danh sách phần AI đã thêm */}
              {!!upgradedAnalysis.changes_added?.length && (
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">AI đã thêm</p>
                  <ul className="space-y-1.5">
                    {upgradedAnalysis.changes_added.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                        <Plus className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span><span className="font-semibold text-gray-800">{c.layer} · {c.criterion}:</span> {c.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Content sau nâng cấp — đoạn AI vừa thêm được highlight xanh */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Content sau nâng cấp</p>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                  {renderHighlighted(upgradeResult.input_text)}
                </p>
              </div>
            </>
          )}

        </div>

        {/* Footer action bar */}
        {view === 'score' && !loading && analysis && result && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            {upgradeError
              ? <p className="text-xs text-red-600 flex-1">{upgradeError}</p>
              : <span className="flex-1" />}
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgrading}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition-colors shrink-0"
            >
              {upgrading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> AI đang nâng cấp content...</>
                : <><Sparkles className="w-4 h-4" /> Nâng cấp content</>
              }
            </button>
          </div>
        )}

        {view === 'upgraded' && upgradeResult && (
          <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-100 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setView('score')}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại kết quả chấm điểm
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyUpgraded}
                className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors ${
                  copied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã copy' : 'Copy'}
              </button>
              {onApply && (
                <button
                  type="button"
                  onClick={handleApplyUpgraded}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Sử dụng bản này
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Đạt chuẩn PAAST khi cả 5 lớp đều có ≥1 tiêu chí đạt — không phải cứ đủ điểm là đạt
 * (business doc §1.3/§5.2, xem `compute_verdict` ở AI service).
 */
function VerdictBadge({ verdict, className = '' }: { verdict: PaastVerdict; className?: string }) {
  if (verdict.passed) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white ${className}`}>
        <CheckCircle2 className="w-3 h-3" /> Đạt chuẩn PAAST
      </span>
    )
  }
  const missingLabels = verdict.missing_layers.map(l => LAYER_META[l].label).join(', ')
  return (
    <span
      title={`Còn thiếu ở lớp: ${missingLabels}`}
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 border border-orange-300 text-orange-700 ${className}`}
    >
      <AlertTriangle className="w-3 h-3" /> Chưa đạt chuẩn — thiếu {missingLabels}
    </span>
  )
}

function LayerBlock({
  title, sub, score, color, bg, border, children,
}: {
  title: string
  sub: string
  score: number
  color: string
  bg: string
  border: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} px-4 py-3`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className={`text-xs font-bold ${color} uppercase tracking-wide`}>
          {title} <span className="text-gray-400 font-medium normal-case">· {sub}</span>
        </p>
        <span className="text-xs font-mono font-bold text-gray-600 bg-white/70 px-2 py-0.5 rounded-md shrink-0">{score}/20</span>
      </div>
      {children}
    </div>
  )
}

function CriterionCard({ criterion }: { criterion: PaastCriterion }) {
  const Icon = criterion.status === 'pass' ? CheckCircle2 : criterion.status === 'na' ? MinusCircle : Circle
  const iconColor = criterion.status === 'pass' ? 'text-emerald-500' : criterion.status === 'na' ? 'text-gray-400' : 'text-orange-500'
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
        <p className="text-xs font-semibold text-gray-800">
          {criterion.name_en} <span className="text-gray-400 font-normal">· {criterion.name_vi}</span>
        </p>
      </div>
      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed pl-5">
        {criterion.status === 'miss' && <span className="font-semibold text-orange-600">Gợi ý — </span>}
        {criterion.status === 'na' && <span className="font-semibold text-gray-500">Cần production — </span>}
        {criterion.evidence}
      </p>
    </div>
  )
}
