'use client'

import { CheckCircle2, Circle, MinusCircle, AlertTriangle } from 'lucide-react'
import type { PaastCriterion, PaastVerdict } from '@/lib/api/paast-analyzer'

/** Ký tự tối thiểu để chấm điểm PAAST — khớp ngưỡng phía AI service. */
export const PAAST_MIN_LENGTH = 100

export const LAYER_META = {
  prefer: { label: 'Prefer (Thích)', sub: 'CRAVES', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  action: { label: 'Action (Hành động)', sub: 'S-FACES', color: 'text-lime-700', bg: 'bg-lime-50', border: 'border-lime-200' },
  acknowledge: { label: 'Acknowledge (Biết)', sub: 'BRANDS', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  stick: { label: 'Stick (Nhớ)', sub: 'STICKS', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  trust: { label: 'Trust (Tin)', sub: 'TRUSTS', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
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

export function CriterionCard({ criterion }: { criterion: PaastCriterion }) {
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
