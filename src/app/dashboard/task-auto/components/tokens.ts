// ─── Design tokens — Task Auto "Tổng quan" ────────────────────────────────────
// Single source of truth for the two color dimensions used across every dashboard
// variant (Global / Team / Personal / Content Creator / Content Team Leader):
//
//   TONE      — semantic *state* color (success/warning/danger/info/violet/neutral/brand).
//               Drives StatCard, MetricStat, badges, alert banners.
//   CATEGORY  — *subject-matter* color coding for KPI breakdowns (video/content/product/…).
//               Independent of state — a "video" tile stays orange whether it's on-target or not.
//   STATUS    — maps a task status key to its TONE, so donut charts, legends and status
//               badges all agree on one palette instead of three copies of the same map.
//
// Previously these palettes were redefined per-file (GlobalDashboard, StatusBar,
// PersonalDashboard each had their own copy) and StatCard/MetricStat took raw
// Tailwind class strings instead of a shared tone — this file replaces both.

export type Tone = 'neutral' | 'brand' | 'info' | 'warning' | 'danger' | 'success' | 'violet'

interface ToneStyle {
  text: string
  bg: string
  border: string
  dot: string
  bar: string
  hex: string
}

export const TONE: Record<Tone, ToneStyle> = {
  // .text đậm (slate-800) chứ không mờ — số liệu "trung tính" (vd 0 chờ duyệt = tin tốt) vẫn nên đọc
  // rõ ràng như mọi số khác, không phải xám nhạt khó đọc; phần "trung tính" nằm ở việc KHÔNG tô màu
  // cảnh báo, không phải ở việc làm mờ chữ.
  neutral: { text: 'text-slate-800',  bg: 'bg-slate-100',  border: 'border-slate-200',  dot: 'bg-slate-300',  bar: 'bg-slate-300',  hex: '#94a3b8' },
  brand:   { text: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100', dot: 'bg-indigo-500', bar: 'bg-indigo-500', hex: '#6366f1' },
  info:    { text: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100',   dot: 'bg-blue-400',   bar: 'bg-blue-400',   hex: '#3b82f6' },
  warning: { text: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100',  dot: 'bg-amber-400',  bar: 'bg-amber-400',  hex: '#f59e0b' },
  danger:  { text: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-100',    dot: 'bg-red-400',    bar: 'bg-red-500',    hex: '#ef4444' },
  success: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500', bar: 'bg-emerald-500', hex: '#10b981' },
  violet:  { text: 'text-violet-600', bg: 'bg-violet-50',  border: 'border-violet-100', dot: 'bg-violet-400', bar: 'bg-violet-500', hex: '#8b5cf6' },
}

/** Tone by completion-rate style thresholds — used anywhere a % needs a red/amber/emerald read. */
export function rateTone(pct: number, good = 70, ok = 40): Tone {
  return pct >= good ? 'success' : pct >= ok ? 'warning' : 'danger'
}

/**
 * Tone for "progress toward a KPI target" (0–100%), 4-tier so "on track" (brand) reads
 * distinctly from "done" (success). Shared by KpiProgress's ring and any other place that
 * displays the same KPI % — keeping this in one place matters because a screen can show the
 * same percentage twice (e.g. a summary badge + a progress ring); two independent threshold
 * functions previously disagreed at the boundary (65% read as "on track" in one spot and
 * "behind" in the other for the identical number).
 */
export function kpiTone(pct: number): Tone {
  if (pct >= 100) return 'success'
  if (pct >= 70) return 'brand'
  if (pct >= 40) return 'warning'
  return 'danger'
}

export type Category = 'video' | 'content' | 'product' | 'extra' | 'views' | 'translation'

interface CategoryStyle {
  text: string
  bg: string
  border: string
  bar: string
}

export const CATEGORY: Record<Category, CategoryStyle> = {
  video:       { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', bar: 'bg-orange-500' },
  content:     { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', bar: 'bg-emerald-500' },
  product:     { text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100', bar: 'bg-violet-500' },
  extra:       { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100', bar: 'bg-purple-500' },
  views:       { text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-100', bar: 'bg-sky-500' },
  translation: { text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100', bar: 'bg-violet-500' },
}

export const STATUS_KEYS = ['pending', 'assigned', 'in_progress', 'submitted', 'approved', 'rejected', 'cancelled'] as const
export type StatusKey = typeof STATUS_KEYS[number]

export const STATUS: Record<StatusKey, { label: string; tone: Tone }> = {
  pending:     { label: 'Chờ xử lý', tone: 'neutral' },
  assigned:    { label: 'Đã giao',   tone: 'info' },
  in_progress: { label: 'Đang làm',  tone: 'warning' },
  submitted:   { label: 'Đã nộp',    tone: 'violet' },
  approved:    { label: 'Đã duyệt',  tone: 'success' },
  rejected:    { label: 'Từ chối',   tone: 'danger' },
  cancelled:   { label: 'Đã hủy',    tone: 'neutral' },
}

/** Donut/legend order — excludes `cancelled` by default since dashboards treat it as "not counted". */
export const STATUS_CHART_KEYS: StatusKey[] = ['pending', 'assigned', 'in_progress', 'submitted', 'approved', 'rejected']

// Task status enum (API) → aggregate key, for per-task badges (TaskRow, tables) that only
// have the enum value, not the lowercase aggregate key used by dashboard totals.
export const TASK_STATUS_TO_KEY: Record<string, StatusKey> = {
  PENDING: 'pending', ASSIGNED: 'assigned', IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted', APPROVED: 'approved', REJECTED: 'rejected', CANCELLED: 'cancelled',
}
