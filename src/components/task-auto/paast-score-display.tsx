'use client'

import { CheckCircle2, Circle, MinusCircle, AlertTriangle, XCircle, Info, Clapperboard } from 'lucide-react'
import type {
  PaastCriterion, PaastVerdict, PaastLayerInsights, PaastVideoRealism, PaastScoreBand, PaastWowStrength,
} from '@/lib/api/paast-analyzer'

/** Ký tự tối thiểu để chấm điểm PAAST — khớp ngưỡng phía AI service. */
export const PAAST_MIN_LENGTH = 100

/**
 * `max`: điểm tối đa mỗi lớp kể từ patch v2.1 (Prefer/Action 25, Acknowledge 20, Stick/Trust 15
 * — trước đó 20 đều nhau). Dùng làm fallback khi bản ghi cũ không có `layers[key].max`.
 */
export const LAYER_META = {
  prefer: { label: 'Prefer (Thích)', sub: 'CRAVES', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', max: 25 },
  action: { label: 'Action (Hành động)', sub: 'S-FACES', color: 'text-lime-700', bg: 'bg-lime-50', border: 'border-lime-200', max: 25 },
  acknowledge: { label: 'Acknowledge (Biết)', sub: 'BRANDS', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', max: 20 },
  stick: { label: 'Stick (Nhớ)', sub: 'STICKS', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', max: 15 },
  trust: { label: 'Trust (Tin)', sub: 'TRUSTS', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', max: 15 },
} as const

export const CRITERIA_LAYERS = ['action', 'acknowledge', 'stick', 'trust'] as const

/** Bỏ marker <add>...</add> mà AI dùng để đánh dấu đoạn vừa thêm — trả về plain text để copy/áp dụng. */
export function stripAddTags(text: string): string {
  return text.replace(/<\/?add>/g, '')
}

/** Tách text theo marker <add>...</add>, trả về mảng node để render — đoạn trong <add> được highlight xanh. */
export function renderHighlighted(text: string) {
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

export function extractErrorMessage(e: any, fallback: string): string {
  const msg = e?.response?.data?.message ?? e?.message
  if (Array.isArray(msg)) return msg.join(', ')
  return msg || fallback
}

/**
 * Đạt chuẩn PAAST khi cả 5 lớp đều có ≥1 tiêu chí đạt — không phải cứ đủ điểm là đạt
 * (business doc §1.3/§5.2, xem `compute_verdict` ở AI service).
 */
export function VerdictBadge({ verdict, className = '' }: { verdict: PaastVerdict; className?: string }) {
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

export function LayerBlock({
  title, sub, score, max, color, bg, border, children,
}: {
  title: string
  sub: string
  score: number
  /** Điểm tối đa của lớp này (25/20/15 tuỳ lớp kể từ patch v2.1) — luôn truyền từ `layers[key].max`. */
  max: number
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
        <span className="text-xs font-mono font-bold text-gray-600 bg-white/70 px-2 py-0.5 rounded-md shrink-0">{score}/{max}</span>
      </div>
      {children}
    </div>
  )
}

/**
 * Chỉ báo mức độ triển khai 1 tiêu chí, thang 0-5 (patch v4) — 5 chấm tô đậm theo `level`, LUÔN
 * kèm `label` dạng CHỮ ngay cạnh (không chỉ dựa vào màu/số chấm tô — nguyên tắc "đừng truyền tải
 * thông tin chỉ bằng màu" khi audit qua ui-ux-pro-max). Chấm trang trí nên `aria-hidden`; `title`
 * cho hover, chữ hiển thị đã đủ cho screen reader đọc tự nhiên theo dòng.
 */
export function LevelMeter({ level, label, className = '' }: { level: number; label?: string | null; className?: string }) {
  const dotColor = level >= 4 ? 'bg-emerald-500' : level === 3 ? 'bg-blue-500' : level >= 1 ? 'bg-orange-400' : 'bg-gray-200'
  return (
    <span className={`inline-flex items-center gap-1 shrink-0 ${className}`} title={`Mức độ: ${label ?? level}/5`}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(dot => (
          <span key={dot} className={`w-1.5 h-1.5 rounded-full ${dot <= level ? dotColor : 'bg-gray-200'}`} />
        ))}
      </span>
      {label && <span className="text-[10px] font-semibold text-gray-500 whitespace-nowrap">{label}</span>}
    </span>
  )
}

export function CriterionCard({ criterion }: { criterion: PaastCriterion }) {
  const Icon = criterion.status === 'pass' ? CheckCircle2 : criterion.status === 'na' ? MinusCircle : Circle
  const iconColor = criterion.status === 'pass' ? 'text-emerald-500' : criterion.status === 'na' ? 'text-gray-400' : 'text-orange-500'
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
          <p className="text-xs font-semibold text-gray-800 truncate">
            {criterion.name_en} <span className="text-gray-400 font-normal">· {criterion.name_vi}</span>
          </p>
        </div>
        {criterion.level != null && <LevelMeter level={criterion.level} label={criterion.level_label} />}
      </div>
      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed pl-5">
        {criterion.status === 'miss' && <span className="font-semibold text-orange-600">Gợi ý — </span>}
        {criterion.status === 'na' && <span className="font-semibold text-gray-500">Cần production — </span>}
        {criterion.evidence}
      </p>
      {/* reasoning (patch v2.1) — lý giải dựa trên đọc hiểu toàn bài, tách biệt khỏi evidence quote. */}
      {criterion.reasoning && (
        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed pl-5 italic">{criterion.reasoning}</p>
      )}
    </div>
  )
}

/** Nhãn + icon cho band tổng điểm (patch v2.1 §10.4) — luôn icon + chữ, không chỉ dựa vào màu. */
const SCORE_BAND_META: Record<PaastScoreBand, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ready: { label: 'Sẵn sàng publish', icon: CheckCircle2, className: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  close: { label: 'Gần đạt — còn vài điểm cần bổ sung', icon: Info, className: 'bg-blue-50 border-blue-300 text-blue-700' },
  'needs-work': { label: 'Cần nâng cấp đáng kể', icon: AlertTriangle, className: 'bg-orange-50 border-orange-300 text-orange-700' },
  'not-ready': { label: 'Chưa đạt chuẩn cơ bản', icon: XCircle, className: 'bg-red-50 border-red-300 text-red-700' },
}

export function ScoreBandBadge({ band, className = '' }: { band: PaastScoreBand; className?: string }) {
  const meta = SCORE_BAND_META[band]
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.className} ${className}`}>
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  )
}

const WOW_STRENGTH_META: Record<PaastWowStrength, { label: string; className: string }> = {
  strong: { label: 'Wow mạnh', className: 'bg-amber-600 text-white border-amber-600' },
  moderate: { label: 'Wow vừa', className: 'bg-white text-amber-700 border-amber-400' },
  weak: { label: 'Wow yếu', className: 'bg-white text-gray-400 border-gray-200' },
}

export function WowStrengthBadge({ strength, className = '' }: { strength: PaastWowStrength; className?: string }) {
  const meta = WOW_STRENGTH_META[strength]
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${meta.className} ${className}`}>
      {meta.label}
    </span>
  )
}

/**
 * Nội dung của LayerBlock Prefer — tách riêng khỏi PaastScoreModal/ContentScoringTab (2 nơi
 * dùng chung UI này bị trùng lặp trước patch v2.1) vì giờ có thêm: coherence warning banner,
 * takeaway statement + wow badge — không chỉ còn là danh sách chip insight.
 */
export function PreferInsightsBlock({ prefer }: { prefer: PaastLayerInsights }) {
  const isCoherent = prefer.coherence?.is_coherent !== false
  return (
    <>
      {prefer.takeaway_statement && (
        <div className="flex items-start gap-2 flex-wrap mb-2.5">
          <p className="text-xs font-bold text-gray-700 leading-relaxed flex-1 min-w-0">
            &ldquo;{prefer.takeaway_statement}&rdquo;
          </p>
          {prefer.wow_strength && <WowStrengthBadge strength={prefer.wow_strength} className="shrink-0 mt-0.5" />}
        </div>
      )}
      {!isCoherent && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-orange-700 leading-relaxed">
            <span className="font-bold">Nội dung đổi trọng tâm giữa chừng — </span>
            {prefer.coherence?.warning || 'chưa hội tụ về 1 insight chủ đạo xuyên suốt.'}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {prefer.insights.map(i => (
          <span
            key={i.code}
            title={[i.description, i.level != null ? `${i.level_label ?? ''} (${i.level}/5)` : ''].filter(Boolean).join(' — ') || undefined}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
              i.status === 'primary'
                ? 'bg-amber-600 border-amber-600 text-white'
                : i.status === 'secondary'
                  ? 'bg-white border-amber-400 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-400'
            }`}
          >
            {i.name_en} · {i.name_vi}
            {i.level != null && <span className="opacity-70"> ({i.level}/5)</span>}
          </span>
        ))}
      </div>
      {prefer.insights
        .filter(i => i.status !== 'off' && i.evidence_sentences.length > 0)
        .map(i => (
          <div key={i.code} className="mt-2.5 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-gray-600">{i.name_en} · {i.name_vi} — {i.description}</p>
              {i.level != null && <LevelMeter level={i.level} label={i.level_label} />}
            </div>
            {i.evidence_sentences.map((s, idx) => (
              <p key={idx} className="text-xs italic text-gray-500 border-l-2 border-amber-300 bg-amber-50/50 px-2.5 py-1.5 rounded-r">
                &ldquo;{s}&rdquo;
              </p>
            ))}
            {i.reasoning && <p className="text-[11px] text-gray-400 leading-relaxed pl-2.5">{i.reasoning}</p>}
          </div>
        ))}
    </>
  )
}

const FEASIBILITY_META: Record<
  PaastVideoRealism['overall_feasibility'],
  { label: string; icon: typeof CheckCircle2; badgeClassName: string; panelClassName: string }
> = {
  realistic: {
    label: 'Khả thi', icon: CheckCircle2,
    badgeClassName: 'bg-emerald-50 border-emerald-300 text-emerald-700',
    panelClassName: 'bg-gray-50 border-gray-200',
  },
  'needs-adjustment': {
    label: 'Cần điều chỉnh', icon: AlertTriangle,
    badgeClassName: 'bg-orange-50 border-orange-300 text-orange-700',
    panelClassName: 'bg-orange-50/60 border-orange-200',
  },
  'high-risk': {
    label: 'Rủi ro cao', icon: XCircle,
    badgeClassName: 'bg-red-50 border-red-300 text-red-700',
    panelClassName: 'bg-red-50/60 border-red-200',
  },
}

/**
 * Panel "Kiểm tra thực tế video" (MỚI, patch v2.1 §4) — mô phỏng xem như video thật, độc lập với
 * 5 lớp PAAST. Luôn hiển thị, kể cả khi verdict = "Đạt chuẩn": 1 content có thể đủ 5 lớp về nội
 * dung nhưng vẫn "chết" khi quay thành video thật. Nền chuyển cam/đỏ nhạt khi có rủi ro (§4:
 * "chuyển --orange-soft nếu overallFeasibility !== realistic") — không chỉ dựa vào màu badge.
 */
export function VideoRealismPanel({ videoRealism }: { videoRealism: PaastVideoRealism }) {
  const meta = FEASIBILITY_META[videoRealism.overall_feasibility]
  const Icon = meta.icon
  const rows: Array<[string, string]> = [
    ['Mở đầu (1-3s)', videoRealism.opening_beat],
    ['Nhịp độ', videoRealism.pacing_note],
    ['Kể vs. Cho xem', videoRealism.show_vs_tell],
    ['Payoff/kết', videoRealism.payoff_note],
  ]
  return (
    <div className={`rounded-xl border px-4 py-3 ${meta.panelClassName}`}>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
          <Clapperboard className="w-3.5 h-3.5 text-slate-400" /> Kiểm tra thực tế video
        </p>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.badgeClassName}`}>
          <Icon className="w-3 h-3" /> {meta.label}
        </span>
      </div>
      <dl className="space-y-1.5">
        {rows.map(([label, text]) => text && (
          <div key={label} className="text-[11px] leading-relaxed">
            <dt className="font-semibold text-gray-500 inline">{label}: </dt>
            <dd className="text-gray-600 inline">{text}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
