'use client'

import { Eye, Edit2, Trash2 } from 'lucide-react'
import { EditorKpi } from '@/types/task-auto'

interface Props {
  kpi: EditorKpi
  canEdit: boolean
  onEdit: (k: EditorKpi) => void
  onDelete: (id: string) => void
  onViewDetail: (k: EditorKpi) => void
}

export function EditorKpiTableRow({ kpi, canEdit, onEdit, onDelete, onViewDetail }: Props) {
  const monthLabel = kpi.month.replace(/(\d{4})-(\d{2})/, 'T$2/$1')

  return (
    <tr
      className="hover:bg-indigo-50/20 transition-colors cursor-pointer"
      onClick={() => onViewDetail(kpi)}
    >
      <td className="px-5 py-4">
        <p className="font-semibold text-slate-900 text-sm">{kpi.user?.full_name ?? '-'}</p>
        <p className="text-xs text-slate-400">{kpi.user?.email ?? ''}</p>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {kpi.team ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
            {kpi.team.name}
          </span>
        ) : <span className="text-slate-300 text-xs">—</span>}
      </td>
      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{monthLabel}</td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="font-bold text-indigo-600 text-base">{kpi.total_target}</span>
        <span className="text-xs text-slate-400 ml-1">video</span>
      </td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="font-semibold text-emerald-600">{kpi.video_win}</span>
        <span className="text-xs text-slate-400 ml-1">win</span>
      </td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="font-semibold text-sky-600">{kpi.content_new}</span>
        <span className="text-xs text-slate-400 ml-1">content</span>
      </td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="font-semibold text-violet-600">{kpi.product_planned}</span>
        <span className="text-xs text-slate-400 ml-1">SP</span>
      </td>
      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{kpi.set_by?.full_name ?? '-'}</td>
      <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={e => { e.stopPropagation(); onViewDetail(kpi) }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onEdit(kpi) }}
                className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-colors"
                title="Sửa KPI"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(kpi.id) }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                title="Xóa KPI"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export function EditorKpiLoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
