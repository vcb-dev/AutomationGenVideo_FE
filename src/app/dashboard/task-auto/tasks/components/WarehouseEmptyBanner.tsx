'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PackageX, Video, ShoppingBag, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTaskNotifications } from '@/lib/api/task-auto'

const NOTICE_TYPE = 'AUTO_ASSIGN_EMPTY_WAREHOUSE'
const DISMISSED_KEY = 'task_auto_warehouse_notice_dismissed'

function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

interface Props {
  /** Chỉ fetch/hiện khi đang ở view cá nhân — số liệu là của riêng editor đang đăng nhập */
  enabled: boolean
}

export function WarehouseEmptyBanner({ enabled }: Props) {
  const [dismissedId, setDismissedId] = useState<string | null>(null)

  useEffect(() => {
    setDismissedId(typeof window !== 'undefined' ? localStorage.getItem(DISMISSED_KEY) : null)
  }, [])

  const { data } = useQuery({
    queryKey: ['task-auto', 'notifications', NOTICE_TYPE],
    queryFn: () => getTaskNotifications({ type: NOTICE_TYPE, limit: 1 }),
    enabled,
    refetchOnWindowFocus: true,
  })

  const notice = data?.data?.[0]
  if (!notice || !notice.meta || !isToday(notice.created_at) || notice.id === dismissedId) return null

  const { videosNeededToday, productKpi, contentLines } = notice.meta

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, notice!.id)
    setDismissedId(notice!.id)
  }

  return (
    <div className="relative bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 space-y-4">
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 p-1 rounded-lg hover:bg-amber-100 text-amber-500"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-sm">
          <PackageX className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-amber-900 text-sm">{notice.title}</h3>
          <p className="text-xs text-amber-700 mt-0.5">
            Kho tháng chưa có content/sản phẩm để bắt cặp tạo task tự động — dưới đây là số liệu bạn
            cần hoàn thành hôm nay theo KPI, hãy tạo task thủ công hoặc bổ sung kho.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 pl-12">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-amber-300 bg-white text-sm font-semibold text-amber-800">
          <Video className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-black text-base leading-none">{videosNeededToday}</span>
          <span className="font-medium opacity-80">video cần làm hôm nay</span>
        </div>

        {contentLines.map(line => (
          <div
            key={line.id}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-amber-200 bg-white/70 text-sm font-medium text-amber-700"
          >
            {line.name}
            <span className="font-black text-amber-900">{line.count}</span>
          </div>
        ))}
      </div>

      {productKpi && (
        <div className="pl-12">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            Còn thiếu {productKpi.remaining} sản phẩm cần đẩy theo KPI tháng
            <span className="text-amber-500 font-normal">
              (đã đẩy {productKpi.pushedThisMonth}/{productKpi.planned})
            </span>
          </div>
          {productKpi.pendingProducts && productKpi.pendingProducts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {productKpi.pendingProducts.map(p => (
                <span
                  key={p.id}
                  className={cn(
                    'px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs font-medium text-amber-700',
                  )}
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
