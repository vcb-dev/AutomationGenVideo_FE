import { useCallback, useEffect, useState } from 'react'
import { getPushPublicKey, subscribePush, unsubscribePush } from '@/lib/api/task-auto'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

function subToPayload(sub: PushSubscription) {
  const json = sub.toJSON()
  return {
    endpoint: json.endpoint as string,
    keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
  }
}

const isSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

/**
 * Đăng ký Service Worker + quản lý Web Push subscription của tab hiện tại.
 * `subscribe()` chỉ được gọi từ 1 hành động click của user — Notification
 * permission API bắt buộc như vậy, trình duyệt sẽ tự chặn nếu gọi ngoài user gesture.
 */
export function usePushNotifications() {
  const [supported] = useState(isSupported)
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  )
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
  }, [supported])

  const doSubscribe = useCallback(async (): Promise<PushSubscription> => {
    const reg = await navigator.serviceWorker.ready
    const { publicKey } = await getPushPublicKey()
    if (!publicKey) throw new Error('Push chưa được cấu hình trên server')
    return reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    })
  }, [])

  const subscribe = useCallback(async () => {
    if (!supported) throw new Error('Trình duyệt không hỗ trợ Web Push')
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return false

      let sub = await doSubscribe()
      try {
        await subscribePush(subToPayload(sub))
      } catch (err: any) {
        // Endpoint đang thuộc user khác (máy dùng chung, người trước chưa tắt push) —
        // huỷ subscription cũ phía trình duyệt rồi lấy endpoint mới hoàn toàn, thử lại 1 lần.
        if (err?.response?.status === 409) {
          await sub.unsubscribe()
          sub = await doSubscribe()
          await subscribePush(subToPayload(sub))
        } else {
          throw err
        }
      }
      setSubscribed(true)
      return true
    } finally {
      setLoading(false)
    }
  }, [supported, doSubscribe])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await unsubscribePush(endpoint).catch(() => {})
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [supported])

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}
