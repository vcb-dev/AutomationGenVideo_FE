'use client';

import { createContext, ReactNode, useContext } from 'react';

/**
 * Khi người khác đang điều khiển vòng quay, mọi nút hành động phải tự khóa.
 *
 * Dùng context thay vì truyền prop qua từng tab: chỉ cần ActionButton và RowActionButton đọc
 * giá trị này là toàn bộ trang thành chế độ xem, không sót nút nào khi thêm tính năng mới.
 */
const ReadOnlyContext = createContext(false);

export function SpinReadOnlyProvider({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  return <ReadOnlyContext.Provider value={readOnly}>{children}</ReadOnlyContext.Provider>;
}

export function useSpinReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}
