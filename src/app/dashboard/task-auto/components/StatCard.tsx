'use client'

import { KpiTile } from './DashboardUI'
import type { Tone } from './tokens'

interface Props {
  label: string
  value: number | string
  icon?: React.ElementType
  tone: Tone
  sub?: string
  /** false → ô hiển thị trung tính dù `tone` là gì (vd "0 quá hạn" là tin tốt, không tô đỏ). */
  active?: boolean
}

/** Ô số liệu độc lập — bọc KpiTile để màn Content Creator dùng chung đúng 1 kiểu ô với Tổng quan. */
export function StatCard({ label, value, icon, tone, sub, active = true }: Props) {
  return <KpiTile label={label} value={value ?? 0} hint={sub} icon={icon} tone={active ? tone : 'neutral'} />
}
