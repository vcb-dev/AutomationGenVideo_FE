import { useCallback, useEffect, useRef } from 'react'

/**
 * useLoadMoreScroll — sau khi bấm "Xem thêm" và trang lớn hơn đã tải xong, cuộn vùng danh
 * sách XUỐNG vừa đủ để lộ phần vừa nối thêm, không phải lướt tay.
 *
 * Neo cuộn là item NGAY SAU item cũ cuối cùng (theo thứ tự DOM hiện tại), KHÔNG phải "item
 * mới đầu tiên": nhiều danh sách (vd cột Kanban ở tab Nhiệm vụ) tự sắp xếp lại theo mức ưu
 * tiên nên item mới có thể bị chèn LÊN phía trên viewport (task hạn hôm nay, task thường xen
 * trên khối quá hạn ở đáy…). Nếu neo vào "item mới đầu tiên" rồi cuộn tới đó, màn hình sẽ
 * giật ngược về đầu danh sách thay vì đi tiếp xuống. Vì vậy hook chỉ cuộn XUỐNG; khi phần
 * mới nằm ở đầu viewport hoặc phía trên thì giữ nguyên vị trí (trình duyệt tự neo nội dung
 * đang xem), người dùng tự cuộn lên nếu muốn.
 *
 * Cách dùng:
 *   const { listRef, markLoadMore } = useLoadMoreScroll(items.map(i => i.id), isFetching)
 *   ...
 *   <div ref={listRef} className="overflow-y-auto ...">{items.map(...)}<button/></div>
 *   <button onClick={() => { markLoadMore(); setLimit(l => l + PAGE_SIZE) }}>Xem thêm</button>
 *
 * Yêu cầu: các thẻ item phải là con TRỰC TIẾP của phần tử gắn listRef, đúng thứ tự với `ids`.
 *
 * @param ids        Danh sách id đang hiển thị, đúng thứ tự render.
 * @param isFetching  useQuery.isFetching — chờ fetch xong mới cuộn.
 */
export function useLoadMoreScroll(ids: string[], isFetching: boolean) {
  const listRef = useRef<HTMLDivElement>(null)
  // Ảnh chụp id đang hiển thị tại thời điểm bấm "Xem thêm"; null = không có yêu cầu cuộn đang chờ.
  const pendingIdsRef = useRef<Set<string> | null>(null)
  // Giữ `ids` mới nhất để markLoadMore không cần phụ thuộc vào nó (tránh tạo lại callback mỗi render).
  const idsRef = useRef(ids)
  idsRef.current = ids
  // Theo dõi mép xuống của isFetching để biết cú fetch "Xem thêm" vừa kết thúc.
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
    // Danh sách chưa dài ra và fetch cũng chưa vừa xong → cú "Xem thêm" chưa về, đợi tiếp.
    if (!grew && !fetchJustSettled) return
    // Đã về (hoặc fetch vừa xong): luôn dọn yêu cầu — kể cả khi trang mới không thêm item nào
    // — để lần render sau (refetch, thêm task realtime…) không bị cuộn nhầm.
    pendingIdsRef.current = null
    if (!grew) return

    const container = listRef.current
    if (!container) return
    // Neo vào item ngay sau item cũ cuối cùng (xem giải thích ở đầu file).
    let lastOldIdx = -1
    for (let i = 0; i < ids.length; i++) if (pending.has(ids[i])) lastOldIdx = i
    const target = container.children[lastOldIdx + 1] as HTMLElement | undefined
    if (!target) return

    const delta = target.getBoundingClientRect().top - container.getBoundingClientRect().top
    // Chỉ cuộn XUỐNG (chừa 8px cho thoáng). delta <= 8 nghĩa là phần mới đã ở đầu viewport
    // hoặc phía trên — cuộn tới đó sẽ giống "nhảy về đầu danh sách", nên bỏ qua.
    if (delta <= 8) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // scrollBy (tương đối) nên chỉ tác động vùng cuộn này, không đụng trang.
    container.scrollBy({ top: delta - 8, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [ids, isFetching])

  return { listRef, markLoadMore }
}
