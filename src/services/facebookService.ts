import { fetchWithAuth } from '@/lib/api-client';
import {
  FacebookPage, PaginatedPages, PaginatedVideos, PageFilters, VideoFilters,
  PaginatedPublishedVideos, PublishedVideoFilters, PublishedVideoFilterOptions,
  PublishedVideoRefreshFilters, PublishedVideoRefreshJob,
} from '@/types/facebook';

// Đi qua BE (proxy sang AI ở src/modules/scraper-proxy), không gọi thẳng AI nữa.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function buildParams(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export const facebookService = {
  // Import / Đồng bộ pages từ Facebook (gọi POST /api/facebook/import/)
  importPages: async (token: string): Promise<{ status: string; created: number; updated: number; message: string }> => {
    const res = await fetchWithAuth(`${API_URL}/facebook/import/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể import kênh từ Facebook');
    }
    return res.json();
  },

  // Import pages metadata từ Facebook (nhẹ, không cào video)
  syncAndGetPages: async (token: string): Promise<FacebookPage[]> => {
    const importRes = await fetchWithAuth(`${API_URL}/facebook/import/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!importRes.ok) throw new Error('Không thể import kênh từ Facebook');

    const listRes = await fetchWithAuth(`${API_URL}/facebook/manage-pages/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) throw new Error('Không thể tải danh sách kênh');
    const json = await listRes.json();
    return json.pages || [];
  },

  // Lấy danh sách pages với pagination + filter + search
  getPages: async (token: string, filters?: PageFilters): Promise<PaginatedPages> => {
    const qs = filters ? buildParams(filters) : '';
    const res = await fetchWithAuth(`${API_URL}/facebook/manage-pages/${qs ? '?' + qs : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải danh sách kênh');
    return res.json();
  },

  // Lấy videos với pagination + filter + search
  getPageVideos: async (token: string, pageId: string, filters?: VideoFilters): Promise<PaginatedVideos> => {
    const qs = filters ? buildParams(filters) : '';
    const res = await fetchWithAuth(`${API_URL}/facebook/page-videos/${pageId}/${qs ? '?' + qs : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải danh sách video');
    return res.json();
  },

  // Video của mọi page nội bộ — tab "Video đã đăng" ở màn Nhiệm vụ (lọc thêm team / người cầm kênh)
  getAllVideos: async (filters: PublishedVideoFilters): Promise<PaginatedPublishedVideos> => {
    const qs = buildParams(filters);
    const res = await fetchWithAuth(`${API_URL}/facebook/videos${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error('Không thể tải danh sách video đã đăng');
    return res.json();
  },

  getVideoFilterOptions: async (): Promise<PublishedVideoFilterOptions> => {
    const res = await fetchWithAuth(`${API_URL}/facebook/videos/filter-options`);
    if (!res.ok) throw new Error('Không thể tải danh sách người cầm kênh');
    return res.json();
  },

  // Nút "Cập nhật": cào bài mới + kéo lại chỉ số theo đúng bộ lọc đang chọn (chạy nền ở BE)
  startVideoRefresh: async (filters: PublishedVideoRefreshFilters): Promise<PublishedVideoRefreshJob> => {
    const body = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''));
    const res = await fetchWithAuth(`${API_URL}/facebook/videos/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || 'Không thể bắt đầu cập nhật');
    }
    return res.json();
  },

  getVideoRefresh: async (jobId: string): Promise<PublishedVideoRefreshJob> => {
    const res = await fetchWithAuth(`${API_URL}/facebook/videos/refresh/${jobId}`);
    if (!res.ok) throw new Error('Không đọc được tiến độ cập nhật');
    return res.json();
  },

  getLatestVideoRefresh: async (): Promise<PublishedVideoRefreshJob | null> => {
    const res = await fetchWithAuth(`${API_URL}/facebook/videos/refresh/latest`);
    if (!res.ok) return null;
    return (await res.json()).job ?? null;
  },

  // Trigger delta sync (cào bài mới)
  triggerScrape: async (token: string, pageId: string): Promise<{ message: string; is_scraping: boolean }> => {
    const res = await fetchWithAuth(`${API_URL}/facebook/sync/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: pageId }),
    });
    if (!res.ok) throw new Error('Không thể gửi yêu cầu cào video');
    return res.json();
  },

  // Trigger backfill (cào lượt đầu)
  triggerBackfill: async (token: string, pageId: string): Promise<{ message: string; is_scraping: boolean }> => {
    const res = await fetchWithAuth(`${API_URL}/facebook/backfill/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: pageId }),
    });
    if (!res.ok) throw new Error('Không thể gửi yêu cầu cào lượt đầu');
    return res.json();
  },
};
