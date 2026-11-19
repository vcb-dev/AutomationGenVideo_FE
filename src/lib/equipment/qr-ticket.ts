import axios, { AxiosInstance } from 'axios';
import { apiClient } from '../api-client';
import { Asset, AvailabilityResponse, CreateBorrowRequestPayload } from './api';
import type { BorrowFormApi } from './borrow-form-context';
import { compressImage } from './image-compressor';

export interface QrCode {
  code: string;
  expiresAt: string;
}

export interface QrTicketSession {
  ticket: string;
  expiresAt: string;
  user: { fullName: string | null; email: string; team: string | null };
}

const STORAGE_KEY = 'mems-qr-ticket';

/** Máy tính đang đăng nhập xin mã QR dùng một lần. */
export async function issueQrCode(): Promise<QrCode> {
  const { data } = await apiClient.post<QrCode>('/mems/qr-tickets');
  return data;
}

/** Client riêng cho điện thoại: không gửi cookie, không bị interceptor của apiClient đẩy về trang đăng nhập. */
export function createTicketClient(ticket?: string): AxiosInstance {
  return axios.create({
    baseURL: apiClient.defaults.baseURL,
    withCredentials: false,
    headers: ticket ? { Authorization: `Bearer ${ticket}` } : {},
  });
}

export async function exchangeQrCode(code: string): Promise<QrTicketSession> {
  const { data } = await createTicketClient().post<QrTicketSession>('/mems/qr-tickets/exchange', { code });
  return data;
}

export function createTicketApi(ticket: string): BorrowFormApi {
  const client = createTicketClient(ticket);
  return {
    fetchAssets: async () => (await client.get<Asset[]>('/mems/qr/assets')).data,
    checkAvailability: async (params) =>
      (await client.get<AvailabilityResponse>('/mems/qr/availability', { params })).data,
    uploadRequestPhoto: async (file: File) => {
      const compressed = await compressImage(file).catch(() => file);
      const form = new FormData();
      form.append('photo', compressed);
      return (await client.post<{ id: string; url: string }>('/mems/qr/request-photos', form)).data;
    },
    createBorrowRequest: async (payload: CreateBorrowRequestPayload) =>
      (await client.post<{ id: string; request_code: string; status: string }>('/mems/qr/requests', payload)).data,
  };
}

/** Vé chỉ sống trong tab hiện tại: tải lại trang không phải quét lại, đóng tab là hết. */
export function saveTicketSession(session: QrTicketSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Trình duyệt chặn bộ nhớ thì chỉ mất tiện ích tải lại trang.
  }
}

export function loadTicketSession(now: number = Date.now()): QrTicketSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as QrTicketSession;
    if (!session?.ticket || !(new Date(session.expiresAt).getTime() > now)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
