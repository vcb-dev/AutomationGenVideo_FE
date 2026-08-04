'use client';

import { createContext, ReactNode, useContext } from 'react';

/**
 * Bật/tắt tên hiển thị trên các ô của bánh xe.
 *
 * Dùng context để một nút duy nhất ở đầu trang điều khiển được cả hai tab quay lẫn chế độ
 * trình chiếu, thay vì mỗi nơi một công tắc riêng dễ lệch nhau.
 */
const WheelNamesContext = createContext(true);

export function WheelNamesProvider({ showNames, children }: { showNames: boolean; children: ReactNode }) {
  return <WheelNamesContext.Provider value={showNames}>{children}</WheelNamesContext.Provider>;
}

export function useWheelNames(): boolean {
  return useContext(WheelNamesContext);
}

const STORAGE_KEY = 'vcbi_lucky_spin_hide_names';

export function loadShowNames(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}

export function saveShowNames(showNames: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, showNames ? '0' : '1');
  } catch {
    /* trình duyệt chặn localStorage — chỉ mất việc nhớ lựa chọn */
  }
}
