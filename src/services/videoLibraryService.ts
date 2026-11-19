import { fetchWithAuth } from '@/lib/api-client';
import { apiBaseUrl } from '@/lib/api-base-url';

export interface ProposeVideoPayload {
  /**
   * true = tiêu đề/mô tả do CON NGƯỜI tự gõ trong form, BE sẽ không đè lên bằng dữ liệu
   * lấy từ nền tảng. Chỉ form "Đề xuất video" đặt cờ này; extension và các thẻ video ở
   * trang Khám phá thì để trống vì chữ ở đó do máy đọc, số liệu nền tảng chuẩn hơn.
   */
  user_edited?: boolean;
  video_id: string;
  platform: string;
  title?: string;
  description?: string;
  video_url: string;
  author_username?: string;
  author_name?: string;
  thumbnail_url?: string;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  hashtags?: string[];
  source?: 'SCRAPED' | 'MANUAL';
  notes?: string;
}

export interface ScraperVideoProposal {
  id: string;
  video_id: string;
  platform: string;
  title: string;
  description: string;
  video_url: string;
  author_username: string;
  author_name: string;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  source: 'SCRAPED' | 'MANUAL';
  notes: string | null;
  requested_by_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  note: string | null;
  created_at: string;
  requested_by?: { id: string; full_name: string; email: string };
}

/** Lỗi gọi API kèm mã HTTP — để chỗ gọi phân biệt được "đã có sẵn" (409) với lỗi thật. */
export class VideoLibraryApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'VideoLibraryApiError';
  }
}

function authHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token && token !== 'valid') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const videoLibraryService = {
  // ─── Đề xuất video (member) ─────────────────────────────
  proposeVideo: async (token: string | null | undefined, payload: ProposeVideoPayload): Promise<{ status: string; message: string; proposal: ScraperVideoProposal }> => {
    const res = await fetchWithAuth(`${apiBaseUrl()}/video-proposals`, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new VideoLibraryApiError(body?.message || body?.error || 'Không thể gửi đề xuất', res.status);
    }
    return res.json();
  },

  getMyProposals: async (token?: string | null, status?: string): Promise<ScraperVideoProposal[]> => {
    const qs = status ? `?status=${status}` : '';
    const res = await fetchWithAuth(`${apiBaseUrl()}/video-proposals/my${qs}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return [];
    return res.json();
  },

  // ─── Duyệt (leader/admin) ────────────────────────────────
  getPendingProposals: async (token?: string | null, status?: string): Promise<ScraperVideoProposal[]> => {
    const qs = status ? `?status=${status}` : '';
    const res = await fetchWithAuth(`${apiBaseUrl()}/video-proposals/pending${qs}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return [];
    return res.json();
  },

  reviewProposal: async (
    token: string | null | undefined,
    id: string,
    action: 'APPROVED' | 'REJECTED',
    note?: string,
  ): Promise<{ status: string; proposal: ScraperVideoProposal }> => {
    const res = await fetchWithAuth(`${apiBaseUrl()}/video-proposals/${id}/review`, {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || body?.error || 'Duyệt đề xuất thất bại');
    }
    return res.json();
  },

  // ─── Leader/admin thêm thẳng (tự duyệt) ──────────────────
  addVideoDirectly: async (token: string | null | undefined, payload: ProposeVideoPayload): Promise<{ status: string; message: string; videoLibraryId: string; approvedContentId: string | null }> => {
    const res = await fetchWithAuth(`${apiBaseUrl()}/video-library/direct`, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new VideoLibraryApiError(body?.message || body?.error || 'Không thể thêm video vào bộ sưu tập', res.status);
    }
    return res.json();
  },
};
