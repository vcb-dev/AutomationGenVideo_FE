'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, PackageX, X } from 'lucide-react'
import { getTaskNotifications } from '@/lib/api/task-auto'
import type { EmptyWarehouseNoticeMeta, Notification } from '@/types/task-auto'

const NOTICE_TYPE = 'AUTO_ASSIGN_EMPTY_WAREHOUSE'
const DISMISSED_KEY = 'task_auto_warehouse_notice_dismissed'

export type WarehouseNotice = Notification<EmptyWarehouseNoticeMeta> & { meta: EmptyWarehouseNoticeMeta }

function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

/** Thông báo "kho sản phẩm team trống" hôm nay của editor đang đăng nhập (auto-assign A4 không tạo được task). */
export function useWarehouseEmptyNotice(enabled: boolean) {
  const [dismissedId, setDismissedId] = useState<string | null>(null)

  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(DISMISSED_KEY))
    } catch {
      // localStorage bị chặn (chế độ riêng tư...) — vẫn hiện cảnh báo, chỉ không nhớ được lần ẩn
    }
  }, [])

  const { data } = useQuery({
    queryKey: ['task-auto', 'notifications', NOTICE_TYPE],
    queryFn: () => getTaskNotifications({ type: NOTICE_TYPE, limit: 1 }),
    enabled,
    refetchOnWindowFocus: true,
  })

  const latest = data?.data?.[0]
  const notice: WarehouseNotice | null =
    enabled && latest?.meta && isToday(latest.created_at) && latest.id !== dismissedId
      ? (latest as WarehouseNotice)
      : null

  function dismiss() {
    if (!notice) return
    try {
      localStorage.setItem(DISMISSED_KEY, notice.id)
    } catch {
      // như trên
    }
    setDismissedId(notice.id)
  }

  return { notice, dismiss }
}

/** Cảnh báo kho trống gọn 1 dòng, đặt ở góc phải đầu khối Kế hoạch ngày — không chiếm 1 ô trong
 * lưới tuyến (lưới đã đủ 4 ô A1/A2/A3/A5). Bấm "Tạo nhiệm vụ" để tự tạo task bù cho tuyến bị trống kho. */
export function WarehouseNoticeAlert({
  notice, onCreate, onDismiss,
}: {
  notice: WarehouseNotice
  onCreate: () => void
  onDismiss: () => void
}) {
  const { videosNeededToday, productKpi, contentLines } = notice.meta
  const lines = contentLines.map(l => l.name).join(', ')

  return (
    <div
      role="status"
      title={notice.title}
      className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 pl-3 pr-1 py-1 max-w-full"
    >
      <PackageX className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
      <p className="text-xs text-amber-900 min-w-0">
        {lines && <span className="font-bold">{lines}: </span>}
        kho SP team trống — tự tạo <span className="font-bold tabular-nums">{videosNeededToday}</span> video
        {productKpi ? <> · thiếu <span className="tabular-nums">{productKpi.remaining}</span> SP KPI tháng</> : null}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="shrink-0 inline-flex items-center gap-0.5 h-8 pl-2.5 pr-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
      >
        Tạo nhiệm vụ
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Ẩn cảnh báo kho trống hôm nay"
        title="Ẩn cảnh báo hôm nay"
        className="shrink-0 p-1.5 rounded-md text-amber-500 hover:bg-amber-100 hover:text-amber-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
