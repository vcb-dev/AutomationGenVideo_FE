import { useCallback, useEffect, useRef } from 'react'

/**
 * useLoadMoreScroll — sau khi bấm "Xem thêm" và trang mới đã tải xong, cuộn vùng danh sách
 * xuống vừa đủ để lộ phần vừa nối thêm.
 *
 * Neo cuộn là item ngay sau item cũ cuối cùng, không phải "item mới đầu tiên": danh sách có
 * thể tự sắp xếp lại và chèn item mới lên trên viewport, neo nhầm sẽ giật ngược về đầu. Hook
 * chỉ cuộn xuống; phần mới ở đầu/trên viewport thì giữ nguyên.
 *
 * Các thẻ item phải là con trực tiếp của phần tử gắn listRef, đúng thứ tự với `ids`.
 */
export function useLoadMoreScroll(ids: string[], isFetching: boolean) {
  const listRef = useRef<HTMLDivElement>(null)
  // Ảnh chụp id đang hiển thị lúc bấm "Xem thêm"; null = không có yêu cầu cuộn chờ xử lý.
  const pendingIdsRef = useRef<Set<string> | null>(null)
  // Giữ `ids` mới nhất để markLoadMore không phải phụ thuộc vào nó.
  const idsRef = useRef(ids)
  idsRef.current = ids
  // Theo dõi mép xuống của isFetching để biết cú fetch "Xem thêm" vừa xong.
  const wasFetchingRef = useRef(isFetching)

  const markLoadMore = useCallback(() => {
    pendingIdsRef.current = new Set(idsRef.current)
  }, [])

  useEffect(() => {
    const fetchJustSettled = wasFetchingRef.current && !isFetching
    wasFetchingRef.current = isFetching

    const pending = pendingIdsRef.current
    if (!pending || isFetching) return

    const grew = ids.length > pending.size
    // Chưa dài ra và fetch cũng chưa vừa xong → cú "Xem thêm" chưa về, đợi tiếp.
    if (!grew && !fetchJustSettled) return
    // Luôn dọn yêu cầu để lần render sau (refetch, realtime…) không bị cuộn nhầm.
    pendingIdsRef.current = null
    if (!grew) return

    const container = listRef.current
    if (!container) return
    // Neo vào item ngay sau item cũ cuối cùng.
    let lastOldIdx = -1
    for (let i = 0; i < ids.length; i++) if (pending.has(ids[i])) lastOldIdx = i
    const target = container.children[lastOldIdx + 1] as HTMLElement | undefined
    if (!target) return

    const delta = target.getBoundingClientRect().top - container.getBoundingClientRect().top
    // Chỉ cuộn xuống (chừa 8px). delta <= 8 nghĩa phần mới đã ở đầu/trên viewport → bỏ qua.
    if (delta <= 8) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // scrollBy tương đối nên chỉ tác động vùng cuộn này, không đụng trang.
    container.scrollBy({ top: delta - 8, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [ids, isFetching])

  return { listRef, markLoadMore }
}
