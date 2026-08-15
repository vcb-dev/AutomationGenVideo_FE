'use client'

import { useState } from 'react'
import {
  Gauge, Loader2, AlertTriangle, RefreshCw, Sparkles, Copy, Check, ArrowLeft, Plus, Eraser, AudioLines,
} from 'lucide-react'
import {
  analyzePaastContent,
  findPaastAnalysisByContent,
  upgradePaastAnalysis,
  type PaastAnalysisHistory,
} from '@/lib/api/paast-analyzer'
import {
  PAAST_MIN_LENGTH, LAYER_META, CRITERIA_LAYERS, VerdictBadge, LayerBlock, CriterionCard,
  renderHighlighted, stripAddTags, extractErrorMessage,
} from '@/components/task-auto/paast-score-display'
import { TtsVoiceModal } from '@/components/task-auto/TtsVoiceModal'

// Công cụ chấm điểm PAAST độc lập, không gắn với task cụ thể — dán/gõ content bất kỳ để chấm,
// tách ra khỏi ContentSection (chi tiết task) theo yêu cầu người dùng để dùng nhanh mà không cần mở task.
export function ContentScoringTab() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PaastAnalysisHistory | null>(null)
  const [scoredContent, setScoredContent] = useState('')
  const [fromCache, setFromCache] = useState(false)

  const [view, setView] = useState<'score' | 'upgraded'>('score')
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [upgradeResult, setUpgradeResult] = useState<PaastAnalysisHistory | null>(null)
  const [copied, setCopied] = useState(false)

  // Tạo voice nhanh từ content đang chấm (tái dùng TTS Minimax của Tiện ích → Clone Voice) — chỉ
  // tạo để nghe/tải tại chỗ, không lưu lại.
  const [showVoiceModal, setShowVoiceModal] = useState(false)

  const trimmed = content.trim()
  const tooShort = trimmed.length < PAAST_MIN_LENGTH
  const isStale = !!result && content !== scoredContent

  function runAnalyze() {
    setResult(null)
    setError(null)
    setLoading(true)
    setFromCache(false)
    const target = content
    analyzePaastContent(target)
      .then(r => {
        if (r.status === 'FAILED' || !r.analysis_result) {
          setError(r.error_message || 'Không chấm điểm được content này')
        } else {
          setResult(r)
          setScoredContent(target)
        }
      })
      .catch(e => setError(extractErrorMessage(e, 'Không chấm điểm được content này')))
      .finally(() => setLoading(false))
  }

  function handleScore() {
    setResult(null)
    setError(null)
    setLoading(true)
    setFromCache(false)
    setView('score')
    setUpgradeResult(null)
    setUpgradeError(null)
    const target = content
    findPaastAnalysisByContent(target)
      .then(existing => {
        if (existing && existing.analysis_result) {
          setResult(existing)
          setScoredContent(target)
          setFromCache(true)
          setLoading(false)
        } else {
          runAnalyze()
        }
      })
      .catch(() => runAnalyze())
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

  // Đưa bản nâng cấp vào ô content — result đi kèm đã là điểm của đúng bản này nên hiển thị lại
  // luôn, không cần chấm lại.
  function handleUseUpgraded() {
    if (!upgradeResult) return
    const stripped = stripAddTags(upgradeResult.input_text)
    setContent(stripped)
    setResult({ ...upgradeResult, input_text: stripped })
    setScoredContent(stripped)
    setFromCache(true)
    setView('score')
    setUpgradeResult(null)
  }

  function handleReset() {
    setContent('')
    setResult(null)
    setScoredContent('')
    setError(null)
    setFromCache(false)
    setView('score')
    setUpgradeResult(null)
    setUpgradeError(null)
  }

  const analysis = result?.analysis_result
  const upgradedAnalysis = upgradeResult?.analysis_result

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
          <Gauge className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Chấm điểm content (PAAST)</h2>
          <p className="text-sm text-slate-400">
            Dán hoặc gõ nội dung bất kỳ để chấm theo 5 lăng kính Prefer · Action · Acknowledge · Stick · Trust — không cần gắn với task cụ thể.
          </p>
        </div>
      </div>

      {/* Ô nhập content */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-gray-400">Nội dung cần chấm điểm</p>
          <p className={`text-xs font-medium ${tooShort ? 'text-gray-300' : 'text-slate-400'}`}>
            {trimmed.length} ký tự{tooShort ? ` (cần ≥ ${PAAST_MIN_LENGTH})` : ''}
          </p>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={8}
          placeholder="Dán hoặc gõ content tại đây để chấm điểm..."
          className="w-full text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
        />
      </div>

      {/* Hành động */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleScore}
          disabled={tooShort || loading}
          title={tooShort ? `Cần ít nhất ${PAAST_MIN_LENGTH} ký tự để chấm điểm` : undefined}
          className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors ${
            !tooShort && !loading
              ? 'bg-violet-600 hover:bg-violet-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang chấm điểm...</>
            : <><Gauge className="w-4 h-4" /> Chấm điểm</>
          }
        </button>
        {result && !loading && (
          <button
            type="button"
            onClick={runAnalyze}
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Chấm điểm lại
          </button>
        )}
        {(content || result) && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" /> Xoá, làm lại
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowVoiceModal(true)}
          disabled={!content.trim()}
          title={!content.trim() ? 'Cần có nội dung để tạo voice' : undefined}
          className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors ${
            content.trim()
              ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          <AudioLines className="w-3.5 h-3.5" /> Tạo voice
        </button>
      </div>

      {isStale && !loading && (
        <p className="text-xs font-medium text-amber-600">Nội dung đã thay đổi kể từ lần chấm gần nhất — bấm "Chấm điểm" để cập nhật.</p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          <p className="text-sm text-gray-400">Đang phân tích qua 5 lăng kính PAAST...</p>
        </div>
      )}

      {/* Kết quả chấm điểm */}
      {view === 'score' && !loading && analysis && result && (
        <div className="space-y-4 pt-1 border-t border-gray-100">
          {fromCache && (
            <p className="text-xs text-slate-400 pt-4">Đã chấm điểm trước đó — hiển thị lại kết quả cũ.</p>
          )}
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

          <div className="flex items-center justify-between gap-3 pt-2">
            {upgradeError
              ? <p className="text-xs text-red-600 flex-1">{upgradeError}</p>
              : <span className="flex-1" />}
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgrading || isStale}
              title={isStale ? 'Chấm điểm lại nội dung mới trước khi nâng cấp' : undefined}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition-colors shrink-0"
            >
              {upgrading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> AI đang nâng cấp content...</>
                : <><Sparkles className="w-4 h-4" /> Nâng cấp content</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Kết quả sau nâng cấp */}
      {view === 'upgraded' && upgradeResult && upgradedAnalysis && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
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

          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Content sau nâng cấp</p>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {renderHighlighted(upgradeResult.input_text)}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
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
              <button
                type="button"
                onClick={handleUseUpgraded}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                Dùng bản này
              </button>
            </div>
          </div>
        </div>
      )}

      <TtsVoiceModal
        open={showVoiceModal}
        content={content}
        onClose={() => setShowVoiceModal(false)}
      />
    </div>
  )
}
