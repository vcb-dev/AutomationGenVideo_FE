import { createContext } from 'react';
import { checkAvailability, createBorrowRequest, fetchAssets, uploadRequestPhoto } from './api';

export interface BorrowFormApi {
  fetchAssets: () => ReturnType<typeof fetchAssets>;
  checkAvailability: typeof checkAvailability;
  uploadRequestPhoto: (file: File) => Promise<{ id: string; url: string }>;
  createBorrowRequest: typeof createBorrowRequest;
}

export interface BorrowFormRequester {
  fullName: string | null;
  email?: string | null;
  team?: string | null;
}

export interface BorrowFormMode {
  api: BorrowFormApi;
  /** Người đứng tên phiếu khi vào bằng vé QR; không có thì lấy từ phiên đăng nhập. */
  requester?: BorrowFormRequester;
  /** Có thì gọi thay cho việc chuyển sang Nhật ký mượn, vì điện thoại không có phiên đăng nhập. */
  onCreated?: (requestCode: string) => void;
}

export const BorrowFormContext = createContext<BorrowFormMode>({
  api: { fetchAssets: () => fetchAssets(), checkAvailability, uploadRequestPhoto, createBorrowRequest },
});
