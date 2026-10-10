import { useEffect, useState } from 'react'

/** Giá trị chỉ cập nhật sau khi `value` đứng yên `delay` ms — ô tìm kiếm/ô số chỉ bắn request khi ngừng gõ. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])
  return debounced
}
