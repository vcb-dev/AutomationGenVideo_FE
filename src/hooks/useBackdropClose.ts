'use client'

import { useRef, type MouseEvent } from 'react'

/**
 * Props gắn lên lớp nền (backdrop) của modal để bấm ra ngoài là đóng, không cần bấm dấu "x".
 *
 * Chỉ đóng khi CẢ mousedown lẫn click đều rơi đúng vào lớp nền — nhờ vậy bôi đen text
 * trong modal rồi nhả chuột ra ngoài sẽ không làm modal đóng (mất nội dung đang nhập).
 *
 * Gắn lên đúng phần tử phủ kín màn hình và là cha/anh-em nằm dưới khung modal:
 *   const backdrop = useBackdropClose(onClose)
 *   <div className="absolute inset-0 bg-black/50" {...backdrop} />
 */
export function useBackdropClose(onClose: () => void) {
  const pressedOnBackdrop = useRef(false)

  return {
    onMouseDown: (e: MouseEvent) => {
      pressedOnBackdrop.current = e.target === e.currentTarget
    },
    onClick: (e: MouseEvent) => {
      const pressed = pressedOnBackdrop.current
      pressedOnBackdrop.current = false
      if (!pressed || e.target !== e.currentTarget) return
      onClose()
    },
  }
}
