import { fetchWithAuth } from '@/lib/api-client';
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

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

export const videoLibraryService = {
  // ─── Đề xuất video (member) ─────────────────────────────
  proposeVideo: async (token: string, payload: ProposeVideoPayload): Promise<{ status: string; message: string; proposal: ScraperVideoProposal }> => {
    const res = await fetchWithAuth(`${API_URL}/video-proposals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || body?.error || 'Không thể gửi đề xuất');
    }
    return res.json();
  },

  getMyProposals: async (token: string, status?: string): Promise<ScraperVideoProposal[]> => {
    const qs = status ? `?status=${status}` : '';
    const res = await fetchWithAuth(`${API_URL}/video-proposals/my${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  // ─── Duyệt (leader/admin) ────────────────────────────────
  getPendingProposals: async (token: string, status?: string): Promise<ScraperVideoProposal[]> => {
    const qs = status ? `?status=${status}` : '';
    const res = await fetchWithAuth(`${API_URL}/video-proposals/pending${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  reviewProposal: async (
    token: string,
    id: string,
    action: 'APPROVED' | 'REJECTED',
    note?: string,
  ): Promise<{ status: string; proposal: ScraperVideoProposal }> => {
    const res = await fetchWithAuth(`${API_URL}/video-proposals/${id}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || body?.error || 'Duyệt đề xuất thất bại');
    }
    return res.json();
  },

  // ─── Leader/admin thêm thẳng (tự duyệt) ──────────────────
  addVideoDirectly: async (token: string, payload: ProposeVideoPayload): Promise<{ status: string; message: string; videoLibraryId: string; approvedContentId: string | null }> => {
    const res = await fetchWithAuth(`${API_URL}/video-library/direct`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || body?.error || 'Không thể thêm video vào bộ sưu tập');
    }
    return res.json();
  },
};
