'use client'

import { FileText, Package, Video } from 'lucide-react'
import { DarkModal } from '@/components/task-auto'
import { cn } from '@/lib/utils'
import { EditorKpi } from '@/types/task-auto'
import { AllocCardSection } from './KpiAllocationCard'

export type KpiFormState = Omit<EditorKpi, 'id' | 'set_by_id' | 'created_at' | 'updated_at' | 'user' | 'set_by' | 'team' | 'allocations'>

export const VIDEO_ROWS: { key: keyof KpiFormState; label: string; bold?: boolean }[] = [
  { key: 'total_target',  label: 'Tổng video sản xuất', bold: true },
  { key: 'video_win',     label: 'Video win (≥10k views)' },
  { key: 'video_fail',    label: 'Video fail' },
]

export const CONTENT_ROWS: { key: keyof KpiFormState; label: string; bold?: boolean }[] = [
  { key: 'content_new',       label: 'Content mới được làm' },
  { key: 'content_collected', label: 'Content sưu tầm về kho team' },
  { key: 'content_win_cover', label: 'Content win được cover lại' },
]

export const PRODUCT_ROWS: { key: keyof KpiFormState; label: string }[] = [
  { key: 'product_planned',     label: 'SP đẩy video theo kế hoạch' },
  { key: 'product_win_collect', label: 'SP sưu tầm và test video win' },
]

interface Props {
  kpi: EditorKpi
  onClose: () => void
}

export function EditorKpiDetailModal({ kpi, onClose }: Props) {
  const monthLabel = kpi.month.replace(/(\d{4})-(\d{2})/, 'Tháng $2/$1')

  return (
    <DarkModal
      open
      onClose={onClose}
      title={`Chi tiết KPI — ${kpi.user?.full_name ?? ''}`}
      subtitle={`${monthLabel} · Người đặt: ${kpi.set_by?.full_name ?? '—'}`}
      size="2xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Tổng video',  value: kpi.total_target,   color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            { label: 'Video win',   value: kpi.video_win,       color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Video fail',  value: kpi.video_fail,      color: 'bg-red-50 text-red-600 border-red-200' },
            { label: 'Content mới', value: kpi.content_new,     color: 'bg-sky-50 text-sky-700 border-sky-200' },
            { label: 'SP kế hoạch', value: kpi.product_planned, color: 'bg-violet-50 text-violet-700 border-violet-200' },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn('flex items-center gap-3 px-5 py-3 rounded-2xl border font-semibold', color)}>
              <span className="text-sm font-medium opacity-70">{label}</span>
              <span className="text-2xl font-black">{value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl overflow-hidden border border-orange-200">
            <div className="bg-orange-400 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
              <Video className="w-4 h-4" /> Số video sản xuất đạt tiêu chuẩn
            </div>
            <div className="divide-y divide-orange-100">
              {VIDEO_ROWS.map(r => (
                <div key={r.key as string} className="flex items-center justify-between px-4 py-3 bg-white">
                  <span className={cn('text-sm text-slate-600', r.bold && 'font-semibold text-slate-800')}>{r.label}</span>
                  <span className={cn('font-bold', r.bold ? 'text-indigo-700 text-lg' : 'text-slate-900 text-base')}>{kpi[r.key] as number}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-green-200">
            <div className="bg-green-500 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Content
            </div>
            <div className="divide-y divide-green-100">
              {CONTENT_ROWS.map(r => (
                <div key={r.key as string} className="flex items-center justify-between px-4 py-3 bg-white">
                  <span className={cn('text-sm text-slate-600', r.bold && 'font-semibold text-slate-800')}>{r.label}</span>
                  <span className={cn('font-bold', r.bold ? 'text-green-700 text-lg' : 'text-slate-900 text-base')}>{kpi[r.key] as number}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-purple-200">
            <div className="bg-purple-500 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> Product
            </div>
            <div className="divide-y divide-purple-100">
              {PRODUCT_ROWS.map(r => (
                <div key={r.key as string} className="flex items-center justify-between px-4 py-3 bg-white">
                  <span className="text-sm text-slate-600">{r.label}</span>
                  <span className="text-base font-bold text-slate-900">{kpi[r.key] as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AllocCardSection
            items={(kpi.allocations ?? []).filter(a => a.type === 'CONTENT_LINE')}
            label="Tuyến nội dung"
            icon={<FileText className="w-3.5 h-3.5" />}
            barColor="bg-indigo-500"
            bgColor="bg-indigo-50/50"
            borderColor="border-indigo-100"
            labelColor="text-indigo-600"
            totalColor="text-indigo-700"
          />
          <AllocCardSection
            items={(kpi.allocations ?? []).filter(a => a.type === 'PRODUCT_LINE')}
            label="Dòng sản phẩm"
            icon={<Package className="w-3.5 h-3.5" />}
            barColor="bg-teal-500"
            bgColor="bg-teal-50/50"
            borderColor="border-teal-100"
            labelColor="text-teal-600"
            totalColor="text-teal-700"
          />
        </div>
      </div>
    </DarkModal>
  )
}
