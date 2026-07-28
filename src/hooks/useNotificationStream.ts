import { useEffect, useRef } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

/**
 * Mở 1 kết nối SSE tới `path` (vd `/task-auto/notifications/stream`) để được server đẩy
 * tín hiệu "có thông báo mới" thay vì polling định kỳ. EventSource của browser không set
 * được header Authorization, nên JWT truyền qua `?access_token=` — JwtStrategy đã hỗ trợ
 * sẵn extractor này (dùng chung với case stream video qua thẻ <video>).
 *
 * `onNotification` được gọi khi: (1) có noti mới, (2) mỗi lần reconnect thành công sau
 * khi mất kết nối/tab ngủ — để đồng bộ lại những gì bị lỡ trong lúc offline. Không gọi
 * ở lần open đầu tiên vì component gọi sẵn ở effect load ban đầu.
 */
export function useNotificationStream(path: string, onNotification: () => void) {
  const callbackRef = useRef(onNotification)
  callbackRef.current = onNotification

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('auth_token')
    if (!token) return

    const url = `${API_URL}${path}?access_token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    let isFirstOpen = true

    es.addEventListener('open', () => {
      if (isFirstOpen) {
        isFirstOpen = false
        return
      }
      callbackRef.current()
    })
    es.addEventListener('notification', () => callbackRef.current())

    return () => es.close()
  }, [path])
}
